import Papa from 'papaparse';
import { NormalizedData } from '@/types/dataset';

export interface CSVFetchOptions {
  url: string;
  encoding?: string;
  delimiter?: string;
}

/**
 * Fetches and parses CSV data from NSI
 */
export async function fetchCSV(options: CSVFetchOptions): Promise<any[]> {
  const { url, delimiter = ',' } = options;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/csv',
      },
      cache: 'no-store' // Disable caching for fresh data
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        delimiter,
        dynamicTyping: true, // Automatically convert numbers
        transformHeader: (header: string) => {
          // Clean and normalize headers
          return header.trim();
        },
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          resolve(results.data as any[]);
        },
        error: (error: any) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  } catch (error) {
    console.error('Error fetching CSV:', error);
    throw error;
  }
}

/**
 * Validates CSV data structure
 */
export function validateCSVData(data: any[]): boolean {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  // Check if first row has at least one property
  const firstRow = data[0];
  return typeof firstRow === 'object' && Object.keys(firstRow).length > 0;
}
