const STABILITY_BASE = 'https://api.stability.ai/v2beta/stable-image/generate';

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
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

function splitBuffer(buf, sep) {
  const parts = [];
  let start = 0, pos;
  while ((pos = indexOf(buf, sep, start)) !== -1) {
    parts.push(buf.slice(start, pos));
    start = pos + sep.length;
    if (buf[start] === 13 && buf[start + 1] === 10) start += 2;
  }
  parts.push(buf.slice(start));
  return parts.filter(p => p.length > 0);
}

function parseMultipart(buffer, boundary) {
  const sep = Buffer.from(`--${boundary}`);
  const results = {};
  const parts = splitBuffer(buffer, sep);
  for (const part of parts) {
    if (part.length < 4) continue;
    const crlf2 = Buffer.from('\r\n\r\n');
    const idx = indexOf(part, crlf2);
    if (idx === -1) continue;
    const headersBuf = part.slice(0, idx).toString('utf8');
    const body = part.slice(idx + 4);
    const bodyTrimmed = body.slice(-2).equals(Buffer.from('\r\n')) ? body.slice(0, -2) : body;
    const dispMatch = headersBuf.match(/Content-Disposition:[^\r\n]*name="([^"]+)"/i);
    if (!dispMatch) continue;
    const name = dispMatch[1];
    const filenameMatch = headersBuf.match(/filename="([^"]+)"/i);
    const ctMatch = headersBuf.match(/Content-Type:\s*([^\r\n]+)/i);
    if (filenameMatch) {
      results[name] = { data: bodyTrimmed, filename: filenameMatch[1], mime: ctMatch ? ctMatch[1].trim() : 'image/jpeg' };
    } else {
      results[name] = { value: bodyTrimmed.toString('utf8') };
    }
  }
  return results;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-model, x-ratio');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante.' });

  try {
    const rawBody = await getRawBody(req);
    const contentType = req.headers['content-type'] || '';
    const model = (req.headers['x-model'] || 'core').replace(/[^a-z]/g, '');
    const ratio = req.headers['x-ratio'] || '1:1';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return res.status(400).json({ error: 'Multipart manquant.' });

    const fields = parseMultipart(rawBody, boundary);
    const promptRaw = fields.prompt?.value;
    if (!promptRaw) return res.status(400).json({ error: 'Prompt requis.' });

    const enriched = `Professional product photography of eyeglasses: ${promptRaw}. High-end optical quality, sharp focus on frames, studio lighting, commercial photography, photorealistic, 8k.`;

    const outForm = new FormData();
    outForm.append('prompt', enriched);
    outForm.append('negative_prompt', 'blurry, low quality, distorted, watermark, text, logo, cartoon');
    outForm.append('output_format', 'jpeg');
    outForm.append('aspect_ratio', ratio);
    if (fields.image) {
      const blob = new Blob([fields.image.data], { type: fields.image.mime });
      outForm.append('image', blob, fields.image.filename);
      outForm.append('strength', '0.75');
    }

    const stabilityRes = await fetch(`${STABILITY_BASE}/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      body: outForm,
    });

    if (!stabilityRes.ok) {
      const err = await stabilityRes.json().catch(() => ({}));
      return res.status(stabilityRes.status).json({ error: err?.errors?.[0] || err?.message || `HTTP ${stabilityRes.status}` });
    }

    const data = await stabilityRes.json();
    if (data.finish_reason && data.finish_reason !== 'SUCCESS') {
      return res.status(422).json({ error: `Génération interrompue (${data.finish_reason})` });
    }

    return res.status(200).json({ image: data.image });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
