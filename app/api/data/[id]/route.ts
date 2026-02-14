import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDatasetById } from '@/lib/data/datasetRegistry';
import { fetchCSV } from '@/lib/data/fetchers/csvFetcher';
import { fetchJSONStat } from '@/lib/data/fetchers/jsonStatFetcher';
import { fetchAndProcessMultiCsv } from '@/lib/data/fetchers/multiCsvFetcher';
import { processLocalDataset } from '@/lib/data/fetchers/localCsvLoader';
import { getCachedData, setCachedData } from '@/lib/data/fetchers/dataCache';
import { normalizeData } from '@/lib/data/transformers/normalizeData';
import type { NormalizedData } from '@/types/dataset';
import { generateMockData, shouldUseMockData } from '@/lib/data/fetchers/mockData';

/** Standard cache headers for dataset responses (data is static). */
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};

function jsonResponse(body: object, extra?: { headers?: Record<string, string>; status?: number }) {
  const headers = new Headers({ ...CACHE_HEADERS, ...extra?.headers });
  return NextResponse.json(body, { headers, status: extra?.status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const locale = (searchParams.get('locale') || 'en') as 'bg' | 'en';

    // Pagination (opt-in)
    const page = parseInt(searchParams.get('page') || '0');
    const pageSize = parseInt(searchParams.get('pageSize') || '0');

    // Get dataset metadata
    const dataset = getDatasetById(id);
    if (!dataset) {
      return NextResponse.json(
        { success: false, error: { message: 'Dataset not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Priority 0: Try pre-built JSON (fastest path for local datasets)
    if (dataset.localNsiId) {
      const prebuildPath = path.join(process.cwd(), 'public', 'data', `${dataset.localNsiId}.json`);
      try {
        const stat = await fs.promises.stat(prebuildPath);
        const etag = `"${dataset.localNsiId}-${stat.mtimeMs}"`;

        // 304 Not Modified
        const ifNoneMatch = request.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
          return new NextResponse(null, {
            status: 304,
            headers: { ...CACHE_HEADERS, ETag: etag },
          });
        }

        const json = await fs.promises.readFile(prebuildPath, 'utf-8');
        const normalized: NormalizedData = JSON.parse(json);
        const paginated = applyPagination(normalized, page, pageSize);

        return jsonResponse(
          { success: true, data: { dataset, data: paginated.data, cached: false, prebuilt: true, ...paginated.meta } },
          { headers: { ETag: etag } }
        );
      } catch {
        // Pre-built file not found — fall through to CSV processing
      }
    }

    // Check in-memory cache
    const cachedData = getCachedData(id, locale);
    if (cachedData) {
      const normalized = normalizeData(cachedData);
      const paginated = applyPagination(normalized, page, pageSize);
      return jsonResponse({
        success: true,
        data: { dataset, data: paginated.data, cached: true, ...paginated.meta }
      });
    }

    let rawData: any[];
    let usedMockData = false;

    // Priority 1: Load from local files if localNsiId is set
    if (dataset.localNsiId) {
      try {
        const processedData = await processLocalDataset(
          dataset.localNsiId,
          dataset.valueColumnName || 'Population'
        );
        rawData = processedData.rows;
      } catch (localError) {
        console.error('Local data load failed:', localError);
        rawData = generateMockData(dataset, locale);
        usedMockData = true;
      }
    }
    // Priority 2: Multi-CSV datasets (remote fetch)
    else if (dataset.fieldsUrl && dataset.codeListsUrl) {
      try {
        const url = dataset.urls[locale];
        const processedData = await fetchAndProcessMultiCsv(
          url,
          dataset.fieldsUrl[locale],
          dataset.codeListsUrl[locale]
        );
        rawData = processedData.rows;
      } catch (fetchError) {
        console.warn('Multi-CSV fetch failed, using mock data:', fetchError);
        rawData = generateMockData(dataset, locale);
        usedMockData = true;
      }
    }
    // Priority 3: Simple CSV/JSON-stat or mock data
    else if (shouldUseMockData()) {
      rawData = generateMockData(dataset, locale);
      usedMockData = true;
    } else {
      try {
        const url = dataset.urls[locale];
        if (dataset.format === 'csv') {
          rawData = await fetchCSV({ url });
        } else {
          rawData = await fetchJSONStat(url);
        }
      } catch (fetchError) {
        console.warn('Real data fetch failed, using mock data:', fetchError);
        rawData = generateMockData(dataset, locale);
        usedMockData = true;
      }
    }

    // Cache the data
    if (!usedMockData) {
      setCachedData(id, locale, rawData);
    }

    const normalized = normalizeData(rawData);
    const paginated = applyPagination(normalized, page, pageSize);

    return jsonResponse({
      success: true,
      data: {
        dataset,
        data: paginated.data,
        cached: false,
        mockData: usedMockData,
        ...paginated.meta
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

/** Applies optional pagination to normalized data. */
function applyPagination(data: NormalizedData, page: number, pageSize: number) {
  if (page > 0 && pageSize > 0) {
    const startIndex = (page - 1) * pageSize;
    const paginatedRows = data.rows.slice(startIndex, startIndex + pageSize);
    return {
      data: { ...data, rows: paginatedRows, metadata: { ...data.metadata, rowCount: paginatedRows.length } },
      meta: {
        pagination: {
          page,
          pageSize,
          totalRows: data.metadata.rowCount,
          totalPages: Math.ceil(data.metadata.rowCount / pageSize),
          hasNext: startIndex + pageSize < data.metadata.rowCount,
          hasPrev: page > 1,
        }
      }
    };
  }
  return { data, meta: {} };
}
