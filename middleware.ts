import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['bg', 'en'],
  defaultLocale: 'bg'
});

export const config = {
  matcher: ['/', '/(bg|en)/:path*']
};
