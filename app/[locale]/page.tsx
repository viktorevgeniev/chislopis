import { getTranslations } from 'next-intl/server';
import { CategoryNav } from '@/components/layout/CategoryNav';
import { DatasetSearch } from '@/components/search/DatasetSearch';
import { getAllDatasets } from '@/lib/data/datasetRegistry';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('home');
  const datasets = getAllDatasets();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-12">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          {t('title')}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          {t('subtitle')}
        </p>
        <DatasetSearch locale={locale as 'bg' | 'en'} />
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{datasets.length}</div>
            <div className="text-sm text-muted-foreground">
              {t('datasetsCount', { count: datasets.length })}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">{t('explore')}</h2>
          <p className="text-muted-foreground">
            Select a category to view interactive visualizations
          </p>
        </div>
        <CategoryNav locale={locale as 'bg' | 'en'} />
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground pt-12 pb-6 border-t">
        <p>
          Data source:{' '}
          <a
            href="https://www.nsi.bg"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            National Statistical Institute of Bulgaria (NSI)
          </a>
        </p>
      </footer>
    </div>
  );
}
