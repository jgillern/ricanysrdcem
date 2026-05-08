const COOKIE_NAME = 'rs_preview';
const MAX_AGE_SEC = 60 * 60 * 24 * 30;
const ENCODER = new TextEncoder();

export const config = {
  matcher: ['/preview', '/preview/:path*'],
};

export default async function middleware(request) {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/preview/login') {
    const form = await request.formData();
    const password = form.get('password') || '';
    if (password && password === process.env.PREVIEW_PASSWORD) {
      const ts = Date.now().toString();
      const sig = await sign(ts);
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/preview',
          'Set-Cookie': `${COOKIE_NAME}=${ts}.${sig}; Path=/preview; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SEC}`,
        },
      });
    }
    return loginPage({ failed: true });
  }

  if (await hasValidCookie(request)) {
    return;
  }

  return loginPage({ failed: false });
}

async function hasValidCookie(request) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)rs_preview=([^;]+)/);
  if (!match) return false;
  const [ts, sig] = match[1].split('.');
  if (!ts || !sig) return false;
  if (!(await verify(ts, sig))) return false;
  const age = Date.now() - parseInt(ts, 10);
  return age >= 0 && age < MAX_AGE_SEC * 1000;
}

async function getKey() {
  const secret = process.env.PREVIEW_SECRET || process.env.PREVIEW_PASSWORD || '';
  return crypto.subtle.importKey(
    'raw',
    ENCODER.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function sign(value) {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(value));
  let bin = '';
  for (const b of new Uint8Array(sig)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function verify(value, sigB64) {
  return (await sign(value)) === sigB64;
}

function loginPage({ failed }) {
  const error = failed
    ? '<p class="err">Špatné heslo. Zkus to ještě jednou.</p>'
    : '';
  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Náhled — Říčany srdcem</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
         font-family: system-ui, -apple-system, sans-serif; color: #0e2a45;
         background: radial-gradient(ellipse at 50% 30%, #4a98d8 0%, #1f72c2 38%, #15568f 100%); }
  form { background: #fbf6ec; padding: 28px 28px 24px; border-radius: 14px;
         box-shadow: 0 18px 40px rgba(11, 31, 56, 0.35); width: min(360px, 90vw); }
  h1 { font-size: 18px; margin: 0 0 16px; font-weight: 700; }
  label { display: block; font-size: 13px; margin-bottom: 6px; color: #555; }
  input[type=password] { width: 100%; padding: 10px 12px; font-size: 15px;
         border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
  input[type=password]:focus { outline: 2px solid #1f72c2; outline-offset: 1px; border-color: transparent; }
  button { margin-top: 14px; width: 100%; padding: 10px 12px; font-size: 15px;
           background: #d93434; color: #fbf6ec; border: 0; border-radius: 8px;
           font-weight: 700; cursor: pointer; }
  button:hover { background: #b22323; }
  .err { color: #b22323; font-size: 13px; margin: 10px 0 0; }
</style>
</head>
<body>
  <form method="POST" action="/preview/login">
    <h1>Náhled — Říčany srdcem</h1>
    <label for="password">Heslo</label>
    <input id="password" name="password" type="password" autofocus required>
    <button type="submit">Pokračovat</button>
    ${error}
  </form>
</body>
</html>`;
  return new Response(html, {
    status: failed ? 401 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
