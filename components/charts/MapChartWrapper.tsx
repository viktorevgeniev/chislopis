'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import MapChart with no SSR
const MapChart = dynamic(() => import('./MapChart').then(mod => ({ default: mod.MapChart })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
});

interface MapChartWrapperProps {
  data: any[];
  regionKey: string;
  valueKey: string;
  title?: string;
  locale?: 'bg' | 'en';
}

export function MapChartWrapper(props: MapChartWrapperProps) {
  return <MapChart {...props} />;
}
