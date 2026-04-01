'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface ResumeViewerProps {
  fileUrl: string
  uploadedAt: number
}

export default function ResumeViewer({ fileUrl, uploadedAt }: ResumeViewerProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last updated:{' '}
          {new Date(uploadedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <iframe
          src={isMobile ? googleDocsUrl : fileUrl}
          className="w-full"
          style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
          title="Resume"
        />
      </div>
    </div>
  )
}
