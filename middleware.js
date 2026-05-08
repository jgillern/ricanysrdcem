export const config = {
  matcher: ['/preview', '/preview/:path*'],
};

export default function middleware(request) {
  const expected = 'Basic ' + btoa('preview:' + (process.env.PREVIEW_PASSWORD || ''));
  if (request.headers.get('authorization') === expected) {
    return;
  }
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Ricany srdcem preview"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
