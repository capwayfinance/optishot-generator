// Stratégie :
// - Avec image → fal-ai/bria/background/replace (garde le sujet, change le fond)
// - Sans image → fal-ai/flux/dev (génération depuis texte)

const FAL_BG_REPLACE = 'https://fal.run/fal-ai/bria/background/replace';
const FAL_TXT2IMG    = 'https://fal.run/fal-ai/flux/dev';

const SIZE_MAP = {
  '1:1':  { width: 1024, height: 1024 },
  '4:5':  { width: 816,  height: 1024 },
  '16:9': { width: 1024, height: 576  },
  '9:16': { width: 576,  height: 1024 },
};

// Prompts de fond selon l'ambiance
const BG_PROMPTS = {
  studio: 'clean professional white studio background, soft even lighting, subtle shadow beneath the glasses, minimal product photography',
  nature: 'warm golden hour sunlight, lush green bokeh background, natural stone surface, outdoor lifestyle photography',
  luxe:   'dark polished marble surface, dramatic side lighting, black luxury background, editorial high-end photography',
  urbain: 'urban concrete surface, cool moody city light, architectural minimalist background, street photography',
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
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

  const headers = {
    Authorization: `Key ${falKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const contentType = req.headers['content-type'] || '';
    let promptRaw = '';
    let style = 'studio';
    let ratio = '1:1';
    let imageBase64 = null;
    let imageMime = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const rawBody = await getRawBody(req);
      const boundary = contentType.split('boundary=')[1]?.split(';')[0]?.trim();
      if (!boundary) return res.status(400).json({ error: 'Boundary manquant.' });
      const fields = parseMultipart(rawBody, boundary);
      promptRaw = fields.prompt?.value || '';
      style     = fields.style?.value  || 'studio';
      ratio     = fields.ratio?.value  || '1:1';
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

    if (!promptRaw.trim() && !imageBase64) {
      return res.status(400).json({ error: 'Prompt ou image requis.' });
    }

    let falRes, data, imageUrl;

    if (imageBase64) {
      // ── MODE BACKGROUND REPLACE ────────────────────────────
      // Garde exactement les lunettes, remplace uniquement le fond
      const bgPrompt = BG_PROMPTS[style] || BG_PROMPTS.studio;
      const finalBgPrompt = promptRaw
        ? `${promptRaw}, ${bgPrompt}`
        : bgPrompt;

      const imageDataUrl = `data:${imageMime};base64,${imageBase64}`;

      console.log('[generate] mode: background-replace, style:', style);

      falRes = await fetch(FAL_BG_REPLACE, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_url:        imageDataUrl,
          prompt:           finalBgPrompt,
          negative_prompt:  'blurry, low quality, distorted, overexposed, text, watermark',
          num_images:       1,
          sync_mode:        true,
        }),
      });

    } else {
      // ── MODE TXT2IMG ────────────────────────────────────────
      const fullPrompt = [
        promptRaw.trim(),
        'luxury eyeglasses',
        'tack sharp focus on frames',
        'professional commercial product photography',
        'no people, no hands, no text, no watermark',
        'photorealistic',
      ].join(', ');

      console.log('[generate] mode: txt2img');

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

    data = await falRes.json();

    // bria retourne images[0].url OU image.url selon la version
    imageUrl = data?.images?.[0]?.url || data?.image?.url;

    if (!imageUrl) {
      console.error('[generate] no image url in response:', JSON.stringify(data).slice(0, 400));
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
