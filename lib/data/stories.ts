import type { Story } from '@/types/story';

/**
 * Story registry. To add a new story, append an entry to this array.
 * No UI code changes required — the engine is generic.
 *
 * Column reference for population-demographics (dataset ID: population-demographics):
 *   Year, NUTS, NUTS_Code (e.g. 'BG'), Residence, Residence_Code ('0'=Total, '1'=Urban, '2'=Rural),
 *   Gender, Gender_Code ('0'=Total, '1'=Male, '2'=Female), Age, Age_Code, Population
 *
 * Column reference for unemployment-rates-by-age-sex (dataset ID 1103):
 *   Year (quarterly, e.g. '2019Q2'), Units, Units_Code, Age10_LFS, Age10_LFS_Code,
 *   Gender, Gender_Code ('0'=Total, '1'=Male, '2'=Female), Rate
 *
 * Column reference for monetary-poverty-rate (dataset ID 242):
 *   Year, Units, Units_Code, Gender, Gender_Code ('0'=Total, '1'=Male, '2'=Female), Rate
 *   Note: Rate is a fraction (e.g. 0.43 = 43%)
 *
 * Column reference for average-annual-wages (dataset ID 612):
 *   NACE2008A21, NACE2008A21_Code, Year, Ownership, Ownership_Code ('total', '1'=Public, '2'=Private),
 *   Units, Units_Code, Amount
 */
