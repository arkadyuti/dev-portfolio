import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value?: string
  onChange: (value: string) => void
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock upload function
  const mockUpload = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // Simulate API call delay
      setTimeout(() => {
        const reader = new FileReader()
        reader.onloadend = () => {
          // Normally this would be a URL from your API
          resolve(reader.result as string)
        }
        reader.readAsDataURL(file)
      }, 1500)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const imageUrl = await mockUpload(file)
      setPreviewUrl(imageUrl)
      onChange(imageUrl)
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

  const handleClick = () => {
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
          <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
          <Button
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
