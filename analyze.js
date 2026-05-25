// Analyzes an uploaded eyeglass frame with Gemini (via OpenRouter) and returns
// a Flux-ready prompt. Reads multipart/form-data { image, style }.
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

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

    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) return res.status(200).json({ prompt: fallbackPrompt, warning: 'OPENROUTER_KEY manquante — prompt par défaut utilisé.' });

    const base64Image = image.data.toString('base64');
    const mimeType = image.mime || 'image/jpeg';

    const instruction = `You are a professional product photographer specializing in luxury eyewear and a Flux AI prompt engineer.
Analyze this eyeglass frame carefully and write a Flux Dev image generation prompt for a high-end product photo.
Photography setting to use: ${ctx}
Rules:
1. Identify frame shape (round/square/rectangular/cat-eye/aviator/oval), rim color, material appearance (acetate/metal/titanium/plastic), lens tint if present
2. Incorporate the exact photography setting specified above
3. Add: lighting description, surface/background, depth of field
4. Stay under 60 words
5. Output ONLY the prompt text — no explanation, no quotes, no preamble`;

    const orRes = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://optishot-generator.vercel.app',
        'X-Title': 'OptiShot Generateur',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: 'text', text: instruction },
          ],
        }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!orRes.ok) {
      const errData = await orRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `OpenRouter HTTP ${orRes.status}`);
    }

    const data = await orRes.json();
    const prompt = data.choices?.[0]?.message?.content?.trim();
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
