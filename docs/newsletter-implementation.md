# Newsletter System

## Overview

Simple newsletter subscription system with MongoDB storage. Email collection via footer form, duplicate prevention, and toast notifications.

## Architecture

### Data Flow

1. User submits email via footer form
2. API checks for existing subscription
3. If new, saves to MongoDB
4. Returns success/error message
5. Toast notification displayed to user

### Key Files

- `models/newsletter.ts` - MongoDB schema with Mongoose, Zod validation
- `app/api/newsletter/route.ts` - Subscribe endpoint (POST)
- `components/footer.tsx` - Newsletter form integration

## Data Model

```typescript
interface INewsletter {
  id: string
  email: string
  createdAt?: Date
  updatedAt?: Date
}
```

### Schema Features

- **email**: Unique, required, lowercase, trimmed
- **id**: Auto-generated UUID
- **timestamps**: Automatic createdAt/updatedAt

## API Endpoint

### POST /api/newsletter

Subscribe to newsletter

- Body: `{ email: string }`
- Response (201): `{ success: true, message: "Successfully subscribed", data: Newsletter }`
- Response (200): `{ success: true, message: "Already subscribed" }` (duplicate)
- Response (400): `{ success: false, message: "Email is required" }`
- Response (500): `{ success: false, message: "Failed to process subscription" }`

### Behavior

- Prevents duplicate subscriptions (checks existing email)
- Returns success even if already subscribed (idempotent)
- Email validation via Zod schema

## Frontend Integration

### Footer Component (`components/footer.tsx`)

- Newsletter form available site-wide
- Client-side email validation
- Loading state during submission
- Toast notifications for success/error
- Form reset on successful subscription

### User Flow

1. Enter email in footer form
2. Submit → Loading state
3. Success → Toast + form reset
4. Error → Error toast with message

---

**Dependencies**: MongoDB/Mongoose, Zod, Toast notifications
**Last Updated**: 2025-01-15
