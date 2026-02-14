'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Dataset } from '@/types/dataset';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { Card, CardContent } from '@/components/ui/card';

function DashboardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      </CardContent>
    </Card>
  );
}

const PopulationDashboard = dynamic(() => import('@/components/charts/PopulationDashboard').then(m => ({ default: m.PopulationDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });
const PopulationByDistrictsDashboard = dynamic(() => import('@/components/charts/PopulationByDistrictsDashboard').then(m => ({ default: m.PopulationByDistrictsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });
const VitalStatisticsDashboard = dynamic(() => import('@/components/charts/VitalStatisticsDashboard').then(m => ({ default: m.VitalStatisticsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });
const BirthsDashboard = dynamic(() => import('@/components/charts/BirthsDashboard').then(m => ({ default: m.BirthsDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });
const MortalityDashboard = dynamic(() => import('@/components/charts/MortalityDashboard').then(m => ({ default: m.MortalityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });
const WeeklyMortalityDashboard = dynamic(() => import('@/components/charts/WeeklyMortalityDashboard').then(m => ({ default: m.WeeklyMortalityDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });
const MarriagesDashboard = dynamic(() => import('@/components/charts/MarriagesDashboard').then(m => ({ default: m.MarriagesDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });
const DivorcesDashboard = dynamic(() => import('@/components/charts/DivorcesDashboard').then(m => ({ default: m.DivorcesDashboard })), { loading: () => <DashboardSkeleton />, ssr: false });

interface VisualizationCardProps {
  dataset: Dataset;
  locale: 'bg' | 'en';
}

export function VisualizationCard({ dataset, locale }: VisualizationCardProps) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/data/${dataset.id}?locale=${locale}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result.data.data.rows);
      } catch (err) {
        console.error('Error fetching dataset:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dataset.id, locale]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-destructive">
            <p className="font-medium mb-2">Error loading data</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Check if dataset has custom visualization
  if (dataset.customVisualization === 'PopulationDashboard') {
    return <PopulationDashboard data={data} locale={locale} />;
  }

  if (dataset.customVisualization === 'PopulationByDistrictsDashboard') {
    return <PopulationByDistrictsDashboard data={data} locale={locale} />;
  }

  if (dataset.customVisualization === 'BirthsDashboard') {
    return <BirthsDashboard data={data} dataset={dataset} locale={locale} />;
  }

  if (dataset.customVisualization === 'MortalityDashboard') {
    return <MortalityDashboard data={data} dataset={dataset} locale={locale} />;
  }

  if (dataset.customVisualization === 'WeeklyMortalityDashboard') {
    return <WeeklyMortalityDashboard data={data} dataset={dataset} locale={locale} />;
  }

  if (dataset.customVisualization === 'MarriagesDashboard') {
    return <MarriagesDashboard data={data} dataset={dataset} locale={locale} />;
  }

  if (dataset.customVisualization === 'DivorcesDashboard') {
    return <DivorcesDashboard data={data} dataset={dataset} locale={locale} />;
  }

  if (dataset.customVisualization === 'VitalStatisticsDashboard') {
    return <VitalStatisticsDashboard data={data} dataset={dataset} locale={locale} />;
  }

  return (
    <ChartContainer
      data={data}
      dataset={dataset}
      title={dataset.title[locale]}
      locale={locale}
    />
  );
}
