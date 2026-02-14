import { useMemo } from 'react';
import { getAllDatasets } from '@/lib/data/datasetRegistry';
import { categories } from '@/lib/data/categories';
import { Dataset } from '@/types/dataset';

export interface SearchResult {
  dataset: Dataset;
  categoryName: string;
  subcategoryName: string;
  href: string;
}

export function useDatasetSearch(query: string, locale: 'bg' | 'en'): SearchResult[] {
  const lookupMap = useMemo(() => {
    const map: Record<string, { categoryName: string; subcategoryName: string }> = {};
    for (const cat of categories) {
      for (const sub of cat.subcategories ?? []) {
        map[`${cat.id}::${sub.id}`] = {
          categoryName: cat.name[locale],
          subcategoryName: sub.name[locale],
        };
      }
    }
    return map;
  }, [locale]);

  const allDatasets = useMemo(() => getAllDatasets(), []);

  return useMemo((): SearchResult[] => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const lower = trimmed.toLowerCase();

    const matched: SearchResult[] = [];
    for (const dataset of allDatasets) {
      if (matched.length >= 10) break;

      const key = `${dataset.category}::${dataset.subcategory}`;
      const lookup = lookupMap[key];
      if (!lookup) continue;

      const { categoryName, subcategoryName } = lookup;

      const hits =
        dataset.title[locale].toLowerCase().includes(lower) ||
        dataset.description[locale].toLowerCase().includes(lower) ||
        categoryName.toLowerCase().includes(lower) ||
        subcategoryName.toLowerCase().includes(lower);

      if (hits) {
        matched.push({
          dataset,
          categoryName,
          subcategoryName,
          href: `/${locale}/category/${dataset.category}/${dataset.subcategory}`,
        });
      }
    }
    return matched;
  }, [query, locale, allDatasets, lookupMap]);
}
