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
 *
 * Column reference for building-permits (dataset ID 654):
 *   Year (from periods), BUILD_Permit / BUILD_Permit_Code ('1'=Residential, '2'=Administrative, '3'=Other),
 *   BUILD_Permit1 / BUILD_Permit1_Code ('4'=Number, '5'=Number of dwellings, '6'=Gross area sq.m),
 *   District_Projection / District_Projection_Code ('BG'=Total, 'SOF'=Sofia-grad, 'PDV'=Plovdiv, etc.),
 *   periods_name / periods_name_Code ('Q1'–'Q4'), Count
 *
 * Column reference for arrivals-from-abroad (dataset ID 240):
 *   Year (from periods — annual rows are '2008'…'2020'; monthly rows are '2008I'…'2020XII'),
 *   Indicators / Indicators_Code ('3.5.1.2'=Total, '3.5.1.2.1'=Holiday, '3.5.1.2.2'=Business, '3.5.1.2.3'=Other),
 *   Countries_TOUR / Countries_TOUR_Code ('total'=Total, 'RO'=Romania, 'TR'=Turkiye, etc.), Visitors
 *
 * Column reference for pension-funds-balance (dataset ID 781):
 *   Year (from periods, annual 2005–2024),
 *   Indicators / Indicators_Code ('3.1.2.4.3.0.1'=Total Assets, '3.1.2.4.3.0.2'=Total Liabilities, etc.),
 *   Units / Units_Code ('1000BGN'=Thousand BGN), Amount
 *
 * Column reference for pension-funds-income (dataset ID 785):
 *   Year (from periods, annual 2005–2024),
 *   Indicators / Indicators_Code ('3.1.2.4.1.0.2.1'=Total revenues, '3.1.2.4.1.0.1.1'=Total expenditure),
 *   Units / Units_Code, Amount
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
        chartTranslations: {
          'Population': { bg: 'Население', en: 'Population' },
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
        chartTranslations: {
          'Male': { bg: 'Мъже', en: 'Male' },
          'Female': { bg: 'Жени', en: 'Female' },
        },
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
        chartTranslations: {
          'Urban': { bg: 'В градовете', en: 'Urban' },
          'Rural': { bg: 'В селата', en: 'Rural' },
        },
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
      {
        title: { bg: 'Все по-малко бебета', en: 'Fewer Babies Born' },
        content: {
          bg: 'Раждаемостта е ключовият двигател на демографския спад. От над 100 000 живородени годишно в началото на 90-те години, България стига до около 55 000 през последните години. При смъртност, надвишаваща раждаемостта, естественият прираст е отрицателен от десетилетия.',
          en: 'Falling birth rates are the key driver of population decline. From over 100,000 live births per year in the early 1990s, Bulgaria has dropped to around 55,000 in recent years. With deaths exceeding births, the natural increase has been negative for decades.',
        },
        datasetId: 'live-births',
        focusFilter: {
          EKATTE_Code: 'BG',
          Gender_Code: '0',
        },
        chartTranslations: {
          'Live Births': { bg: 'Живородени', en: 'Live Births' },
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
                v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v),
            },
          },
          series: [
            {
              type: 'line',
              name: 'Live Births',
              encode: { x: 'Year', y: 'LiveBirths' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#ec4899' },
              lineStyle: { width: 3 },
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
        chartTranslations: {
          'Unemployment Rate': { bg: 'Безработица', en: 'Unemployment Rate' },
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
        chartTranslations: {
          'Male': { bg: 'Мъже', en: 'Male' },
          'Female': { bg: 'Жени', en: 'Female' },
        },
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
        title: { bg: 'Образованието има значение', en: 'Education Matters' },
        content: {
          bg: 'Безработицата сред хората с основно или по-ниско образование е многократно по-висока от тази сред висшистите. Разликата е драматична — висшето образование намалява риска от безработица почти четири пъти. Този „образователен щит" се засилва с годините.',
          en: 'Unemployment among those with primary or lower education is several times higher than among university graduates. The gap is dramatic — a higher education degree cuts unemployment risk by nearly four times. This "education shield" has strengthened over the years.',
        },
        datasetId: 'unemployment-rates-by-education',
        focusFilter: {
          Age10_LFS_Code: '0',
          LFS_EDUlevel_Code: ['1', '2', '4'],
        },
        seriesGroupBy: 'LFS_EDUlevel',
        chartTranslations: {
          'Higher': { bg: 'Висше', en: 'Higher' },
          'Upper secondary': { bg: 'Средно', en: 'Upper secondary' },
          'Primary or lower': { bg: 'Основно и по-ниско', en: 'Primary or lower' },
        },
        echartsConfig: {
          tooltip: { trigger: 'axis' },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => v.toFixed(0) + '%',
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
        chartTranslations: {
          'Poverty Rate': { bg: 'Риск от бедност', en: 'Poverty Rate' },
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
        chartTranslations: {
          'Male': { bg: 'Мъже', en: 'Male' },
          'Female': { bg: 'Жени', en: 'Female' },
        },
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
      {
        title: { bg: 'Възрастта има значение', en: 'Age Matters' },
        content: {
          bg: 'Рискът от бедност не е равномерно разпределен по възрасти. Хората над 65 години са най-уязвими — ниските пенсии ги поставят трайно под прага на бедност. Децата под 18 г. също са в по-висок риск от средния за работоспособното население.',
          en: 'The risk of poverty is not evenly distributed across ages. People over 65 are the most vulnerable — low pensions keep them persistently below the poverty line. Children under 18 also face higher risk than the working-age population.',
        },
        datasetId: 'poverty-rate-by-age-sex',
        focusFilter: {
          NUTS_Code: 'BG',
          Gender_Code: '0',
          SILC_Median_Code: '3',
          Units_Code: 'perc_pop_fig',
          SILC_Age_Code: ['1', '2', '3'],
        },
        seriesGroupBy: 'SILC_Age',
        chartTranslations: {
          'Less than 18 years': { bg: 'Под 18 години', en: 'Less than 18 years' },
          'Between 18 and 64 years': { bg: 'Между 18 и 64 години', en: 'Between 18 and 64 years' },
          '65 years and over': { bg: '65 и повече години', en: '65 years and over' },
        },
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) => Number(v).toFixed(1) + '%',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => v.toFixed(0) + '%',
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
        title: { bg: 'Работещ, но беден', en: 'Working but Still Poor' },
        content: {
          bg: 'Наличието на работа не гарантира излизане от бедността. Делът на „работещите бедни" в България е сред най-високите в ЕС — около 8–10% от заетите живеят под прага на бедност. Ниските заплати в редица сектори са основната причина.',
          en: 'Having a job does not guarantee an escape from poverty. Bulgaria\'s in-work poverty rate is among the highest in the EU — around 8–10% of employed people live below the poverty line. Low wages in several sectors are the main driver.',
        },
        datasetId: 'in-work-poverty-by-age-sex',
        focusFilter: {
          Gender_Code: '0',
          SILC_Age_Code: '9',
        },
        chartTranslations: {
          'In-Work Poverty Rate': { bg: 'Бедност сред работещите', en: 'In-Work Poverty Rate' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) => Number(v).toFixed(1) + '%',
          },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => v.toFixed(0) + '%',
            },
          },
          series: [
            {
              type: 'line',
              name: 'In-Work Poverty Rate',
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
        title: { bg: 'Регионалният разрив', en: 'The Regional Divide' },
        content: {
          bg: 'Бедността в България има ясна география. Северозападен и Югоизточен район имат най-високи нива на бедност, докато Югозападен район (включващ София) е значително по-добре. Разликите между регионите са по-големи, отколкото между България и много страни от ЕС.',
          en: 'Poverty in Bulgaria has a clear geography. The Northwest and Southeast regions have the highest poverty rates, while the Southwest (including Sofia) fares significantly better. The gap between regions is larger than between Bulgaria and many EU countries.',
        },
        datasetId: 'monetary-poverty-rate-regional',
        focusFilter: {
          NUTS_Code: ['BG31', 'BG32', 'BG33', 'BG34', 'BG41', 'BG42'],
        },
        seriesGroupBy: 'NUTS',
        chartTranslations: {
          'Severozapaden': { bg: 'Северозападен', en: 'Severozapaden' },
          'Severen tsentralen': { bg: 'Северен централен', en: 'Severen tsentralen' },
          'Severoiztochen': { bg: 'Североизточен', en: 'Severoiztochen' },
          'Yugoiztochen': { bg: 'Югоизточен', en: 'Yugoiztochen' },
          'Yugozapaden': { bg: 'Югозападен', en: 'Yugozapaden' },
          'Yuzhen tsentralen': { bg: 'Южен централен', en: 'Yuzhen tsentralen' },
        },
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) => Number(v).toFixed(1) + '%',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => v.toFixed(0) + '%',
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
        chartTranslations: {
          'Average Wage': { bg: 'Средна заплата', en: 'Average Wage' },
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
        chartTranslations: {
          'Public sector': { bg: 'Публичен сектор', en: 'Public sector' },
          'Private sector': { bg: 'Частен сектор', en: 'Private sector' },
        },
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
      {
        title: { bg: 'Победители и губещи', en: 'Winners and Losers' },
        content: {
          bg: 'Секторните разлики в заплатите са огромни. Информационните технологии (J) водят с над 64 000 лв годишно, следвани от енергетика и финанси. В другия край — хотелиерството и ресторантьорството, „другите услуги" и земеделието остават далеч под средното ниво.',
          en: 'Sector wage gaps are enormous. Information & Communication (J) leads with over 64,000 BGN annually, followed by energy and finance. At the other end — hospitality, other services, and agriculture remain far below the national average.',
        },
        datasetId: 'average-annual-wages',
        focusFilter: {
          Ownership_Code: 'total',
          Year: '2024',
          NACE2008A21_Code: [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
            'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
          ],
        },
        chartTranslations: {
          'Annual Wage (2024)': { bg: 'Годишна заплата (2024)', en: 'Annual Wage (2024)' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: { trigger: 'axis' },
          grid: { left: '30%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) =>
                v >= 10_000
                  ? (v / 1000).toFixed(0) + 'K лв'
                  : v.toLocaleString() + ' лв',
            },
          },
          yAxis: { type: 'category' },
          series: [
            {
              type: 'bar',
              name: 'Annual Wage (2024)',
              encode: { x: 'Amount', y: 'NACE2008A21' },
              itemStyle: { color: '#10b981' },
            },
          ],
        },
      },
      {
        title: { bg: 'Разривът расте', en: 'The Gap Widens' },
        content: {
          bg: 'ИТ секторът се откъсва все по-бързо от останалата икономика. Средната заплата в хотелиерството едва надхвърля 17 000 лв, докато в ИТ надминава 64 000 лв — разлика почти 4 пъти. Преди десетилетие съотношението беше по-малко от 3:1.',
          en: 'The IT sector is pulling away from the rest of the economy at an accelerating pace. The average wage in hospitality barely exceeds 17,000 BGN while IT surpasses 64,000 BGN — a nearly 4× gap. A decade ago the ratio was less than 3:1.',
        },
        datasetId: 'average-annual-wages',
        focusFilter: {
          Ownership_Code: 'total',
          NACE2008A21_Code: ['J', 'I'],
        },
        seriesGroupBy: 'NACE2008A21',
        chartTranslations: {
          'Information and communication': { bg: 'Информация и комуникация', en: 'Information and communication' },
          'Accommodation and food service activities': { bg: 'Хотелиерство и ресторантьорство', en: 'Accommodation and food service activities' },
        },
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
              type: 'line',
              encode: { x: 'Year', y: 'Amount' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
    ],
  },

  // ── Story 5: Economy → Construction ──────────────────────────────────────
  {
    slug: 'bulgarias-building-boom',
    title: {
      bg: 'Строителният бум в България',
      en: "Bulgaria's Building Boom",
    },
    description: {
      bg: 'Как разрешителните за строеж разкриват пулса на икономиката',
      en: 'How building permits reveal the pulse of the economy',
    },
    highlightValue: '1 823',
    trend: 'up',
    steps: [
      {
        title: { bg: 'Националната тенденция', en: 'The National Trend' },
        content: {
          bg: 'Броят на издадените разрешителни за жилищно строителство расте постепенно от 2005 г. насам. Ниският първи квартал на всяка година отразява строителния цикъл — темпото се ускорява към средата и края на годината. Въпреки кризата от 2009–2012 г. секторът се е възстановил напълно.',
          en: 'The number of building permits issued for residential construction has grown steadily since 2005. The first quarter of each year is typically the quietest — construction activity accelerates as the year progresses. Despite the 2009–2012 crisis, the sector has fully recovered.',
        },
        datasetId: 'building-permits',
        focusFilter: {
          District_Projection_Code: 'BG',
          BUILD_Permit_Code: '1',
          BUILD_Permit1_Code: '4',
          periods_name_Code: 'Q1',
        },
        chartTranslations: {
          'Residential Permits (Q1)': { bg: 'Жилищни разрешителни (Q1)', en: 'Residential Permits (Q1)' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: { trigger: 'axis' },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: { type: 'value', name: 'Permits' },
          series: [
            {
              type: 'line',
              name: 'Residential Permits (Q1)',
              encode: { x: 'Year', y: 'Count' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#f97316' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: { bg: 'Не само жилища', en: 'Not Just Homes' },
        content: {
          bg: 'Жилищното строителство доминира, но „другите сгради" (складове, стопански постройки, инфраструктура) не изостават много. Административните сгради (офиси, банки, хотели) са сравнително малко на брой — знак, че строителният бум е воден основно от жилищното търсене.',
          en: 'Residential buildings dominate, but "other buildings" (warehouses, farm buildings, infrastructure) are not far behind. Administrative buildings (offices, banks, hotels) are comparatively few — a sign that the construction boom is driven mainly by housing demand.',
        },
        datasetId: 'building-permits',
        focusFilter: {
          District_Projection_Code: 'BG',
          BUILD_Permit1_Code: '4',
          periods_name_Code: 'Q1',
        },
        seriesGroupBy: 'BUILD_Permit',
        chartTranslations: {
          'Residential buildings': { bg: 'Жилищни сгради', en: 'Residential buildings' },
          'Administrative buildings': { bg: 'Административни сгради', en: 'Administrative buildings' },
          'Other buildings': { bg: 'Други сгради', en: 'Other buildings' },
        },
        echartsConfig: {
          tooltip: { trigger: 'axis' },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: { type: 'value', name: 'Permits' },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Count' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
      {
        title: { bg: 'Колко нови жилища?', en: 'How Many Dwellings?' },
        content: {
          bg: 'Едно разрешително може да покрива десетки или стотици апартаменти в жилищна сграда. Броят на предвидените жилища в разрешителните за жилищно строителство показва реалния мащаб на новото предлагане — от под 3 000 жилища на тримесечие през 2010 г. до над 10 000 през 2025 г.',
          en: 'A single permit can cover dozens or hundreds of apartments in a residential building. The number of dwellings in residential building permits reveals the true scale of new supply — from under 3,000 dwellings per quarter in 2010 to over 10,000 by 2025.',
        },
        datasetId: 'building-permits',
        focusFilter: {
          District_Projection_Code: 'BG',
          BUILD_Permit_Code: '1',
          BUILD_Permit1_Code: '5',
          periods_name_Code: 'Q1',
        },
        chartTranslations: {
          'Dwellings in Permits (Q1)': { bg: 'Жилища в разрешителни (Q1)', en: 'Dwellings in Permits (Q1)' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: { trigger: 'axis' },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: { type: 'value', name: 'Dwellings' },
          series: [
            {
              type: 'line',
              name: 'Dwellings in Permits (Q1)',
              encode: { x: 'Year', y: 'Count' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#f97316' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: { bg: 'Кой строи най-много?', en: 'Where is the Most Building?' },
        content: {
          bg: 'В Q1 на 2024 г. ясно се откроява регионалното неравенство. София-град и Пловдив са далеч пред останалите области по брой издадени разрешителни за жилищно строителство. Активното строителство следва концентрацията на население и икономически растеж.',
          en: 'In Q1 2024, regional inequality is stark. Sofia-grad and Plovdiv are far ahead of other districts in residential building permits issued. Active construction follows population concentration and economic growth.',
        },
        datasetId: 'building-permits',
        focusFilter: {
          BUILD_Permit_Code: '1',
          BUILD_Permit1_Code: '4',
          periods_name_Code: 'Q1',
          Year: '2024',
        },
        chartTranslations: {
          'Residential Permits Q1 2024': { bg: 'Жилищни разрешителни Q1 2024', en: 'Residential Permits Q1 2024' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: { trigger: 'axis' },
          grid: { left: '20%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'value', name: 'Permits' },
          yAxis: { type: 'category' },
          series: [
            {
              type: 'bar',
              name: 'Residential Permits Q1 2024',
              encode: { x: 'Count', y: 'District_Projection' },
              itemStyle: { color: '#f97316' },
            },
          ],
        },
      },
    ],
  },

  // ── Story 6: Sectoral → Tourism ───────────────────────────────────────────
  {
    slug: 'bulgarias-tourism',
    title: {
      bg: 'България на туристическата карта',
      en: 'Bulgaria on the Tourist Map',
    },
    description: {
      bg: 'Бум, срив и ново начало — историята на туризма в България',
      en: 'Boom, crash, and new beginnings — the story of tourism in Bulgaria',
    },
    highlightValue: '12.6M',
    trend: 'down',
    steps: [
      {
        title: { bg: 'Бумът и сривът', en: 'The Boom and the Crash' },
        content: {
          bg: 'Туризмът в България растеше непрекъснато от 2008 до 2019 г., достигайки връх от над 12.5 милиона посещения. Пандемията от COVID-19 срина тази тенденция почти за нула — 2020 г. отчита едва малка част от пиковите нива. Туристическият сектор беше сред най-тежко засегнатите от кризата.',
          en: 'Tourism to Bulgaria grew steadily from 2008 to 2019, peaking at over 12.5 million arrivals. The COVID-19 pandemic wiped out nearly all of this growth — 2020 recorded only a fraction of peak levels. The tourism sector was among the hardest hit by the crisis.',
        },
        datasetId: 'arrivals-from-abroad',
        focusFilter: {
          Indicators_Code: '3.5.1.2',
          Countries_TOUR_Code: 'total',
          Year: [
            '2008', '2009', '2010', '2011', '2012', '2013',
            '2014', '2015', '2016', '2017', '2018', '2019', '2020',
          ],
        },
        chartTranslations: {
          'Total Arrivals': { bg: 'Общо пристигания', en: 'Total Arrivals' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) =>
              Number(v).toLocaleString() + ' visitors',
          },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v / 1_000_000).toFixed(1) + 'M',
            },
          },
          series: [
            {
              type: 'line',
              name: 'Total Arrivals',
              encode: { x: 'Year', y: 'Visitors' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#06b6d4' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: { bg: 'Защо идват?', en: 'Why They Come' },
        content: {
          bg: 'По-голямата част от чуждестранните посетители идват с цел почивка и отдих — курортите по Черноморието и ски туризмът са основни магнити. Деловият туризъм е значително по-малък, но по-стабилен и по-малко зависим от сезоните. Пандемията засегна непропорционално ваканционния туризъм.',
          en: 'The majority of foreign visitors come for holiday and recreation — the Black Sea resorts and ski tourism are major draws. Business travel is significantly smaller but more stable and less dependent on seasons. The pandemic disproportionately hit leisure tourism.',
        },
        datasetId: 'arrivals-from-abroad',
        focusFilter: {
          Indicators_Code: ['3.5.1.2.1', '3.5.1.2.2', '3.5.1.2.3'],
          Countries_TOUR_Code: 'total',
          Year: [
            '2008', '2009', '2010', '2011', '2012', '2013',
            '2014', '2015', '2016', '2017', '2018', '2019', '2020',
          ],
        },
        seriesGroupBy: 'Indicators',
        chartTranslations: {
          'Arrivals of visitors from abroad to Bulgaria holiday and recreation purpose': { bg: 'Почивка и отдих', en: 'Holiday and recreation' },
          'Arrivals of visitors from abroad to Bulgaria by professional purpose': { bg: 'Делова цел', en: 'Professional purpose' },
          'Arrivals of visitors from abroad to Bulgaria by other purposes': { bg: 'Други цели', en: 'Other purposes' },
        },
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) =>
              (Number(v) / 1_000_000).toFixed(2) + 'M',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v / 1_000_000).toFixed(1) + 'M',
            },
          },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Visitors' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
      {
        title: { bg: 'Откъде идват туристите?', en: 'Where do Tourists Come From?' },
        content: {
          bg: 'В рекордната 2019 г. Румъния е водещият пазар за туризъм в България с над 2.1 милиона посещения. Следват Турция и Сърбия. Туристи от Западна Европа (Германия, Великобритания, Франция) също са сред постоянните гости. Географската близост е ключов фактор.',
          en: 'In the record year of 2019, Romania was the top source market for Bulgarian tourism with over 2.1 million arrivals, followed by Turkiye and Serbia. Visitors from Western Europe (Germany, United Kingdom, France) are also consistent contributors. Geographic proximity is a key driver.',
        },
        datasetId: 'arrivals-from-abroad',
        focusFilter: {
          Indicators_Code: '3.5.1.2',
          Year: '2019',
          Countries_TOUR_Code: ['RO', 'TR', 'RS', 'UA', 'RoW', 'RU', 'PL', 'DE', 'GR', 'GB'],
        },
        chartTranslations: {
          'Arrivals': { bg: 'Пристигания', en: 'Arrivals' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) => Number(v).toLocaleString(),
          },
          grid: { left: '22%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'value', name: 'Arrivals (2019)' },
          yAxis: { type: 'category' },
          series: [
            {
              type: 'bar',
              name: 'Arrivals',
              encode: { x: 'Visitors', y: 'Countries_TOUR' },
              itemStyle: { color: '#06b6d4' },
            },
          ],
        },
      },
      {
        title: { bg: 'Променящите се пазари', en: 'Shifting Markets' },
        content: {
          bg: 'Румъния остава стабилно най-големият пазар, нараствайки от 1.8 на 2.2 милиона за десетилетие. Русия показва рязък обрат — след връх през 2013 г. (санкции и геополитика) руските туристи намаляват почти тройно. Турция расте постоянно, а Германия остава стабилна.',
          en: 'Romania remains the steadiest top market, growing from 1.8M to 2.2M over the decade. Russia tells a different story — after peaking in 2013, Russian arrivals fell nearly threefold amid sanctions and geopolitics. Turkiye grew consistently while Germany stayed flat.',
        },
        datasetId: 'arrivals-from-abroad',
        focusFilter: {
          Indicators_Code: '3.5.1.2',
          Countries_TOUR_Code: ['RO', 'DE', 'RU', 'TR'],
          Year: [
            '2008', '2009', '2010', '2011', '2012', '2013',
            '2014', '2015', '2016', '2017', '2018', '2019', '2020',
          ],
        },
        seriesGroupBy: 'Countries_TOUR',
        chartTranslations: {
          'Romania': { bg: 'Румъния', en: 'Romania' },
          'Germany': { bg: 'Германия', en: 'Germany' },
          'Russian Federation': { bg: 'Русия', en: 'Russian Federation' },
          'Turkiye': { bg: 'Турция', en: 'Turkiye' },
        },
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) =>
              (Number(v) / 1_000_000).toFixed(2) + 'M',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) => (v / 1_000_000).toFixed(1) + 'M',
            },
          },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Visitors' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
    ],
  },

  // ── Story 7: Finance → Pensions ───────────────────────────────────────────
  {
    slug: 'saving-for-old-age',
    title: {
      bg: 'Спестявания за старини',
      en: 'Saving for Old Age',
    },
    description: {
      bg: 'Как нарастват пенсионните фондове в застаряваща България',
      en: 'How pension funds are growing in an ageing Bulgaria',
    },
    highlightValue: '26.7B лв',
    trend: 'up',
    steps: [
      {
        title: { bg: 'Нарастващите резерви', en: 'Growing Reserves' },
        content: {
          bg: 'Активите на фондовете за допълнително пенсионно осигуряване нарастват от около 1.1 милиарда лева през 2005 г. до над 26 милиарда лева през 2024 г. Тяхното нарастване отразява постепенното изграждане на втория стълб на пенсионната система и отговор на демографските предизвикателства пред НОИ.',
          en: 'Assets of supplementary pension insurance funds have grown from about 1.1 billion BGN in 2005 to over 26 billion BGN in 2024. This reflects the gradual build-up of the second pillar of the pension system and a response to the demographic challenges facing the state pension insurer.',
        },
        datasetId: 'pension-funds-balance',
        focusFilter: {
          Indicators_Code: '3.1.2.4.3.0.1',
        },
        chartTranslations: {
          'Total Assets': { bg: 'Общо активи', en: 'Total Assets' },
        },
        echartsConfig: {
          dataset: { source: '__injected__' },
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) =>
              (Number(v) / 1_000_000).toFixed(1) + 'B лв',
          },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category', boundaryGap: false },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) =>
                (v / 1_000_000).toFixed(0) + 'B лв',
            },
          },
          series: [
            {
              type: 'line',
              name: 'Total Assets',
              encode: { x: 'Year', y: 'Amount' },
              smooth: true,
              areaStyle: { opacity: 0.15 },
              itemStyle: { color: '#8b5cf6' },
              lineStyle: { width: 3 },
            },
          ],
        },
      },
      {
        title: { bg: 'Къде отиват парите?', en: 'Where the Money Goes' },
        content: {
          bg: 'Инвестициите съставляват по-голямата част от активите на пенсионните фондове. Средствата са разпределени между български и чуждестранни финансови инструменти, банкови депозити и инвестиционни имоти — стратегия за диверсификация, която защитава спестяванията на бъдещите пенсионери.',
          en: 'Investments make up the bulk of pension fund assets. The money is spread across domestic and foreign financial instruments, bank deposits, and investment property — a diversification strategy that protects future pensioners\' savings.',
        },
        datasetId: 'pension-funds-balance',
        focusFilter: {
          Indicators_Code: [
            '3.1.2.4.3.0.1.1.1',
            '3.1.2.4.3.0.1.1.2',
            '3.1.2.4.3.0.1.1.3',
            '3.1.2.4.3.0.1.1.4',
          ],
        },
        seriesGroupBy: 'Indicators',
        chartTranslations: {
          'Financial assets issued by issuers headquarters in the Republic of Bulgaria': { bg: 'Финансови активи — емитенти в България', en: 'Domestic financial assets' },
          'Financial assets issued by issuers headquarters  outside the Republic of Bulgaria': { bg: 'Финансови активи — емитенти в чужбина', en: 'Foreign financial assets' },
          'Deposits in banks': { bg: 'Банкови депозити', en: 'Deposits in banks' },
          'Investment estate': { bg: 'Инвестиционни имоти', en: 'Investment estate' },
        },
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) =>
              (Number(v) / 1_000_000).toFixed(1) + 'B лв',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) =>
                (v / 1_000_000).toFixed(0) + 'B лв',
            },
          },
          series: [
            {
              type: 'line',
              encode: { x: 'Year', y: 'Amount' },
              smooth: true,
              lineStyle: { width: 2 },
            },
          ],
        },
      },
      {
        title: { bg: 'Активи срещу задължения', en: 'Assets vs. Liabilities' },
        content: {
          bg: 'Нетната позиция на фондовете — разликата между активите и задълженията — расте стабилно. Фондовете не само стават по-големи, те остават платежоспособни: активите далеч надхвърлят задълженията към осигурените лица и пенсионерите.',
          en: 'The net position of the funds — the gap between assets and liabilities — is growing steadily. The funds are not only getting bigger, they remain solvent: assets far exceed obligations to insured persons and pensioners.',
        },
        datasetId: 'pension-funds-balance',
        focusFilter: {
          Indicators_Code: ['3.1.2.4.3.0.1', '3.1.2.4.3.0.2'],
        },
        seriesGroupBy: 'Indicators',
        chartTranslations: {
          'Total Assets': { bg: 'Общо активи', en: 'Total Assets' },
          'Total Liabilities': { bg: 'Общо задължения', en: 'Total Liabilities' },
        },
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) =>
              (Number(v) / 1_000_000).toFixed(1) + 'B лв',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) =>
                (v / 1_000_000).toFixed(0) + 'B лв',
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
      {
        title: { bg: 'Приходи срещу разходи', en: 'Revenues vs. Expenditures' },
        content: {
          bg: 'Фондовете генерират приходи — основно от инвестиции — и изплащат суми на осигурените лица. Разходите растат постепенно, тъй като все повече хора достигат пенсионна възраст. В повечето години приходите надвишават разходите, което осигурява нетен ръст на фондовете.',
          en: 'The funds generate revenues — mainly from investments — and pay out to insured persons and pensioners. Expenditures grow steadily as more people reach retirement age. In most years revenues exceed expenditures, generating net growth in the funds.',
        },
        datasetId: 'pension-funds-income',
        focusFilter: {
          Indicators_Code: ['3.1.2.4.1.0.2.1', '3.1.2.4.1.0.1.1'],
        },
        seriesGroupBy: 'Indicators',
        chartTranslations: {
          'Total revenues': { bg: 'Общо приходи', en: 'Total revenues' },
          'Total expenditure': { bg: 'Общо разходи', en: 'Total expenditure' },
        },
        echartsConfig: {
          tooltip: {
            trigger: 'axis',
            valueFormatter: (v: unknown) =>
              (Number(v) / 1_000_000).toFixed(1) + 'B лв',
          },
          legend: {},
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: { type: 'category' },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (v: number) =>
                (v / 1_000_000).toFixed(0) + 'B лв',
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
