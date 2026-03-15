import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const LOCALES = ['bg', 'en'] as const;
type Locale = typeof LOCALES[number];

const intlMiddleware = createMiddleware({
  locales: LOCALES,
  defaultLocale: 'bg',
  localeDetection: false,
});

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasLocalePrefix = /^\/(bg|en)(\/|$)/.test(pathname);

  if (!hasLocalePrefix) {
    // 1. Respect the user's saved language preference (set when they switch language)
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    if (cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale)) {
      return intlMiddleware(request) as NextResponse;
    }

    // 2. Detect by Vercel geo header: Bulgaria → bg, everywhere else → en
    const country = request.headers.get('x-vercel-ip-country');
    const locale: Locale = country === 'BG' ? 'bg' : 'en';

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request) as NextResponse;
}

export const config = {
  matcher: ['/', '/(bg|en)/:path*']
};
