import { getTranslations } from 'next-intl/server';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { DatasetSearch } from '@/components/search/DatasetSearch';
import { getAllDatasets } from '@/lib/data/datasetRegistry';
import { StorySnippet } from '@/components/StorySnippet';
import { DiscoverMore } from '@/components/DiscoverMore';
import { categories } from '@/lib/data/categories';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('home');
  const datasets = getAllDatasets();

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-16 md:py-24">
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tighter text-foreground animate-fade-up">
          {t('title')}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-fade-up delay-100">
          {t('subtitle')}
        </p>
        <div className="animate-fade-up delay-200">
          <DatasetSearch locale={locale as 'bg' | 'en'} />
        </div>
        <div className="flex items-center justify-center gap-4 pt-4 animate-fade-up delay-300">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">
              {t('datasetsCount', { count: datasets.length })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Story */}
      <StorySnippet locale={locale as 'bg' | 'en'} />

      {/* Categories Section */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-headline font-bold mb-2">{t('explore')}</h2>
          <p className="text-muted-foreground">
            {t('exploreSubtitle')}
          </p>
        </div>
        <CategoryNav locale={locale as 'bg' | 'en'} />
      </section>

      {/* Discover More */}
      <DiscoverMore locale={locale as 'bg' | 'en'} categories={categories} />

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground pt-16 pb-8 border-t border-outline/20">
        <p>
          {t('dataSource')}{' '}
          <a
            href="https://www.nsi.bg"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            {t('dataSourceName')}
          </a>
        </p>
      </footer>
    </div>
  );
}
