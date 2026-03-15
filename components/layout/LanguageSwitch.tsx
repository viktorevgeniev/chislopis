'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface LanguageSwitchProps {
  locale: string;
}

export function LanguageSwitch({ locale }: LanguageSwitchProps) {
  const pathname = usePathname();
  const router = useRouter();

  const switchLanguage = (newLocale: string) => {
    if (newLocale === locale) return;

    // Save preference so geo-detection doesn't override it on future visits
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;

    // Replace the locale in the pathname
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <div className="flex items-center gap-2 border rounded-md p-1">
      <Button
        variant={locale === 'bg' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => switchLanguage('bg')}
        className="h-8"
      >
        БГ
      </Button>
      <Button
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => switchLanguage('en')}
        className="h-8"
      >
        EN
      </Button>
    </div>
  );
}
