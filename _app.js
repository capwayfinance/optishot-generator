/**
 * pages/api/generate.js
 * Proxy serveur → Stability AI
 * La clé API ne touche jamais le navigateur.
 *
 * Reçoit : multipart/form-data
 *   - prompt        string   requis
 *   - model         string   'core' | 'ultra'
 *   - aspect_ratio  string   '1:1' | '4:5' | '9:16' | '16:9' | '3:2'
 *   - image         File     optionnel (image-to-image)
 *
 * Renvoie : { image: string (base64 jpeg) }
 *        ou { error: string }
 */

export const config = {
  api: {
    // Nécessaire pour recevoir les fichiers uploadés
    bodyParser: false,
  },
};

const STABILITY_BASE = 'https://api.stability.ai/v2beta/stable-image/generate';

const NEGATIVE_PROMPT =
  'blurry, low quality, distorted, watermark, text, logo, cartoon, ' +
  'illustration, bad lighting, overexposed, underexposed, grainy, noise';

/**
 * Lit le body brut de la requête et le renvoie en Buffer.
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // — Méthode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  // — Clé API côté serveur uniquement
  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) {
    console.error('[OptiShot] STABILITY_API_KEY manquante dans les variables d\'environnement.');
    return res.status(500).json({ error: 'Configuration serveur incomplète.' });
  }

  try {
    // — Lire le body brut (multipart envoyé par le client)
    const rawBody = await getRawBody(req);
    const contentType = req.headers['content-type'] || '';

    // — Extraire le modèle et le ratio depuis les headers custom
    //   (plus simple que de parser le multipart côté serveur)
    const model = (req.headers['x-model'] || 'core').replace(/[^a-z]/g, '');
    const ratio = req.headers['x-ratio'] || '1:1';

    // — Valider le modèle
    if (!['core', 'ultra'].includes(model)) {
      return res.status(400).json({ error: 'Modèle invalide. Utilisez "core" ou "ultra".' });
    }

    const endpoint = `${STABILITY_BASE}/${model}`;

    // — Parser le multipart pour injecter negative_prompt et aspect_ratio
    //   On reconstruit un FormData côté Node en ajoutant les champs manquants
    // FormData et Blob natifs disponibles sur Node 18+ / Vercel
    const outForm = new FormData();

    // Re-parser le multipart entrant pour extraire prompt et image
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'Content-Type multipart/form-data manquant ou malformé.' });
    }

    const fields = parseMultipart(rawBody, boundary);

    const promptRaw = fields.prompt?.value;
    if (!promptRaw) {
      return res.status(400).json({ error: 'Le champ "prompt" est requis.' });
    }

    const enrichedPrompt =
      `Professional product photography of eyeglasses: ${promptRaw}. ` +
      `High-end optical store quality, sharp focus on the frames, ` +
      `studio lighting, commercial photography style, photorealistic, 8k resolution.`;

    outForm.append('prompt', enrichedPrompt);
    outForm.append('negative_prompt', NEGATIVE_PROMPT);
    outForm.append('output_format', 'jpeg');
    outForm.append('aspect_ratio', ratio);

    // Image optionnelle (image-to-image)
    if (fields.image) {
      const imgBlob = new Blob([fields.image.data], { type: fields.image.mime || 'image/jpeg' });
      outForm.append('image', imgBlob, fields.image.filename || 'frame.jpg');
      outForm.append('strength', '0.75');
    }

    // — Appel Stability AI (serveur → serveur, pas de CORS)
    const stabilityRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        // NE PAS ajouter Content-Type : fetch le définit automatiquement avec boundary
      },
      body: outForm,
    });

    if (!stabilityRes.ok) {
      const errBody = await stabilityRes.json().catch(() => ({}));
      const detail =
        errBody?.errors?.[0] || errBody?.message || `HTTP ${stabilityRes.status}`;
      console.error('[OptiShot] Stability AI error:', detail);
      return res.status(stabilityRes.status).json({ error: detail });
    }

    const data = await stabilityRes.json();

    if (data.finish_reason && data.finish_reason !== 'SUCCESS') {
      return res
        .status(422)
        .json({ error: `Génération interrompue par l'IA (${data.finish_reason}).` });
    }

    return res.status(200).json({ image: data.image });

  } catch (err) {
    console.error('[OptiShot] Erreur interne:', err);
    return res.status(500).json({ error: 'Erreur serveur inattendue. Réessayez.' });
  }
}

/**
 * Parser multipart minimal.
 * Retourne un objet { fieldName: { value?, data?, mime?, filename? } }
 */
function parseMultipart(buffer, boundary) {
  const sep = Buffer.from(`--${boundary}`);
  const results = {};
  const parts = splitBuffer(buffer, sep);

  for (const part of parts) {
    if (part.length < 4) continue;

    // Séparer headers et body (double CRLF)
    const crlf2 = Buffer.from('\r\n\r\n');
    const idx = indexOf(part, crlf2);
    if (idx === -1) continue;

    const headersBuf = part.slice(0, idx).toString('utf8');
    const body = part.slice(idx + 4);

    // Retirer le CRLF final
    const bodyTrimmed = body.slice(-2).equals(Buffer.from('\r\n'))
      ? body.slice(0, -2)
      : body;

    // Parser Content-Disposition
    const dispMatch = headersBuf.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
    if (!dispMatch) continue;
    const name = dispMatch[1];

    const filenameMatch = headersBuf.match(/filename="([^"]+)"/i);
    const ctMatch = headersBuf.match(/Content-Type:\s*([^\r\n]+)/i);

    if (filenameMatch) {
      results[name] = {
        data: bodyTrimmed,
        filename: filenameMatch[1],
        mime: ctMatch ? ctMatch[1].trim() : 'application/octet-stream',
      };
    } else {
      results[name] = { value: bodyTrimmed.toString('utf8') };
    }
  }

  return results;
}

function splitBuffer(buf, sep) {
  const parts = [];
  let start = 0;
  let pos;
  while ((pos = indexOf(buf, sep, start)) !== -1) {
    parts.push(buf.slice(start, pos));
    start = pos + sep.length;
    // Sauter le CRLF après le boundary
    if (buf[start] === 13 && buf[start + 1] === 10) start += 2;
  }
  parts.push(buf.slice(start));
  return parts.filter((p) => p.length > 0);
}

function indexOf(buf, search, offset = 0) {
  for (let i = offset; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}
