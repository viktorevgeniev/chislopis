'use client';

import React, { useEffect, useRef } from 'react';
import { bulgariaGeoJSON } from '@/lib/geo/bulgariaGeoJSON';
import { findRegionByName } from '@/lib/geo/bulgariaRegions';

interface MapChartProps {
  data: any[];
  regionKey: string;
  valueKey: string;
  title?: string;
  locale?: 'bg' | 'en';
}

export function MapChart({ data, regionKey, valueKey, title, locale = 'en' }: MapChartProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !data || data.length === 0) return;

    // Dynamically import Leaflet and CSS
    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      // @ts-ignore - CSS import handled by bundler
      await import('leaflet/dist/leaflet.css');

      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Initialize map centered on Bulgaria
      const map = L.map(mapRef.current!).setView([42.7339, 25.4858], 7);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Create value map from data
      const valueMap = new Map<string, number>();
      data.forEach(item => {
        const regionName = item[regionKey];
        const value = parseFloat(item[valueKey]);
        if (regionName && !isNaN(value)) {
          valueMap.set(regionName.toLowerCase(), value);
        }
      });

      // Find min and max values for color scaling
      const values = Array.from(valueMap.values());
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      // Color scale function
      const getColor = (value: number) => {
        const ratio = (value - minValue) / (maxValue - minValue);
        const hue = (1 - ratio) * 240; // Blue (240) to red (0)
        return `hsl(${hue}, 70%, 50%)`;
      };

      // Add markers for each region
      bulgariaGeoJSON.features.forEach(feature => {
        const regionName = locale === 'bg' ? feature.properties.name : feature.properties.name_en;
        const value = valueMap.get(feature.properties.name.toLowerCase()) ||
                      valueMap.get(feature.properties.name_en.toLowerCase());

        if (value !== undefined && feature.geometry.type === 'Point') {
          const coords = feature.geometry.coordinates;
          const color = getColor(value);

          // Create circle marker
          const circle = L.circleMarker([coords[1], coords[0]], {
            radius: 15,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
          }).addTo(map);

          // Add popup
          circle.bindPopup(`
            <div class="text-sm">
              <strong>${regionName}</strong><br/>
              ${valueKey}: ${value.toLocaleString()}
            </div>
          `);
        }
      });

      // Add legend
      const legend = (L.control as any)({ position: 'bottomright' });
      legend.onAdd = () => {
        const div = L.DomUtil.create('div', 'bg-white p-2 rounded shadow-md');
        div.innerHTML = `
          <div class="text-xs font-medium mb-1">${valueKey}</div>
          <div class="flex items-center gap-1 text-xs">
            <div class="w-4 h-4 rounded" style="background: ${getColor(minValue)}"></div>
            <span>${minValue.toLocaleString()}</span>
          </div>
          <div class="flex items-center gap-1 text-xs mt-1">
            <div class="w-4 h-4 rounded" style="background: ${getColor(maxValue)}"></div>
            <span>${maxValue.toLocaleString()}</span>
          </div>
        `;
        return div;
      };
      legend.addTo(map);
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [data, regionKey, valueKey, locale]);

  return <div ref={mapRef} className="w-full h-full min-h-[500px] rounded-lg" />;
}
