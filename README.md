# Числопис / Chislopis

A modern, bilingual (Bulgarian/English) data visualization platform for Bulgaria's National Statistical Institute (NSI) open data.

## Features

- **Bilingual Support**: Full Bulgarian and English translations with seamless language switching
- **Auto-categorization**: 131+ datasets organized into 7 logical categories
- **Smart Chart Selection**: Automatically chooses the best visualization based on data characteristics
- **Interactive Visualizations**:
  - Line charts for time series data
  - Bar charts for categorical data
  - Pie charts for composition data
  - Maps for geographic data
  - Data tables for complex datasets
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Performance Optimized**: Caching, lazy loading, and efficient data fetching

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 18 + TypeScript
- **Charts**: Apache ECharts
- **Maps**: Leaflet (ready for integration)
- **Styling**: Tailwind CSS + shadcn/ui components
- **i18n**: next-intl
- **Data**: CSV + JSON-stat formats from NSI API

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
chislopis/
├── app/                        # Next.js App Router
│   ├── [locale]/              # i18n routing
│   │   ├── page.tsx           # Home page
│   │   └── category/[slug]/   # Category pages
│   └── api/                   # API routes
├── components/                # React components
│   ├── charts/               # Chart components
│   ├── layout/               # Layout components
│   └── visualization/        # Visualization components
├── lib/                      # Core logic
│   ├── data/                # Data fetching & registry
│   ├── charts/              # Chart selection logic
│   └── geo/                 # Geographic mappings
├── types/                   # TypeScript definitions
├── messages/                # i18n translations
└── public/                  # Static assets
```

## Data Categories

1. **Demographics** - Population, births, deaths, migration
2. **Economy** - GDP, business statistics, foreign trade
3. **Labor & Employment** - Employment, unemployment, wages
4. **Social Indicators** - Income, poverty, education, healthcare
5. **Regional Statistics** - Data by regions and municipalities
6. **Sectoral Statistics** - Tourism, culture, industry
7. **Finance** - Budget, banking, investment

## Chart Auto-Selection

The platform automatically selects the most appropriate chart type based on data characteristics:

- Geographic data + numerical → **Map**
- Time series data → **Line chart**
- Categorical data (≤7 categories) → **Pie chart**
- Categorical data (>7 categories) → **Bar chart**
- Two numerical dimensions → **Scatter plot**
- Complex data → **Data table**

Users can manually override the auto-selection if needed.

## Dataset Registry

The platform catalogs 15 key NSI datasets (MVP). The registry can be expanded to include all 131+ available datasets.

Current datasets include:
- Population by districts and municipalities
- Births and deaths statistics
- GDP by districts
- Foreign trade data
- Employment and unemployment rates
- Average wages by sector
- And more...

## Adding New Datasets

To add a new dataset:

1. Open `lib/data/datasetRegistry.ts`
2. Add a new dataset entry following the `Dataset` interface
3. Include bilingual titles, descriptions, and URLs
4. Specify data characteristics (hasGeographic, hasTimeSeries, etc.)
5. The visualization will be automatically generated!

## Localization

Add new translations in:
- `messages/bg.json` (Bulgarian)
- `messages/en.json` (English)

## Performance Features

- **In-memory caching**: 1-hour cache for fetched datasets
- **Lazy loading**: Charts load only when needed
- **Pagination**: Tables handle large datasets efficiently
- **Responsive charts**: Auto-resize on viewport changes

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Data Source

All data is sourced from the [National Statistical Institute of Bulgaria (NSI)](https://www.nsi.bg) open data portal.

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Future Enhancements

- [ ] Dataset search functionality
- [ ] Custom dashboard builder
- [ ] Data comparison tool
- [ ] Export charts as PNG/SVG
- [ ] User accounts & saved dashboards
- [ ] Real-time data updates
- [ ] Mobile app
- [ ] Full Leaflet map integration
- [ ] More datasets (expand to all 131+)

## Contact

For questions or feedback, please open an issue on GitHub.
