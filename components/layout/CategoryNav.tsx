'use client';

import Link from 'next/link';
import { categories } from '@/lib/data/categories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryNavProps {
  locale: 'bg' | 'en';
}

export function CategoryNav({ locale }: CategoryNavProps) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    red: 'from-red-500 to-orange-500',
    orange: 'from-orange-500 to-yellow-500',
    indigo: 'from-indigo-500 to-purple-500',
    emerald: 'from-emerald-500 to-teal-500'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => (
        <Link key={category.id} href={`/${locale}/category/${category.id}`}>
          <Card className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer">
            <CardHeader>
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                  colorMap[category.color] || colorMap.blue
                } flex items-center justify-center mb-4`}
              >
                <span className="text-white text-2xl">📊</span>
              </div>
              <CardTitle className="text-xl">{category.name[locale]}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{category.description[locale]}</CardDescription>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