export const STORIES: Story[] = [
  {
    slug: 'bulgarias-shrinking-population',
    title: {
      bg: 'Свиващото се население на България',
      en: "Bulgaria's Shrinking Population",
    },
    description: {
      bg: 'Как демографската криза оформя бъдещето на страната',
      en: 'How the demographic crisis is shaping the future of the country',
    },
    highlightValue: '6.45M',
    trend: 'down',
    steps: [
      {
        title: { bg: 'Общата картина', en: 'The Big Picture' },
        content: {
          bg: 'От 1990 г. насам България е загубила над 1.5 милиона жители. Общото население пада всяка година — тенденция, която не показва признаци на спиране. Към 2024 г. страната е сред нациите с най-бързо намаляващо население в Европа.',
          en: 'Since 1990, Bulgaria has lost over 1.5 million residents. The total population falls every year — a trend showing no signs of stopping. By 2024, the country is among the fastest-shrinking nations in Europe.',
        },
        datasetId: 'population-demographics',
        focusFilter: {
          NUTS_Code: 'BG',
          Residence_Code: '0',
          Gender_Code: '0',
          Age: 'Total',
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: { trigger: 'axis' },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v / 1_000_000).toFixed(2) + 'M',
            },
          },
          series: [
            {
              type: 'line',
              name: 'Population',
              encode: { x: 'Year', y: 'Population' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#3b82f6' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: { bg: 'Жените са повече', en: 'Women Outnumber Men' },
        content: {
          bg: 'Разликата между половете нараства. Жените съставляват по-голяма и по-голяма дял от намаляващото население, отчасти защото мъжете имигрират по-активно и имат по-ниска средна продължителност на живота.',
          en: 'The gender gap is widening. Women make up a growing share of the shrinking population, partly because men emigrate at higher rates and have lower average life expectancy.',
        },
        datasetId: 'population-demographics',
        focusFilter: {
          NUTS_Code: 'BG',
          Residence_Code: '0',
          Gender_Code: ['1', '2'],
          Age: 'Total',
        },
        seriesGroupBy: 'Gender',
        echartsConfig: {
          tooltip: { trigger: 'axis' },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v / 1_000_000).toFixed(2) + 'M',
            },
          },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Population' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
      {
        title: { bg: 'Градовете срещу селото', en: 'Cities vs. Countryside' },
        content: {
          bg: 'Урбанизацията продължава. Докато градовете задържат население по-успешно, малките градове и селата се обезлюдяват с ускорени темпове. Разривът между градско и селско население се задълбочава с всяка изминала година.',
          en: 'Urbanisation continues. While cities retain population more effectively, small towns and villages are emptying at an accelerating pace. The urban-rural divide deepens with each passing year.',
        },
        datasetId: 'population-demographics',
        focusFilter: {
          NUTS_Code: 'BG',
          Gender_Code: '0',
          Age: 'Total',
          Residence_Code: ['1', '2'],
        },
        seriesGroupBy: 'Residence',
        echartsConfig: {
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v / 1_000_000).toFixed(2) + 'M',
            },
          },
          series: [
            {
              type: 'bar',
              encode: { x: 'Year', y: 'Population' },
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'bulgarias-unemployment',
    title: {
      bg: 'Безработицата в България',
      en: "Bulgaria's Unemployment",
    },
    description: {
      bg: 'Как се промени пазарът на труда през последните години',
      en: 'How the labour market has changed in recent years',
    },
    highlightValue: '4.2%',
    trend: 'down',
    steps: [
      {
        title: { bg: 'Общата тенденция', en: 'The Overall Trend' },
        content: {
          bg: 'Безработицата спадна до исторически ниски нива за последните десетилетия. След пика от кризата през 2013–2014 г. пазарът на труда се възстанови значително, достигайки нива около 4%.',
          en: 'Unemployment has fallen to historically low levels. After the crisis peak in 2013–2014, the labour market recovered significantly, reaching rates around 4%.',
        },
        datasetId: 'unemployment-rates-by-age-sex',
        focusFilter: {
          Age10_LFS: 'Total',
          Gender_Code: '0',
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: { trigger: 'axis' },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => v.toFixed(1) + '%',
            },
          },
          series: [
            {
              type: 'line',
              name: 'Unemployment Rate',
              encode: { x: 'Year', y: 'Rate' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#f59e0b' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: { bg: 'Младежка безработица', en: 'Youth Unemployment' },
        content: {
          bg: 'Младежката безработица (15–24 г.) остава значително по-висока от средната. Въпреки подобренията, младите хора са непропорционално засегнати от липсата на работни места.',
          en: 'Youth unemployment (15–24) remains significantly higher than the average. Despite improvements, young people are disproportionately affected by the lack of job opportunities.',
        },
        datasetId: 'unemployment-rates-by-age-sex',
        focusFilter: {
          Age10_LFS_Code: ['15 - 24', '25 - 34', '35 - 44', '55 - 64'],
          Gender_Code: '0',
        },
        seriesGroupBy: 'Age10_LFS',
        echartsConfig: {
          tooltip: { trigger: 'axis' },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => v.toFixed(1) + '%',
            },
          },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Rate' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
      {
        title: { bg: 'Мъже срещу жени', en: 'Men vs. Women' },
        content: {
          bg: 'Разликата в безработицата между мъжете и жените се е стеснила значително. И двата пола показват сходни тенденции на спад, макар мъжете исторически да имат малко по-висока безработица.',
          en: 'The unemployment gap between men and women has narrowed significantly. Both genders show similar declining trends, though men historically had slightly higher unemployment.',
        },
        datasetId: 'unemployment-rates-by-age-sex',
        focusFilter: {
          Age10_LFS: 'Total',
          Gender_Code: ['1', '2'],
        },
        seriesGroupBy: 'Gender',
        echartsConfig: {
          tooltip: { trigger: 'axis' },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => v.toFixed(1) + '%',
            },
          },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Rate' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'poverty-and-exclusion',
    title: {
      bg: 'Бедност и социално изключване',
      en: 'Poverty and Social Exclusion',
    },
    description: {
      bg: 'Защо толкова много българи остават в риск от бедност',
      en: 'Why so many Bulgarians remain at risk of poverty',
    },
    highlightValue: '43%',
    trend: 'up',
    steps: [
      {
        title: { bg: 'Рискът от бедност', en: 'The Poverty Risk' },
        content: {
          bg: 'Делът на хората в риск от бедност в България остава сред най-високите в ЕС. Въпреки икономическия растеж, над 40% от населението е застрашено от бедност или социално изключване.',
          en: 'The share of people at risk of poverty in Bulgaria remains among the highest in the EU. Despite economic growth, over 40% of the population faces risk of poverty or social exclusion.',
        },
        datasetId: 'monetary-poverty-rate',
        focusFilter: {
          Gender_Code: '0',
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) => (Number(v) * 100).toFixed(1) + '%',
          },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v * 100).toFixed(0) + '%',
            },
          },
          series: [
            {
              type: 'line',
              name: 'Poverty Rate',
              encode: { x: 'Year', y: 'Rate' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#ef4444' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: { bg: 'Разлика по пол', en: 'Gender Gap' },
        content: {
          bg: 'Жените са по-засегнати от бедността от мъжете. Разликата се дължи отчасти на по-ниските пенсии и по-малкото участие на пазара на труда сред по-възрастните жени.',
          en: 'Women are more affected by poverty than men. The gap is partly due to lower pensions and less labour market participation among older women.',
        },
        datasetId: 'monetary-poverty-rate',
        focusFilter: {
          Gender_Code: ['1', '2'],
        },
        seriesGroupBy: 'Gender',
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) => (Number(v) * 100).toFixed(1) + '%',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v * 100).toFixed(0) + '%',
            },
          },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Rate' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'rising-wages',
    title: {
      bg: 'Растящите заплати',
      en: 'Rising Wages',
    },
    description: {
      bg: 'Как средната заплата расте и какво стои зад цифрите',
      en: 'How average wages are growing and what lies behind the numbers',
    },
    highlightValue: '2 450 лв',
    trend: 'up',
    steps: [
      {
        title: { bg: 'Устойчив растеж', en: 'Steady Growth' },
        content: {
          bg: 'Средната брутна заплата расте устойчиво, надминавайки инфлацията в последните години и постепенно намалявайки разликата с европейския стандарт.',
          en: 'Average gross wages are growing steadily, outpacing inflation in recent years and gradually narrowing the gap with European levels.',
        },
        datasetId: 'average-annual-wages',
        focusFilter: {
          NACE2008A21_Code: '0',
          Ownership_Code: 'total',
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: { trigger: 'axis' },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) =>
                v >= 10_000
                  ? (v / 1000).toFixed(0) + 'K лв'
                  : v.toLocaleString() + ' лв',
            },
          },
          series: [
            {
              type: 'line',
              name: 'Average Wage',
              encode: { x: 'Year', y: 'Amount' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#10b981' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: {
          bg: 'Публичен срещу частен сектор',
          en: 'Public vs. Private Sector',
        },
        content: {
          bg: 'Заплатите в публичния сектор исторически изостават от тези в частния, но разликата се свива. В някои години публичният сектор дори надминава частния.',
          en: 'Public sector wages historically lagged behind private ones, but the gap is shrinking. In some years the public sector even surpasses the private.',
        },
        datasetId: 'average-annual-wages',
        focusFilter: {
          NACE2008A21_Code: '0',
          Ownership_Code: ['1', '2'],
        },
        seriesGroupBy: 'Ownership',
        echartsConfig: {
          tooltip: { trigger: 'axis' },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) =>
                v >= 10_000
                  ? (v / 1000).toFixed(0) + 'K лв'
                  : v.toLocaleString() + ' лв',
            },
          },
          series: [
            {
              type: 'bar',
              encode: { x: 'Year', y: 'Amount' },
            },
          ],
        },
      },
    ],
  },
];

export function getStoryBySlug(slug: string): Story | undefined {
  return STORIES.find((s) => s.slug === slug);
}

export function getAllStories(): Story[] {
  return STORIES;
}

export function getRandomStory(): Story {
  return STORIES[Math.floor(Math.random() * STORIES.length)];
}

export function getNextStory(currentSlug: string): Story | undefined {
  const idx = STORIES.findIndex((s) => s.slug === currentSlug);
  if (idx === -1 || STORIES.length <= 1) return undefined;
  return STORIES[(idx + 1) % STORIES.length];
}
