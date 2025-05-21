import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageUploadProps {
  value?: string | File
  onChange: (value: File | null) => void
  className?: string
  label?: string
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  className,
  label = 'Upload Image',
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Create preview URL when value changes
  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else if (typeof value === 'string') {
      setPreviewUrl(value)
    } else {
      setPreviewUrl(null)
    }
  }, [value])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      onChange(file)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
      // Clear the input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('space-y-4', className)}>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
      />

      {previewUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
          <Image
            src={previewUrl}
            alt="Preview"
            className="h-full w-full object-cover"
            width={1286}
            height={723}
          />
          <Button
            type="button"
            variant="secondary"
            className="absolute bottom-2 right-2"
            onClick={handleClick}
            disabled={isUploading}
          >
            Change Image
          </Button>
        </div>
      ) : (
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors hover:bg-secondary/50"
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleClick(e as unknown as React.MouseEvent)
            }
          }}
          role="button"
          tabIndex={0}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-primary"></div>
              <p>Uploading...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="rounded-full bg-secondary p-3">
                  {previewUrl ? <ImageIcon /> : <Upload />}
                </div>
                <p className="font-medium">{label}</p>
                <p className="text-sm text-muted-foreground">Click to browse or drag and drop</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ImageUpload
