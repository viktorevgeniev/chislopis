import { CategoryId } from '@/types/dataset';

export interface Category {
  id: CategoryId;
  name: {
    bg: string;
    en: string;
  };
  description: {
    bg: string;
    en: string;
  };
  icon: string;
  color: string;
}

export const categories: Category[] = [
  {
    id: 'demographics',
    name: {
      bg: 'Демография',
      en: 'Demographics'
    },
    description: {
      bg: 'Население, раждаемост, смъртност, миграция',
      en: 'Population, births, deaths, migration'
    },
    icon: 'users',
    color: 'blue'
  },
  {
    id: 'economy',
    name: {
      bg: 'Икономика',
      en: 'Economy'
    },
    description: {
      bg: 'БВП, бизнес статистика, външна търговия',
      en: 'GDP, business statistics, foreign trade'
    },
    icon: 'trending-up',
    color: 'green'
  },
  {
    id: 'labor',
    name: {
      bg: 'Труд и Заетост',
      en: 'Labor & Employment'
    },
    description: {
      bg: 'Заетост, безработица, заплати',
      en: 'Employment, unemployment, wages'
    },
    icon: 'briefcase',
    color: 'purple'
  },
  {
    id: 'social',
    name: {
      bg: 'Социални Показатели',
      en: 'Social Indicators'
    },
    description: {
      bg: 'Доходи, бедност, образование, здравеопазване',
      en: 'Income, poverty, education, healthcare'
    },
    icon: 'heart',
    color: 'red'
  },
  {
    id: 'regional',
    name: {
      bg: 'Регионална Статистика',
      en: 'Regional Statistics'
    },
    description: {
      bg: 'Данни по области и общини',
      en: 'Data by regions and municipalities'
    },
    icon: 'map',
    color: 'orange'
  },
  {
    id: 'sectoral',
    name: {
      bg: 'Отраслова Статистика',
      en: 'Sectoral Statistics'
    },
    description: {
      bg: 'Туризъм, култура, индустрия',
      en: 'Tourism, culture, industry'
    },
    icon: 'building',
    color: 'indigo'
  },
  {
    id: 'finance',
    name: {
      bg: 'Финанси',
      en: 'Finance'
    },
    description: {
      bg: 'Бюджет, банкиране, инвестиции',
      en: 'Budget, banking, investment'
    },
    icon: 'dollar-sign',
    color: 'emerald'
  }
];

export function getCategoryById(id: CategoryId): Category | undefined {
  return categories.find(cat => cat.id === id);
}

export function getCategoryName(id: CategoryId, locale: 'bg' | 'en'): string {
  const category = getCategoryById(id);
  return category ? category.name[locale] : id;
}
