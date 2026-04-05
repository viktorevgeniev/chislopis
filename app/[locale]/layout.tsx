import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Manrope, Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { FeedbackButton } from '@/components/layout/FeedbackButton';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import '../globals.css';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-headline',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${manrope.variable} ${inter.variable}`}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <main className="mx-auto max-w-7xl px-4 md:px-8 pt-10 pb-16">{children}</main>
          <FeedbackButton />
        </NextIntlClientProvider>
        <Analytics />
        <GoogleAnalytics gaId="G-ZGZ0DGRRH1" />
      </body>
    </html>
  );
}
