const FAL_BASE = 'https://fal.run/fal-ai/flux/dev';

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

async function readPayload(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) return JSON.parse(req.body);
  const raw = await getRawBody(req);
  return raw && raw.length ? JSON.parse(raw.toString('utf8')) : {};
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
    const payload = await readPayload(req);
    const promptRaw = (payload.prompt || '').toString().trim();
    const ratio = payload.ratio || '1:1';
    if (!promptRaw) return res.status(400).json({ error: 'Prompt requis.' });

    const finalPrompt = [
      promptRaw,
      'professional commercial product photography',
      'ultra sharp focus',
      'no people, no hands, no text, no watermark',
      'photorealistic',
    ].join(', ');

    const falRes = await fetch(FAL_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        image_size: SIZE_MAP[ratio] || SIZE_MAP['1:1'],
        num_images: 1,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        output_format: 'jpeg',
        enable_safety_checker: false,
        seed: Math.floor(Math.random() * 9999999),
      }),
    });

    if (!falRes.ok) {
      const errData = await falRes.json().catch(() => ({}));
      const msg = errData?.detail?.[0]?.msg || errData?.detail || errData?.message || `HTTP ${falRes.status}`;
      console.error('[generate] fal.ai error:', msg);
      return res.status(falRes.status).json({ error: String(msg).slice(0, 300) });
    }

    const data = await falRes.json();
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
      console.error('[generate] no image in response:', JSON.stringify(data).slice(0, 300));
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
