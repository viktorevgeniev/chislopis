/**
 * Bulgaria region mappings for bilingual support and geocoding
 */

export interface RegionMapping {
  code: string;
  bg: string;
  en: string;
  nuts: string; // NUTS code (Nomenclature of Territorial Units for Statistics)
  type: 'district' | 'region';
}

/**
 * Bulgarian administrative regions (28 oblasti/districts)
 */
export const bulgariaRegions: RegionMapping[] = [
  { code: 'BG411', bg: 'София-град', en: 'Sofia City', nuts: 'BG411', type: 'district' },
  { code: 'BG412', bg: 'София', en: 'Sofia', nuts: 'BG412', type: 'district' },
  { code: 'BG421', bg: 'Пловдив', en: 'Plovdiv', nuts: 'BG421', type: 'district' },
  { code: 'BG422', bg: 'Хасково', en: 'Haskovo', nuts: 'BG422', type: 'district' },
  { code: 'BG423', bg: 'Пазарджик', en: 'Pazardzhik', nuts: 'BG423', type: 'district' },
  { code: 'BG424', bg: 'Смолян', en: 'Smolyan', nuts: 'BG424', type: 'district' },
  { code: 'BG425', bg: 'Кърджали', en: 'Kardzhali', nuts: 'BG425', type: 'district' },
  { code: 'BG331', bg: 'Варна', en: 'Varna', nuts: 'BG331', type: 'district' },
  { code: 'BG332', bg: 'Добрич', en: 'Dobrich', nuts: 'BG332', type: 'district' },
  { code: 'BG341', bg: 'Бургас', en: 'Burgas', nuts: 'BG341', type: 'district' },
  { code: 'BG342', bg: 'Сливен', en: 'Sliven', nuts: 'BG342', type: 'district' },
  { code: 'BG343', bg: 'Ямбол', en: 'Yambol', nuts: 'BG343', type: 'district' },
  { code: 'BG344', bg: 'Стара Загора', en: 'Stara Zagora', nuts: 'BG344', type: 'district' },
  { code: 'BG311', bg: 'Видин', en: 'Vidin', nuts: 'BG311', type: 'district' },
  { code: 'BG312', bg: 'Монтана', en: 'Montana', nuts: 'BG312', type: 'district' },
  { code: 'BG313', bg: 'Враца', en: 'Vratsa', nuts: 'BG313', type: 'district' },
  { code: 'BG321', bg: 'Плевен', en: 'Pleven', nuts: 'BG321', type: 'district' },
  { code: 'BG322', bg: 'Велико Търново', en: 'Veliko Tarnovo', nuts: 'BG322', type: 'district' },
  { code: 'BG323', bg: 'Габрово', en: 'Gabrovo', nuts: 'BG323', type: 'district' },
  { code: 'BG324', bg: 'Русе', en: 'Ruse', nuts: 'BG324', type: 'district' },
  { code: 'BG325', bg: 'Разград', en: 'Razgrad', nuts: 'BG325', type: 'district' },
  { code: 'BG326', bg: 'Силистра', en: 'Silistra', nuts: 'BG326', type: 'district' },
  { code: 'BG327', bg: 'Търговище', en: 'Targovishte', nuts: 'BG327', type: 'district' },
  { code: 'BG413', bg: 'Благоевград', en: 'Blagoevgrad', nuts: 'BG413', type: 'district' },
  { code: 'BG414', bg: 'Перник', en: 'Pernik', nuts: 'BG414', type: 'district' },
  { code: 'BG415', bg: 'Кюстендил', en: 'Kyustendil', nuts: 'BG415', type: 'district' },
  { code: 'BG416', bg: 'Ловеч', en: 'Lovech', nuts: 'BG416', type: 'district' },
  { code: 'BG417', bg: 'Шумен', en: 'Shumen', nuts: 'BG417', type: 'district' }
];

/**
 * Statistical regions (NUTS 2 level)
 */
export const bulgariaStatRegions: RegionMapping[] = [
  { code: 'BG41', bg: 'Югозападен', en: 'Southwestern', nuts: 'BG41', type: 'region' },
  { code: 'BG42', bg: 'Южен централен', en: 'South Central', nuts: 'BG42', type: 'region' },
  { code: 'BG33', bg: 'Североизточен', en: 'Northeastern', nuts: 'BG33', type: 'region' },
  { code: 'BG34', bg: 'Югоизточен', en: 'Southeastern', nuts: 'BG34', type: 'region' },
  { code: 'BG31', bg: 'Северозападен', en: 'Northwestern', nuts: 'BG31', type: 'region' },
  { code: 'BG32', bg: 'Северен централен', en: 'North Central', nuts: 'BG32', type: 'region' }
];

/**
 * Find region by name (supports both BG and EN)
 */
export function findRegionByName(name: string): RegionMapping | undefined {
  const normalized = name.toLowerCase().trim();

  return [...bulgariaRegions, ...bulgariaStatRegions].find(
    region =>
      region.bg.toLowerCase() === normalized ||
      region.en.toLowerCase() === normalized ||
      region.code.toLowerCase() === normalized
  );
}

/**
 * Get region name in specified locale
 */
export function getRegionName(code: string, locale: 'bg' | 'en'): string {
  const region = [...bulgariaRegions, ...bulgariaStatRegions].find(r => r.code === code);
  return region ? region[locale] : code;
}

/**
 * Normalize region name for matching
 */
export function normalizeRegionName(name: string, fromLocale: 'bg' | 'en', toLocale: 'bg' | 'en'): string {
  const region = findRegionByName(name);
  return region ? region[toLocale] : name;
}

/**
 * Get all region codes
 */
export function getAllRegionCodes(): string[] {
  return bulgariaRegions.map(r => r.code);
}

/**
 * Map data to regions
 */
export function mapDataToRegions(data: any[], regionKey: string, valueKey: string) {
  const regionData = new Map<string, number>();

  data.forEach(row => {
    const regionName = row[regionKey];
    const value = parseFloat(row[valueKey]);

    if (regionName && !isNaN(value)) {
      const region = findRegionByName(regionName);
      if (region) {
        regionData.set(region.code, value);
      }
    }
  });

  return regionData;
}
