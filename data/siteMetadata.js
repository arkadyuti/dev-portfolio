/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: 'Arkadyuti Sarkar | Frontend Associate Architect',
  author: 'Arkadyuti Sarkar',
  headerTitle: 'Arkadyuti Sarkar',
  description: 'Frontend Associate Architect specializing in modern JavaScript frameworks, scalable architectures, and exceptional user experiences',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://example.com',
  siteRepo: '',
  siteLogo: `${process.env.BASE_PATH || ''}/static/images/logo.png`,
  socialBanner: `${process.env.BASE_PATH || ''}/static/images/twitter-card.png`,
  email: 'address@yoursite.com',
  github: 'https://github.com',
  x: 'https://twitter.com/x',
  facebook: 'https://facebook.com',
  youtube: 'https://youtube.com',
  linkedin: 'https://www.linkedin.com',
  threads: 'https://www.threads.net',
  instagram: 'https://www.instagram.com',
  medium: 'https://medium.com',
  bluesky: 'https://bsky.app/',
  locale: 'en-US',
  analytics: {
    // Analytics provider configurations
    googleAnalyticsId: '', // e.g. UA-000000-2 or G-XXXXXXX
  },
  keywords: [
    'frontend architecture',
    'react',
    'javascript',
    'web development',
    'UI/UX',
    'nextjs',
    'typescript',
    'frontend engineer',
    'portfolio'
  ]
}

module.exports = siteMetadata
