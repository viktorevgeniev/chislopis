import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getAllStories } from '@/lib/data/stories';

export default async function StoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('stories');
  const stories = getAllStories();
  const loc = locale as 'bg' | 'en';

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{t('allStories')}</h1>
        <p className="text-muted-foreground">{t('allStoriesSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stories.map((story) => {
          const TrendIcon =
            story.trend === 'up'
              ? TrendingUp
              : story.trend === 'down'
                ? TrendingDown
                : Minus;
          const trendColor =
            story.trend === 'up'
              ? 'text-rose-500'
              : story.trend === 'down'
                ? 'text-emerald-500'
                : 'text-muted-foreground';

          return (
            <Link key={story.slug} href={`/${locale}/stories/${story.slug}`}>
              <div className="h-full flex flex-col rounded-2xl border p-6 transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-lg font-bold">{story.title[loc]}</h2>
                  {story.highlightValue && (
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-2xl font-bold tabular-nums text-primary">
                        {story.highlightValue}
                      </span>
                      {story.trend && (
                        <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                          <TrendIcon className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {story.description[loc]}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('stepsCount', { count: story.steps.length })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t('readStory')} <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
