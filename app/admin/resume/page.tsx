'use client'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/sonner'
import { Upload, FileText, ExternalLink, Loader2 } from 'lucide-react'
import type { IResume } from '@/models/resume'

export default function AdminResumePage() {
  const [currentResume, setCurrentResume] = useState<IResume | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchResume()
  }, [])

  const fetchResume = async () => {
    try {
      const response = await fetch('/api/resume')
      const data = await response.json()
      if (data.success && data.data) {
        setCurrentResume(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch resume:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB')
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file first')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setCurrentResume(data.data)
        setSelectedFile(null)
        // Reset file input
        const fileInput = document.getElementById('resume-file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        toast.success('Resume uploaded successfully')
      } else {
        toast.error(data.error?.message || 'Failed to upload resume')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload resume')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Resume Management</h2>
        <p className="text-muted-foreground">Upload and manage your resume PDF.</p>
      </div>

      {/* Current Resume Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Resume</CardTitle>
        </CardHeader>
        <CardContent>
          {currentResume ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-10 w-10 text-red-500" />
                <div>
                  <p className="font-medium">{currentResume.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(currentResume.fileSize)} &middot; Uploaded{' '}
                    {new Date(currentResume.uploadedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <a
                href={currentResume.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View
                </Button>
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground">No resume uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {currentResume ? 'Replace Resume' : 'Upload Resume'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="resume-file"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50"
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to select a PDF file</p>
                    <p className="text-xs text-muted-foreground">PDF only, max 10MB</p>
                  </>
                )}
              </label>
              <input
                id="resume-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {currentResume ? 'Replace Resume' : 'Upload Resume'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
