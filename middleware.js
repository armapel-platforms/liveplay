export const config = {
  matcher: [
    '/((?!not-available.html|assets/|favicon.ico).*)',
  ],
};

export default function middleware(request) {
  const country = request.geo?.country;

  if (country === 'PH') {
    return;
  }

  const url = new URL('/not-available.html', request.url);

  return Response.redirect(url);
}
