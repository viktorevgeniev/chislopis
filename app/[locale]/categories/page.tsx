import Link from 'next/link';
import {
  Users, TrendingUp, Briefcase, Heart, Map, Building, DollarSign,
  HeartPulse, Landmark, Hammer, ShoppingCart, UserX, Activity,
  AlertTriangle, BarChart2, ShoppingBag, BookOpen, Stethoscope,
  Plane, Palette, FileText, Shield, PiggyBank, type LucideProps
} from 'lucide-react';
import { categories } from '@/lib/data/categories';
import {
  getAllDatasets,
  getDatasetsByCategory,
  getDatasetsBySubcategory,
} from '@/lib/data/datasetRegistry';
import { CategoryId } from '@/types/dataset';

type IconComponent = React.ComponentType<LucideProps>;

const iconMap: Record<string, IconComponent> = {
  'users': Users,
  'trending-up': TrendingUp,
  'briefcase': Briefcase,
  'heart': Heart,
  'map': Map,
  'building': Building,
  'dollar-sign': DollarSign,
  'heart-pulse': HeartPulse,
  'landmark': Landmark,
  'hammer': Hammer,
  'shopping-cart': ShoppingCart,
  'user-x': UserX,
  'activity': Activity,
  'alert-triangle': AlertTriangle,
  'bar-chart': BarChart2,
  'shopping-bag': ShoppingBag,
  'book-open': BookOpen,
  'stethoscope': Stethoscope,
  'plane': Plane,
  'palette': Palette,
  'file-text': FileText,
  'shield': Shield,
  'piggy-bank': PiggyBank,
};

function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Component = iconMap[name] ?? Building;
  return <Component size={size} className={className} />;
}

