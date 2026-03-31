'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus, ArrowRight, BarChart3 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

  const trendColor = 'text-foreground';

  return (
    <section>
      {/* Featured Story badge */}
      <div className="mb-6">
        <span className="inline-flex items-center px-3 py-1 bg-secondary-container text-secondary rounded-full text-xs font-bold tracking-widest uppercase">
          <span className="mr-1.5">&#10022;</span>
          {t('featuredStory')}
        </span>
      </div>

      {/* Big editorial header */}
      <div className="mb-8">
        <h2 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tighter text-foreground leading-[1.05] mb-4">
          {story.title[locale]}
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
          {story.description[locale]}
        </p>
      </div>

      {/* Bento grid: hero metric + chapters sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Hero Metric Card */}
        <div className="lg:col-span-8 bg-card rounded-xl overflow-hidden relative shadow-ambient border border-outline/10">
          <div className="p-8 md:p-12 flex flex-col justify-between h-full">
            {/* Stat */}
            {story.highlightValue && (
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-2 opacity-80">
                  {t('storySteps')}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl md:text-8xl font-extrabold font-headline tracking-tighter text-foreground">
                    {story.highlightValue}
                  </span>
                </div>
                {story.trend && (
                  <div className={`flex items-center gap-2 mt-3 font-semibold ${trendColor}`}>
                    <TrendIcon
                      className="w-5 h-5"
                      aria-label={story.trend === 'up' ? t('trendUp') : story.trend === 'down' ? t('trendDown') : undefined}
                    />
                    <span className="text-base tracking-tight">
                      {story.trend === 'up' ? t('trendUp') : story.trend === 'down' ? t('trendDown') : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={`/${locale}/stories/${story.slug}`}
                className={cn(buttonVariants({ size: 'lg' }), 'font-headline gap-2')}
              >
                {t('readStory')}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Side: In This Story */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-card p-6 md:p-8 rounded-xl flex-grow shadow-ambient border border-outline/10">
            <h3 className="font-headline text-xl font-bold mb-5 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {t('storySteps')}
            </h3>
            <nav className="space-y-3">
              {story.steps.map((step, i) => (
                <div
                  key={i}
                  className="block p-3 bg-muted rounded-lg"
                >
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    {locale === 'bg' ? 'Глава' : 'Chapter'} {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="text-base font-bold font-headline text-foreground">
                    {step.title[locale]}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
