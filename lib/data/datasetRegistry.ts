import { Dataset } from '@/types/dataset';

/**
 * Registry of NSI (National Statistical Institute) datasets
 * Each dataset includes metadata, URLs, and characteristics for auto-visualization
 */
export const datasetRegistry: Dataset[] = [
  // DEMOGRAPHICS
  {
    id: 'population-total',
    nsiId: '1.1.1.1',
    title: {
      bg: 'Население по области и общини',
      en: 'Population by Districts and Municipalities'
    },
    description: {
      bg: 'Общ брой на населението по статистически райони, области и общини',
      en: 'Total population by statistical regions, districts and municipalities'
    },
    category: 'demographics',
    subcategory: 'population',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/POP_1.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/POP_1.1.1.1_EN.csv'
    },
    updateFrequency: 'yearly',
    lastUpdated: '2024-01-15',
    dimensions: [
      { name: 'year', type: 'temporal', cardinality: 30, isKey: true },
      { name: 'region', type: 'geographic', cardinality: 28, isKey: true },
      { name: 'population', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['map', 'line', 'bar'],
    hasGeographic: true,
    hasTimeSeries: true
  },
  {
    id: 'population-demographics',
    nsiId: '1942',
    title: {
      bg: 'Население по статистически райони, възраст, местоживеене и пол',
      en: 'Population by districts, municipalities, place of residence and sex'
    },
    description: {
      bg: 'Подробна демографска статистика на населението по NUTS региони, възрастови групи, градско/селско население и пол',
      en: 'Detailed demographic statistics by NUTS regions, age groups, urban/rural residence and sex'
    },
    category: 'demographics',
    subcategory: 'population-demographics',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/opendata/getopendata.php?l=bg&id=1942',
      en: 'https://www.nsi.bg/opendata/getopendata.php?l=en&id=1942'
    },
    fieldsUrl: {
      bg: 'https://www.nsi.bg/opendata/getfields.php?l=bg&id=1942',
      en: 'https://www.nsi.bg/opendata/getfields.php?l=en&id=1942'
    },
    codeListsUrl: {
      bg: 'https://www.nsi.bg/opendata/getcodelists.php?l=bg&id=1942',
      en: 'https://www.nsi.bg/opendata/getcodelists.php?l=en&id=1942'
    },
    updateFrequency: 'yearly',
    lastUpdated: '2024-01-15',
    dimensions: [
      { name: 'Year', type: 'temporal', cardinality: 15, isKey: true },
      { name: 'NUTS', type: 'geographic', cardinality: 30, isKey: true },
      { name: 'Residence', type: 'categorical', cardinality: 3, isKey: true },
      { name: 'Age', type: 'categorical', cardinality: 20, isKey: true },
      { name: 'Gender', type: 'categorical', cardinality: 3, isKey: true },
      { name: 'Population', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['bar', 'line', 'map'],
    hasGeographic: true,
    hasTimeSeries: true,
    customVisualization: 'PopulationDashboard'
  },
  {
    id: 'births-deaths',
    nsiId: '1.1.3.1',
    title: {
      bg: 'Раждания и смъртност',
      en: 'Births and Deaths'
    },
    description: {
      bg: 'Живородени и умрели по статистически райони и области',
      en: 'Live births and deaths by statistical regions and districts'
    },
    category: 'demographics',
    subcategory: 'vital-statistics',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/POP_1.1.3.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/POP_1.1.3.1_EN.csv'
    },
    updateFrequency: 'yearly',
    lastUpdated: '2024-01-15',
    dimensions: [
      { name: 'year', type: 'temporal', cardinality: 30, isKey: true },
      { name: 'region', type: 'geographic', cardinality: 28, isKey: true },
      { name: 'births', type: 'numerical', cardinality: 0, isKey: false },
      { name: 'deaths', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['line', 'bar', 'map'],
    hasGeographic: true,
    hasTimeSeries: true
  },

  // ECONOMY
  {
    id: 'gdp-regional',
    nsiId: '2.1.1.1',
    title: {
      bg: 'БВП по области',
      en: 'GDP by Districts'
    },
    description: {
      bg: 'Брутен вътрешен продукт по статистически райони и области',
      en: 'Gross Domestic Product by statistical regions and districts'
    },
    category: 'economy',
    subcategory: 'gdp',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/NAC_2.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/NAC_2.1.1.1_EN.csv'
    },
    updateFrequency: 'yearly',
    lastUpdated: '2023-12-20',
    dimensions: [
      { name: 'year', type: 'temporal', cardinality: 15, isKey: true },
      { name: 'region', type: 'geographic', cardinality: 28, isKey: true },
      { name: 'gdp', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['map', 'bar', 'line'],
    hasGeographic: true,
    hasTimeSeries: true
  },
  {
    id: 'foreign-trade',
    nsiId: '4.1.1.1',
    title: {
      bg: 'Външна търговия',
      en: 'Foreign Trade'
    },
    description: {
      bg: 'Износ и внос на стоки по месеци',
      en: 'Export and import of goods by months'
    },
    category: 'economy',
    subcategory: 'trade',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/TR_4.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/TR_4.1.1.1_EN.csv'
    },
    updateFrequency: 'monthly',
    lastUpdated: '2024-01-30',
    dimensions: [
      { name: 'month', type: 'temporal', cardinality: 240, isKey: true },
      { name: 'type', type: 'categorical', cardinality: 2, isKey: true },
      { name: 'value', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['line', 'bar'],
    hasGeographic: false,
    hasTimeSeries: true
  },

  // LABOR & EMPLOYMENT
  {
    id: 'employment-rate',
    nsiId: '3.1.1.1',
    title: {
      bg: 'Коефициент на заетост',
      en: 'Employment Rate'
    },
    description: {
      bg: 'Коефициент на заетост на населението на възраст 15+ години',
      en: 'Employment rate of population aged 15+ years'
    },
    category: 'labor',
    subcategory: 'employment',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/LFS_3.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/LFS_3.1.1.1_EN.csv'
    },
    updateFrequency: 'quarterly',
    lastUpdated: '2024-01-25',
    dimensions: [
      { name: 'quarter', type: 'temporal', cardinality: 80, isKey: true },
      { name: 'region', type: 'geographic', cardinality: 6, isKey: true },
      { name: 'rate', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['line', 'bar'],
    hasGeographic: true,
    hasTimeSeries: true
  },
  {
    id: 'unemployment-rate',
    nsiId: '3.1.2.1',
    title: {
      bg: 'Коефициент на безработица',
      en: 'Unemployment Rate'
    },
    description: {
      bg: 'Коефициент на безработица на населението на възраст 15+ години',
      en: 'Unemployment rate of population aged 15+ years'
    },
    category: 'labor',
    subcategory: 'unemployment',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/LFS_3.1.2.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/LFS_3.1.2.1_EN.csv'
    },
    updateFrequency: 'quarterly',
    lastUpdated: '2024-01-25',
    dimensions: [
      { name: 'quarter', type: 'temporal', cardinality: 80, isKey: true },
      { name: 'region', type: 'geographic', cardinality: 6, isKey: true },
      { name: 'rate', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['line', 'bar', 'map'],
    hasGeographic: true,
    hasTimeSeries: true
  },
  {
    id: 'average-wages',
    nsiId: '3.2.1.1',
    title: {
      bg: 'Средна месечна работна заплата',
      en: 'Average Monthly Salary'
    },
    description: {
      bg: 'Средна месечна работна заплата на наетите лица по икономически дейности',
      en: 'Average monthly salary of employees by economic activities'
    },
    category: 'labor',
    subcategory: 'wages',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/SAL_3.2.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/SAL_3.2.1.1_EN.csv'
    },
    updateFrequency: 'quarterly',
    lastUpdated: '2024-01-20',
    dimensions: [
      { name: 'quarter', type: 'temporal', cardinality: 60, isKey: true },
      { name: 'sector', type: 'categorical', cardinality: 15, isKey: true },
      { name: 'salary', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['bar', 'line'],
    hasGeographic: false,
    hasTimeSeries: true
  },

  // SOCIAL INDICATORS
  {
    id: 'poverty-rate',
    nsiId: '5.1.1.1',
    title: {
      bg: 'Относителен дял на бедните',
      en: 'Relative Share of Poor Population'
    },
    description: {
      bg: 'Относителен дял на бедните по статистически райони',
      en: 'Relative share of poor population by statistical regions'
    },
    category: 'social',
    subcategory: 'poverty',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/INC_5.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/INC_5.1.1.1_EN.csv'
    },
    updateFrequency: 'yearly',
    lastUpdated: '2023-11-30',
    dimensions: [
      { name: 'year', type: 'temporal', cardinality: 15, isKey: true },
      { name: 'region', type: 'geographic', cardinality: 6, isKey: true },
      { name: 'rate', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['line', 'bar', 'map'],
    hasGeographic: true,
    hasTimeSeries: true
  },
  {
    id: 'education-enrollment',
    nsiId: '6.1.1.1',
    title: {
      bg: 'Учащи в учебни заведения',
      en: 'Students in Educational Institutions'
    },
    description: {
      bg: 'Брой на учащите по вид на учебното заведение',
      en: 'Number of students by type of educational institution'
    },
    category: 'social',
    subcategory: 'education',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/EDU_6.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/EDU_6.1.1.1_EN.csv'
    },
    updateFrequency: 'yearly',
    lastUpdated: '2023-12-15',
    dimensions: [
      { name: 'year', type: 'temporal', cardinality: 20, isKey: true },
      { name: 'type', type: 'categorical', cardinality: 5, isKey: true },
      { name: 'students', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['bar', 'line'],
    hasGeographic: false,
    hasTimeSeries: true
  },

  // REGIONAL STATISTICS
  {
    id: 'regional-development',
    nsiId: '7.1.1.1',
    title: {
      bg: 'Индекс на регионално развитие',
      en: 'Regional Development Index'
    },
    description: {
      bg: 'Индекс на регионално развитие по области',
      en: 'Regional development index by districts'
    },
    category: 'regional',
    subcategory: 'development',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/REG_7.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/REG_7.1.1.1_EN.csv'
    },
    updateFrequency: 'yearly',
    lastUpdated: '2023-10-30',
    dimensions: [
      { name: 'year', type: 'temporal', cardinality: 10, isKey: true },
      { name: 'region', type: 'geographic', cardinality: 28, isKey: true },
      { name: 'index', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['map', 'bar'],
    hasGeographic: true,
    hasTimeSeries: true
  },

  // SECTORAL STATISTICS
  {
    id: 'tourism-accommodations',
    nsiId: '8.1.1.1',
    title: {
      bg: 'Туристически посещения',
      en: 'Tourist Visits'
    },
    description: {
      bg: 'Брой на пренощувалите лица в местата за настаняване',
      en: 'Number of nights spent in accommodation establishments'
    },
    category: 'sectoral',
    subcategory: 'tourism',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/TOU_8.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/TOU_8.1.1.1_EN.csv'
    },
    updateFrequency: 'monthly',
    lastUpdated: '2024-01-31',
    dimensions: [
      { name: 'month', type: 'temporal', cardinality: 120, isKey: true },
      { name: 'type', type: 'categorical', cardinality: 3, isKey: true },
      { name: 'nights', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['line', 'bar'],
    hasGeographic: false,
    hasTimeSeries: true
  },

  // FINANCE
  {
    id: 'government-budget',
    nsiId: '9.1.1.1',
    title: {
      bg: 'Консолидиран бюджет',
      en: 'Consolidated Budget'
    },
    description: {
      bg: 'Приходи и разходи на консолидирания бюджет',
      en: 'Revenues and expenditures of the consolidated budget'
    },
    category: 'finance',
    subcategory: 'budget',
    format: 'csv',
    urls: {
      bg: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/FIN_9.1.1.1_BG.csv',
      en: 'https://www.nsi.bg/sites/default/files/files/data/timeseries/FIN_9.1.1.1_EN.csv'
    },
    updateFrequency: 'quarterly',
    lastUpdated: '2024-01-15',
    dimensions: [
      { name: 'quarter', type: 'temporal', cardinality: 40, isKey: true },
      { name: 'type', type: 'categorical', cardinality: 2, isKey: true },
      { name: 'amount', type: 'numerical', cardinality: 0, isKey: false }
    ],
    suggestedChartTypes: ['bar', 'line'],
    hasGeographic: false,
    hasTimeSeries: true
  }
];

// Helper functions
export function getDatasetById(id: string): Dataset | undefined {
  return datasetRegistry.find(dataset => dataset.id === id);
}

export function getDatasetsByCategory(categoryId: string): Dataset[] {
  return datasetRegistry.filter(dataset => dataset.category === categoryId);
}

export function getAllDatasets(): Dataset[] {
  return datasetRegistry;
}

export function searchDatasets(query: string, locale: 'bg' | 'en'): Dataset[] {
  const lowerQuery = query.toLowerCase();
  return datasetRegistry.filter(dataset =>
    dataset.title[locale].toLowerCase().includes(lowerQuery) ||
    dataset.description[locale].toLowerCase().includes(lowerQuery)
  );
}
