import { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'

interface PageSEOProps {
  title: string
  description?: string
  image?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  tags?: string[]
  [key: string]: string | string[] | undefined
}

export function genPageMetadata({
  title,
  description,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  tags,
  ...rest
}: PageSEOProps): Metadata {
  // Generate absolute URL for image
  const imageUrl = image
    ? image.startsWith('http')
      ? image
      : `${siteMetadata.siteUrl}${image}`
    : siteMetadata.socialBanner

  // Check if title already includes site name to avoid duplication
  const includesSiteName = title.toLowerCase().includes(siteMetadata.title.toLowerCase())
  const ogTitle = includesSiteName ? title : `${title} | ${siteMetadata.title}`

  return {
    title,
    description: description || siteMetadata.description,
    alternates: {
      canonical: './',
    },
    openGraph: {
      title: ogTitle,
      description: description || siteMetadata.description,
      url: './',
      siteName: siteMetadata.title,
      images: image ? [imageUrl] : [siteMetadata.socialBanner],
      locale: 'en_US',
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors?.length && { authors }),
    },
    twitter: {
      title: ogTitle,
      card: 'summary_large_image',
      images: image ? [imageUrl] : [siteMetadata.socialBanner],
    },
    ...rest,
  }
}

// Helper function to generate structured data for blog posts
export function generateArticleStructuredData({
  title,
  description,
  image,
  publishedTime,
  modifiedTime,
  authorName,
  authorUrl,
  url,
}: {
  title: string
  description: string
  image: string
  publishedTime: string
  modifiedTime?: string
  authorName: string
  authorUrl?: string
  url: string
}) {
  const imageUrl = image.startsWith('http') ? image : `${siteMetadata.siteUrl}${image}`
  const pageUrl = url.startsWith('http') ? url : `${siteMetadata.siteUrl}${url}`

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: imageUrl,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl || siteMetadata.siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteMetadata.title,
      logo: {
        '@type': 'ImageObject',
        url: `${siteMetadata.siteUrl}${siteMetadata.siteLogo}`,
      },
    },
    url: pageUrl,
    datePublished: publishedTime,
    ...(modifiedTime && { dateModified: modifiedTime }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
  })
}

// Helper function to generate structured data for person profile
export function generatePersonStructuredData({
  name,
  title,
  description,
  image,
  url,
  sameAs,
  skills,
  worksFor,
}: {
  name: string
  title: string
  description: string
  image: string
  url: string
  sameAs: string[]
  skills?: string[]
  worksFor?: { name: string; url?: string }
}) {
  const imageUrl = image.startsWith('http') ? image : `${siteMetadata.siteUrl}${image}`
  const pageUrl = url.startsWith('http') ? url : `${siteMetadata.siteUrl}${url}`

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: name,
    jobTitle: title,
    description: description,
    image: imageUrl,
    url: pageUrl,
    sameAs: sameAs,
  }

  // Add worksFor if provided
  if (worksFor) {
    schema.worksFor = {
      '@type': 'Organization',
      name: worksFor.name,
      ...(worksFor.url && { url: worksFor.url }),
    }
  }

  // Add knowsAbout (skills) if provided
  if (skills && skills.length > 0) {
    schema.knowsAbout = skills
  }

  // Add additional professional context
  schema.hasOccupation = {
    '@type': 'Occupation',
    name: title,
    occupationalCategory: {
      '@type': 'CategoryCode',
      inCodeSet: {
        '@type': 'CategoryCodeSet',
        name: 'O*NET-SOC',
      },
      codeValue: '15-1252.00', // Software Developers
      name: 'Software Developers',
    },
    skills: skills && skills.length > 0 ? skills.slice(0, 10).join(', ') : undefined,
  }

  return JSON.stringify(schema)
}

// Helper function to generate structured data for website
export function generateWebsiteStructuredData({
  name,
  url,
  description,
  author,
}: {
  name: string
  url: string
  description: string
  author: string
}) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: name,
    url: url,
    description: description,
    author: {
      '@type': 'Person',
      name: author,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  })
}

// Helper function to generate breadcrumb structured data
export function generateBreadcrumbStructuredData({
  items,
}: {
  items: Array<{ name: string; url: string }>
}) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteMetadata.siteUrl}${item.url}`,
    })),
  })
}
