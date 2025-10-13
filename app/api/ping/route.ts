import { NextResponse } from 'next/server'
import packageJson from '../../../package.json'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'pong',
    version: packageJson.version,
    timestamp: new Date().toISOString(),
  })
}
