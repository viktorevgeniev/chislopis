import { getDatasetsByCategory } from '@/lib/data/datasetRegistry';
import { getCategoryById } from '@/lib/data/categories';
import { VisualizationCard } from '@/components/visualization/VisualizationCard';
import { CategoryId } from '@/types/dataset';

export default async function CategoryPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const category = getCategoryById(slug as CategoryId);
  const datasets = getDatasetsByCategory(slug);

  if (!category) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        <p className="text-muted-foreground">The category &quot;{slug}&quot; does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{category.name[locale as 'bg' | 'en']}</h1>
        <p className="text-lg text-muted-foreground">
          {category.description[locale as 'bg' | 'en']}
        </p>
        <p className="text-sm text-muted-foreground">
          {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Datasets Grid */}
      {datasets.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">
            No datasets available in this category yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {datasets.map((dataset) => (
            <VisualizationCard
              key={dataset.id}
              dataset={dataset}
              locale={locale as 'bg' | 'en'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
