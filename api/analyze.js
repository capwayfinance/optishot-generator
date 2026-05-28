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

// 20 univers cinématiques haute couture — vocabulaire commercial luxury
const UNIVERSES = [
  // Studio premium
  'placed on a pure white Carrara marble slab, lit by a single large softbox creating a razor-thin shadow, clinical luxury product photography, white infinity backdrop, ambient light filling every surface detail',

  // Paris / Editorial
  'elegantly resting on a weathered Haussmann limestone balcony railing, soft golden-hour bokeh revealing the Eiffel Tower at sunset in the far background, warm Parisian amber light, natural reflections on the lenses, high-end fashion editorial',

  // Sombre / Luxe dramatique
  'on a polished absolute black granite surface, single dramatic overhead spotlight creating a perfectly shaped reflection beneath the frames, deep black infinity background, luxury watch advertisement style, razor-sharp details',

  // Nature japonaise
  'placed on a smooth grey river stone surrounded by raked white Zen garden sand, delicate early morning mist, soft diffused Japanese light, serene and minimal, luxury lifestyle editorial, ultra-shallow depth of field',

  // Méditerranée
  'resting on sun-bleached white travertine stone, warm Mediterranean afternoon light, blurred turquoise sea bokeh in the background, Positano cliffside luxury hotel atmosphere, natural reflections shimmering on lenses',

  // Urbain nocturne
  'on rain-wet black asphalt in an empty Paris street at night, bokeh of warm amber streetlights and blurred neon reflections, moody cinematic atmosphere, editorial fashion photography, dramatic shadows',

  // Nordique glacier
  'on translucent ancient blue ice, cold crisp Arctic light, extreme clarity and precision, micro ice crystal textures visible, clean white sky, luxury Scandinavian editorial, hyper-detailed',

  // Bois et cuir
  'on a hand-stitched full-grain saddle leather surface, warm directional studio light revealing every texture and grain, rich chestnut tones, artisan heritage luxury, close-up product editorial',

  // Palais / Baroque
  'on aged gilded gold leaf baroque picture frame moulding, warm soft candlelight, Louvre Museum atmosphere, Renaissance luxury aesthetic, painterly bokeh of ornate architecture, deep warm shadows',

  // High-tech futuriste
  'floating on a transparent acrylic shelf above a softly glowing electric blue LED panel, sleek futuristic tech-luxury product editorial, cool blue-white tones, sharp reflections, Apple-launch-event aesthetic',

  // Désert minéral
  'on smooth terracotta-colored desert sandstone, dramatic raking side light revealing micro surface textures, deep Moroccan blue sky in background, raw mineral luxury, National Geographic editorial quality',

  // Loft new-yorkais
  'on weathered reclaimed oak flooring, New York loft atmosphere, large industrial steel window casting dramatic grid shadows, warm morning sunlight from the side, Brooklyn art studio editorial',

  // Floral japonais
  'surrounded by fresh-cut magnolia blossoms on pale grey Japanese washi paper, soft diffused window light, delicate pink and white petals slightly out of focus, luxury cosmetics campaign aesthetic, ultra-clean',

  // Velours de nuit
  'on deep forest-green velvet fabric, a single focused narrow-beam spotlight illuminating the frames from above-left, jewellery-boutique display aesthetic, rich shadow gradients, Hermès flagship store atmosphere',

  // Côte Amalfitaine
  'on a glazed handmade Italian ceramic tile in cobalt and white, warm Capri sunlight, blurred lemon grove and blue Mediterranean sea bokeh in background, artisan Italian luxury, summer editorial',

  // Studio cinéma
  'on a dark walnut director clapperboard surface, warm tungsten film studio lights, Cinema Paradiso atmosphere, golden tones, bokeh of soft studio equipment, timeless cinematic luxury editorial',

  // Montagne cristal
  'on frost-covered dark schist mountain rock, pure Alpine air light, Mont Blanc glacier blurred in the background, crisp cold shadows, outdoor luxury brand campaign, ultra-sharp frame details',

  // Concept store
  'on a minimalist poured concrete shelf in a Marais Paris concept store, diffused north-facing window light, architectural shadows, clean Brutalist-chic aesthetic, Merci or Centre Pompidou editorial',

  // Nuit étoilée
  'on polished obsidian stone under a clear night sky, long-exposure stars softly visible above, moonlight as the only light source, ethereal and dreamlike, luxury watch brand campaign atmosphere',

  // Bain de lumière
  'backlit by a single window with sheer white linen curtains, morning light diffused to pure luminous white, frame silhouette crisp and glowing, ultra-minimal Scandinavian interior, peaceful luxury editorial',
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

    const instruction = `You are a world-class luxury eyewear art director and Flux AI image prompt engineer. Your prompts have been used in campaigns for Oliver Peoples, Cartier, and Lindberg.

You receive ${imageParts.length} photo(s) of eyeglass frames. There may be hands visible — ignore them entirely. Focus only on the glasses.

STEP 1 — Analyze the frames with extreme precision:
- Frame shape: round / oval / square / rectangular / cat-eye / aviator / browline / geometric
- Frame color: be hyper-specific (e.g. "deep translucent tortoiseshell with amber-honey and dark brown swirls", "brushed rose-gold titanium", "matte jet-black acetate")
- Frame material: acetate / metal / titanium / mixed / TR-90
- Lens: clear / lightly tinted (what color?) / mirrored / gradient / photochromic
- Lens shape: describe precisely
- Temple and bridge details: any distinctive features
- Overall style personality: minimalist / bold / retro / sporty / avant-garde / classic luxury

STEP 2 — Write 3 Flux Dev image generation prompts in English.
Each prompt must use a completely different visual universe:

Universe 1: ${pickedUniverses[0]}

Universe 2: ${pickedUniverses[1]}

Universe 3: ${pickedUniverses[2]}

Each English prompt MUST:
1. Open with: "High-end luxury commercial product photography of [exact frame description from Step 1],"
2. Describe the exact scene from the universe above
3. Include: specific light source and quality, surface material and texture, depth of field treatment
4. End with: "lenses treated as semi-transparent with natural reflections, no hands, no people, isolated eyewear product, photorealistic, 8K resolution, commercial advertisement quality"
5. Be between 60-90 words
6. Sound like a brief from a luxury creative director to a photographer

STEP 3 — Write a "frame_description" IN FRENCH, 1 sentence, poetic and precise (like a luxury boutique product description).

Return ONLY valid JSON, no markdown backticks, no explanation:
{
  "frame_description": "Montures rondes en acétate écaille de tortue aux reflets miel et brun profond...",
  "suggestions": [
    {"fr": "Marbre blanc, lumière rasante", "en": "High-end luxury commercial product photography of [frames]..."},
    {"fr": "Balcon parisien, coucher de soleil", "en": "High-end luxury commercial product photography of [frames]..."},
    {"fr": "Granit noir, spotlight dramatique", "en": "High-end luxury commercial product photography of [frames]..."}
  ]
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
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [...imageParts, { type: 'text', text: instruction }],
        }],
        max_tokens:  1200,
        temperature: 0.85,
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
    const parsed = JSON.parse(jsonMatch[0]);

    // Supporte les deux formats : suggestions [{fr,en}] ou prompts [string]
    let suggestions = [];
    if (parsed.suggestions?.length) {
      suggestions = parsed.suggestions.slice(0, 3);
    } else if (parsed.prompts?.length) {
      suggestions = parsed.prompts.slice(0, 3).map((p, i) => ({
        fr: ['Ambiance studio', 'Décor luxueux', 'Atmosphère naturelle'][i],
        en: p,
      }));
    }

    if (!suggestions.length) throw new Error('Aucune suggestion générée.');

    console.log('[analyze] OK:', parsed.frame_description);
    return res.status(200).json({
      suggestions,
      frame_description: parsed.frame_description || '',
    });

  } catch (err) {
    console.error('[analyze] error:', err.message);
    const pickedUniverses = pickRandom(UNIVERSES, 3);
    const frLabels = ['Studio minimaliste', 'Ambiance luxe', 'Lumière naturelle'];
    return res.status(200).json({
      suggestions: pickedUniverses.map((u, i) => ({
        fr: frLabels[i],
        en: `Luxury eyeglasses, ${u}, tack sharp focus, no hands, no people, photorealistic, 8k`,
      })),
      warning: err.message,
    });
  }
};
