import { NextRequest, NextResponse } from 'next/server';
import { geolocation } from '@vercel/functions';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|not-available).*)',
  ],
};

export function middleware(request: NextRequest) {
  const { country } = geolocation(request);

  if (country !== 'PH') {
    return NextResponse.redirect(new URL('/not-available', request.url));
  }

  return NextResponse.next();
}
