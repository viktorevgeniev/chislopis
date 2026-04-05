'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { categories } from '@/lib/data/categories';
import { getDatasetsByCategory } from '@/lib/data/datasetRegistry';

interface CategoryNavProps {
  locale: 'bg' | 'en';
}

const cardStyles: Record<string, { bg: string; border: string; chip: string }> = {
  blue:    { bg: 'bg-cat-blue-bg',    border: 'border-cat-blue-border',    chip: 'bg-cat-blue-chip text-cat-blue-fg'       },
  green:   { bg: 'bg-cat-green-bg',   border: 'border-cat-green-border',   chip: 'bg-cat-green-chip text-cat-green-fg'     },
  purple:  { bg: 'bg-cat-purple-bg',  border: 'border-cat-purple-border',  chip: 'bg-cat-purple-chip text-cat-purple-fg'   },
  red:     { bg: 'bg-cat-red-bg',     border: 'border-cat-red-border',     chip: 'bg-cat-red-chip text-cat-red-fg'         },
  orange:  { bg: 'bg-cat-orange-bg',  border: 'border-cat-orange-border',  chip: 'bg-cat-orange-chip text-cat-orange-fg'   },
  indigo:  { bg: 'bg-cat-indigo-bg',  border: 'border-cat-indigo-border',  chip: 'bg-cat-indigo-chip text-cat-indigo-fg'   },
  emerald: { bg: 'bg-cat-emerald-bg', border: 'border-cat-emerald-border', chip: 'bg-cat-emerald-chip text-cat-emerald-fg' },
};

export function CategoryNav({ locale }: CategoryNavProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => {
        const style = cardStyles[category.color] || cardStyles.blue;
        return (
          <Link key={category.id} href={`/${locale}/category/${category.id}`}>
            <div
              className={`h-full flex flex-col rounded-2xl border ${style.bg} ${style.border} p-6 shadow-ambient transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer`}
            >
              <h3 className="text-2xl font-headline font-bold mb-2">{category.name[locale]}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {category.description[locale]}
              </p>

              {category.subcategories && category.subcategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {category.subcategories.map((sub) => (
                    <span
                      key={sub.id}
                      className={`text-xs font-medium px-3 py-1 rounded-full ${style.chip}`}
                    >
                      {sub.name[locale]}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const all = getDatasetsByCategory(category.id);
                    return `${all.length} ${locale === 'bg' ? 'набора данни' : 'datasets'}`;
                  })()}
                </span>
                <span className={cn(buttonVariants({ size: 'default' }), 'gap-2 font-headline pointer-events-none')}>
                  {locale === 'bg' ? 'Разгледай' : 'Explore'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
