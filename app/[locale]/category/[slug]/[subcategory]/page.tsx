import Link from 'next/link';
import { getDatasetsBySubcategory } from '@/lib/data/datasetRegistry';
import { getCategoryById, getSubcategoryById } from '@/lib/data/categories';
import { VisualizationCard } from '@/components/visualization/VisualizationCard';
import { CategoryId } from '@/types/dataset';

export default async function SubcategoryPage({
  params
}: {
  params: Promise<{ locale: string; slug: string; subcategory: string }>;
}) {
  const { locale, slug, subcategory: subcategoryId } = await params;
  const category = getCategoryById(slug as CategoryId);
  const subcategory = getSubcategoryById(slug as CategoryId, subcategoryId);
  const datasets = getDatasetsBySubcategory(slug, subcategoryId);

  const loc = locale as 'bg' | 'en';

  if (!category || !subcategory) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Not found</h1>
        <p className="text-muted-foreground">
          The subcategory &quot;{subcategoryId}&quot; does not exist.
        </p>
        <Link
          href={`/${locale}/category/${slug}`}
          className="text-primary hover:underline mt-4 inline-block"
        >
          &larr; {loc === 'bg' ? 'Назад към категорията' : 'Back to category'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
          {loc === 'bg' ? 'Начало' : 'Home'}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/${locale}/category/${slug}`}
          className="hover:text-foreground transition-colors"
        >
          {category.name[loc]}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">{subcategory.name[loc]}</span>
      </nav>

      {/* Subcategory Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{subcategory.name[loc]}</h1>
        <p className="text-lg text-muted-foreground">
          {subcategory.description[loc]}
        </p>
        <p className="text-sm text-muted-foreground">
          {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Datasets */}
      {datasets.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">
            No datasets available in this subcategory yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {datasets.map((dataset) => (
            <VisualizationCard
              key={dataset.id}
              dataset={dataset}
              locale={loc}
            />
          ))}
        </div>
      )}
    </div>
  );
}
