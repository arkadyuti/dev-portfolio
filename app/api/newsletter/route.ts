import { NextRequest, NextResponse } from 'next/server'
import NewsletterModel, { transformToNewsletter } from 'models/newsletter'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/logger'
import { withDatabase } from '@/lib/api-middleware'

async function handler(request: NextRequest) {
  try {
    // Parse request body
    const data = await request.json()
    const { email } = data

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 })
    }

    // Check if email already exists
    const existingSubscriber = await NewsletterModel.findOne({ email })

    if (existingSubscriber) {
      return NextResponse.json(
        { success: true, message: 'Already subscribed to the newsletter' },
        { status: 200 }
      )
    }

    // Create new newsletter subscription
    const newsletterSubscription = new NewsletterModel({
      id: uuidv4(),
      email,
    })

    await newsletterSubscription.save()

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to the newsletter',
        data: transformToNewsletter(newsletterSubscription),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error processing newsletter subscription', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process newsletter subscription' },
      { status: 500 }
    )
  }
}

export const POST = withDatabase(handler)
