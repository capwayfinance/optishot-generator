// Mode intelligent :
// - Si une image est fournie → img2img (garde les lunettes, change le décor)
// - Sinon → txt2img (génération depuis le texte)

const FAL_TXT2IMG = 'https://fal.run/fal-ai/flux/dev';
const FAL_IMG2IMG = 'https://fal.run/fal-ai/flux/dev/image-to-image';

const SIZE_MAP = {
  '1:1':  { width: 1024, height: 1024 },
  '4:5':  { width: 816,  height: 1024 },
  '16:9': { width: 1024, height: 576  },
  '9:16': { width: 576,  height: 1024 },
};

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

function parseMultipart(buffer, boundary) {
  const sep = Buffer.from('--' + boundary);
  const results = {};
  let start = 0, pos;
  const parts = [];
  while ((pos = indexOf(buffer, sep, start)) !== -1) {
    parts.push(buffer.slice(start, pos));
    start = pos + sep.length;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
  }
  parts.push(buffer.slice(start));
  for (const part of parts.filter((p) => p.length > 4)) {
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
      results[name] = { data: body, filename: filenameMatch[1], mime: ctMatch ? ctMatch[1].trim() : 'image/jpeg' };
    } else {
      results[name] = { value: body.toString('utf8') };
    }
  }
  return results;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const falKey = process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY manquante sur Vercel.' });

  try {
    const contentType = req.headers['content-type'] || '';
    let promptRaw = '';
    let ratio = '1:1';
    let imageBase64 = null;
    let imageMime = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      // Reçoit image + prompt + ratio
      const rawBody = await getRawBody(req);
      const boundary = contentType.split('boundary=')[1]?.split(';')[0]?.trim();
      if (!boundary) return res.status(400).json({ error: 'Boundary manquant.' });
      const fields = parseMultipart(rawBody, boundary);
      promptRaw = fields.prompt?.value || '';
      ratio = fields.ratio?.value || '1:1';
      if (fields.image) {
        imageBase64 = fields.image.data.toString('base64');
        imageMime = fields.image.mime || 'image/jpeg';
      }
    } else {
      // JSON legacy (sans image)
      const raw = await getRawBody(req);
      const payload = raw.length ? JSON.parse(raw.toString('utf8')) : {};
      promptRaw = (payload.prompt || '').toString().trim();
      ratio = payload.ratio || '1:1';
    }

    if (!promptRaw.trim()) return res.status(400).json({ error: 'Prompt requis.' });

    const headers = {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    let falRes;

    if (imageBase64) {
      // ── MODE IMG2IMG : garde les vraies lunettes, change le décor ──
      const backgroundPrompt = [
        promptRaw.trim(),
        'keep the exact same eyeglass frames',
        'same glasses shape color and material',
        'only change the background and lighting',
        'product photography',
        'tack sharp focus on frames',
        'photorealistic',
      ].join(', ');

      const imageDataUrl = `data:${imageMime};base64,${imageBase64}`;

      falRes = await fetch(FAL_IMG2IMG, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_url:             imageDataUrl,
          prompt:                backgroundPrompt,
          strength:              0.55,   // 0 = image identique, 1 = tout regénéré
          num_inference_steps:   40,
          guidance_scale:        7.0,
          output_format:         'jpeg',
          enable_safety_checker: false,
          seed:                  Math.floor(Math.random() * 9999999),
        }),
      });

    } else {
      // ── MODE TXT2IMG : pas d'image fournie ──
      const fullPrompt = [
        promptRaw.trim(),
        'luxury eyeglasses',
        'tack sharp focus on frames',
        'professional commercial product photography',
        'no people, no hands, no text, no watermark',
        'photorealistic',
      ].join(', ');

      falRes = await fetch(FAL_TXT2IMG, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt:                fullPrompt,
          image_size:            SIZE_MAP[ratio] || SIZE_MAP['1:1'],
          num_images:            1,
          num_inference_steps:   50,
          guidance_scale:        7.5,
          output_format:         'jpeg',
          enable_safety_checker: false,
          seed:                  Math.floor(Math.random() * 9999999),
        }),
      });
    }

    if (!falRes.ok) {
      const errData = await falRes.json().catch(() => ({}));
      const msg = errData?.detail?.[0]?.msg || errData?.detail || errData?.message || `HTTP ${falRes.status}`;
      console.error('[generate] fal.ai error:', msg);
      return res.status(falRes.status).json({ error: String(msg).slice(0, 300) });
    }

    const data = await falRes.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
      console.error('[generate] no image:', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: "fal.ai n'a retourné aucune image." });
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return res.status(502).json({ error: `Récupération image échouée (HTTP ${imgRes.status}).` });
    const arrayBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({ image: base64 });

  } catch (err) {
    console.error('[generate] error:', err.message);
    return res.status(500).json({ error: err.message.slice(0, 300) });
  }
};
