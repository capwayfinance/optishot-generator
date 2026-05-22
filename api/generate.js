const https = require('https');
const { URL } = require('url');

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
    if (buffer[start] === 13 && buffer[start+1] === 10) start += 2;
  }
  parts.push(buffer.slice(start));
  for (const part of parts.filter(p => p.length > 4)) {
    const crlf2 = Buffer.from('\r\n\r\n');
    const idx = indexOf(part, crlf2);
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

function buildMultipart(fields) {
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const parts = [];
  for (const [name, val] of Object.entries(fields)) {
    if (val.type === 'text') {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val.value}`
      );
    } else if (val.type === 'file') {
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${val.filename}"\r\nContent-Type: ${val.mime}\r\n\r\n`;
      parts.push({ header: Buffer.from(header), data: val.data });
    }
  }
  const buffers = [];
  for (const p of parts) {
    if (typeof p === 'string') {
      buffers.push(Buffer.from(p + '\r\n'));
    } else {
      buffers.push(p.header, p.data, Buffer.from('\r\n'));
    }
  }
  buffers.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(buffers), boundary };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-model, x-ratio');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.STABILITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Clé API manquante.' });

  try {
    const rawBody = await getRawBody(req);
    const contentType = req.headers['content-type'] || '';
    const model = (req.headers['x-model'] || 'core').replace(/[^a-z]/g, '');
    const ratio = req.headers['x-ratio'] || '1:1';
    const boundary = contentType.split('boundary=')[1]?.split(';')[0]?.trim();
    if (!boundary) return res.status(400).json({ error: 'Multipart manquant.' });

    const fields = parseMultipart(rawBody, boundary);
    const promptRaw = fields.prompt?.value;
    if (!promptRaw) return res.status(400).json({ error: 'Prompt requis.' });

    const enriched = `Professional product photography of eyeglasses: ${promptRaw}. High-end optical quality, sharp focus on frames, studio lighting, photorealistic, 8k.`;

    const outFields = {
      prompt: { type: 'text', value: enriched },
      negative_prompt: { type: 'text', value: 'blurry, low quality, distorted, watermark, text, logo, cartoon' },
      output_format: { type: 'text', value: 'jpeg' },
      aspect_ratio: { type: 'text', value: ratio },
    };

    if (fields.image) {
      outFields.image = { type: 'file', filename: fields.image.filename || 'frame.jpg', mime: fields.image.mime, data: fields.image.data };
      outFields.strength = { type: 'text', value: '0.75' };
    }

    const { body: multipartBody, boundary: newBoundary } = buildMultipart(outFields);

    const endpoint = `/v2beta/stable-image/generate/${model}`;
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.stability.ai',
        path: endpoint,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': `multipart/form-data; boundary=${newBoundary}`,
          'Content-Length': multipartBody.length,
        }
      };
      const request = https.request(options, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try { resolve({ status: response.statusCode, data: JSON.parse(text) }); }
          catch { resolve({ status: response.statusCode, data: { error: text } }); }
        });
      });
      request.on('error', reject);
      request.write(multipartBody);
      request.end();
    });

    if (result.status !== 200) {
      const errMsg = result.data?.errors?.[0] || result.data?.message || result.data?.error || `HTTP ${result.status}`;
      return res.status(result.status).json({ error: errMsg });
    }

    if (result.data.finish_reason && result.data.finish_reason !== 'SUCCESS') {
      return res.status(422).json({ error: `Génération interrompue (${result.data.finish_reason})` });
    }

    return res.status(200).json({ image: result.data.image });

  } catch (err) {
    console.error('OptiShot error:', err);
    return res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
};
