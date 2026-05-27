const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
      if (buf[i+j] !== search[j]) { ok=false; break; }
    }
    if (ok) return i;
  }
  return -1;
}

function parseMultipart(buffer, boundary) {
  const sep = Buffer.from('--' + boundary);
  const images = [], fields = {};
  let start = 0, pos;
  const parts = [];
  while ((pos = indexOf(buffer, sep, start)) !== -1) {
    parts.push(buffer.slice(start, pos));
    start = pos + sep.length;
    if (buffer[start]===13 && buffer[start+1]===10) start += 2;
  }
  parts.push(buffer.slice(start));
  for (const part of parts.filter(p => p.length > 4)) {
    const idx = indexOf(part, Buffer.from('\r\n\r\n'));
    if (idx === -1) continue;
    const headers = part.slice(0, idx).toString('utf8');
    let body = part.slice(idx + 4);
    if (body.slice(-2).equals(Buffer.from('\r\n'))) body = body.slice(0,-2);
    const nameMatch = headers.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const filenameMatch = headers.match(/filename="([^"]+)"/i);
    const ctMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    if (filenameMatch) {
      images.push({ data: body, mime: ctMatch ? ctMatch[1].trim() : 'image/jpeg' });
    } else {
      fields[name] = body.toString('utf8');
    }
  }
  return { images, fields };
}

// Univers créatifs pour forcer la diversité
const UNIVERSES = [
  'minimalist Japanese zen garden, raked white sand, single stone, morning mist, extreme close-up',
  'brutalist concrete architecture, harsh industrial light, raw texture, geometric shadows',
  'luxury Parisian perfume counter, velvet surface, warm amber light, editorial close-up',
  'Scandinavian winter light, frosted glass surface, pale grey background, ultra clean',
  'old Italian marble table, warm afternoon sun, Mediterranean atmosphere, artisan quality',
  'dark volcanic black sand, dramatic ocean light, moody atmospheric, editorial fashion',
  'golden wheat field at magic hour, soft bokeh, warm harvest light, organic luxury',
  'stealth black matte surface, dark studio, single overhead spotlight, dramatic shadow',
  'translucent acrylic floating, electric blue backlight, futuristic tech editorial',
  'antique oak wood desk, candle warm light, literary study atmosphere, heritage luxury',
  'rain-wet urban sidewalk, city neon reflections, night photography, moody street style',
  'white marble quarry, natural stone texture, pale sunlight, architectural minimalism',
  'tropical palm leaf shadow, warm golden sun filter, resort luxury, lifestyle editorial',
  'industrial copper pipes, warehouse light, New York loft atmosphere, urban premium',
  'frozen ice crystal surface, cold blue light, Nordic editorial, hyper detailed',
];

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rawBody  = await getRawBody(req);
    const ct       = req.headers['content-type'] || '';
    const boundary = ct.split('boundary=')[1]?.split(';')[0]?.trim();
    if (!boundary) return res.status(400).json({ error: 'Multipart manquant.' });

    const { images, fields } = parseMultipart(rawBody, boundary);

    // Choisir 3 univers aléatoires différents à chaque appel
    const pickedUniverses = pickRandom(UNIVERSES, 3);

    const fallbackPrompts = pickedUniverses.map(u =>
      `Luxury eyeglasses isolated, ${u}, tack sharp focus on frames, no hands, no people, photorealistic, 8k`
    );

    if (!images.length) return res.status(200).json({ prompts: fallbackPrompts });

    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) return res.status(200).json({ prompts: fallbackPrompts, warning: 'OPENROUTER_KEY manquante.' });

    const imageParts = images.slice(0, 4).map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mime};base64,${img.data.toString('base64')}` },
    }));

    const instruction = `You are a world-class luxury eyewear photographer and creative director.

Analyze the glasses in the photo(s). There may be hands — ignore them completely.

Identify precisely:
- Frame shape (round/oval/square/rectangular/cat-eye/aviator/browline)
- Color (be very specific: tortoiseshell amber-brown, matte black, transparent crystal, rose gold metal...)
- Material (acetate / metal / titanium)
- Lens (clear / tinted / mirrored / gradient)

Then write 3 Flux Dev image generation prompts. Each prompt MUST use a completely different visual universe from the list below. Each one should feel like a totally different photo shoot.

Universe for prompt 1: ${pickedUniverses[0]}
Universe for prompt 2: ${pickedUniverses[1]}
Universe for prompt 3: ${pickedUniverses[2]}

Rules for each prompt:
- Start with the exact glasses description
- Add the universe/setting
- Add specific lighting and atmosphere
- End with: "isolated product, no hands, no people, photorealistic, 8k"
- Max 70 words
- Must feel COMPLETELY DIFFERENT from the others

Also write a short frame description IN FRENCH (1 sentence max).

Return ONLY valid JSON:
{
  "frame_description": "Montures rondes en acétate écaille de tortue...",
  "prompts": ["prompt 1", "prompt 2", "prompt 3"]
}`;

    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://optishot-generator.vercel.app',
        'X-Title':      'OptiShot',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{
          role: 'user',
          content: [...imageParts, { type: 'text', text: instruction }],
        }],
        max_tokens:  900,
        temperature: 0.9,
      }),
    });

    if (!orRes.ok) {
      const errData = await orRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `OpenRouter HTTP ${orRes.status}`);
    }

    const data    = await orRes.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Réponse Gemini vide.');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON invalide.');
    const parsed  = JSON.parse(jsonMatch[0]);
    const prompts = (parsed.prompts || []).slice(0, 3);
    if (!prompts.length) throw new Error('Aucun prompt.');

    console.log('[analyze] OK:', parsed.frame_description);
    return res.status(200).json({
      prompts,
      frame_description: parsed.frame_description || '',
    });

  } catch (err) {
    console.error('[analyze] error:', err.message);
    const pickedUniverses = pickRandom(UNIVERSES, 3);
    return res.status(200).json({
      prompts: pickedUniverses.map(u =>
        `Luxury eyeglasses, ${u}, tack sharp focus, no hands, no people, photorealistic, 8k`
      ),
      warning: err.message,
    });
  }
};
