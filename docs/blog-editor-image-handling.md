# Blog Editor Image Handling Flow

## Overview
This document explains how images are handled in the blog editor, specifically focusing on the image upload and management process during blog post creation/editing.

## Components Involved

### 1. BlockNoteEditor Component
Located at `components/BlockNoteEditor/BlockNoteEditor.tsx`

Key features:
- Handles rich text editing with image support
- Provides image upload functionality
- Tracks uploaded images through callbacks

```typescript
interface BlockNoteEditorLocalProps {
  onDataChange: (blocks: Block[], html: string) => void
  initialContent?: PartialBlock[] | undefined
  onImageUpload?: (imageUrl: string) => void
}
```

### 2. Blog Form Component
Located at `app/admin/blogs/new/page.tsx`

Key features:
- Manages the blog post form
- Tracks editor state including images
- Handles form submission with image data

## Image Handling Flow

### 1. Image Upload Process
1. When a user adds an image in the editor:
   - The image is uploaded to `/api/blog-content-image`
   - The uploaded image URL is returned
   - The URL is passed to the editor for display
   - The URL is tracked via `onImageUpload` callback

### 2. State Management
The blog form maintains editor state using `editorRef`:
```typescript
const editorRef = useRef<{
  contentRTE: any;      // Rich text editor content
  contentImages: string[]; // List of uploaded image URLs
  content: string;      // HTML content
}>({
  contentRTE: null,
  contentImages: [],
  content: ''
})
```

### 3. Form Submission
When the form is submitted:
1. All form data is collected into FormData
2. Editor content and images are included:
   ```typescript
   formData.append('contentRTE', JSON.stringify(editorRef.current.contentRTE))
   formData.append('content', editorRef.current.content)
   formData.append('contentImages', JSON.stringify(editorRef.current.contentImages))
   ```
3. The complete data is sent to the server for processing

## Key Points

1. **Image Tracking**: All uploaded images are tracked in `contentImages` array
2. **FormData Handling**: Complex data (arrays/objects) are stringified before being added to FormData
3. **State Management**: All editor-related state is consolidated in a single ref for better organization
4. **API Endpoints**: 
   - `/api/blog-content-image` for image uploads
   - `/api/blog` for blog post submission

## Benefits of This Approach

1. **Centralized State**: All editor-related state is managed in one place
2. **Efficient Upload**: Images are uploaded immediately when added to the editor
3. **Complete Data**: All necessary data (content, images, RTE data) is sent together during submission
4. **Clean Implementation**: Clear separation of concerns between editor and form components

## Future Considerations

1. Image cleanup for unused images
2. Image optimization
3. Support for different image types/formats
4. Image size limits and validation 