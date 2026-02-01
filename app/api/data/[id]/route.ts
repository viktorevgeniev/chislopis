import { NextRequest, NextResponse } from 'next/server';
import { getDatasetById } from '@/lib/data/datasetRegistry';
import { fetchCSV } from '@/lib/data/fetchers/csvFetcher';
import { fetchJSONStat } from '@/lib/data/fetchers/jsonStatFetcher';
import { fetchAndProcessMultiCsv } from '@/lib/data/fetchers/multiCsvFetcher';
import { getCachedData, setCachedData } from '@/lib/data/fetchers/dataCache';
import { normalizeData } from '@/lib/data/transformers/normalizeData';
import { generateMockData, shouldUseMockData } from '@/lib/data/fetchers/mockData';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = (searchParams.get('locale') || 'en') as 'bg' | 'en';

    // Get dataset metadata
    const dataset = getDatasetById(id);
    if (!dataset) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Dataset not found',
            code: 'NOT_FOUND'
          }
        },
        { status: 404 }
      );
    }

    // Check cache first
    const cachedData = getCachedData(id, locale);
    if (cachedData) {
      const normalized = normalizeData(cachedData);
      return NextResponse.json({
        success: true,
        data: {
          dataset,
          data: normalized,
          cached: true
        }
      });
    }

    // Try to fetch real data from NSI, fallback to mock data
    let rawData: any[];
    let usedMockData = false;

    // Multi-CSV datasets always try to fetch real data (they have special processing)
    const isMultiCsvDataset = dataset.fieldsUrl && dataset.codeListsUrl;

    if (shouldUseMockData() && !isMultiCsvDataset) {
      // Use mock data in development (except for multi-CSV datasets)
      rawData = generateMockData(dataset, locale);
      usedMockData = true;
    } else {
      try {
        // Fetch data from NSI
        const url = dataset.urls[locale];

        // Check if this is a multi-CSV dataset (has fieldsUrl and codeListsUrl)
        if (isMultiCsvDataset) {
          console.log('Fetching multi-CSV dataset:', id, url);
          const processedData = await fetchAndProcessMultiCsv(
            url,
            dataset.fieldsUrl![locale],
            dataset.codeListsUrl![locale]
          );
          console.log('Processed data rows:', processedData.rows.length, 'Sample:', processedData.rows[0]);
          rawData = processedData.rows;
        } else if (dataset.format === 'csv') {
          rawData = await fetchCSV({ url });
        } else {
          rawData = await fetchJSONStat(url);
        }
      } catch (fetchError) {
        // Fallback to mock data if real fetch fails
        console.warn('Real data fetch failed, using mock data:', fetchError);
        rawData = generateMockData(dataset, locale);
        usedMockData = true;
      }
    }

    // Cache the data
    if (!usedMockData) {
      setCachedData(id, locale, rawData);
    }

    // Normalize data
    const normalized = normalizeData(rawData);

    return NextResponse.json({
      success: true,
      data: {
        dataset,
        data: normalized,
        cached: false,
        mockData: usedMockData
      }
    });
  } catch (error) {
    console.error('Error fetching dataset data:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch data',
          code: 'FETCH_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
