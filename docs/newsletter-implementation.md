# Newsletter Implementation Documentation

This document outlines the implementation of the Newsletter subscription feature in the portfolio application.

## Table of Contents

1. [Data Model](#data-model)
2. [API Endpoints](#api-endpoints)
3. [Frontend Integration](#frontend-integration)
4. [User Experience](#user-experience)

## Data Model

The newsletter subscription data is stored in MongoDB using the following schema (defined in `models/newsletter.ts`):

```typescript
interface INewsletter {
  id: string
  email: string
  createdAt?: Date
  updatedAt?: Date
}
```

Key fields:

- `id`: Unique identifier for the subscription
- `email`: Subscriber's email address
- `createdAt`: Timestamp when the subscription was created
- `updatedAt`: Timestamp when the subscription was last updated

## API Endpoints

### POST /api/newsletter

Creates a new newsletter subscription.

**Request Body:**

```json
{
  "email": "string"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully subscribed to the newsletter",
  "data": {
    "id": "string",
    "email": "string",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

**Error Responses:**

- Email required validation (400):

```json
{
  "success": false,
  "message": "Email is required"
}
```

- Already subscribed (200):

```json
{
  "success": true,
  "message": "Already subscribed to the newsletter"
}
```

- Server error (500):

```json
{
  "success": false,
  "message": "Failed to process newsletter subscription"
}
```

## Frontend Integration

The newsletter subscription form is integrated into the site footer. This form allows visitors to subscribe to the newsletter from any page on the website.

Implementation details (`components/footer.tsx`):

```tsx
const handleNewsletterSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  const form = e.target as HTMLFormElement
  const emailInput = form.elements.namedItem('email') as HTMLInputElement
  const email = emailInput.value

  // Form validation
  if (!email) {
    toast.error('Please enter your email address')
    return
  }

  setIsLoading(true)

  try {
    // API request
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    // Handle response
    if (data.success) {
      toast.success(data.message || 'Successfully subscribed to the newsletter')
      form.reset()
    } else {
      toast.error(data.message || 'Failed to subscribe to the newsletter')
    }
  } catch (error) {
    logger.error('Error subscribing to newsletter:', error)
    toast.error('Failed to subscribe to the newsletter')
  } finally {
    setIsLoading(false)
  }
}
```

## User Experience

The newsletter subscription feature provides the following user experience:

1. **Accessibility**: The subscription form is available in the footer across the entire site
2. **Feedback**:
   - Loading state during form submission
   - Success toast notification upon successful subscription
   - Error toast notification if subscription fails
3. **Validation**:
   - Client-side validation ensures email is provided
   - Server-side validation ensures email is valid
   - Prevents duplicate subscriptions
4. **Status Persistence**:
   - Subscriptions are permanently stored in the MongoDB database
   - Prevents duplicate subscriptions by checking existing entries
