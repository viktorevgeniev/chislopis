import { NextRequest, NextResponse } from 'next/server';
import { getAllDatasets, getDatasetsByCategory } from '@/lib/data/datasetRegistry';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    const datasets = category
      ? getDatasetsByCategory(category)
      : getAllDatasets();

    return NextResponse.json({
      success: true,
      data: {
        datasets,
        total: datasets.length,
        category: category || null
      }
    });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch datasets',
          code: 'FETCH_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
