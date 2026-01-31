/**
 * In-memory cache for dataset data
 * Reduces API calls and improves performance
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  locale: string;
}

// Simple in-memory cache (server-side only)
const cache = new Map<string, CacheEntry>();

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Generates cache key from dataset ID and locale
 */
function getCacheKey(datasetId: string, locale: string): string {
  return `${datasetId}:${locale}`;
}

/**
 * Retrieves cached data if available and not expired
 */
export function getCachedData(datasetId: string, locale: string): any | null {
  const key = getCacheKey(datasetId, locale);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const age = now - entry.timestamp;

  if (age > CACHE_DURATION) {
    // Cache expired, remove it
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Stores data in cache
 */
export function setCachedData(
  datasetId: string,
  locale: string,
  data: any
): void {
  const key = getCacheKey(datasetId, locale);
  cache.set(key, {
    data,
    timestamp: Date.now(),
    locale
  });
}

/**
 * Clears specific cache entry
 */
export function clearCache(datasetId: string, locale?: string): void {
  if (locale) {
    const key = getCacheKey(datasetId, locale);
    cache.delete(key);
  } else {
    // Clear all locales for this dataset
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      if (key.startsWith(`${datasetId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cache.delete(key));
  }
}

/**
 * Clears all cached data
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Gets cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      locale: entry.locale
    }))
  };
}
