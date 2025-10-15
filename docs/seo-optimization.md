# SEO Implementation

## Overview

Comprehensive SEO setup using Next.js 15 Metadata API with dynamic meta tags, structured data (JSON-LD), OpenGraph/Twitter cards, sitemap generation, and RSS feed.

## Architecture

### Key Files

- `app/seo.tsx` - Meta tag generation utilities
- `app/layout.tsx` - Root metadata configuration
- `app/sitemap.ts` - Dynamic sitemap generation
- `app/feed.xml/route.ts` - RSS feed
- `app/robots.txt/route.ts` - Robots.txt
- `data/siteMetadata.js` - Site-wide SEO config

## Metadata Structure

### Root Layout (`app/layout.tsx`)

- **metadataBase**: Site URL for absolute paths
- **title template**: `%s | Site Name` pattern
- **OpenGraph**: Social media preview cards
- **Twitter**: Card type + images
- **robots**: Indexing directives
- **verification**: Search Console codes

### Page Metadata (`app/seo.tsx`)

```typescript
genPageMetadata({
  title: string
  description?: string
  image?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string  // For articles
  modifiedTime?: string
  authors?: string[]
  tags?: string[]
})
```

## Structured Data (JSON-LD)

### Person Schema

Used on homepage for personal brand:

```typescript
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "...",
  "jobTitle": "...",
  "description": "...",
  "image": "...",
  "url": "...",
  "sameAs": ["github", "linkedin", "twitter"]
}
```

### Website Schema

```typescript
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "...",
  "url": "...",
  "description": "..."
}
```

### Article Schema

Used on blog posts:

```typescript
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "author": {...},
  "datePublished": "...",
  "dateModified": "...",
  "image": "...",
  "publisher": {...}
}
```

## Sitemap Generation

### Dynamic Sitemap (`app/sitemap.ts`)

- Fetches all published blogs and projects from MongoDB
- Generates URLs with:
  - `loc`: Full URL
  - `lastModified`: Update timestamp
  - `changeFrequency`: Update frequency hint
  - `priority`: Relative importance (0-1)

### URL Structure

```
/ (homepage) - priority: 1.0, changeFrequency: daily
/about - priority: 0.8
/projects - priority: 0.9
/blogs - priority: 0.9
/blogs/[slug] - priority: 0.7, dynamic
/contact - priority: 0.6
```

## RSS Feed

### Feed Structure (`app/feed.xml/route.ts`)

- RSS 2.0 format
- Includes 10 most recent published blogs
- Fields: title, description, link, pubDate, guid

## Robots.txt

### Configuration (`app/robots.txt/route.ts`)

```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
```

## Page-Specific SEO

### Homepage

- Person + Website structured data
- Dynamic metadata from profile data
- H1: Person name (not job title)
- Priority image loading

### Blog Posts

- Article structured data
- Meta: title, excerpt, cover image, tags
- OpenGraph article type
- Reading time in meta
- Canonical URLs

### Projects

- Meta: title, description, cover image
- Tags as keywords

## Image Optimization

- Next.js Image component
- Remote patterns configured
- Alt text required
- Lazy loading (except hero)
- Blur placeholders

## Performance SEO

- Server-side rendering (no loading states)
- Static generation where possible
- Image optimization
- Minimal JavaScript
- Fast page loads → better rankings

## Technical SEO Checklist

### Implemented ✅

- Meta tags (title, description, keywords)
- OpenGraph tags
- Twitter cards
- Structured data (Person, Website, Article)
- Sitemap (dynamic)
- Robots.txt
- RSS feed
- Canonical URLs
- Image optimization
- Mobile responsive
- Fast page loads

### Missing/Optional

- Schema.org BreadcrumbList
- FAQ schema (if applicable)
- Video schema (if adding videos)
- Local business schema
- Google Analytics integration
- Search Console verification

## Configuration

### Site Metadata (`data/siteMetadata.js`)

```javascript
{
  title: "Your Name | Your Title",
  author: "Your Name",
  description: "...",
  siteUrl: "https://yourdomain.com",
  socialBanner: "/og-image.jpg",
  email: "...",
  github: "...",
  linkedin: "...",
  twitter: "...",
  keywords: ["..."],
  verification: {
    google: "...",  // Search Console
    bing: "..."
  }
}
```

## Best Practices

1. **Unique Titles**: Each page has unique, descriptive title
2. **Meta Descriptions**: 150-160 characters, compelling
3. **Keywords**: Natural, relevant, not stuffed
4. **Images**: Optimized, with alt text
5. **URLs**: Clean, descriptive slugs
6. **Internal Linking**: Cross-link related content
7. **Fresh Content**: Regular blog updates
8. **Mobile-First**: Responsive design
9. **Fast Loading**: < 3s page load
10. **HTTPS**: Secure connections

---

**Dependencies**: Next.js Metadata API, MongoDB (for dynamic sitemap)
**Last Updated**: 2025-01-15
