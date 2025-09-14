export const config = {
  matcher: [
    '/((?!not-available.html|favicon.ico).*)',
  ],
};

export default function middleware(request) {
  const country = request.geo?.country || 'US';

  if (country !== 'PH') {
    const url = new URL('/not-available.html', request.url);
    
    return Response.redirect(url, 307);
  }

}
