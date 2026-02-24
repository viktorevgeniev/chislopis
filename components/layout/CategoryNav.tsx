'use client';

import Link from 'next/link';
import { categories } from '@/lib/data/categories';
import { getDatasetsByCategory } from '@/lib/data/datasetRegistry';

interface CategoryNavProps {
  locale: 'bg' | 'en';
}

const cardStyles: Record<string, { bg: string; border: string; chip: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', chip: 'bg-blue-100 text-blue-700' },
  green: { bg: 'bg-green-50', border: 'border-green-200', chip: 'bg-green-100 text-green-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', chip: 'bg-purple-100 text-purple-700' },
  red: { bg: 'bg-orange-50', border: 'border-orange-200', chip: 'bg-orange-100 text-orange-700' },
  orange: { bg: 'bg-amber-50', border: 'border-amber-200', chip: 'bg-amber-100 text-amber-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', chip: 'bg-indigo-100 text-indigo-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', chip: 'bg-emerald-100 text-emerald-700' },
};

export function CategoryNav({ locale }: CategoryNavProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => {
        const style = cardStyles[category.color] || cardStyles.blue;
        return (
          <Link key={category.id} href={`/${locale}/category/${category.id}`}>
            <div
              className={`h-full flex flex-col rounded-2xl border ${style.bg} ${style.border} p-6 transition-all hover:shadow-lg cursor-pointer`}
            >
              <h3 className="text-2xl font-bold mb-2">{category.name[locale]}</h3>
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
                    const impl = all.filter(d => d.customVisualization);
                    return `${impl.length} / ${all.length} ${locale === 'bg' ? 'набора данни' : 'datasets'}`;
                  })()}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-white/70 border border-current/10 hover:bg-white transition-colors">
                  {locale === 'bg' ? 'Разгледай' : 'Explore'} →
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
