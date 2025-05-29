/* eslint-disable react-hooks/rules-of-hooks */
'use client'
import '@blocknote/core/fonts/inter.css'
import { BlockNoteView } from '@blocknote/mantine'

import '@blocknote/mantine/style.css'
import { useCreateBlockNote } from '@blocknote/react'
import { Block, BlockNoteEditor, PartialBlock } from '@blocknote/core'
import './styles.css'

interface BlockNoteEditorLocalProps {
  onDataChange: (blocks: Block[], html: string) => void
  initialContent?: PartialBlock[] | undefined
  onImageUpload?: (imageUrl: string) => void
  onImageDelete?: (imageUrl: string) => void
}

async function uploadFile(file: File) {
  const body = new FormData()
  body.append('file', file)

  const response = await fetch('/api/blog-content-image', {
    method: 'POST',
    body: body,
  })

  const result = await response.json()
  if (!result.success) {
    throw new Error(result.message || 'Upload failed')
  }
  return result.data.url
}

export default function BlockNoteEditorLocal({
  onDataChange,
  initialContent,
  onImageUpload,
  onImageDelete,
}: BlockNoteEditorLocalProps) {
  let editor: BlockNoteEditor
  try {
    editor = useCreateBlockNote({
      initialContent: initialContent,
      uploadFile: async (file: File) => {
        const url = await uploadFile(file)
        if (onImageUpload) {
          onImageUpload(url)
        }
        return url
      },
    })
  } catch (error) {
    editor = useCreateBlockNote({
      initialContent: undefined,
      uploadFile: async (file: File) => {
        const url = await uploadFile(file)
        if (onImageUpload) {
          onImageUpload(url)
        }
        return url
      },
    })
  }

  const handleOnChange = async () => {
    const blocks = editor.document
    const html = await editor.blocksToFullHTML(blocks)
    
    // Check for deleted images
    if (onImageDelete && initialContent) {
      const currentImages = blocks
        .filter((block) => block.type === 'image')
        .map((block) => block.props.url)
      
      const initialImages = initialContent
        .filter((block) => block.type === 'image')
        .map((block) => block.props.url)
      
      // Find images that were in initialContent but not in current content
      const deletedImages = initialImages.filter((url) => !currentImages.includes(url))
      deletedImages.forEach((url) => onImageDelete(url))
    }
    
    onDataChange(blocks, html)
  }

  return <BlockNoteView onChange={handleOnChange} editor={editor} className={'block-note-editor'} />
}
