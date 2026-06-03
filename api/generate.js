// generate.js v5 — Imagen 4 (Google) remplace Flux Dev
// Pipeline avec image :  birefnet (fal.ai) → Imagen 4 génère le fond → composite (fal.ai)
// Pipeline sans image :  Imagen 4 génère directement

const FAL_BIREFNET  = 'https://fal.run/fal-ai/birefnet';
const FAL_COMPOSITE = 'https://fal.run/fal-ai/imageutils/composite';
const IMAGEN_URL    = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages';

// Aspect ratios supportés par Imagen 4
const RATIO_MAP = {
  '1:1':  'ASPECT_RATIO_1_1',
  '4:5':  'ASPECT_RATIO_3_4',   // Imagen n'a pas 4:5 — 3:4 est le plus proche
  '9:16': 'ASPECT_RATIO_9_16',
  '16:9': 'ASPECT_RATIO_16_9',
};

const BG_PROMPTS = {
  studio: 'professional white studio background, soft even lighting, subtle shadow beneath the glasses, clean minimal product photography',
  nature: 'warm golden hour sunlight outdoors, natural stone surface, lush green botanical bokeh background, lifestyle luxury',
  luxe:   'dark polished marble surface, dramatic directional side light, luxury editorial, deep contrast, high-end boutique',
  urbain: 'matte concrete surface, cool moody directional urban light, minimalist city background, architectural',
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function indexOf(buf, search, offset = 0) {
  for (let i = offset; i <= buf.length - search.length; i++) {
    let ok = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i+j] !== search[j]) { ok = false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

function parseMultipart(buffer, boundary) {
  const sep = Buffer.from('--' + boundary);
  const results = {};
  let start = 0, pos;
  const parts = [];
  while ((pos = indexOf(buffer, sep, start)) !== -1) {
    parts.push(buffer.slice(start, pos));
    start = pos + sep.length;
    if (buffer[start] === 13 && buffer[start+1] === 10) start += 2;
  }
  parts.push(buffer.slice(start));
  for (const part of parts.filter(p => p.length > 4)) {
    const idx = indexOf(part, Buffer.from('\r\n\r\n'));
    if (idx === -1) continue;
    const headers = part.slice(0, idx).toString('utf8');
    let body = part.slice(idx + 4);
    if (body.slice(-2).equals(Buffer.from('\r\n'))) body = body.slice(0, -2);
    const nameMatch = headers.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const filenameMatch = headers.match(/filename="([^"]+)"/i);
    const ctMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    if (filenameMatch) {
      results[name] = { data: body, mime: ctMatch ? ctMatch[1].trim() : 'image/jpeg' };
    } else {
      results[name] = { value: body.toString('utf8') };
    }
  }
  return results;
}

async function fetchFal(url, body, falKey) {
  return fetch(url, {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
}

async function urlToBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch image failed: ${r.status}`);
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

// ── Gemini 2.5 Flash Image (Nano Banana) — 500 images/jour gratuit ──
async function generateWithImagen(prompt, ratio, geminiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini image HTTP ${res.status}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) throw new Error('Gemini image : aucune image retournée.');
  return imagePart.inlineData.data; // base64
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const falKey    = process.env.FAL_KEY;
  const geminiKey = process.env.GEMINI_KEY;

  if (!geminiKey) return res.status(500).json({ error: 'GEMINI_KEY manquante sur Vercel.' });

  try {
    const ct = req.headers['content-type'] || '';
    let promptRaw = '', style = 'studio', ratio = '1:1';
    let imageBase64 = null, imageMime = 'image/jpeg';

    if (ct.includes('multipart/form-data')) {
      const rawBody  = await getRawBody(req);
      const boundary = ct.split('boundary=')[1]?.split(';')[0]?.trim();
      if (!boundary) return res.status(400).json({ error: 'Boundary manquant.' });
      const fields = parseMultipart(rawBody, boundary);
      promptRaw    = fields.prompt?.value || '';
      style        = fields.style?.value  || 'studio';
      ratio        = fields.ratio?.value  || '1:1';
      if (fields.image) {
        imageBase64 = fields.image.data.toString('base64');
        imageMime   = fields.image.mime || 'image/jpeg';
      }
    } else {
      const raw = await getRawBody(req);
      const payload = raw.length ? JSON.parse(raw.toString('utf8')) : {};
      promptRaw = (payload.prompt || '').toString().trim();
      ratio     = payload.ratio || '1:1';
    }

    const bgBase = BG_PROMPTS[style] || BG_PROMPTS.studio;

    // ══════════════════════════════════════════════════
    // SANS IMAGE → Imagen 4 génère directement
    // ══════════════════════════════════════════════════
    if (!imageBase64) {
      const fullPrompt = promptRaw
        ? `${promptRaw}, ${bgBase}, luxury eyeglasses product photography, no people, no hands, photorealistic, 8k`
        : `luxury eyeglasses, ${bgBase}, no people, no hands, photorealistic, 8k`;

      console.log('[generate] Imagen 4 txt2img');
      const base64 = await generateWithImagen(fullPrompt, ratio, geminiKey);
      return res.status(200).json({ image: base64 });
    }

    // ══════════════════════════════════════════════════
    // AVEC IMAGE → Pipeline 3 étapes
    // ══════════════════════════════════════════════════
    const imageDataUrl = `data:${imageMime};base64,${imageBase64}`;

    // Étape 1 : birefnet — découpe les lunettes proprement
    let glassesUrl = null;
    if (falKey) {
      console.log('[generate] Step 1: birefnet');
      try {
        const brRes = await fetchFal(FAL_BIREFNET, {
          image_url: imageDataUrl,
          model: 'General Use (Light)',
          output_format: 'png',
        }, falKey);
        if (brRes.ok) {
          const brData = await brRes.json();
          glassesUrl = brData?.image?.url || brData?.images?.[0]?.url;
        }
      } catch(e) {
        console.warn('[generate] birefnet failed:', e.message);
      }
    }

    // Étape 2 : Imagen 4 génère le fond
    const bgPrompt = promptRaw
      ? `${promptRaw}, ${bgBase}, no glasses, empty scene, product photography background, photorealistic, 8k`
      : `${bgBase}, no glasses, empty scene, product photography background, photorealistic, 8k`;

    console.log('[generate] Step 2: Imagen 4 background');
    const bgBase64 = await generateWithImagen(bgPrompt, ratio, geminiKey);
    const bgDataUrl = `data:image/png;base64,${bgBase64}`;

    // Étape 3 : composite lunettes sur le fond Imagen 4
    if (glassesUrl && falKey) {
      console.log('[generate] Step 3: composite');
      try {
        const compRes = await fetchFal(FAL_COMPOSITE, {
          background_image_url: bgDataUrl,
          foreground_image_url: glassesUrl,
          position: 'center',
          scale: 0.7,
          sync_mode: true,
        }, falKey);

        if (compRes.ok) {
          const compData = await compRes.json();
          const finalUrl = compData?.image?.url || compData?.images?.[0]?.url;
          if (finalUrl) {
            console.log('[generate] composite OK');
            const base64 = await urlToBase64(finalUrl);
            return res.status(200).json({ image: base64 });
          }
        }
      } catch(e) {
        console.warn('[generate] composite failed:', e.message);
      }
    }

    // Fallback : retourner le fond Imagen 4 directement
    console.log('[generate] fallback: Imagen 4 bg only');
    return res.status(200).json({ image: bgBase64 });

  } catch (err) {
    console.error('[generate] error:', err.message);
    return res.status(500).json({ error: err.message.slice(0, 300) });
  }
};
