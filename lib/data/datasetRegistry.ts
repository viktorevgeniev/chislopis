import { Dataset, CategoryId } from '@/types/dataset';

/**
 * Helper to create a standard NSI dataset entry with sensible defaults.
 */
function nsiDataset(
  id: string,
  nsiId: string,
  titleBg: string,
  titleEn: string,
  descBg: string,
  descEn: string,
  category: CategoryId,
  subcategory: string,
  valueColumnName: string,
  opts: {
    updateFrequency?: 'yearly' | 'quarterly' | 'monthly';
    hasGeographic?: boolean;
    suggestedChartTypes?: ('line' | 'bar' | 'pie' | 'map' | 'table' | 'scatter')[];
    customVisualization?: string;
    dimensions?: Dataset['dimensions'];
  } = {}
): Dataset {
  return {
    id,
    nsiId,
    title: { bg: titleBg, en: titleEn },
    description: { bg: descBg, en: descEn },
    category,
    subcategory,
    format: 'csv',
    urls: {
      bg: `https://www.nsi.bg/opendata/getopendata.php?l=bg&id=${nsiId}`,
      en: `https://www.nsi.bg/opendata/getopendata.php?l=en&id=${nsiId}`
    },
    localNsiId: nsiId,
    valueColumnName,
    updateFrequency: opts.updateFrequency || 'yearly',
    lastUpdated: '2024-01-15',
    dimensions: opts.dimensions || [],
    suggestedChartTypes: opts.suggestedChartTypes || ['line', 'bar'],
    hasGeographic: opts.hasGeographic ?? false,
    hasTimeSeries: true,
    ...(opts.customVisualization ? { customVisualization: opts.customVisualization } : {})
  };
}

/**
 * Registry of NSI (National Statistical Institute) datasets
 * Each dataset includes metadata, URLs, and characteristics for auto-visualization
 */
