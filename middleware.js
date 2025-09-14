import { next } from '@vercel/edge';
import { NextResponse } from 'next/server';

const ALLOWED_COUNTRY = 'PH';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|not-available.html|.*\\..*).*)',
  ],
};

export default function middleware(request) {
  const country = request.geo?.country;

  if (country !== ALLOWED_COUNTRY) {
    return NextResponse.rewrite(new URL('/not-available', request.url));
  }

  return next();
}
