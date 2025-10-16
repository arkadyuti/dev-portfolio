import { Github, Linkedin, Mail, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { profile } from '@/data/profile-data'
import Image from 'next/image'
import { Metadata } from 'next'
import {
  genPageMetadata,
  generatePersonStructuredData,
  generateBreadcrumbStructuredData,
} from '../seo'
import Script from 'next/script'
import siteMetadata from '@/data/siteMetadata'

export const metadata: Metadata = genPageMetadata({
  title: `About ${profile.name} | ${profile.title} | Skills & Experience`,
  description: profile.aboutPageMetadata.description,
  keywords: profile.aboutPageMetadata.keywords,
})

const AboutPage = () => {
  const socialLinks = [
    { name: 'Github', href: profile.socialLinks.github, icon: Github },
    { name: 'LinkedIn', href: profile.socialLinks.linkedin, icon: Linkedin },
    { name: 'Twitter', href: profile.socialLinks.twitter, icon: Twitter },
    { name: 'Email', href: profile.socialLinks.email, icon: Mail },
  ]

  // Convert markdown content to HTML paragraphs
  // This is a very simple implementation - in a real app you would use a markdown parser
  const bioContentParagraphs = profile.longBio.split('\n\n').map((paragraph, index) => {
    if (paragraph.startsWith('# ')) {
      return (
        <h1 key={index} className="mb-4 mt-8 text-3xl font-bold">
          {paragraph.substring(2)}
        </h1>
      )
    } else if (paragraph.startsWith('## ')) {
      return (
        <h2 key={index} className="mb-3 mt-6 text-2xl font-bold">
          {paragraph.substring(3)}
        </h2>
      )
    } else if (paragraph.startsWith('### ')) {
      return (
        <h3 key={index} className="mb-2 mt-5 text-xl font-bold">
          {paragraph.substring(4)}
        </h3>
      )
    } else if (paragraph.startsWith('- ')) {
      const items = paragraph.split('\n').map((item) => item.substring(2))
      return (
        <ul key={index} className="mb-4 mt-2 list-disc space-y-1 pl-5">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    } else {
      return (
        <p key={index} className="mb-4">
          {paragraph}
        </p>
      )
    }
  })

  // Generate structured data for person
  const allSkills = profile.skills.flatMap((category) => category.items)
  const personStructuredData = generatePersonStructuredData({
    name: profile.name,
    title: profile.title,
    description: profile.bio,
    image: profile.profileImage,
    url: '/about',
    sameAs: [profile.socialLinks.github, profile.socialLinks.linkedin, profile.socialLinks.twitter],
    skills: allSkills.slice(0, 20), // Top 20 skills
    worksFor: { name: 'Tekion', url: 'https://tekion.com' },
  })

  // Generate breadcrumb structured data
  const breadcrumbStructuredData = generateBreadcrumbStructuredData({
    items: [
      { name: 'Home', url: siteMetadata.siteUrl },
      { name: 'About', url: `${siteMetadata.siteUrl}/about` },
    ],
  })

  return (
    <>
      {/* Add structured data */}
      <Script
        id="person-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: personStructuredData }}
      />
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbStructuredData }}
      />

      <section className="py-12 md:py-20">
        <div className="container-custom max-w-5xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Bio section */}
            <div className="order-2 lg:order-1 lg:col-span-8">
              <h1 className="section-heading">About Me</h1>

              <div className="prose prose-lg max-w-none">{bioContentParagraphs}</div>

              <div className="mt-8 flex flex-wrap gap-4">
                {socialLinks.map((link) => (
                  <Button key={link.name} variant="outline" asChild>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <link.icon className="h-5 w-5" />
                      {link.name}
                    </a>
                  </Button>
                ))}
              </div>
            </div>

            {/* Profile image & details */}
            <div className="order-1 lg:order-2 lg:col-span-4">
              <div className="sticky top-24">
                <div className="mb-6 overflow-hidden rounded-xl">
                  <Image
                    src={profile.profileImage}
                    alt={`${profile.name} - Professional photo of ${profile.title} with expertise in React, TypeScript, AI, and full-stack development`}
                    className="h-auto w-full object-cover"
                    width={400}
                    height={400}
                    priority
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">{profile.name}</h2>
                    <p className="text-muted-foreground">{profile.title}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {profile.skills.slice(0, 3).flatMap((category) =>
                      category.items.slice(0, 2).map((skill, idx) => (
                        <Badge key={`${category.category}-${idx}`} variant="outline">
                          {skill}
                        </Badge>
                      ))
                    )}
                  </div>

                  <Button className="w-full" asChild>
                    <a href={profile.socialLinks.email}>Get in touch</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills section */}
      <section className="bg-secondary/50 py-12 md:py-20">
        <div className="container-custom max-w-5xl">
          <h2 className="section-heading">My Skills & Expertise</h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {profile.skills.map((skillCategory, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <h3 className="mb-4 text-xl font-bold">{skillCategory.category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {skillCategory.items.map((skill, skillIdx) => (
                      <Badge key={skillIdx} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default AboutPage
