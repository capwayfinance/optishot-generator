// generate.js v4 — Pipeline 2 étapes
// Étape 1 : birefnet (suppression fond propre, préserve les verres)
// Étape 2 : Flux Dev (génération du fond)
// Étape 3 : Composite (lunettes par-dessus le fond généré)

const FAL_BIREFNET  = 'https://fal.run/fal-ai/birefnet';
const FAL_FLUX      = 'https://fal.run/fal-ai/flux/dev';
const FAL_COMPOSITE = 'https://fal.run/fal-ai/imageutils/composite';
const FAL_BRIA      = 'https://fal.run/fal-ai/bria/background/replace';

const SIZE_MAP = {
  '1:1':  { width: 1024, height: 1024 },
  '4:5':  { width: 816,  height: 1024 },
  '16:9': { width: 1024, height: 576  },
  '9:16': { width: 576,  height: 1024 },
};

const BG_PROMPTS = {
  studio: 'clean white studio background, even soft-box lighting, minimal product photography, no objects',
  nature: 'warm golden hour sunlight, lush green bokeh background, natural stone surface, outdoor lifestyle',
  luxe:   'dark polished marble surface, dramatic directional side light, luxury editorial, deep contrast',
  urbain: 'matte concrete surface, cool directional urban light, architectural city background',
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
      if (buf[i+j] !== search[j]) { ok=false; break; }
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
      results[name] = { data: body, mime: ctMatch ? ctMatch[1].trim() : 'image/jpeg' };
    } else {
      results[name] = { value: body.toString('utf8') };
    }
  }
  return results;
}

