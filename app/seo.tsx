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

  return {
    title,
    description: description || siteMetadata.description,
    openGraph: {
      title: `${title} | ${siteMetadata.title.split('|')[0].trim()}`,
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
      title: `${title} | ${siteMetadata.title.split('|')[0].trim()}`,
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
      name: siteMetadata.title.split('|')[0].trim(),
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
}: {
  name: string
  title: string
  description: string
  image: string
  url: string
  sameAs: string[]
}) {
  const imageUrl = image.startsWith('http') ? image : `${siteMetadata.siteUrl}${image}`
  const pageUrl = url.startsWith('http') ? url : `${siteMetadata.siteUrl}${url}`

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: name,
    jobTitle: title,
    description: description,
    image: imageUrl,
    url: pageUrl,
    sameAs: sameAs,
  })
}
