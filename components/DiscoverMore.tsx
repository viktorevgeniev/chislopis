'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Category } from '@/lib/data/categories';

const STORAGE_KEY = 'chislopis-seen';

const cardStyles: Record<string, { bg: string; border: string; chip: string }> = {
  blue:    { bg: 'bg-cat-blue-bg',    border: 'border-cat-blue-border',    chip: 'bg-cat-blue-chip text-cat-blue-fg'       },
  green:   { bg: 'bg-cat-green-bg',   border: 'border-cat-green-border',   chip: 'bg-cat-green-chip text-cat-green-fg'     },
  purple:  { bg: 'bg-cat-purple-bg',  border: 'border-cat-purple-border',  chip: 'bg-cat-purple-chip text-cat-purple-fg'   },
  red:     { bg: 'bg-cat-red-bg',     border: 'border-cat-red-border',     chip: 'bg-cat-red-chip text-cat-red-fg'         },
  orange:  { bg: 'bg-cat-orange-bg',  border: 'border-cat-orange-border',  chip: 'bg-cat-orange-chip text-cat-orange-fg'   },
  emerald: { bg: 'bg-cat-emerald-bg', border: 'border-cat-emerald-border', chip: 'bg-cat-emerald-chip text-cat-emerald-fg' },
};

interface DiscoverMoreProps {
  locale: 'bg' | 'en';
  categories: Category[];
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  while (result.length < n && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

export function DiscoverMore({ locale, categories }: DiscoverMoreProps) {
  const t = useTranslations('home');
  const [suggestions, setSuggestions] = useState<Category[] | null>(null);

  useEffect(() => {
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      seen = [];
    }
    const unseen = categories.filter((c) => !seen.includes(c.id));
    const pool = unseen.length >= 3 ? unseen : categories;
    setSuggestions(pickRandom(pool, Math.min(3, pool.length)));
  }, [categories]);

  function markSeen(id: string) {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (!seen.includes(id)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen, id]));
      }
    } catch {
      // ignore
    }
  }

  // Avoid hydration mismatch — render nothing until client picks suggestions
  if (!suggestions) return null;

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-headline font-bold mb-1">{t('discoverMore')}</h2>
        <p className="text-sm text-muted-foreground">{t('discoverMoreSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {suggestions.map((category) => {
          const style = cardStyles[category.color] ?? cardStyles.blue;
          return (
            <Link
              key={category.id}
              href={`/${locale}/category/${category.id}`}
              onClick={() => markSeen(category.id)}
            >
              <div
                className={`h-full flex flex-col rounded-2xl border ${style.bg} ${style.border} p-6 shadow-ambient transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer`}
              >
                <h3 className="text-lg font-headline font-bold mb-2">{category.name[locale]}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {category.description[locale]}
                </p>
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.slice(0, 3).map((sub) => (
                      <span
                        key={sub.id}
                        className={`text-xs font-medium px-3 py-1 rounded-full ${style.chip}`}
                      >
                        {sub.name[locale]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
