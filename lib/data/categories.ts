import { CategoryId } from '@/types/dataset';

export interface Subcategory {
  id: string;
  name: {
    bg: string;
    en: string;
  };
  description: {
    bg: string;
    en: string;
  };
  icon: string;
}

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
  subcategories?: Subcategory[];
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
    color: 'blue',
    subcategories: [
      {
        id: 'population',
        name: { bg: 'Население', en: 'Population' },
        description: {
          bg: 'Население по райони, области, общини, възраст и пол',
          en: 'Population by regions, districts, municipalities, age and sex'
        },
        icon: 'users'
      },
      {
        id: 'vital-statistics',
        name: { bg: 'Раждания и смъртност', en: 'Births & Deaths' },
        description: {
          bg: 'Живородени и умирания по области, общини и пол',
          en: 'Live births and deaths by districts, municipalities and sex'
        },
        icon: 'heart-pulse'
      }
    ]
  },
  {
    id: 'employment',
    name: {
      bg: 'Заетост',
      en: 'Employment'
    },
    description: {
      bg: 'Заети лица, коефициенти на заетост, наети лица',
      en: 'Employed persons, employment rates, employees'
    },
    icon: 'briefcase',
    color: 'purple',
    subcategories: [
      {
        id: 'employment',
        name: { bg: 'Заетост', en: 'Employment' },
        description: {
          bg: 'Коефициенти на активност и заетост, заети лица по пол, възраст и райони',
          en: 'Activity and employment rates, employed persons by sex, age and regions'
        },
        icon: 'briefcase'
      },
      {
        id: 'employees',
        name: { bg: 'Наети лица', en: 'Employees' },
        description: {
          bg: 'Наети лица по вид собственост, договор, работно време',
          en: 'Employees by ownership, contract type, working time'
        },
        icon: 'users'
      }
    ]
  },
  {
    id: 'unemployment',
    name: {
      bg: 'Безработица и Работна Сила',
      en: 'Unemployment & Labour Force'
    },
    description: {
      bg: 'Безработни лица, работна сила, заплати',
      en: 'Unemployed persons, labour force, wages'
    },
    icon: 'user-x',
    color: 'orange',
    subcategories: [
      {
        id: 'unemployment',
        name: { bg: 'Безработица', en: 'Unemployment' },
        description: {
          bg: 'Безработни лица и коефициенти на безработица по пол, възраст и райони',
          en: 'Unemployed persons and unemployment rates by sex, age and regions'
        },
        icon: 'user-x'
      },
      {
        id: 'labour-force',
        name: { bg: 'Работна сила', en: 'Labour Force' },
        description: {
          bg: 'Работна сила, лица извън работната сила, обезкуражени лица',
          en: 'Labour force, persons not in labour force, discouraged persons'
        },
        icon: 'activity'
      },
      {
        id: 'wages',
        name: { bg: 'Заплати и работно време', en: 'Wages & Working Hours' },
        description: {
          bg: 'Средни заплати и работно време по икономически дейности',
          en: 'Average wages and working hours by economic activities'
        },
        icon: 'dollar-sign'
      }
    ]
  },
  {
    id: 'poverty',
    name: {
      bg: 'Бедност и Социално Изключване',
      en: 'Poverty & Social Exclusion'
    },
    description: {
      bg: 'Риск от бедност, материални лишения, парични разходи',
      en: 'At-risk-of-poverty, material deprivation, household expenditure'
    },
    icon: 'alert-triangle',
    color: 'red',
    subcategories: [
      {
        id: 'poverty',
        name: { bg: 'Бедност и социално изключване', en: 'Poverty & Social Exclusion' },
        description: {
          bg: 'Относителен дял на бедните, риск от бедност, материални лишения',
          en: 'At-risk-of-poverty rates, people at risk of poverty or social exclusion, material deprivation'
        },
        icon: 'alert-triangle'
      },
      {
        id: 'expenditure',
        name: { bg: 'Разходи и потребление', en: 'Expenditure & Consumption' },
        description: {
          bg: 'Парични разходи и доходи, потребление на храни и напитки',
          en: 'Monetary expenditure and income, household consumption of foods and beverages'
        },
        icon: 'shopping-bag'
      }
    ]
  },
  {
    id: 'income-health',
    name: {
      bg: 'Доходи, Образование и Здраве',
      en: 'Income, Education & Health'
    },
    description: {
      bg: 'Доходи и неравенство, образование, здравеопазване',
      en: 'Income and inequality, education, healthcare'
    },
    icon: 'bar-chart',
    color: 'indigo',
    subcategories: [
      {
        id: 'income',
        name: { bg: 'Доходи и неравенство', en: 'Income & Inequality' },
        description: {
          bg: 'Разпределение на доходите, коефициент на Джини, средни и медианни доходи',
          en: 'Income distribution, Gini coefficient, mean and median income'
        },
        icon: 'bar-chart'
      },
      {
        id: 'education',
        name: { bg: 'Образование', en: 'Education' },
        description: {
          bg: 'Учащи, детски градини, педагогически персонал, образователно ниво',
          en: 'Students, kindergartens, pedagogical staff, educational attainment'
        },
        icon: 'book-open'
      },
      {
        id: 'healthcare',
        name: { bg: 'Здравеопазване', en: 'Healthcare' },
        description: {
          bg: 'Здравни заведения и медицински персонал по области и общини',
          en: 'Health establishments and medical personnel by districts and municipalities'
        },
        icon: 'stethoscope'
      }
    ]
  },
  {
    id: 'economy-sectors',
    name: {
      bg: 'Икономика и Отрасли',
      en: 'Economy & Sectors'
    },
    description: {
      bg: 'Инвестиции, бизнес показатели, строителство, туризъм, култура',
      en: 'Investment, business indicators, construction, tourism, culture'
    },
    icon: 'trending-up',
    color: 'green',
    subcategories: [
      {
        id: 'fdi',
        name: { bg: 'Преки чуждестранни инвестиции', en: 'Foreign Direct Investment' },
        description: {
          bg: 'ПЧИ в нефинансовите предприятия по икономически дейности и райони',
          en: 'FDI in non-financial enterprises by economic activity and regions'
        },
        icon: 'landmark'
      },
      {
        id: 'business',
        name: { bg: 'Бизнес показатели', en: 'Business Indicators' },
        description: {
          bg: 'Основни икономически показатели по размер на предприятията',
          en: 'Main economic indicators by enterprise size and economic activity'
        },
        icon: 'building'
      },
      {
        id: 'construction',
        name: { bg: 'Строителство', en: 'Construction' },
        description: {
          bg: 'Издадени разрешителни за строеж по области',
          en: 'Building permits issued for construction by districts'
        },
        icon: 'hammer'
      },
      {
        id: 'trade',
        name: { bg: 'Търговия', en: 'Trade' },
        description: {
          bg: 'Външна търговия и търговия на дребно',
          en: 'Foreign trade and retail sales'
        },
        icon: 'shopping-cart'
      },
      {
        id: 'tourism',
        name: { bg: 'Туризъм', en: 'Tourism' },
        description: {
          bg: 'Места за настаняване, посещения на чужденци, нощувки',
          en: 'Accommodation establishments, visitor arrivals, nights spent'
        },
        icon: 'plane'
      },
      {
        id: 'culture',
        name: { bg: 'Култура', en: 'Culture' },
        description: {
          bg: 'Музеи, експонати и посещения по области',
          en: 'Museums, exhibits and visits by districts'
        },
        icon: 'palette'
      }
    ]
  },
  {
    id: 'finance',
    name: {
      bg: 'Финанси',
      en: 'Finance'
    },
    description: {
      bg: 'Застраховане, пенсионни фондове, инвестиционни дружества',
      en: 'Insurance, pension funds, investment companies'
    },
    icon: 'dollar-sign',
    color: 'emerald',
    subcategories: [
      {
        id: 'insurance',
        name: { bg: 'Застрахователни дружества', en: 'Insurance Companies' },
        description: {
          bg: 'Финансови отчети на застрахователните дружества',
          en: 'Financial statements of insurance companies'
        },
        icon: 'shield'
      },
      {
        id: 'pensions',
        name: { bg: 'Пенсионни дружества и фондове', en: 'Pension Companies & Funds' },
        description: {
          bg: 'Баланси и отчети на пенсионни дружества и фондове',
          en: 'Balance sheets and statements of pension companies and funds'
        },
        icon: 'piggy-bank'
      },
      {
        id: 'investments',
        name: { bg: 'Инвестиционни дружества', en: 'Investment Companies' },
        description: {
          bg: 'Баланси и отчети на инвестиционните дружества',
          en: 'Balance sheets and statements of investment companies'
        },
        icon: 'trending-up'
      },
      {
        id: 'associations',
        name: { bg: 'Сдружения и фондации', en: 'Associations & Foundations' },
        description: {
          bg: 'Баланси и отчети на сдружения и фондации',
          en: 'Balance sheets and statements of associations and foundations'
        },
        icon: 'users'
      }
    ]
  }
];

export function getCategoryById(id: CategoryId): Category | undefined {
  return categories.find(cat => cat.id === id);
}

export function getCategoryName(id: CategoryId, locale: 'bg' | 'en'): string {
  const category = getCategoryById(id);
  return category ? category.name[locale] : id;
}

export function getSubcategoryById(categoryId: CategoryId, subcategoryId: string): Subcategory | undefined {
  const category = getCategoryById(categoryId);
  return category?.subcategories?.find(sub => sub.id === subcategoryId);
}