const cardStyles: Record<string, {
  bg: string; border: string; chip: string;
  iconBg: string; iconText: string; badge: string;
}> = {
  blue:    { bg: 'bg-cat-blue-bg',    border: 'border-cat-blue-border',    chip: 'bg-cat-blue-chip text-cat-blue-fg',       iconBg: 'bg-cat-blue-solid',    iconText: 'text-white', badge: 'bg-cat-blue-chip text-cat-blue-fg'    },
  green:   { bg: 'bg-cat-green-bg',   border: 'border-cat-green-border',   chip: 'bg-cat-green-chip text-cat-green-fg',     iconBg: 'bg-cat-green-solid',   iconText: 'text-white', badge: 'bg-cat-green-chip text-cat-green-fg'  },
  purple:  { bg: 'bg-cat-purple-bg',  border: 'border-cat-purple-border',  chip: 'bg-cat-purple-chip text-cat-purple-fg',   iconBg: 'bg-cat-purple-solid',  iconText: 'text-white', badge: 'bg-cat-purple-chip text-cat-purple-fg' },
  red:     { bg: 'bg-cat-red-bg',     border: 'border-cat-red-border',     chip: 'bg-cat-red-chip text-cat-red-fg',         iconBg: 'bg-cat-red-solid',     iconText: 'text-white', badge: 'bg-cat-red-chip text-cat-red-fg'      },
  orange:  { bg: 'bg-cat-orange-bg',  border: 'border-cat-orange-border',  chip: 'bg-cat-orange-chip text-cat-orange-fg',   iconBg: 'bg-cat-orange-solid',  iconText: 'text-white', badge: 'bg-cat-orange-chip text-cat-orange-fg' },
  indigo:  { bg: 'bg-cat-indigo-bg',  border: 'border-cat-indigo-border',  chip: 'bg-cat-indigo-chip text-cat-indigo-fg',   iconBg: 'bg-cat-indigo-solid',  iconText: 'text-white', badge: 'bg-cat-indigo-chip text-cat-indigo-fg' },
  emerald: { bg: 'bg-cat-emerald-bg', border: 'border-cat-emerald-border', chip: 'bg-cat-emerald-chip text-cat-emerald-fg', iconBg: 'bg-cat-emerald-solid', iconText: 'text-white', badge: 'bg-cat-emerald-chip text-cat-emerald-fg' },
};

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = locale as 'bg' | 'en';

  const totalDatasets = getAllDatasets().length;
  const totalSubcategories = categories.flatMap((c) => c.subcategories ?? []).length;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4 py-10">
        <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {loc === 'bg' ? 'Категории статистики' : 'Browse by Category'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {loc === 'bg'
            ? 'Разглеждайте набори от данни на НСИ по теми и подкатегории'
            : 'Explore NSI datasets organized by topic and subcategory'}
        </p>
        <div className="flex items-center justify-center gap-8 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{categories.length}</div>
            <div className="text-xs text-muted-foreground">{loc === 'bg' ? 'категории' : 'categories'}</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalSubcategories}</div>
            <div className="text-xs text-muted-foreground">{loc === 'bg' ? 'подкатегории' : 'subcategories'}</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {totalDatasets}
            </div>
            <div className="text-xs text-muted-foreground">{loc === 'bg' ? 'набора данни' : 'datasets'}</div>
          </div>
        </div>
      </section>

      {/* Category Cards */}
      <section className="space-y-6">
        {categories.map((category) => {
          const style = cardStyles[category.color] ?? cardStyles.blue;
          const allDs = getDatasetsByCategory(category.id as CategoryId);

          return (
            <div
              key={category.id}
              className={`rounded-2xl border ${style.bg} ${style.border} overflow-hidden`}
            >
              {/* Category Header Row */}
              <Link href={`/${locale}/category/${category.id}`}>
                <div className="flex items-center gap-5 p-6 hover:brightness-95 transition-all cursor-pointer group">
                  <div className={`shrink-0 p-3 rounded-xl ${style.iconBg} ${style.iconText} shadow-sm`}>
                    <Icon name={category.icon} size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold group-hover:underline decoration-2">
                      {category.name[loc]}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {category.description[loc]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full ${style.badge}`}>
                      {allDs.length}
                      <span className="hidden sm:inline font-normal opacity-70">
                        {loc === 'bg' ? ' набора' : ' datasets'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1 group-hover:gap-2 transition-all">
                      {loc === 'bg' ? 'Разгледай' : 'Explore'} <span>→</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Subcategories Grid */}
              {category.subcategories && category.subcategories.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {category.subcategories.map((sub) => {
                      const subAll = getDatasetsBySubcategory(category.id as CategoryId, sub.id);
                      return (
                        <Link
                          key={sub.id}
                          href={`/${locale}/category/${category.id}/${sub.id}`}
                          className="group/sub block"
                        >
                          <div className="h-full flex flex-col rounded-xl border bg-card/70 hover:bg-card p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`p-1.5 rounded-lg ${style.chip}`}>
                                <Icon name={sub.icon} size={14} />
                              </span>
                              <h3 className="text-sm font-semibold leading-tight group-hover/sub:text-primary transition-colors">
                                {sub.name[loc]}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                              {sub.description[loc]}
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.chip}`}>
                                {subAll.length}
                                {' '}{loc === 'bg' ? 'набора' : 'datasets'}
                              </span>
                              <span className="text-xs text-muted-foreground group-hover/sub:translate-x-0.5 transition-transform">→</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No subcategories: show a placeholder row */}
              {(!category.subcategories || category.subcategories.length === 0) && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-muted-foreground italic">
                    {loc === 'bg' ? 'Без подкатегории' : 'No subcategories'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Footer note */}
      <footer className="text-center text-sm text-muted-foreground pt-6 pb-4 border-t">
        {loc === 'bg' ? 'Данни от' : 'Data from'}{' '}
        <a
          href="https://www.nsi.bg"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          {loc === 'bg' ? 'Национален статистически институт (НСИ)' : 'National Statistical Institute of Bulgaria (NSI)'}
        </a>
      </footer>
    </div>
  );
}
