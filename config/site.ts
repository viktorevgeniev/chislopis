export const siteConfig = {
  name: {
    bg: 'Числопис',
    en: 'Chislopis'
  },
  description: {
    bg: 'Визуализация на данни от Националния статистически институт',
    en: 'NSI Data Visualization Platform'
  },
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ogImage: '/og-image.png',
  links: {
    nsi: 'https://www.nsi.bg',
    github: 'https://github.com/yourusername/chislopis'
  }
};
