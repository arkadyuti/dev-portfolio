/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: 'Arkadyuti Sarkar',
  author: 'Arkadyuti Sarkar',
  headerTitle: 'Arkadyuti Sarkar',
  description:
    'Associate Architect at Tekion with 9+ years building AI-powered developer workflows, enterprise CI/CD systems, and IoT platforms. Expertise in Model Context Protocol (MCP), React, Next.js, TypeScript, Docker, and scalable architectures.',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://dev.visharka.us',
  siteRepo: 'https://github.com/arkadyuti/dev-portfolio',
  siteLogo: `${process.env.BASE_PATH || ''}/static/favicons/android-chrome-512x512.png`,
  socialBanner: `${process.env.BASE_PATH || ''}/static/favicons/android-chrome-512x512.png`,
  email: 'diva_diagram_4v@icloud.com',
  github: 'https://github.com/arkadyuti',
  x: 'https://x.com/arkadooti',
  linkedin: 'https://www.linkedin.com/in/arkadyuti/',
  instagram: 'https://www.instagram.com/arkadyuti.sarkar/',
  locale: 'en-US',
  analytics: {
    // Analytics provider configurations
    // Add your Google Analytics 4 ID here (format: G-XXXXXXXXXX)
    // Get it from: https://analytics.google.com/
    // Steps: 1. Create GA4 property 2. Go to Admin > Data Streams > Web > Measurement ID
    googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || '', // e.g. G-XXXXXXXXXX
  },
  keywords: [
    'Arkadyuti Sarkar',
    'Associate Architect',
    'Tekion',
    'AI Developer Workflows',
    'Model Context Protocol',
    'MCP',
    'Enterprise Architecture',
    'CI/CD Optimization',
    'IoT Platform Development',
    'Technical Leadership',
    'React.js Expert',
    'TypeScript Architecture',
    'Docker',
    'Kubernetes',
    'Microservices',
    'Performance Optimization',
    'Team Scaling',
    'Jenkins',
    'AWS',
    'MongoDB',
    'MQTT',
    'Node.js',
    'Golang',
    'frontend architect',
    'backend development',
    'full stack developer',
    'software engineering',
    'portfolio website',
    'tech blog',
  ],
}

module.exports = siteMetadata
