/**
 * Translates data field names based on locale
 */
export function translateFieldName(fieldName: string, locale: 'bg' | 'en'): string {
  const translations: Record<string, { bg: string; en: string }> = {
    year: { bg: 'Година', en: 'Year' },
    quarter: { bg: 'Тримесечие', en: 'Quarter' },
    month: { bg: 'Месец', en: 'Month' },
    region: { bg: 'Регион', en: 'Region' },
    value: { bg: 'Стойност', en: 'Value' },
    category: { bg: 'Категория', en: 'Category' },
    type: { bg: 'Тип', en: 'Type' },
    sector: { bg: 'Сектор', en: 'Sector' },
    salary: { bg: 'Заплата', en: 'Salary' },
    students: { bg: 'Учащи', en: 'Students' },
    rate: { bg: 'Коефициент', en: 'Rate' },
    population: { bg: 'Население', en: 'Population' },
    births: { bg: 'Раждания', en: 'Births' },
    deaths: { bg: 'Смъртност', en: 'Deaths' },
    gdp: { bg: 'БВП', en: 'GDP' },
    export: { bg: 'Износ', en: 'Export' },
    import: { bg: 'Внос', en: 'Import' },
    index: { bg: 'Индекс', en: 'Index' },
    nights: { bg: 'Нощувки', en: 'Nights' },
    amount: { bg: 'Сума', en: 'Amount' }
  };

  const normalized = fieldName.toLowerCase();
  return translations[normalized]?.[locale] || fieldName;
}
