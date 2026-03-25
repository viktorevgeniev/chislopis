'use client';

import React, { forwardRef } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StoryStep } from '@/types/story';

interface StoryStepCardProps {
  step: StoryStep;
  locale: 'bg' | 'en';
  stepNumber: number;
  totalSteps: number;
  isActive: boolean;
  datasetUrl: string;
  labelStep: string;
  labelViewFullDataset: string;
}

export const StoryStepCard = forwardRef<HTMLDivElement, StoryStepCardProps>(
  function StoryStepCard(
    {
      step,
      locale,
      stepNumber,
      totalSteps,
      isActive,
      datasetUrl,
      labelStep,
      labelViewFullDataset,
    },
    ref,
  ) {
    return (
      <div ref={ref} className="scroll-mt-24">
        <Card
          className={cn(
            'transition-all duration-300',
            isActive
              ? 'border-primary shadow-lg'
              : 'border-border opacity-60',
          )}
        >
          <CardHeader className="pb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {labelStep} {stepNumber} / {totalSteps}
            </p>
            <CardTitle className="text-xl leading-snug">
              {step.title[locale]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed text-foreground/90">
              {step.content[locale]}
            </p>
            <Link
              href={datasetUrl}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {labelViewFullDataset} →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  },
);
