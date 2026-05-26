// Essaie gemini-2.0-flash-exp (v1beta), fallback sur prompt générique
const GEMINI_MODELS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
];

const STYLE_CONTEXT = {
  studio: 'professional white studio background, even soft-box lighting, subtle drop shadow beneath the frames',
  nature: 'natural outdoor light, warm golden hour, stone or wood surface, soft botanical bokeh background',
  luxe:   'dark polished marble surface, dramatic directional side light, luxury editorial, deep contrast',
  urbain: 'matte concrete surface, cool directional urban light, architectural city background',
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

  try {
    const rawBody = await getRawBody(req);
    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1]?.split(';')[0]?.trim();
    if (!boundary) return res.status(400).json({ error: 'Multipart manquant.' });

    const fields = parseMultipart(rawBody, boundary);
    const style = fields.style?.value || 'studio';
    const ctx = STYLE_CONTEXT[style] || STYLE_CONTEXT.studio;
    const image = fields.image;

    const fallbackPrompt = `Luxury eyeglasses on ${ctx}, tack sharp focus on frame details, photorealistic, commercial product photography, 8k`;

    if (!image) return res.status(200).json({ prompt: fallbackPrompt });

    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) return res.status(200).json({ prompt: fallbackPrompt, warning: 'GEMINI_KEY manquante.' });

    const base64Image = image.data.toString('base64');
    const mimeType = image.mime || 'image/jpeg';

    const instruction = `You are a product photographer and Flux AI prompt engineer specializing in luxury eyewear.
Analyze this eyeglass frame and write a Flux Dev image generation prompt for a high-end product photo.
Photography setting: ${ctx}
Rules:
1. Identify frame shape (round/square/rectangular/cat-eye/aviator), color, material (acetate/metal/titanium)
2. Use the photography setting above
3. Add lighting, surface, depth of field
4. Under 60 words
5. Output ONLY the prompt text, nothing else`;

    // Essaie chaque modèle jusqu'à en trouver un qui marche
    let lastError = '';
    for (const url of GEMINI_MODELS) {
      try {
        const geminiRes = await fetch(`${url}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Image } },
                { text: instruction },
              ],
            }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
          }),
        });

        if (!geminiRes.ok) {
          const errData = await geminiRes.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${geminiRes.status}`;
          console.error('[analyze] model failed:', url, lastError);
          continue; // essaie le suivant
        }

        const data = await geminiRes.json();
        const prompt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!prompt) { lastError = 'Réponse vide'; continue; }

        console.log('[analyze] success with:', url);
        return res.status(200).json({ prompt });

      } catch (err) {
        lastError = err.message;
        console.error('[analyze] error with model:', url, err.message);
      }
    }

    // Tous les modèles ont échoué → fallback
    return res.status(200).json({ prompt: fallbackPrompt, warning: lastError });

  } catch (err) {
    console.error('[analyze] fatal error:', err.message);
    const ctx = STYLE_CONTEXT.studio;
    return res.status(200).json({
      prompt: `Luxury eyeglasses on ${ctx}, tack sharp focus, photorealistic, commercial quality, 8k`,
      warning: err.message,
    });
  }
};
