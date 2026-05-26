const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

const STYLE_CONTEXT = {
  studio: 'professional white studio, even soft-box lighting, subtle drop shadow beneath the frames',
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

    const fallbackPrompt = `Luxury eyeglasses, ${ctx}, sharp focus on frame details, photorealistic, commercial product photography, 8k`;

    if (!image) return res.status(200).json({ prompt: fallbackPrompt });

    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) {
      return res.status(200).json({ prompt: fallbackPrompt, warning: 'GEMINI_KEY manquante.' });
    }

    const base64Image = image.data.toString('base64');
    const mimeType = image.mime || 'image/jpeg';

    const instruction = `You are a professional product photographer specializing in luxury eyewear and a Flux AI prompt engineer.
Analyze this eyeglass frame and write a Flux Dev image generation prompt for a high-end product photo.
Photography setting: ${ctx}
Rules:
1. Identify frame shape, rim color, material (acetate/metal/titanium), lens tint if present
2. Incorporate the photography setting above
3. Add lighting, surface/background, depth of field details
4. Stay under 60 words
5. Output ONLY the prompt — no explanation, no quotes`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
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
      throw new Error(errData?.error?.message || `Gemini HTTP ${geminiRes.status}`);
    }

    const data = await geminiRes.json();
    const prompt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!prompt) throw new Error('Réponse Gemini vide.');

    return res.status(200).json({ prompt });

  } catch (err) {
    console.error('[analyze] error:', err.message);
    const ctx = STYLE_CONTEXT.studio;
    return res.status(200).json({
      prompt: `Eyeglasses product photography, ${ctx}, sharp focus on frame details, photorealistic, commercial quality, 8k`,
      warning: err.message,
    });
  }
};
