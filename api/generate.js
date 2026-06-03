// generate.js v6 — Nano Banana (Gemini 2.5 Flash Image) seul
// Avec image : envoie la photo + le prompt → Nano Banana génère le visuel complet
// Sans image : génère depuis le texte uniquement

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
  const results = {};
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
      results[name] = { data: body, mime: ctMatch ? ctMatch[1].trim() : 'image/jpeg' };
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

  const geminiKey = process.env.GEMINI_KEY;
  if (!geminiKey) return res.status(500).json({ error: 'GEMINI_KEY manquante.' });

  try {
    const ct = req.headers['content-type'] || '';
    let promptRaw = '', ratio = '1:1';
    let imageBase64 = null, imageMime = 'image/jpeg';

    if (ct.includes('multipart/form-data')) {
      const rawBody  = await getRawBody(req);
      const boundary = ct.split('boundary=')[1]?.split(';')[0]?.trim();
      if (!boundary) return res.status(400).json({ error: 'Boundary manquant.' });
      const fields = parseMultipart(rawBody, boundary);
      promptRaw    = fields.prompt?.value || '';
      ratio        = fields.ratio?.value  || '1:1';
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

    // ── Construction du prompt final ─────────────────────────
    let finalPrompt;
    if (imageBase64) {
      // Avec image : demander à Nano Banana de garder les lunettes et changer le décor
      finalPrompt = `You are a luxury eyewear product photographer.
I am giving you a photo of eyeglass frames.
Your task: generate a NEW high-quality product photograph of THESE EXACT SAME glasses in the following setting:

${promptRaw || 'professional white studio background, soft lighting, clean minimal product photography'}

Important rules:
- Keep the EXACT SAME glasses frames — same shape, same color, same material
- The glasses must be clearly visible and sharp in the foreground
- Only change the background, lighting and setting
- No hands, no people
- Photorealistic, high-end commercial product photography quality
- 8K resolution`;
    } else {
      // Sans image : génération pure
      finalPrompt = `${promptRaw || 'luxury eyeglasses, professional white studio background, soft lighting, minimal product photography'}
No hands, no people. Photorealistic, high-end commercial product photography, 8K.`;
    }

    // ── Appel Nano Banana ─────────────────────────────────────
    const parts = [];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: imageMime, data: imageBase64 } });
    }
    parts.push({ text: finalPrompt });

    const nbRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      }
    );

    if (!nbRes.ok) {
      const err = await nbRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Nano Banana HTTP ${nbRes.status}`);
    }

    const data = await nbRes.json();
    const responseParts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = responseParts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart) throw new Error('Nano Banana : aucune image retournée.');

    return res.status(200).json({ image: imagePart.inlineData.data });

  } catch (err) {
    console.error('[generate] error:', err.message);
    return res.status(500).json({ error: err.message.slice(0, 300) });
  }
};
