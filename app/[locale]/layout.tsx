import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import '@fontsource-variable/manrope';
import '@fontsource-variable/inter';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { FeedbackButton } from '@/components/layout/FeedbackButton';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import '../globals.css';

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return {
    title: {
      default: `${tCommon('appName')} – ${t('title')}`,
      template: `%s | ${tCommon('appName')}`,
    },
    description: t('intro'),
    openGraph: {
      title: `${tCommon('appName')} – ${t('title')}`,
      description: t('intro'),
      locale: locale === 'bg' ? 'bg_BG' : 'en_US',
      type: 'website',
    },
  };
}

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
    <html lang={locale}>
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
