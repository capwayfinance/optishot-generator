// analyze.js v3 — multi-photos + 3 suggestions de prompts
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const STYLE_CONTEXT = {
  studio: 'professional white studio background, even soft-box lighting, clean product shot',
  nature: 'warm golden hour sunlight, natural stone surface, green botanical bokeh background',
  luxe:   'dark polished marble, dramatic side lighting, luxury editorial black background',
  urbain: 'matte concrete surface, cool moody city light, minimalist urban background',
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
  const results = [];   // tableau pour accepter plusieurs "image"
  const fields = {};
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
      results.push({ field: name, data: body, mime: ctMatch ? ctMatch[1].trim() : 'image/jpeg' });
    } else {
      fields[name] = body.toString('utf8');
    }
  }
  return { images: results.filter(r => r.field === 'images[]' || r.field === 'image'), fields };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rawBody = await getRawBody(req);
    const ct = req.headers['content-type'] || '';
    const boundary = ct.split('boundary=')[1]?.split(';')[0]?.trim();
    if (!boundary) return res.status(400).json({ error: 'Multipart manquant.' });

    const { images, fields } = parseMultipart(rawBody, boundary);
    const style = fields.style || 'studio';
    const ctx   = STYLE_CONTEXT[style] || STYLE_CONTEXT.studio;

    const fallbackPrompts = [
      `Luxury eyeglasses isolated on ${ctx}, tack sharp focus on frames, photorealistic, 8k`,
      `Eyeglasses product shot, ${ctx}, dramatic lighting, ultra detailed, commercial photography`,
      `Premium glasses, ${ctx}, shallow depth of field, high-end editorial style, 8k`,
    ];

    if (!images.length) return res.status(200).json({ prompts: fallbackPrompts });

    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) return res.status(200).json({ prompts: fallbackPrompts, warning: 'OPENROUTER_KEY manquante.' });

    // Construire les parties image pour Gemini (max 4 photos)
    const imageParts = images.slice(0, 4).map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mime};base64,${img.data.toString('base64')}` },
    }));

    const instruction = `You are a luxury eyewear product photographer and Flux AI prompt engineer.
You receive ${imageParts.length} photo(s) of the same eyeglass frame taken by an optician with their phone. Hands may be visible — ignore them and focus only on the glasses.

Analyze: frame shape, rim color, material (acetate/metal/titanium), lens tint, any distinctive details.

Generate exactly 3 different Flux Dev image generation prompts. Each prompt = different mood/style.
Photography setting for all: ${ctx}

Format your response as JSON only, no other text:
{
  "frame_description": "brief description of the glasses in French",
  "prompts": [
    "prompt 1 in English, under 60 words",
    "prompt 2 in English, under 60 words",
    "prompt 3 in English, under 60 words"
  ]
}

Each prompt must describe the EXACT frame (shape, color, material) + the photography setting + lighting + surface + depth of field.
NO hands. NO people. Product photography only.`;

    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://optishot-generator.vercel.app',
        'X-Title':      'OptiShot Generateur',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: [
            ...imageParts,
            { type: 'text', text: instruction },
          ],
        }],
        max_tokens:  600,
        temperature: 0.4,
      }),
    });

    if (!orRes.ok) {
      const errData = await orRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `OpenRouter HTTP ${orRes.status}`);
    }

    const data    = await orRes.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Réponse Gemini vide.');

    // Parser le JSON retourné par Gemini
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Format JSON invalide.');
    const parsed = JSON.parse(jsonMatch[0]);

    const prompts = parsed.prompts?.slice(0, 3);
    if (!prompts?.length) throw new Error('Aucun prompt généré.');

    console.log('[analyze] OK —', parsed.frame_description);
    return res.status(200).json({
      prompts,
      frame_description: parsed.frame_description || '',
    });

  } catch (err) {
    console.error('[analyze] error:', err.message);
    const ctx = STYLE_CONTEXT.studio;
    return res.status(200).json({
      prompts: [
        `Luxury eyeglasses on ${ctx}, tack sharp focus, photorealistic, 8k`,
        `Premium glasses product shot, ${ctx}, dramatic lighting, commercial photography`,
        `Eyeglasses editorial, ${ctx}, shallow depth of field, high-end style`,
      ],
      warning: err.message,
    });
  }
};
