'use client'

import { Share2, Facebook, Twitter, Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { IBlog } from 'models/blog'

interface ShareButtonsProps {
  post: Pick<IBlog, 'title'>
}

export function ShareButtons({ post }: ShareButtonsProps) {
  const handleShare = (platform: string) => {
    const url = window.location.href
    const title = post.title
    let shareUrl = ''

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      case 'copy':
        navigator.clipboard.writeText(url)
        toast('Link copied to clipboard!')
        return
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Share this post:</span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => handleShare('facebook')}
          title="Share on Facebook"
        >
          <Facebook className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => handleShare('twitter')}
          title="Share on Twitter"
        >
          <Twitter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => handleShare('linkedin')}
          title="Share on LinkedIn"
        >
          <Linkedin className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => handleShare('copy')}
          title="Copy link"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
