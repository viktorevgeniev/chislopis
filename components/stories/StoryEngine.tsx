'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getDatasetById } from '@/lib/data/datasetRegistry';
import { getStoryBySlug, getNextStory } from '@/lib/data/stories';
import { ArrowRight } from 'lucide-react';
import { StoryChart, type StoryChartHandle } from './StoryChart';
import { StoryStepCard } from './StoryStepCard';
import { cn } from '@/lib/utils';
import type { Story, StoryStep } from '@/types/story';
import type { NormalizedData } from '@/types/dataset';
import type { EChartsOption } from '@/lib/echarts';

interface StoryEngineProps {
  slug: string;
  locale: 'bg' | 'en';
}

export function StoryEngine({ slug, locale }: StoryEngineProps) {
  const t = useTranslations('stories');
  // Resolve the story client-side so non-serializable values (e.g. formatter
  // functions in echartsConfig) never cross the server/client boundary.
  const story = getStoryBySlug(slug) as Story;
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadingSteps, setLoadingSteps] = useState<Set<number>>(new Set());
  const chartRef = useRef<StoryChartHandle>(null);
  const dataCache = useRef<Map<string, NormalizedData>>(new Map());
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Build the "View Full Dataset" URL for a given step
  function getDatasetUrl(step: StoryStep): string {
    const dataset = getDatasetById(step.datasetId);
    if (!dataset) return `/${locale}`;
    if (dataset.subcategory) {
      return `/${locale}/category/${dataset.category}/${dataset.subcategory}`;
    }
    return `/${locale}/category/${dataset.category}`;
  }

  // Apply focusFilter, then build and push the ECharts option
  const applyStepToChart = useCallback(
    (step: StoryStep, normalized: NormalizedData) => {
      // 1. Filter rows
      let rows: Record<string, unknown>[] = normalized.rows as Record<string, unknown>[];
      if (step.focusFilter) {
        rows = rows.filter((row) =>
          Object.entries(step.focusFilter!).every(([key, value]) => {
            const rowVal = String(row[key] ?? '');
            return Array.isArray(value)
              ? value.includes(rowVal)
              : rowVal === value;
          }),
        );
      }

      let option: EChartsOption;

      if (step.seriesGroupBy) {
        // 2a. Multi-series: group rows by the specified column
        const groups = new Map<string, Record<string, unknown>[]>();
        for (const row of rows) {
          const key = String(row[step.seriesGroupBy] ?? '');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(row);
        }

        // Extract encode settings from the first series in echartsConfig
        const seriesTemplate = Array.isArray(step.echartsConfig.series)
          ? step.echartsConfig.series[0]
          : step.echartsConfig.series;
        const encodeX =
          (seriesTemplate as { encode?: { x?: string; y?: string } })?.encode
            ?.x ?? 'Year';
        const encodeY =
          (seriesTemplate as { encode?: { x?: string; y?: string } })?.encode
            ?.y ?? 'Population';

        option = {
          ...step.echartsConfig,
          // Remove dataset — we use explicit series.data instead
          dataset: undefined,
          series: Array.from(groups.entries()).map(([name, groupRows]) => ({
            ...(seriesTemplate as object),
            name,
            encode: undefined,
            data: groupRows.map((r) => [r[encodeX], r[encodeY]]),
          })),
        } as EChartsOption;
      } else {
        // 2b. Single series: inject rows as dataset.source
        option = {
          ...step.echartsConfig,
          dataset: { source: rows },
        };
      }

      chartRef.current?.setOption(option, { notMerge: false });
    },
    [],
  );

  // Fetch data for a step, use cache if available
  const fetchStepData = useCallback(
    async (step: StoryStep, stepIndex: number) => {
      const cached = dataCache.current.get(step.datasetId);
      if (cached) {
        applyStepToChart(step, cached);
        return;
      }

      setLoadingSteps((prev) => new Set(prev).add(stepIndex));
      try {
        const res = await fetch(
          `/api/data/${step.datasetId}?locale=${locale}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const normalized: NormalizedData = json.data.data;
        dataCache.current.set(step.datasetId, normalized);
        applyStepToChart(step, normalized);
      } catch (err) {
        console.error('StoryEngine: failed to fetch', step.datasetId, err);
      } finally {
        setLoadingSteps((prev) => {
          const next = new Set(prev);
          next.delete(stepIndex);
          return next;
        });
      }
    },
    [locale, applyStepToChart],
  );

  // Load data whenever the active step changes
  useEffect(() => {
    const step = story.steps[activeIndex];
    if (step) fetchStepData(step, activeIndex);
  }, [activeIndex, story.steps, fetchStepData]);

  // Register IntersectionObserver for all step cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = stepRefs.current.indexOf(
              entry.target as HTMLDivElement,
            );
            if (idx !== -1) setActiveIndex(idx);
          }
        });
      },
      {
        threshold: 0.4,
        // rootMargin shifts the trigger zone down past the sticky header (~64px)
        rootMargin: '-64px 0px 0px 0px',
      },
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // Re-register when step count changes (e.g. if story prop is swapped)
  }, [story.steps.length]);

  return (
    <div className="relative">
      {/* Story header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">{story.title[locale]}</h1>
        <p className="text-muted-foreground">{story.description[locale]}</p>
      </div>

      {/* Two-column layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Left: sticky chart */}
        <div className="lg:sticky lg:top-20 mb-6 lg:mb-0">
          <StoryChart
            ref={chartRef}
            isLoading={loadingSteps.has(activeIndex)}
          />

          {/* Step indicator dots */}
          <div className="flex justify-center gap-2 mt-4">
            {story.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  stepRefs.current[i]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                }}
                className={cn(
                  'w-2.5 h-2.5 rounded-full transition-colors',
                  i === activeIndex
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60',
                )}
                aria-label={`${t('step')} ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right: scrollable step cards */}
        <div className="space-y-[60vh]">
          {story.steps.map((step, i) => (
            <StoryStepCard
              key={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              step={step}
              locale={locale}
              stepNumber={i + 1}
              totalSteps={story.steps.length}
              isActive={i === activeIndex}
              datasetUrl={getDatasetUrl(step)}
              labelStep={t('step')}
              labelViewFullDataset={t('viewFullDataset')}
            />
          ))}

          {/* Bottom padding so the last card can scroll into the observer zone */}
          <div className="h-[40vh]" />
        </div>
      </div>

      {/* Next Story footer */}
      {(() => {
        const nextStory = getNextStory(slug);
        if (!nextStory) return null;
        return (
          <div className="mt-16 max-w-md mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('nextStory')}
            </span>
            <Link
              href={`/${locale}/stories/${nextStory.slug}`}
              className="mt-2 flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-lg hover:border-primary/30"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {nextStory.title[locale]}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {nextStory.description[locale]}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        );
      })()}
    </div>
  );
}
