export const config = {
  matcher: ['/preview', '/preview/:path*'],
};

export default function middleware(request) {
  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (password && password === process.env.PREVIEW_PASSWORD) {
        return;
      }
    } catch {}
  }
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Ricany srdcem preview"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
