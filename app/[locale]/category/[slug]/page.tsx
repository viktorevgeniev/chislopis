import Link from 'next/link';
import { getDatasetsByCategory, getDatasetsBySubcategory } from '@/lib/data/datasetRegistry';
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
  const allDatasets = getDatasetsByCategory(slug);
  // Only show datasets that have a custom dashboard implemented
  const datasets = allDatasets.filter(d => d.customVisualization);

  if (!category) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Category not found</h1>
        <p className="text-muted-foreground">The category &quot;{slug}&quot; does not exist.</p>
      </div>
    );
  }

  const loc = locale as 'bg' | 'en';
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  return (
    <div className="space-y-8">
      {/* Category Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{category.name[loc]}</h1>
        <p className="text-lg text-muted-foreground">
          {category.description[loc]}
        </p>
        <p className="text-sm text-muted-foreground">
          {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Subcategory Cards or Datasets */}
      {hasSubcategories ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {category.subcategories!.map((sub) => {
            const subDatasets = getDatasetsBySubcategory(slug, sub.id).filter(d => d.customVisualization);
            return (
              <Link
                key={sub.id}
                href={`/${locale}/category/${slug}/${sub.id}`}
                className="group block"
              >
                <div className="rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50">
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {sub.name[loc]}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {sub.description[loc]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subDatasets.length} dataset{subDatasets.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : datasets.length === 0 ? (
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
              locale={loc}
            />
          ))}
        </div>
      )}
    </div>
  );
}
