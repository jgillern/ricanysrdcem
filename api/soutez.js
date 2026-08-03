/**
 * POST /api/soutez — příjem odpovědí ze soutěžní křížovky (stránka /soutez).
 *
 * Bezpečnostní model:
 *  - Prohlížeč nemá k databázi žádný přístup. Klient posílá JSON sem, do databáze
 *    zapisuje až tato funkce servisním klíčem, který žije jen v env varech na Vercelu.
 *  - Tabulka `contest_entries` má zapnuté RLS bez jediné policy a odebraná práva
 *    rolím `anon` / `authenticated` — přes veřejné API Supabase se k ní nedostane nikdo
 *    (viz supabase/migrations/0001_contest_entries.sql).
 *  - Ukládáme jen e-mail, tajenku a čas. Místo IP adresy jen její nevratný HMAC otisk,
 *    a to výhradně kvůli brzdě proti hromadnému odesílání.
 *
 * Env vary (Vercel → Settings → Environment Variables):
 *  - SUPABASE_URL               … https://<ref>.supabase.co
 *  - SUPABASE_SERVICE_ROLE_KEY  … servisní klíč (NIKDY ne do klienta ani do repa)
 *  - CONTEST_IP_SALT            … volitelné, náhodný řetězec pro hashování IP
 *  - CONTEST_DEADLINE           … volitelné, ISO datum uzávěrky (default níže)
 */

export const config = { runtime: 'edge' };

const TABLE = 'contest_entries';
const CONSENT_VERSION = '2026-08-soutez-v1';
const DEFAULT_DEADLINE = '2026-09-30T23:59:59+02:00';

const MAX_EMAIL = 254;
const MAX_ANSWER = 200;
const MIN_FILL_MS = 1500;      // rychleji než za 1,5 s to člověk nevyplní
const MAX_PER_IP_PER_DAY = 10; // víc odpovědí z jedné sítě za den = spam

const ENCODER = new TextEncoder();

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Nepodporovaná metoda.', code: 'method' }, 405);
  }
  if (!sameOrigin(request)) {
    return json({ error: 'Neplatný požadavek.', code: 'origin' }, 403);
  }

  const deadline = Date.parse(process.env.CONTEST_DEADLINE || DEFAULT_DEADLINE);
  if (Number.isFinite(deadline) && Date.now() > deadline) {
    return json({ error: 'Soutěž už bohužel skončila. Díky za zájem!', code: 'closed' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Neplatný požadavek.', code: 'body' }, 400);
  }

  // Honeypot + minimální doba vyplnění — tiché „ok" pro boty, ať nezkoušejí dál.
  if (typeof body.web === 'string' && body.web.trim() !== '') {
    return json({ ok: true }, 200);
  }
  if (typeof body.elapsed === 'number' && body.elapsed >= 0 && body.elapsed < MIN_FILL_MS) {
    return json({ error: 'Odeslání se nepovedlo, zkuste to prosím ještě jednou.', code: 'too_fast' }, 400);
  }

  const email = String(body.email || '').trim();
  const answer = String(body.answer || '').trim().replace(/\s+/g, ' ');

  if (!isEmail(email) || email.length > MAX_EMAIL) {
    return json({ error: 'Zkontrolujte prosím e‑mailovou adresu.', code: 'email' }, 400);
  }
  if (answer.length < 2 || answer.length > MAX_ANSWER) {
    return json({ error: 'Vyplňte prosím znění tajenky.', code: 'answer' }, 400);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('soutez: chybí SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    return json({
      error: 'Formulář je dočasně mimo provoz. Napište nám prosím na info@ricanysrdcem.cz.',
      code: 'config',
    }, 503);
  }

  const ipHash = await hashIp(request);

  const limited = await overLimit(url, key, ipHash);
  if (limited === true) {
    return json({ error: 'Z této sítě už dnes dorazilo hodně odpovědí. Zkuste to prosím zítra.', code: 'rate' }, 429);
  }

  const now = new Date().toISOString();
  const payload = {
    email,
    email_norm: email.toLowerCase(),
    answer,
    answer_norm: normalizeAnswer(answer),
    consent_version: CONSENT_VERSION,
    ip_hash: ipHash,
    updated_at: now,
  };

  // Upsert přes e-mail: jeden e-mail = jedna účast, platí poslední odeslaná odpověď.
  const res = await fetch(`${url}/rest/v1/${TABLE}?on_conflict=email_norm`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('soutez: zápis selhal', res.status, await res.text().catch(() => ''));
    return json({
      error: 'Odpověď se nepodařilo uložit. Zkuste to prosím za chvíli znovu.',
      code: 'store',
    }, 502);
  }

  return json({ ok: true }, 200);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Tajenka pro vyhodnocení: bez diakritiky, velkými písmeny, bez interpunkce. */
function normalizeAnswer(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Formulář smí odesílat jen naše stránka — odřízne přímé volání endpointu z cizího webu. */
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const self = request.headers.get('x-forwarded-host') || new URL(request.url).host;
  return host === self || host === 'ricanysrdcem.cz' || host.endsWith('.ricanysrdcem.cz');
}

/**
 * Nevratný otisk IP adresy (HMAC-SHA256, zkrácený). Slouží jen jako brzda proti
 * hromadnému odesílání — samotnou IP nikam neukládáme a z otisku ji nelze získat.
 */
async function hashIp(request) {
  const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '')
    .split(',')[0]
    .trim();
  if (!ip) return null;
  const secret = process.env.CONTEST_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const key = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(ip));
  return [...new Uint8Array(sig)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** true = limit překročen, false = ok, null = nepodařilo se ověřit (pouštíme dál). */
async function overLimit(url, key, ipHash) {
  if (!ipHash) return false;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const query =
    `select=id&ip_hash=eq.${ipHash}&updated_at=gte.${encodeURIComponent(since)}` +
    `&limit=${MAX_PER_IP_PER_DAY + 1}`;
  try {
    const res = await fetch(`${url}/rest/v1/${TABLE}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > MAX_PER_IP_PER_DAY;
  } catch {
    return null;
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
