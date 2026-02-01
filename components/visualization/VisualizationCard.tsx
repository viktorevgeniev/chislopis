'use client';

import React, { useState, useEffect } from 'react';
import { Dataset } from '@/types/dataset';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { PopulationDashboard } from '@/components/charts/PopulationDashboard';
import { Card, CardContent } from '@/components/ui/card';

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

  return (
    <ChartContainer
      data={data}
      dataset={dataset}
      title={dataset.title[locale]}
      locale={locale}
    />
  );
}
