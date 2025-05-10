/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: 'Portfolio',
  author: 'Arkadyuti Sarkar',
  headerTitle: 'Blog',
  description: 'Portfolio',
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
  locale: 'en-US'
}

module.exports = siteMetadata