export const datasetRegistry: Dataset[] = [
  // ═══════════════════════════════════════════
  // DEMOGRAPHICS
  // ═══════════════════════════════════════════

  // --- demographics > population ---
  nsiDataset(
    'population-by-districts', '1169',
    'Население по пол, местоживеене, области и общини',
    'Population by sex, residence, districts and municipalities',
    'Население по пол, местоживеене (градско/селско), области и общини по години',
    'Population by sex, place of residence (urban/rural), districts and municipalities by year',
    'demographics', 'population', 'Population',
    {
      hasGeographic: true,
      suggestedChartTypes: ['bar', 'line', 'map'],
      customVisualization: 'PopulationByDistrictsDashboard',
      dimensions: [
        { name: 'Year', type: 'temporal', cardinality: 25, isKey: true },
        { name: 'EKATTE', type: 'geographic', cardinality: 300, isKey: true },
        { name: 'Residence', type: 'categorical', cardinality: 3, isKey: true },
        { name: 'Gender', type: 'categorical', cardinality: 3, isKey: true },
        { name: 'Population', type: 'numerical', cardinality: 0, isKey: false }
      ]
    }
  ),
  nsiDataset(
    'population-demographics', '1942',
    'Население по статистически райони, възраст, местоживеене и пол',
    'Population by statistical regions, age, residence and sex',
    'Подробна демографска статистика на населението по NUTS региони, възрастови групи, градско/селско население и пол',
    'Detailed demographic statistics by NUTS regions, age groups, urban/rural residence and sex',
    'demographics', 'population', 'Population',
    {
      hasGeographic: true,
      suggestedChartTypes: ['bar', 'line', 'map'],
      customVisualization: 'PopulationDashboard',
      dimensions: [
        { name: 'Year', type: 'temporal', cardinality: 15, isKey: true },
        { name: 'NUTS', type: 'geographic', cardinality: 30, isKey: true },
        { name: 'Residence', type: 'categorical', cardinality: 3, isKey: true },
        { name: 'Age', type: 'categorical', cardinality: 20, isKey: true },
        { name: 'Gender', type: 'categorical', cardinality: 3, isKey: true },
        { name: 'Population', type: 'numerical', cardinality: 0, isKey: false }
      ]
    }
  ),

  // --- demographics > vital-statistics ---
  nsiDataset(
    'live-births', '1130',
    'Живородени по области, общини и пол',
    'Live births by districts, municipalities and sex',
    'Брой живородени деца по области, общини и пол по години',
    'Number of live births by districts, municipalities and sex by year',
    'demographics', 'vital-statistics', 'LiveBirths',
    {
      hasGeographic: true,
      customVisualization: 'BirthsDashboard'
    }
  ),
  nsiDataset(
    'deaths', '1139',
    'Умирания по области, общини и пол',
    'Deaths by districts, municipalities and sex',
    'Брой умирания по области, общини и пол по години',
    'Number of deaths by districts, municipalities and sex by year',
    'demographics', 'vital-statistics', 'Deaths',
    {
      hasGeographic: true,
      customVisualization: 'VitalStatisticsDashboard'
    }
  ),
  nsiDataset(
    'deaths-by-causes-age', '1678',
    'Умирания по причини, пол и възрастови групи по статистически райони (2015-2019)',
    'Deaths by causes, sex and age groups by statistical regions (2015-2019)',
    'Умирания по причини за смърт, пол и възрастови групи по статистически райони',
    'Deaths by causes of death, sex and age groups by statistical regions',
    'demographics', 'vital-statistics', 'Deaths',
    { hasGeographic: true, customVisualization: 'MortalityDashboard' }
  ),
  nsiDataset(
    'deaths-by-weeks', '1893',
    'Умирания по седмици, възраст, пол и области',
    'Deaths by weeks, age, sex and districts',
    'Умирания по седмици, възрастови групи, пол и области',
    'Deaths by weeks, age groups, sex and districts',
    'demographics', 'vital-statistics', 'Deaths',
    { hasGeographic: true, customVisualization: 'WeeklyMortalityDashboard' }
  ),
  nsiDataset(
    'marriages', '818',
    'Бракове по статистически райони, области, общини',
    'Marriages by statistical regions, districts, municipalities',
    'Сключени бракове по статистически райони, области и общини',
    'Marriages by statistical regions, districts and municipalities',
    'demographics', 'vital-statistics', 'Marriages',
    { hasGeographic: true, customVisualization: 'MarriagesDashboard' }
  ),
  nsiDataset(
    'divorces', '819',
    'Бракоразводи по статистически райони, области, общини',
    'Divorces by statistical regions, districts, municipalities',
    'Бракоразводи по статистически райони, области и общини',
    'Divorces by statistical regions, districts and municipalities',
    'demographics', 'vital-statistics', 'Divorces',
    { hasGeographic: true, customVisualization: 'DivorcesDashboard' }
  ),
  nsiDataset(
    'mortality-by-causes', '1125',
    'Смъртност по причини, пол, статистически райони и области (2005-2019)',
    'Mortality by causes, sex, statistical regions and districts (2005-2019)',
    'Смъртност по причини за смърт, пол, статистически райони и области',
    'Mortality by causes of death, sex, statistical regions and districts',
    'demographics', 'vital-statistics', 'Deaths',
    { hasGeographic: true, customVisualization: 'MortalityRatesDashboard' }
  ),

  // ═══════════════════════════════════════════
  // EMPLOYMENT
  // ═══════════════════════════════════════════

  // --- employment > employment (Activity Rates) ---
  nsiDataset(
    'activity-rates-by-age-sex', '1175',
    'Коефициенти на икономическа активност по възрастови групи и пол',
    'Activity rates by age groups and sex',
    'Тримесечни коефициенти на икономическа активност по възрастови групи и пол',
    'Quarterly activity rates by age groups and sex',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'ActivityRatesDashboard' }
  ),
  nsiDataset(
    'activity-rates-by-age-sex-region', '1214',
    'Коефициенти на икономическа активност по възраст, пол и статистически райони',
    'Activity rates by age, sex and statistical region',
    'Тримесечни коефициенти на активност по възраст, пол и статистически райони',
    'Quarterly activity rates by age, sex and statistical region',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'ActivityRatesRegionalDashboard' }
  ),
  nsiDataset(
    'activity-rates-by-education', '1211',
    'Коефициенти на икономическа активност по степен на образование',
    'Activity rates by level of education',
    'Тримесечни коефициенти на активност по степен на образование',
    'Quarterly activity rates by level of education',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'ActivityRatesEducationDashboard' }
  ),
  nsiDataset(
    'activity-rates-by-residence-sex', '1209',
    'Коефициенти на икономическа активност по местоживеене и пол',
    'Activity rates by place of residence and sex',
    'Тримесечни коефициенти на активност по местоживеене и пол',
    'Quarterly activity rates by place of residence and sex',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'ActivityRatesResidenceDashboard' }
  ),

  // --- labor > employment (Employment Rates) ---
  nsiDataset(
    'employment-rates-15-64-regions', '939',
    'Коефициенти на заетост (15-64) по пол, статистически райони и области',
    'Employment rates (15-64) by sex, statistical regions and districts',
    'Тримесечни коефициенти на заетост за 15-64 годишни по пол, райони и области',
    'Quarterly employment rates for 15-64 year-olds by sex, regions and districts',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'EmploymentRatesRegionalDashboard' }
  ),
  nsiDataset(
    'employment-rates-20-64-sex', '1099',
    'Коефициенти на заетост (20-64) по пол',
    'Employment rates (20-64 years) by sex',
    'Тримесечни коефициенти на заетост за 20-64 годишни по пол',
    'Quarterly employment rates for 20-64 year-olds by sex',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'EmploymentRates2064Dashboard' }
  ),
  nsiDataset(
    'employment-rates-by-age-sex', '1176',
    'Коефициенти на заетост по възрастови групи и пол',
    'Employment rates by age group and sex',
    'Тримесечни коефициенти на заетост по възрастови групи и пол',
    'Quarterly employment rates by age group and sex',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'EmploymentRatesByAgeDashboard' }
  ),
  nsiDataset(
    'employment-rates-by-education', '1212',
    'Коефициенти на заетост по степен на образование',
    'Employment rates by level of education',
    'Тримесечни коефициенти на заетост по степен на образование',
    'Quarterly employment rates by level of education',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'EmploymentRatesByEducationDashboard' }
  ),
  nsiDataset(
    'employment-rates-by-residence-sex', '1210',
    'Коефициенти на заетост по местоживеене и пол',
    'Employment rates by place of residence and sex',
    'Тримесечни коефициенти на заетост по местоживеене и пол',
    'Quarterly employment rates by place of residence and sex',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'EmploymentRatesByResidenceDashboard' }
  ),
  nsiDataset(
    'employment-rates-10yr-age', '1722',
    'Коефициенти на заетост по пол и 10-годишни възрастови групи',
    'Employment rates by sex and 10-year age groups',
    'Годишни коефициенти на заетост по пол и 10-годишни възрастови групи',
    'Annual employment rates by sex and 10-year age groups',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'yearly', customVisualization: 'EmploymentRatesAnnualDashboard' }
  ),
  nsiDataset(
    'employment-rates-regions', '937',
    'Коефициенти на заетост по пол, статистически райони и области',
    'Employment rates by sex, statistical regions and districts',
    'Тримесечни коефициенти на заетост по пол, статистически райони и области',
    'Quarterly employment rates by sex, statistical regions and districts',
    'employment', 'employment', 'Rate',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'EmploymentRatesAllRegionsDashboard' }
  ),

  // --- labor > employment (Employed Persons) ---
  nsiDataset(
    'employed-15-64-regions', '922',
    'Заети лица (15-64) по пол, статистически райони и области',
    'Employed persons aged 15-64 by sex, statistical regions and districts',
    'Тримесечни данни за заети лица на 15-64 години по пол, райони и области',
    'Quarterly employed persons aged 15-64 by sex, regions and districts',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'EmployedPersonsRegionalDashboard' }
  ),
  nsiDataset(
    'employed-20-64-sex', '1098',
    'Заети лица (20-64) по пол',
    'Employed persons aged 20-64 by sex',
    'Тримесечни данни за заети лица на 20-64 години по пол',
    'Quarterly employed persons aged 20-64 by sex',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedPersons2064Dashboard' }
  ),
  nsiDataset(
    'employed-by-age-sex', '1101',
    'Заети лица по възрастови групи и пол',
    'Employed persons by age groups and sex',
    'Тримесечни данни за заети лица по възрастови групи и пол',
    'Quarterly employed persons by age groups and sex',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByAgeSexDashboard' }
  ),
  nsiDataset(
    'employed-by-activity-2003-2007', '1135',
    'Заети лица по икономически дейности и пол (2003-2007)',
    'Employed persons by economic activity groupings and sex (2003-2007)',
    'Заети лица по групи икономически дейности и пол за периода 2003-2007',
    'Employed persons by economic activity groupings and sex for 2003-2007',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByActivityDashboard' }
  ),
  nsiDataset(
    'employed-by-activity-2008', '1133',
    'Заети лица по икономически дейности и пол (от 2008)',
    'Employed persons by economic activity groupings and sex (from 2008)',
    'Заети лица по групи икономически дейности и пол от 2008 г.',
    'Employed persons by economic activity groupings and sex from 2008',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByActivity2008Dashboard' }
  ),
  nsiDataset(
    'employed-by-education', '1124',
    'Заети лица по степен на образование',
    'Employed persons by level of education',
    'Тримесечни данни за заети лица по степен на образование',
    'Quarterly employed persons by level of education',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByEducationLevelDashboard' }
  ),
  nsiDataset(
    'employed-by-occupation-2003-2005', '1428',
    'Заети лица по класове професии и пол (2003-2005)',
    'Employed persons by occupational classes and sex (2003-2005)',
    'Заети лица по класове професии и пол за периода 2003-2005',
    'Employed persons by occupational classes and sex for 2003-2005',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByOccupationDashboard' }
  ),
  nsiDataset(
    'employed-by-occupation-2006-2010', '1129',
    'Заети лица по класове професии и пол (2006-2010)',
    'Employed persons by occupational classes and sex (2006-2010)',
    'Заети лица по класове професии и пол за периода 2006-2010',
    'Employed persons by occupational classes and sex for 2006-2010',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByOccupationDashboard' }
  ),
  nsiDataset(
    'employed-by-occupation-2011', '1127',
    'Заети лица по класове професии и пол (от 2011)',
    'Employed persons by occupational classes and sex (from 2011)',
    'Заети лица по класове професии и пол от 2011 г.',
    'Employed persons by occupational classes and sex from 2011',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByOccupationDashboard' }
  ),
  nsiDataset(
    'employed-by-residence-sex', '1108',
    'Заети лица по местоживеене и пол',
    'Employed persons by place of residence and sex',
    'Тримесечни данни за заети лица по местоживеене и пол',
    'Quarterly employed persons by place of residence and sex',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByResidenceSexDashboard' }
  ),
  nsiDataset(
    'employed-by-status-sex', '1123',
    'Заети лица по професионален статус и пол',
    'Employed persons by professional status and sex',
    'Тримесечни данни за заети лица по професионален статус и пол',
    'Quarterly employed persons by professional status and sex',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByProfStatusDashboard' }
  ),
  nsiDataset(
    'employed-by-regions-sex', '908',
    'Заети лица по пол, статистически райони и области',
    'Employed persons by sex, statistical regions and districts',
    'Тримесечни данни за заети лица по пол, статистически райони и области',
    'Quarterly employed persons by sex, statistical regions and districts',
    'employment', 'employment', 'Persons',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'EmployedPersonsRegionalDashboard' }
  ),

  // --- labor > employees ---
  nsiDataset(
    'employees-by-ownership', '1264',
    'Наети лица по вид собственост',
    'Employees by kind of ownership',
    'Тримесечни данни за наети лица по вид собственост',
    'Quarterly employees by kind of ownership',
    'employment', 'employees', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByOwnershipDashboard' }
  ),
  nsiDataset(
    'employees-by-permanency', '1265',
    'Наети лица по постоянство на работата',
    'Employees by permanency of job',
    'Тримесечни данни за наети лица по постоянство на работата',
    'Quarterly employees by permanency of job',
    'employment', 'employees', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployedByPermanencyDashboard' }
  ),
  nsiDataset(
    'employees-by-residence', '1260',
    'Наети лица по местоживеене',
    'Employees by place of residence',
    'Тримесечни данни за наети лица по местоживеене',
    'Quarterly employees by place of residence',
    'employment', 'employees', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployeesByResidenceDashboard' }
  ),
  nsiDataset(
    'employees-by-sex', '1259',
    'Наети лица по пол',
    'Employees by sex',
    'Тримесечни данни за наети лица по пол',
    'Quarterly employees by sex',
    'employment', 'employees', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployeesBySexDashboard' }
  ),
  nsiDataset(
    'employees-by-contract', '1263',
    'Наети лица по вид на договора с работодателя',
    'Employees by type of contract with the employer',
    'Тримесечни данни за наети лица по вид на договора',
    'Quarterly employees by type of contract',
    'employment', 'employees', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployeesByContractDashboard' }
  ),
  nsiDataset(
    'employees-by-working-time', '1262',
    'Наети лица по вид работно време (пълно/непълно)',
    'Employees by type of working time (full/part time)',
    'Тримесечни данни за наети лица по вид работно време',
    'Quarterly employees by type of working time',
    'employment', 'employees', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'EmployeesByWorkingTimeDashboard' }
  ),
  nsiDataset(
    'employees-labour-contract-nace', '365',
    'Наети лица по трудово правоотношение по икономически дейности (A21) (2008-2024)',
    'Employees under labour contract by economic activities (A21) (2008-2024)',
    'Наети лица по трудово и служебно правоотношение по икономически дейности',
    'Employees under labour contract by economic activities',
    'employment', 'employees', 'Persons',
    { customVisualization: 'EmployeesLabourContractNaceDashboard' }
  ),

  // --- labor > unemployment ---
  nsiDataset(
    'long-term-unemployment-rate', '1093',
    'Коефициент на продължителна безработица по пол',
    'Long-term unemployment rate by sex',
    'Тримесечен коефициент на продължителна безработица по пол',
    'Quarterly long-term unemployment rate by sex',
    'unemployment', 'unemployment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'LongTermUnemploymentRateDashboard' }
  ),
  nsiDataset(
    'unemployed-by-age-sex', '1096',
    'Безработни лица по възрастови групи и пол',
    'Unemployed persons by age groups and sex',
    'Тримесечни данни за безработни лица по възрастови групи и пол',
    'Quarterly unemployed persons by age groups and sex',
    'unemployment', 'unemployment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'UnemployedByAgeSexDashboard' }
  ),
  nsiDataset(
    'unemployed-by-duration-sex', '1106',
    'Безработни лица по продължителност на безработицата и пол',
    'Unemployed persons by duration of unemployment and sex',
    'Тримесечни данни за безработни лица по продължителност на безработицата',
    'Quarterly unemployed persons by duration of unemployment and sex',
    'unemployment', 'unemployment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'UnemployedByDurationSexDashboard' }
  ),
  nsiDataset(
    'unemployed-by-experience', '1110',
    'Безработни лица по предишен трудов опит',
    'Unemployed persons by previous employment experience',
    'Тримесечни данни за безработни лица по предишен трудов опит',
    'Quarterly unemployed persons by previous employment experience',
    'unemployment', 'unemployment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'UnemployedByExperienceDashboard' }
  ),
  nsiDataset(
    'unemployed-by-education', '1150',
    'Безработни лица по степен на образование',
    'Unemployed persons by level of education',
    'Тримесечни данни за безработни лица по степен на образование',
    'Quarterly unemployed persons by level of education',
    'unemployment', 'unemployment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'UnemployedByEducationDashboard' }
  ),
  nsiDataset(
    'unemployed-by-job-search', '1117',
    'Безработни лица по начини на търсене на работа и пол',
    'Unemployed persons by methods of job search and sex',
    'Тримесечни данни за безработни лица по начини на търсене на работа',
    'Quarterly unemployed persons by methods of job search and sex',
    'unemployment', 'unemployment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'UnemployedByJobSearchDashboard' }
  ),
  nsiDataset(
    'unemployed-by-residence-sex', '1119',
    'Безработни лица по местоживеене и пол',
    'Unemployed persons by place of residence and sex',
    'Тримесечни данни за безработни лица по местоживеене и пол',
    'Quarterly unemployed persons by place of residence and sex',
    'unemployment', 'unemployment', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'UnemployedByResidenceSexDashboard' }
  ),
  nsiDataset(
    'unemployed-by-regions-sex', '1112',
    'Безработни лица по статистически райони и пол',
    'Unemployed persons by statistical regions and sex',
    'Тримесечни данни за безработни лица по статистически райони и пол',
    'Quarterly unemployed persons by statistical regions and sex',
    'unemployment', 'unemployment', 'Persons',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'UnemployedByRegionsSexDashboard' }
  ),
  nsiDataset(
    'unemployment-rates-by-age-sex', '1103',
    'Коефициенти на безработица по възрастови групи и пол',
    'Unemployment rates by age groups and sex',
    'Тримесечни коефициенти на безработица по възрастови групи и пол',
    'Quarterly unemployment rates by age groups and sex',
    'unemployment', 'unemployment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'UnemploymentRatesByAgeSexDashboard' }
  ),
  nsiDataset(
    'unemployment-rates-by-education', '1166',
    'Коефициенти на безработица по степен на образование',
    'Unemployment rates by level of education',
    'Тримесечни коефициенти на безработица по степен на образование',
    'Quarterly unemployment rates by level of education',
    'unemployment', 'unemployment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'UnemploymentRatesByEducationDashboard' }
  ),
  nsiDataset(
    'unemployment-rates-by-residence-sex', '1120',
    'Коефициенти на безработица по местоживеене и пол',
    'Unemployment rates by place of residence and sex',
    'Тримесечни коефициенти на безработица по местоживеене и пол',
    'Quarterly unemployment rates by place of residence and sex',
    'unemployment', 'unemployment', 'Rate',
    { updateFrequency: 'quarterly', customVisualization: 'UnemploymentRatesByResidenceSexDashboard' }
  ),
  nsiDataset(
    'unemployment-rates-10yr-age', '1720',
    'Коефициенти на безработица по пол и 10-годишни възрастови групи',
    'Unemployment rates by sex and 10-year age groups',
    'Годишни коефициенти на безработица по пол и 10-годишни възрастови групи',
    'Annual unemployment rates by sex and 10-year age groups',
    'unemployment', 'unemployment', 'Rate',
    { customVisualization: 'UnemploymentRatesAnnualDashboard' }
  ),
  nsiDataset(
    'unemployment-rates-regions-annual', '1011',
    'Коефициенти на безработица по пол, статистически райони и области',
    'Unemployment rates by sex, statistical regions and districts',
    'Годишни коефициенти на безработица по пол, статистически райони и области',
    'Annual unemployment rates by sex, statistical regions and districts',
    'unemployment', 'unemployment', 'Rate',
    { hasGeographic: true, customVisualization: 'UnemploymentRatesRegionalAnnualDashboard' }
  ),
  nsiDataset(
    'unemployment-rates-regions-quarterly', '1116',
    'Коефициенти на безработица по статистически райони и пол',
    'Unemployment rates by statistical regions and sex',
    'Тримесечни коефициенти на безработица по статистически райони и пол',
    'Quarterly unemployment rates by statistical regions and sex',
    'unemployment', 'unemployment', 'Rate',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'UnemploymentRatesRegionalQuarterlyDashboard' }
  ),

  // --- labor > labour-force ---
  nsiDataset(
    'labour-force-by-age-sex', '1187',
    'Работна сила по възрастови групи и пол',
    'Labour force by age groups and sex',
    'Тримесечни данни за работната сила по възрастови групи и пол',
    'Quarterly labour force by age groups and sex',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'LabourForceByAgeSexDashboard' }
  ),
  nsiDataset(
    'labour-force-by-education', '1190',
    'Работна сила по степен на образование',
    'Labour force by level of education',
    'Тримесечни данни за работната сила по степен на образование',
    'Quarterly labour force by level of education',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'LabourForceByEducationDashboard' }
  ),
  nsiDataset(
    'labour-force-by-residence-sex', '385',
    'Работна сила по местоживеене и пол',
    'Labour force by place of residence and sex',
    'Тримесечни данни за работната сила по местоживеене и пол',
    'Quarterly labour force by place of residence and sex',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'LabourForceByResidenceSexDashboard' }
  ),
  nsiDataset(
    'labour-force-by-regions-sex', '1183',
    'Работна сила по пол и статистически райони',
    'Labour force by sex and statistical regions',
    'Тримесечни данни за работната сила по пол и статистически райони',
    'Quarterly labour force by sex and statistical regions',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'LabourForceByRegionsSexDashboard' }
  ),

  // --- labor > labour-force (Not in Labour Force) ---
  nsiDataset(
    'not-in-lf-by-age-sex', '1161',
    'Лица извън работната сила по възрастови групи и пол',
    'Persons not in labour force by age groups and sex',
    'Тримесечни данни за лица извън работната сила по възрастови групи и пол',
    'Quarterly persons not in labour force by age groups and sex',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'NotInLFByAgeSexDashboard' }
  ),
  nsiDataset(
    'not-in-lf-by-education', '1155',
    'Лица извън работната сила по степен на образование',
    'Persons not in labour force by level of education',
    'Тримесечни данни за лица извън работната сила по степен на образование',
    'Quarterly persons not in labour force by level of education',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'NotInLFByEducationDashboard' }
  ),
  nsiDataset(
    'not-in-lf-by-residence-sex', '1158',
    'Лица извън работната сила по местоживеене и пол',
    'Persons not in labour force by place of residence and sex',
    'Тримесечни данни за лица извън работната сила по местоживеене и пол',
    'Quarterly persons not in labour force by place of residence and sex',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'NotInLFByResidenceSexDashboard' }
  ),
  nsiDataset(
    'not-in-lf-by-reasons', '1217',
    'Лица извън работната сила по причини за неактивност (2003-2020)',
    'Persons not in labour force by reasons of inactivity (2003-2020)',
    'Тримесечни данни за лица извън работната сила по причини за неактивност',
    'Quarterly persons not in labour force by reasons of inactivity',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'NotInLFByReasonsDashboard' }
  ),
  nsiDataset(
    'not-in-lf-by-regions-sex', '1163',
    'Лица извън работната сила по статистически райони и пол',
    'Persons not in labour force by statistical regions and sex',
    'Тримесечни данни за лица извън работната сила по статистически райони и пол',
    'Quarterly persons not in labour force by statistical regions and sex',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', hasGeographic: true, customVisualization: 'NotInLFByRegionsSexDashboard' }
  ),

  // --- labor > labour-force (Discouraged Persons) ---
  nsiDataset(
    'discouraged-by-age-sex', '1157',
    'Обезкуражени лица по възрастови групи и пол',
    'Discouraged persons by age groups and sex',
    'Тримесечни данни за обезкуражени лица по възрастови групи и пол',
    'Quarterly discouraged persons by age groups and sex',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'DiscouragedByAgeSexDashboard' }
  ),
  nsiDataset(
    'discouraged-by-education', '1164',
    'Обезкуражени лица по степен на образование',
    'Discouraged persons by level of education',
    'Тримесечни данни за обезкуражени лица по степен на образование',
    'Quarterly discouraged persons by level of education',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'DiscouragedByEducationDashboard' }
  ),
  nsiDataset(
    'discouraged-by-residence-sex', '1153',
    'Обезкуражени лица по местоживеене и пол',
    'Discouraged persons by place of residence and sex',
    'Тримесечни данни за обезкуражени лица по местоживеене и пол',
    'Quarterly discouraged persons by place of residence and sex',
    'unemployment', 'labour-force', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'DiscouragedByResidenceSexDashboard' }
  ),

  // --- labor > wages ---
  nsiDataset(
    'average-annual-wages', '612',
    'Средна годишна работна заплата по икономически дейности (2008-2024)',
    'Average annual wages and salaries by economic activities (2008-2024)',
    'Средна годишна работна заплата на наетите по трудово и служебно правоотношение по икономически дейности',
    'Average annual wages and salaries of employees by economic activities',
    'unemployment', 'wages', 'Amount',
    { customVisualization: 'WagesByActivityOwnershipDashboard', suggestedChartTypes: ['line', 'bar'] }
  ),
  nsiDataset(
    'avg-weekly-hours-ownership', '1341',
    'Средни отработени часове седмично по вид собственост',
    'Average weekly hours per employed person by ownership',
    'Тримесечни средни отработени часове седмично на заето лице по вид собственост',
    'Quarterly average weekly hours per employed person by ownership',
    'unemployment', 'wages', 'Hours',
    { updateFrequency: 'quarterly', customVisualization: 'AvgHoursByOwnershipDashboard', suggestedChartTypes: ['line', 'bar'] }
  ),
  nsiDataset(
    'avg-weekly-hours-sex', '1340',
    'Средни отработени часове седмично по пол',
    'Average weekly hours per employed person by sex',
    'Тримесечни средни отработени часове седмично на заето лице по пол',
    'Quarterly average weekly hours per employed person by sex',
    'unemployment', 'wages', 'Hours',
    { updateFrequency: 'quarterly', customVisualization: 'AvgHoursBySexDashboard', suggestedChartTypes: ['line', 'bar'] }
  ),

  // ═══════════════════════════════════════════
  // SOCIAL INDICATORS
  // ═══════════════════════════════════════════

  // --- social > poverty (At-Risk-of-Poverty) ---
  nsiDataset(
    'poverty-rate-before-transfers-excl-pensions', '199',
    'Относителен дял на бедните преди социални трансфери (без пенсии)',
    'At-risk-of-poverty rate before social transfers (pensions excluded)',
    'Относителен дял на бедните преди социални трансфери, без пенсии',
    'At-risk-of-poverty rate before social transfers, pensions excluded',
    'poverty', 'poverty', 'Rate',
    { hasGeographic: true, customVisualization: 'PovertyRateBeforeTransfersDashboard' }
  ),
  nsiDataset(
    'poverty-rate-before-transfers-incl-pensions', '202',
    'Относителен дял на бедните преди социални трансфери (с пенсии)',
    'At-risk-of-poverty rate before social transfers (pensions included)',
    'Относителен дял на бедните преди социални трансфери, с пенсии',
    'At-risk-of-poverty rate before social transfers, pensions included',
    'poverty', 'poverty', 'Rate',
    { hasGeographic: true, customVisualization: 'PovertyRateInclPensionsDashboard' }
  ),
  nsiDataset(
    'poverty-rate-by-age-sex', '176',
    'Относителен дял на бедните по възраст и пол',
    'At-risk-of-poverty rate by age and sex',
    'Относителен дял на бедните по възрастови групи и пол',
    'At-risk-of-poverty rate by age groups and sex',
    'poverty', 'poverty', 'Rate',
    { hasGeographic: true, customVisualization: 'PovertyRateByAgeSexDashboard' }
  ),
  nsiDataset(
    'poverty-rate-by-household', '684',
    'Относителен дял на бедните по тип домакинство',
    'At-risk-of-poverty rate by household type',
    'Относителен дял на бедните по тип домакинство',
    'At-risk-of-poverty rate by household type',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'PovertyRateByHouseholdDashboard' }
  ),
  nsiDataset(
    'poverty-rate-by-activity', '189',
    'Относителен дял на бедните по най-честа икономическа активност',
    'At-risk-of-poverty rate by most frequent activity status',
    'Относителен дял на бедните по най-честа икономическа активност',
    'At-risk-of-poverty rate by most frequent activity status',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'PovertyRateByActivityDashboard' }
  ),
  nsiDataset(
    'poverty-rate-elderly', '212',
    'Относителен дял на бедните сред възрастните хора',
    'At-risk-of-poverty rate of older people',
    'Относителен дял на бедните сред лицата на 65 и повече години',
    'At-risk-of-poverty rate of people aged 65 and over',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'PovertyRateElderlyDashboard' }
  ),
  nsiDataset(
    'poverty-thresholds', '169',
    'Линия на бедност',
    'At-risk-of-poverty thresholds',
    'Линия на бедност по размер на домакинството',
    'At-risk-of-poverty thresholds by household size',
    'poverty', 'poverty', 'Threshold',
    { customVisualization: 'PovertyThresholdDashboard' }
  ),

  // --- social > poverty (In-Work Poverty) ---
  nsiDataset(
    'in-work-poverty-by-age-sex', '251',
    'Работещи бедни по възраст и пол',
    'In-work at-risk-of-poverty rate by age and sex',
    'Относителен дял на работещите бедни по възраст и пол',
    'In-work at-risk-of-poverty rate by age and sex',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'InWorkPovertyByAgeSexDashboard' }
  ),
  nsiDataset(
    'in-work-poverty-by-education', '263',
    'Работещи бедни по образователно равнище',
    'In-work at-risk-of-poverty rate by educational attainment level',
    'Относителен дял на работещите бедни по образователно равнище',
    'In-work at-risk-of-poverty rate by educational attainment level',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'InWorkPovertyByEducationDashboard' }
  ),
  nsiDataset(
    'in-work-poverty-by-working-time', '273',
    'Работещи бедни по пълно/непълно работно време',
    'In-work at-risk-of-poverty rate by full-/part-time work',
    'Относителен дял на работещите бедни по пълно и непълно работно време',
    'In-work at-risk-of-poverty rate by full-time and part-time work',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'InWorkPovertyByWorkingTimeDashboard' }
  ),
  nsiDataset(
    'in-work-poverty-by-household', '259',
    'Работещи бедни по тип домакинство',
    'In-work at-risk-of-poverty rate by household type',
    'Относителен дял на работещите бедни по тип домакинство',
    'In-work at-risk-of-poverty rate by household type',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'InWorkPovertyByHouseholdDashboard' }
  ),

  // --- social > poverty (People at Risk) ---
  nsiDataset(
    'risk-poverty-exclusion-age-sex', '319',
    'Лица в риск от бедност или социално изключване по възраст и пол',
    'People at risk of poverty or social exclusion by age and sex',
    'Лица в риск от бедност или социално изключване по възраст и пол',
    'People at risk of poverty or social exclusion by age and sex',
    'poverty', 'poverty', 'Rate',
    { hasGeographic: true, customVisualization: 'RiskPovertyExclusionAgeSexDashboard' }
  ),
  nsiDataset(
    'risk-poverty-exclusion-education', '325',
    'Лица в риск от бедност или социално изключване по образование (18+)',
    'People at risk of poverty or social exclusion by education (18+)',
    'Лица на 18 и повече години в риск от бедност по образование',
    'People aged 18+ at risk of poverty or social exclusion by education',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'RiskPovertyExclusionEducationDashboard' }
  ),
  nsiDataset(
    'risk-poverty-exclusion-household', '324',
    'Лица в риск от бедност или социално изключване по тип домакинство',
    'People at risk of poverty or social exclusion by household type',
    'Лица в риск от бедност или социално изключване по тип домакинство',
    'People at risk of poverty or social exclusion by household type',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'RiskPovertyExclusionHouseholdDashboard' }
  ),
  nsiDataset(
    'risk-poverty-exclusion-activity', '320',
    'Лица в риск от бедност или социално изключване по активност (18+)',
    'People at risk of poverty or social exclusion by activity status (18+)',
    'Лица на 18 и повече години в риск от бедност по икономическа активност',
    'People aged 18+ at risk of poverty or social exclusion by activity status',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'RiskPovertyExclusionActivityDashboard' }
  ),

  // --- social > poverty (Material Deprivation) ---
  nsiDataset(
    'material-deprivation-age-sex', '302',
    'Материални лишения по възраст и пол',
    'Material deprivation rate by age and sex',
    'Относителен дял на материално лишените лица по възраст и пол',
    'Material deprivation rate by age and sex',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'MaterialDeprivationDashboard' }
  ),
  nsiDataset(
    'severe-deprivation-household', '305',
    'Тежки материални лишения по тип домакинство',
    'Severe material deprivation rate by household type',
    'Относителен дял на лицата с тежки материални лишения по тип домакинство',
    'Severe material deprivation rate by household type',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'MaterialDeprivationByHouseholdDashboard' }
  ),
  nsiDataset(
    'severe-deprivation-activity', '304',
    'Тежки материални лишения по икономическа активност',
    'Severe material deprivation rate by most frequent activity status',
    'Относителен дял на лицата с тежки материални лишения по икономическа активност',
    'Severe material deprivation rate by most frequent activity status',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'MaterialDeprivationByActivityDashboard' }
  ),

  // --- social > poverty (Low Work Intensity) ---
  nsiDataset(
    'low-work-intensity-age-sex', '307',
    'Лица в домакинства с нисък интензитет на работа по възраст и пол (до 2020)',
    'People in households with very low work intensity by age and sex (until 2020)',
    'Лица в домакинства с много нисък интензитет на работа по възраст и пол',
    'People in households with very low work intensity by age and sex',
    'poverty', 'poverty', 'Rate',
    { hasGeographic: true, customVisualization: 'LowWorkIntensityAgeSexDashboard' }
  ),
  nsiDataset(
    'low-work-intensity-education', '315',
    'Лица в домакинства с нисък интензитет на работа по образование (до 2020)',
    'People in households with very low work intensity by education (until 2020)',
    'Лица в домакинства с много нисък интензитет на работа по образование',
    'People in households with very low work intensity by education',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'LowWorkIntensityEducationDashboard' }
  ),
  nsiDataset(
    'low-work-intensity-household', '312',
    'Лица в домакинства с нисък интензитет на работа по тип домакинство (до 2020)',
    'People in households with very low work intensity by household type (until 2020)',
    'Лица в домакинства с много нисък интензитет на работа по тип домакинство',
    'People in households with very low work intensity by household type',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'LowWorkIntensityHouseholdDashboard' }
  ),
  nsiDataset(
    'low-work-intensity-activity', '309',
    'Лица в домакинства с нисък интензитет на работа по активност (до 2020)',
    'People in households with very low work intensity by activity status (until 2020)',
    'Лица в домакинства с много нисък интензитет на работа по икономическа активност',
    'People in households with very low work intensity by activity status',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'LowWorkIntensityActivityDashboard' }
  ),

  // --- social > income ---
  nsiDataset(
    'monetary-poverty-rate', '242',
    'Парична бедност по пол',
    'Monetary poverty rate by sex',
    'Дял на лицата под прага на парична бедност по пол (% от населението), 2008–2024',
    'Share of persons below the monetary poverty threshold by sex (% of population), 2008–2024',
    'poverty', 'poverty', 'Rate',
    { customVisualization: 'MonetaryPovertyRateDashboard' }
  ),
  nsiDataset(
    'income-distribution-deciles', '295',
    'Разпределение на дохода по децили',
    'Distribution of income by deciles (top cut-off point)',
    'Разпределение на дохода по децили (горна граница на дохода), 2008–2024',
    'Distribution of income by deciles (top cut-off point of income threshold by decile), 2008–2024',
    'income-health', 'income', 'Amount',
    { customVisualization: 'IncomeDistributionDecilesDashboard' }
  ),
  nsiDataset(
    'monetary-poverty-rate-regional', '301',
    'Парична бедност по статистически региони и области (NUTS)',
    'Monetary poverty rate by statistical regions and districts (NUTS)',
    'Дял на лицата под прага на парична бедност по статистически региони и области (NUTS), 2008–2024',
    'Share of persons below the monetary poverty threshold by statistical regions and districts (NUTS), 2008–2024',
    'income-health', 'income', 'Rate',
    {
      hasGeographic: true,
      suggestedChartTypes: ['line', 'bar', 'map'],
      customVisualization: 'MonetaryPovertyRateRegionalDashboard',
    }
  ),
  nsiDataset(
    'mean-median-income-age-sex', '296',
    'Среден и медианен доход по възраст и пол',
    'Mean and median income by age and sex',
    'Среден и медианен доход по възрастови групи и пол, 2008–2024',
    'Mean and median income by age groups and sex, 2008–2024',
    'income-health', 'income', 'Amount',
    {
      suggestedChartTypes: ['line', 'bar'],
      customVisualization: 'MeanMedianIncomeAgeSexDashboard',
    }
  ),
  nsiDataset(
    'mean-median-income-household', '297',
    'Среден и медианен доход по тип домакинство',
    'Mean and median income by household type',
    'Среден и медианен доход по тип домакинство — праг на бедност за различни структури домакинства',
    'Mean and median income by household type — monetary poverty thresholds across household structures',
    'income-health', 'income', 'Amount',
    {
      suggestedChartTypes: ['line', 'bar'],
      customVisualization: 'MeanMedianIncomeHouseholdDashboard',
    }
  ),
  nsiDataset(
    'mean-median-income-activity', '298',
    'Среден и медианен доход по икономическа активност',
    'Mean and median income by most frequent activity status',
    'Среден и медианен доход по най-честа икономическа активност',
    'Mean and median income by most frequent activity status',
    'income-health', 'income', 'Amount',
    {
      suggestedChartTypes: ['line', 'bar'],
      customVisualization: 'MeanMedianIncomeActivityDashboard',
    }
  ),
  nsiDataset(
    'relative-median-income-ratio', '235',
    'Относителен медианен доход',
    'Relative median income ratio',
    'Съотношение на относителния медианен доход по пол',
    'Relative median income ratio by sex',
    'income-health', 'income', 'Ratio',
    { customVisualization: 'RelativeMedianIncomeRatioDashboard' }
  ),
  nsiDataset(
    's80-s20-ratio', '300',
    'Парична бедност по статистически региони и възрастови групи',
    'Monetary poverty rate by statistical regions and age groups (NUTS)',
    'Дял на лицата под прага на парична бедност по NUTS региони и възрастови групи (%), 2008–2024',
    'Share of persons below the monetary poverty threshold by NUTS regions and age groups (%), 2008–2024',
    'income-health', 'income', 'PovertyRate',
    {
      hasGeographic: true,
      suggestedChartTypes: ['line', 'bar'],
      customVisualization: 'MonetaryPovertyRateNutsAgeDashboard',
    }
  ),
  nsiDataset(
    'total-income-by-source-residence', '470',
    'Общ доход по източници и местоживеене',
    'Total income by source and place of residence',
    'Общ доход на домакинствата по източници на доходи и местоживеене (лв./домакинство, лв./лице, структура %), 2008–2022',
    'Total household income by income sources and place of residence (BGN/household, BGN/capita, structure %), 2008–2022',
    'income-health', 'income', 'Amount',
    { customVisualization: 'TotalIncomeBySourceResidenceDashboard' }
  ),

  // --- social > expenditure ---
  nsiDataset(
    'household-food-consumption', '428',
    'Потребление на основни хранителни продукти',
    'Household consumption of main foods and beverages',
    'Потребление на основни хранителни продукти и напитки от домакинствата',
    'Household consumption of main foods and beverages',
    'poverty', 'expenditure', 'Amount',
    { customVisualization: 'FoodConsumptionDashboard' }
  ),
  nsiDataset(
    'monetary-expenditure', '727',
    'Парични разходи по групи и местоживеене',
    'Monetary expenditure by group and place of residence',
    'Парични разходи на домакинствата по групи и местоживеене',
    'Monetary expenditure of households by group and place of residence',
    'poverty', 'expenditure', 'Amount',
    { customVisualization: 'MonetaryExpenditureResidenceDashboard' }
  ),
  nsiDataset(
    'monetary-income', '690',
    'Парични доходи по източници и местоживеене',
    'Monetary income by source and place of residence',
    'Парични доходи на домакинствата по източници и местоживеене',
    'Monetary income of households by source and place of residence',
    'poverty', 'expenditure', 'Amount',
    { customVisualization: 'MonetaryIncomeResidenceDashboard' }
  ),
  nsiDataset(
    'total-expenditure', '715',
    'Общи разходи по групи и местоживеене',
    'Total expenditure by group and place of residence',
    'Общи разходи на домакинствата по групи и местоживеене',
    'Total expenditure of households by group and place of residence',
    'poverty', 'expenditure', 'Amount',
    { customVisualization: 'MonetaryExpenditureResidenceDashboard' }
  ),

  // --- social > education ---
  nsiDataset(
    'children-in-kindergartens', '107',
    'Деца в детски градини по общини',
    'Children in kindergartens by municipalities',
    'Деца в детски градини по общини',
    'Children in kindergartens by municipalities',
    'income-health', 'education', 'Count',
    { hasGeographic: true, customVisualization: 'ChildrenInKindergartensDashboard' }
  ),
  nsiDataset(
    'pedagogical-staff-kindergartens', '118',
    'Педагогически персонал в детски градини по области и общини',
    'Pedagogical staff in kindergartens by districts and municipalities',
    'Педагогически персонал в детски градини по области и общини',
    'Pedagogical staff in kindergartens by districts and municipalities',
    'income-health', 'education', 'Count',
    { hasGeographic: true, customVisualization: 'TeachingStaffKindergartensDashboard' }
  ),
  nsiDataset(
    'population-by-education-level', '1219',
    'Население на 15 и повече навършени години по степен на образование',
    'Population aged 15+ by level of education',
    'Тримесечни данни за населението на 15 и повече навършени години по степен на образование',
    'Quarterly population aged 15 and over by level of education',
    'income-health', 'education', 'Persons',
    { updateFrequency: 'quarterly', customVisualization: 'PopulationByEducationLevelDashboard' }
  ),

  // --- social > healthcare ---
  nsiDataset(
    'health-establishments', '1206',
    'Здравни заведения по области и общини (2011-2024)',
    'Health establishments by districts and municipalities (2011-2024)',
    'Здравни заведения по области и общини',
    'Health establishments by districts and municipalities',
    'income-health', 'healthcare', 'Count',
    { hasGeographic: true, customVisualization: 'HealthEstablishmentsDashboard' }
  ),
  nsiDataset(
    'medical-personnel', '1105',
    'Медицински персонал по области и общини (2003-2017)',
    'Medical personnel by districts and municipalities (2003-2017)',
    'Медицински персонал по области и общини',
    'Medical personnel by districts and municipalities',
    'income-health', 'healthcare', 'Count',
    { hasGeographic: true, customVisualization: 'MedicalPersonnelDashboard' }
  ),

  // ═══════════════════════════════════════════
  // ECONOMY & BUSINESS
  // ═══════════════════════════════════════════

  // --- economy > fdi ---
  nsiDataset(
    'fdi-by-economic-activity', '860',
    'ПЧИ в нефинансовите предприятия по икономически дейности (НКИД Рев.2)',
    'FDI in non-financial enterprises by economic activity (NACE Rev.2)',
    'Преки чуждестранни инвестиции в нефинансовите предприятия по икономически дейности',
    'Foreign direct investment in non-financial enterprises by economic activity',
    'economy-sectors', 'fdi', 'Amount',
    { customVisualization: 'FdiByEconomicActivityDashboard' }
  ),
  nsiDataset(
    'fdi-by-regions', '629',
    'ПЧИ в нефинансовите предприятия по статистически райони и области',
    'FDI in non-financial enterprises by statistical regions and districts',
    'Преки чуждестранни инвестиции в нефинансовите предприятия по райони и области',
    'Foreign direct investment in non-financial enterprises by regions and districts',
    'economy-sectors', 'fdi', 'Amount',
    {
      hasGeographic: true,
      suggestedChartTypes: ['line', 'bar', 'map'],
      customVisualization: 'FdiByRegionDashboard',
    }
  ),

  // --- economy > business ---
  nsiDataset(
    'business-indicators-by-size-activity', '868',
    'Основни икономически показатели по размер на предприятията и икономически дейности',
    'Main economic indicators by enterprise size and economic activity',
    'Основни икономически показатели по размер на предприятията и икономически дейности',
    'Main economic indicators by enterprise size and economic activity',
    'economy-sectors', 'business', 'Value',
    { customVisualization: 'BusinessIndicatorsByActivityDashboard' }
  ),
  nsiDataset(
    'business-indicators-by-size-regions', '865',
    'Основни икономически показатели по размер на предприятията и статистически райони',
    'Main economic indicators by enterprise size and statistical regions',
    'Основни икономически показатели по размер на предприятията и статистически райони',
    'Main economic indicators by enterprise size and statistical regions',
    'economy-sectors', 'business', 'Value',
    { hasGeographic: true, customVisualization: 'BusinessIndicatorsBySizeRegionsDashboard' }
  ),
  nsiDataset(
    'prodprom-by-cpa', '1274',
    'ПРОДПРОМ по подкатегории на продукцията (КПО)',
    'PRODPROM data by product subcategories (CPA classification)',
    'Данни от ПРОДПРОМ по подкатегории на продукцията по КПО класификация — производство, продадена продукция по количество и стойност (хил. лв.)',
    'PRODPROM data by product subcategories by CPA classification — production, sold output by quantity and value (thousand BGN)',
    'economy-sectors', 'business', 'Value',
    { suggestedChartTypes: ['line', 'bar', 'table'], customVisualization: 'ProdcomDashboard' }
  ),

  // --- economy > construction ---
  nsiDataset(
    'building-permits', '654',
    'Издадени разрешителни за строеж по области',
    'Building permits issued for construction by districts',
    'Издадени разрешителни за строеж по области',
    'Building permits issued for construction by districts',
    'economy-sectors', 'construction', 'Count',
    { hasGeographic: true, updateFrequency: 'quarterly', customVisualization: 'BuildingPermitsDashboard', suggestedChartTypes: ['line', 'bar', 'pie'] }
  ),

  // --- economy > trade ---
  nsiDataset(
    'retail-sales-premises', '454',
    'Търговски обекти за продажби на дребно към 31.12 (2000-2016)',
    'Retail sales premises as of 31.12 (2000-2016)',
    'Брой търговски обекти за продажби на дребно (магазини, павилиони, бензиностанции) по вид стока към 31 декември',
    'Number of retail sales outlets (shops, pavilions, fuel stations) by commodity type as of December 31st',
    'economy-sectors', 'trade', 'Count',
    { suggestedChartTypes: ['line', 'bar', 'pie'], customVisualization: 'RetailOutletsDashboard' }
  ),

  // ═══════════════════════════════════════════
  // SECTORAL STATISTICS
  // ═══════════════════════════════════════════

  // --- sectoral > tourism ---
  nsiDataset(
    'accommodation-establishments', '1363',
    'Места за настаняване',
    'Accommodation establishments',
    'Места за настаняване по статистически райони',
    'Accommodation establishments by statistical regions',
    'economy-sectors', 'tourism', 'Count',
    { hasGeographic: true, customVisualization: 'AccommodationEstablishmentsDashboard', suggestedChartTypes: ['line', 'bar', 'scatter'] }
  ),
  nsiDataset(
    'arrivals-from-abroad', '240',
    'Посещения на чужденци в България (2008-2020)',
    'Arrivals of visitors from abroad to Bulgaria (2008-2020)',
    'Посещения на чужденци в България по страни',
    'Arrivals of visitors from abroad to Bulgaria by country',
    'economy-sectors', 'tourism', 'Visitors',
    { customVisualization: 'VisitorsInBulgariaDashboard', suggestedChartTypes: ['line', 'bar'] }
  ),
  nsiDataset(
    'nights-by-foreigners', '1227',
    'Нощувки на чужденци в места за настаняване (2012-2020)',
    'Nights spent by foreigners in accommodation (2012-2020)',
    'Нощувки на чужденци в места за настаняване по статистически райони',
    'Nights spent by foreigners in accommodation by statistical regions',
    'economy-sectors', 'tourism', 'Nights',
    { hasGeographic: true, customVisualization: 'NightsByForeignersDashboard', suggestedChartTypes: ['line', 'bar', 'scatter'] }
  ),
  nsiDataset(
    'trips-abroad', '159',
    'Пътувания на български граждани в чужбина (2008-2020)',
    'Trips of Bulgarian residents abroad (2008-2020)',
    'Пътувания на български граждани в чужбина по страни',
    'Trips of Bulgarian residents abroad by country',
    'economy-sectors', 'tourism', 'Trips',
    { hasGeographic: true, customVisualization: 'BulgarianTripsAbroadDashboard', suggestedChartTypes: ['line', 'bar'] }
  ),

  // --- sectoral > culture ---
  nsiDataset(
    'museums-exhibits-visits', '844',
    'Музеи - експонати и посещения по области',
    'Museums - exhibits and visits by districts',
    'Музеи, музейни експонати и посещения по области',
    'Museums, museum exhibits and visits by districts',
    'economy-sectors', 'culture', 'Count',
    { hasGeographic: true, customVisualization: 'MuseumsDashboard', suggestedChartTypes: ['bar', 'line', 'scatter'] }
  ),

  // ═══════════════════════════════════════════
  // FINANCE & INSURANCE
  // ═══════════════════════════════════════════

  // --- finance > insurance ---
  nsiDataset(
    'insurance-financial-position', '873',
    'Отчет за финансовото състояние на застрахователните дружества',
    'Statement of financial position of insurance companies',
    'Отчет за финансовото състояние на застрахователните дружества',
    'Statement of financial position of insurance companies',
    'finance', 'insurance', 'Amount',
    { customVisualization: 'InsuranceBalanceDashboard' }
  ),
  nsiDataset(
    'insurance-profit-loss', '1050',
    'Отчет за печалбата или загубата на застрахователните дружества',
    'Statement of profit or loss of insurance companies',
    'Отчет за печалбата или загубата на застрахователните дружества',
    'Statement of profit or loss of insurance companies',
    'finance', 'insurance', 'Amount',
    { customVisualization: 'InsuranceProfitLossDashboard' }
  ),

  // --- finance > pensions ---
  nsiDataset(
    'pension-companies-balance', '1200',
    'Обобщен баланс на пенсионноосигурителните дружества',
    'Summarized balance sheet of pension companies',
    'Обобщен баланс на пенсионноосигурителните дружества',
    'Summarized balance sheet of pension companies',
    'finance', 'pensions', 'Amount',
    { customVisualization: 'PensionCompaniesBalanceDashboard' }
  ),
  nsiDataset(
    'pension-funds-balance', '781',
    'Обобщен баланс на фондовете за допълнително пенсионно осигуряване',
    'Summarized balance sheet of supplementary pension insurance funds',
    'Обобщен баланс на фондовете за допълнително пенсионно осигуряване',
    'Summarized balance sheet of supplementary pension insurance funds',
    'finance', 'pensions', 'Amount',
    { customVisualization: 'PensionFundsBalanceDashboard' }
  ),
  nsiDataset(
    'pension-companies-income', '646',
    'Обобщен отчет за доходите на пенсионноосигурителните дружества',
    'Summarized income statement of pension companies',
    'Обобщен отчет за доходите на пенсионноосигурителните дружества',
    'Summarized income statement of pension companies',
    'finance', 'pensions', 'Amount',
    { customVisualization: 'PensionCompaniesIncomeDashboard' }
  ),
  nsiDataset(
    'pension-funds-income', '785',
    'Обобщен отчет за доходите на фондовете за допълнително пенсионно осигуряване',
    'Summarized income statement of supplementary pension insurance funds',
    'Обобщен отчет за доходите на фондовете за допълнително пенсионно осигуряване',
    'Summarized income statement of supplementary pension insurance funds',
    'finance', 'pensions', 'Amount',
    { customVisualization: 'PensionFundsIncomeDashboard' }
  ),

  // --- finance > investments ---
  nsiDataset(
    'investment-companies-balance', '434',
    'Обобщен баланс на инвестиционните дружества',
    'Summarized balance sheet of investment companies',
    'Обобщен баланс на инвестиционните дружества',
    'Summarized balance sheet of investment companies',
    'finance', 'investments', 'Amount',
    { customVisualization: 'InvestmentCompaniesBalanceDashboard' }
  ),
  nsiDataset(
    'investment-companies-income', '1046',
    'Обобщен отчет за доходите на инвестиционните дружества',
    'Summarized income statement of investment companies',
    'Обобщен отчет за доходите на инвестиционните дружества',
    'Summarized income statement of investment companies',
    'finance', 'investments', 'Amount',
    { customVisualization: 'InvestmentCompaniesIncomeDashboard' }
  ),

  // --- finance > associations ---
  nsiDataset(
    'associations-balance', '772',
    'Обобщен баланс на сдруженията и фондациите',
    'Summarized balance sheet of associations and foundations',
    'Обобщен баланс на сдруженията и фондациите',
    'Summarized balance sheet of associations and foundations',
    'finance', 'associations', 'Amount',
    { customVisualization: 'AssociationsBalanceDashboard' }
  ),
  nsiDataset(
    'associations-profit-loss', '521',
    'Обобщен отчет за приходите и разходите на сдруженията и фондациите',
    'Summarized profit-loss statement of associations and foundations',
    'Обобщен отчет за приходите и разходите на сдруженията и фондациите',
    'Summarized profit-loss statement of associations and foundations',
    'finance', 'associations', 'Amount',
    { customVisualization: 'AssociationsProfitLossDashboard' }
  ),
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

export function getDatasetsBySubcategory(categoryId: string, subcategoryId: string): Dataset[] {
  return datasetRegistry.filter(
    dataset => dataset.category === categoryId && dataset.subcategory === subcategoryId
  );
}

export function searchDatasets(query: string, locale: 'bg' | 'en'): Dataset[] {
  const lowerQuery = query.toLowerCase();
  return datasetRegistry.filter(dataset =>
    dataset.title[locale].toLowerCase().includes(lowerQuery) ||
    dataset.description[locale].toLowerCase().includes(lowerQuery)
  );
}

export function getImplementedDatasets(): Dataset[] {
  return datasetRegistry.filter(dataset => dataset.customVisualization);
}
