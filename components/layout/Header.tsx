'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitch } from './LanguageSwitch';
import { HeaderSearch } from '@/components/search/HeaderSearch';

interface HeaderProps {
  locale: string;
}

export function Header({ locale }: HeaderProps) {
  const t = useTranslations('common');
  const nav = useTranslations('nav');
  const pathname = usePathname();

  return (
    <header className="border-b border-outline/20 bg-white/80 dark:bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 md:px-8 h-20 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <Image src="/logo.png" alt="" width={56} height={56} className="shrink-0" />
          <span className="text-2xl font-headline font-extrabold text-primary">
            {t('appName')}
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {[
            { href: `/${locale}`, label: nav('home') },
            { href: `/${locale}/stories`, label: nav('stories') },
            { href: `/${locale}/categories`, label: nav('categories') },
            { href: `/${locale}/about`, label: nav('about') },
          ].map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`text-sm font-medium tracking-wide transition-colors hover:text-primary${isActive ? ' text-primary' : ''}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <HeaderSearch locale={locale as 'bg' | 'en'} />
          <LanguageSwitch locale={locale} />
        </div>
      </div>
    </header>
  );
}
