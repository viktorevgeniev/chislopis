import { Dataset } from '@/types/dataset';

/**
 * Generates mock data for demonstration when real NSI data is unavailable
 */
export function generateMockData(dataset: Dataset, locale: 'bg' | 'en'): any[] {
  const rowCount = 30; // Default number of rows
  const data: any[] = [];

  // Helper to generate years
  const generateYears = (count: number) => {
    const currentYear = 2023;
    return Array.from({ length: count }, (_, i) => currentYear - count + i + 1);
  };

  // Helper to generate regions
  const regions = locale === 'bg'
    ? ['София-град', 'Пловдив', 'Варна', 'Бургас', 'Русе', 'Стара Загора']
    : ['Sofia City', 'Plovdiv', 'Varna', 'Burgas', 'Ruse', 'Stara Zagora'];

  // Generate data based on dataset characteristics
  if (dataset.hasTimeSeries && dataset.hasGeographic) {
    // Time series + geographic data
    const years = generateYears(5);
    years.forEach(year => {
      regions.forEach(region => {
        data.push({
          year,
          region,
          value: Math.floor(Math.random() * 1000000) + 500000
        });
      });
    });
  } else if (dataset.hasTimeSeries) {
    // Time series data only
    const years = generateYears(rowCount);
    years.forEach(year => {
      data.push({
        year,
        value: Math.floor(Math.random() * 5000) + 1000,
        ...(dataset.id.includes('foreign-trade') && {
          type: locale === 'bg' ? (Math.random() > 0.5 ? 'Износ' : 'Внос') : (Math.random() > 0.5 ? 'Export' : 'Import')
        })
      });
    });
  } else if (dataset.hasGeographic) {
    // Geographic data only
    regions.forEach(region => {
      data.push({
        region,
        value: Math.floor(Math.random() * 500000) + 100000
      });
    });
  } else if (dataset.category === 'labor' && dataset.id.includes('wages')) {
    // Wages by sector
    const sectors = locale === 'bg'
      ? ['Производство', 'Търговия', 'ИТ сектор', 'Здравеопазване', 'Образование', 'Транспорт']
      : ['Manufacturing', 'Trade', 'IT Sector', 'Healthcare', 'Education', 'Transport'];

    const quarters = ['Q1 2022', 'Q2 2022', 'Q3 2022', 'Q4 2022', 'Q1 2023', 'Q2 2023'];
    quarters.forEach(quarter => {
      sectors.forEach(sector => {
        data.push({
          quarter,
          sector,
          salary: Math.floor(Math.random() * 2000) + 1000
        });
      });
    });
  } else if (dataset.category === 'social' && dataset.id.includes('education')) {
    // Education enrollment
    const types = locale === 'bg'
      ? ['Начални училища', 'Средни училища', 'Гимназии', 'Университети', 'Професионални училища']
      : ['Primary Schools', 'Middle Schools', 'High Schools', 'Universities', 'Vocational Schools'];

    const years = generateYears(10);
    years.forEach(year => {
      types.forEach(type => {
        data.push({
          year,
          type,
          students: Math.floor(Math.random() * 50000) + 10000
        });
      });
    });
  } else {
    // Generic categorical data
    const categories = locale === 'bg'
      ? ['Категория А', 'Категория Б', 'Категория В', 'Категория Г', 'Категория Д']
      : ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];

    categories.forEach(category => {
      data.push({
        category,
        value: Math.floor(Math.random() * 10000) + 1000
      });
    });
  }

  return data;
}

/**
 * Check if we should use mock data (for demo purposes)
 */
export function shouldUseMockData(): boolean {
  // Always use mock data in development for demo
  return process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DATA === 'true';
}
