'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitch } from './LanguageSwitch';

interface HeaderProps {
  locale: string;
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations('common');
  const nav = useTranslations('nav');

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {t('appName')}
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href={`/${locale}`}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {nav('home')}
          </Link>
          <Link
            href={`/${locale}/categories`}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {nav('categories')}
          </Link>
        </nav>

        <LanguageSwitch locale={locale} />
      </div>
    </header>
  );
}
