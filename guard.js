// guard.js — Garde-fou OptiShot
// CORS restreint, rate-limit par IP, email obligatoire, quota par email.
// Compteurs stockés dans Upstash Redis via son API REST (aucune dépendance npm).

const REDIS_URL =
  process.env.KV_REST_API_URL ||
  process.env.STORAGE_KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.STORAGE_KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

const QUOTA = 3; // visuels gratuits par email
const QUOTA_TTL = 60 * 60 * 24 * 30; // le quota d'un email se réinitialise après 30 jours
const RL_MAX = 20; // requêtes max par IP dans la fenêtre
const RL_WINDOW = 3600; // fenêtre rate-limit (secondes)

const ALLOWED_ORIGINS = [
  'https://optishot-generator.vercel.app',
  'https://capway.fr',
  'https://www.capway.fr',
];

// Exécute une commande Redis via l'API REST Upstash (commande = tableau JSON).
async function redis(cmd) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('redis-not-configured');
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  });
  const data = await res.json();
  if (data.error) throw new Error('redis: ' + data.error);
  return data.result;
}

// N'autorise le CORS que pour les origines connues (fini le '*').
function applyCors(req, res) {
  const origin = req.headers.origin || '';
  const ok =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/optishot-generator[a-z0-9-]*\.vercel\.app$/.test(origin); // déploiements preview
  if (ok) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-optishot-email');
}

function getIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

const normEmail = (e) => (e || '').toString().trim().toLowerCase();
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

// Garde d'entrée commun aux endpoints coûteux.
// mode 'generate' → vérifie le quota ; mode 'analyze' → email + rate-limit seulement.
// Retourne { ok:true, email } ou envoie une réponse d'erreur et retourne { ok:false }.
async function guard(req, res, mode) {
  const email = normEmail(req.headers['x-optishot-email']);
  if (!validEmail(email)) {
    res
      .status(400)
      .json({ error: 'EMAIL_REQUIRED', message: 'Merci d’indiquer votre email pour utiliser OptiShot.' });
    return { ok: false };
  }
  try {
    // Rate-limit par IP (anti-matraquage)
    const key = `rl:${getIp(req)}`;
    const n = await redis(['INCR', key]);
    if (n === 1) await redis(['EXPIRE', key, RL_WINDOW]);
    if (n > RL_MAX) {
      res
        .status(429)
        .json({ error: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez dans quelques minutes.' });
      return { ok: false };
    }
    // Quota par email (génération d'image seulement)
    if (mode === 'generate') {
      const used = parseInt((await redis(['GET', `q:${email}`])) || '0', 10);
      if (used >= QUOTA) {
        res.status(403).json({
          error: 'QUOTA_EXCEEDED',
          message: `Vous avez utilisé vos ${QUOTA} visuels gratuits. Envie d’aller plus loin ? Parlons de votre cabinet.`,
          cta: 'https://www.capway.fr/rendez-vous',
        });
        return { ok: false };
      }
    }
  } catch (e) {
    // Redis indisponible → on ne casse pas l'outil (fail-open) ; l'email reste requis.
    console.warn('[guard] redis error (fail-open):', e.message);
  }
  return { ok: true, email };
}

// À appeler après une génération d'image RÉUSSIE : incrémente le quota + enregistre le lead.
async function recordGeneration(email) {
  try {
    const key = `q:${email}`;
    const n = await redis(['INCR', key]);
    if (n === 1) await redis(['EXPIRE', key, QUOTA_TTL]);
    await redis(['SADD', 'leads:emails', email]);
  } catch (e) {
    console.warn('[guard] recordGeneration error:', e.message);
  }
}

module.exports = { guard, recordGeneration, applyCors, QUOTA };
