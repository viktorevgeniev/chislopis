'use client';

import React, { useState } from 'react';
import { ChartType, Dataset } from '@/types/dataset';
import { selectChartType, suggestAlternativeCharts, analyzeData } from '@/lib/charts/chartSelector';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { PieChart } from './PieChart';
import { MapChartWrapper } from './MapChartWrapper';
import { DataTable } from './DataTable';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartContainerProps {
  data: any[];
  dataset?: Dataset;
  title?: string;
  initialChartType?: ChartType;
  locale?: 'bg' | 'en';
}

export function ChartContainer({
  data,
  dataset,
  title,
  initialChartType,
  locale = 'en'
}: ChartContainerProps) {
  const autoSelectedType = initialChartType || selectChartType(data, dataset);
  const [selectedType, setSelectedType] = useState<ChartType>(autoSelectedType);
  const alternativeTypes = suggestAlternativeCharts(data, dataset);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const characteristics = analyzeData(data, dataset);

  // Find suitable keys for visualization
  const numericalDim = characteristics.dimensions.find(d => d.type === 'numerical');
  const categoricalDim = characteristics.dimensions.find(d => d.type === 'categorical');
  const temporalDim = characteristics.dimensions.find(d => d.type === 'temporal');
  const geographicDim = characteristics.dimensions.find(d => d.type === 'geographic');

  const renderChart = () => {
    try {
      switch (selectedType) {
        case 'line':
          if (temporalDim && numericalDim) {
            return (
              <LineChart
                data={data}
                xKey={temporalDim.name}
                yKey={numericalDim.name}
                title={title}
              />
            );
          }
          return <div className="text-muted-foreground">Insufficient data for line chart</div>;

        case 'bar':
          if (categoricalDim && numericalDim) {
            return (
              <BarChart
                data={data.slice(0, 50)} // Limit for readability
                xKey={categoricalDim.name}
                yKey={numericalDim.name}
                title={title}
              />
            );
          } else if (temporalDim && numericalDim) {
            return (
              <BarChart
                data={data.slice(0, 50)}
                xKey={temporalDim.name}
                yKey={numericalDim.name}
                title={title}
              />
            );
          }
          return <div className="text-muted-foreground">Insufficient data for bar chart</div>;

        case 'pie':
          if (categoricalDim && numericalDim) {
            return (
              <PieChart
                data={data.slice(0, 15)} // Limit categories for pie chart
                nameKey={categoricalDim.name}
                valueKey={numericalDim.name}
                title={title}
              />
            );
          }
          return <div className="text-muted-foreground">Insufficient data for pie chart</div>;

        case 'map':
          if (geographicDim && numericalDim) {
            return (
              <MapChartWrapper
                data={data}
                regionKey={geographicDim.name}
                valueKey={numericalDim.name}
                title={title}
                locale={locale}
              />
            );
          }
          return <div className="text-muted-foreground">Insufficient data for map</div>;

        case 'table':
          return <DataTable data={data} locale={locale} />;

        default:
          return <DataTable data={data} locale={locale} />;
      }
    } catch (error) {
      console.error('Chart rendering error:', error);
      return (
        <div className="text-destructive">
          Error rendering chart. Showing data table instead.
          <DataTable data={data} />
        </div>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title || dataset?.title[locale] || 'Data Visualization'}</CardTitle>
          {alternativeTypes.length > 1 && (
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ChartType)}
              className="w-40"
            >
              {alternativeTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </Select>
          )}
        </div>
        {dataset && (
          <p className="text-sm text-muted-foreground mt-2">
            {dataset.description[locale]}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="w-full">{renderChart()}</div>
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Data points: {data.length.toLocaleString()}</p>
          <p>
            Dimensions: {characteristics.categoricalDimensions} categorical,{' '}
            {characteristics.numericalDimensions} numerical,{' '}
            {characteristics.temporalDimensions} temporal,{' '}
            {characteristics.geographicDimensions} geographic
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