async function fetchWithKey(url, body, falKey) {
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function urlToBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch image failed: ${r.status}`);
  const ab = await r.arrayBuffer();
  return Buffer.from(ab).toString('base64');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const falKey = process.env.FAL_KEY;
  if (!falKey) return res.status(500).json({ error: 'FAL_KEY manquante.' });

  try {
    const ct = req.headers['content-type'] || '';
    let promptRaw = '', style = 'studio', ratio = '1:1';
    let imageBase64 = null, imageMime = 'image/jpeg';

    if (ct.includes('multipart/form-data')) {
      const rawBody  = await getRawBody(req);
      const boundary = ct.split('boundary=')[1]?.split(';')[0]?.trim();
      if (!boundary) return res.status(400).json({ error: 'Boundary manquant.' });
      const fields = parseMultipart(rawBody, boundary);
      promptRaw    = fields.prompt?.value || '';
      style        = fields.style?.value  || 'studio';
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

    const size = SIZE_MAP[ratio] || SIZE_MAP['1:1'];

    // ══════════════════════════════════════════════════════
    // SANS IMAGE → txt2img Flux Dev simple
    // ══════════════════════════════════════════════════════
    if (!imageBase64) {
      const fullPrompt = [
        promptRaw.trim() || `luxury eyeglasses, ${BG_PROMPTS[style] || BG_PROMPTS.studio}`,
        'tack sharp focus on frames',
        'no people, no hands, no text, no watermark',
        'professional product photography, photorealistic',
      ].join(', ');

      const r = await fetchWithKey(FAL_FLUX, {
        prompt: fullPrompt,
        image_size: size,
        num_images: 1,
        num_inference_steps: 50,
        guidance_scale: 7.5,
        output_format: 'jpeg',
        enable_safety_checker: false,
        seed: Math.floor(Math.random() * 9999999),
      }, falKey);

      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.detail || `Flux HTTP ${r.status}`);
      }
      const d = await r.json();
      const imgUrl = d?.images?.[0]?.url;
      if (!imgUrl) throw new Error('Flux: aucune image retournée.');
      const base64 = await urlToBase64(imgUrl);
      return res.status(200).json({ image: base64 });
    }

    // ══════════════════════════════════════════════════════
    // AVEC IMAGE → Pipeline 2 étapes
    // ══════════════════════════════════════════════════════

    const imageDataUrl = `data:${imageMime};base64,${imageBase64}`;

    // ── ÉTAPE 1 : birefnet — suppression fond propre ──────
    console.log('[generate] Step 1: birefnet background removal');
    const birefnetRes = await fetchWithKey(FAL_BIREFNET, {
      image_url: imageDataUrl,
      model: 'General Use (Light)',
      output_format: 'png',
      operating_on_video: false,
    }, falKey);

    let glassesUrl = null;

    if (birefnetRes.ok) {
      const birefnetData = await birefnetRes.json();
      glassesUrl = birefnetData?.image?.url || birefnetData?.images?.[0]?.url;
      console.log('[generate] birefnet OK, glasses URL:', glassesUrl ? 'got it' : 'missing');
    } else {
      const errData = await birefnetRes.json().catch(() => ({}));
      console.warn('[generate] birefnet failed:', errData?.detail || birefnetRes.status, '— falling back to bria');
    }

    // ── ÉTAPE 2 : Flux Dev — génère le fond ──────────────
    const bgBase = BG_PROMPTS[style] || BG_PROMPTS.studio;
    const bgPrompt = promptRaw
      ? `${promptRaw}, ${bgBase}, no glasses, no eyewear, empty scene, photorealistic, 8k`
      : `${bgBase}, no glasses, no eyewear, empty scene, photorealistic, 8k`;

    console.log('[generate] Step 2: Flux background generation');
    const fluxRes = await fetchWithKey(FAL_FLUX, {
      prompt: bgPrompt,
      image_size: size,
      num_images: 1,
      num_inference_steps: 50,
      guidance_scale: 7.5,
      output_format: 'jpeg',
      enable_safety_checker: false,
      seed: Math.floor(Math.random() * 9999999),
    }, falKey);

    if (!fluxRes.ok) {
      const e = await fluxRes.json().catch(() => ({}));
      throw new Error(e?.detail || `Flux HTTP ${fluxRes.status}`);
    }

    const fluxData = await fluxRes.json();
    const bgUrl = fluxData?.images?.[0]?.url;
    if (!bgUrl) throw new Error('Flux: aucun fond retourné.');

    console.log('[generate] Flux bg OK');

    // ── ÉTAPE 3 : Composite ou fallback bria ─────────────
    if (glassesUrl) {
      // Composite : lunettes PNG sur le fond Flux
      console.log('[generate] Step 3: compositing glasses over background');
      const compRes = await fetchWithKey(FAL_COMPOSITE, {
        background_image_url: bgUrl,
        foreground_image_url: glassesUrl,
        position: 'center',
        scale: 0.7,
        sync_mode: true,
      }, falKey);

      if (compRes.ok) {
        const compData = await compRes.json();
        const finalUrl = compData?.image?.url || compData?.images?.[0]?.url;
        if (finalUrl) {
          console.log('[generate] composite OK');
          const base64 = await urlToBase64(finalUrl);
          return res.status(200).json({ image: base64 });
        }
      }
      console.warn('[generate] composite failed, falling back to direct Flux result');
    }

    // Fallback : si le composite échoue, retourner le fond Flux seul
    // (meilleur que bria qui modifie les verres)
    // OU fallback bria avec prompts renforcés pour préserver les verres
    console.log('[generate] Fallback: bria with lens-preservation prompt');

    const briaPrompt = [
      promptRaw || bgBase,
      'preserve the exact eyeglass frames',
      'keep original lens transparency and color',
      'keep clear transparent lenses exactly as they are',
      'only change the background behind the glasses',
      'do not modify the glasses frames or lenses',
    ].join(', ');

    const briaRes = await fetchWithKey(FAL_BRIA, {
      image_url:        imageDataUrl,
      prompt:           briaPrompt,
      negative_prompt:  'black lenses, dark lenses, sunglasses, tinted lenses, mirrored lenses, colored lenses, hands, fingers, person, human, skin, blurry, low quality, distorted, watermark',
      num_images:       1,
      sync_mode:        true,
    }, falKey);

    if (!briaRes.ok) {
      const e = await briaRes.json().catch(() => ({}));
      throw new Error(e?.detail || `Bria HTTP ${briaRes.status}`);
    }

    const briaData = await briaRes.json();
    const briaUrl  = briaData?.images?.[0]?.url || briaData?.image?.url;
    if (!briaUrl) throw new Error('Bria: aucune image retournée.');

    const base64 = await urlToBase64(briaUrl);
    return res.status(200).json({ image: base64 });

  } catch (err) {
    console.error('[generate] error:', err.message);
    return res.status(500).json({ error: err.message.slice(0, 300) });
  }
};
