'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { getRandomStory } from '@/lib/data/stories';
import type { Story } from '@/types/story';

interface StorySnippetProps {
  locale: 'bg' | 'en';
}

export function StorySnippet({ locale }: StorySnippetProps) {
  const t = useTranslations('home');
  const [story, setStory] = useState<Story | null>(null);

  useEffect(() => {
    setStory(getRandomStory());
  }, []);

  // Avoid hydration mismatch — render nothing until client picks a story
  if (!story) return null;

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
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('featuredStory')}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Link href={`/${locale}/stories/${story.slug}`}>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-6 md:p-8 transition-all hover:shadow-lg cursor-pointer">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Main content */}
            <div className="flex-1 space-y-3">
              <h2 className="text-xl font-bold text-foreground">
                {story.title[locale]}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {story.description[locale]}
              </p>

              {/* Steps table of contents */}
              <div className="pt-2 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('storySteps')}
                </span>
                <ol className="space-y-0.5">
                  {story.steps.map((step, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-baseline gap-2"
                    >
                      <span className="text-xs font-medium text-primary/60">
                        {i + 1}.
                      </span>
                      {step.title[locale]}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="inline-flex items-center gap-1.5 text-sm font-medium text-primary pt-1">
                {t('readStory')} <ArrowRight className="h-4 w-4" />
              </div>
            </div>

            {/* Stat badge */}
            {story.highlightValue && (
              <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
                <div className="text-4xl font-bold tabular-nums text-primary">
                  {story.highlightValue}
                </div>
                {story.trend && (
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}
                  >
                    <TrendIcon className="h-4 w-4" />
                    {story.trend === 'up' ? t('trendUp') : story.trend === 'down' ? t('trendDown') : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}
