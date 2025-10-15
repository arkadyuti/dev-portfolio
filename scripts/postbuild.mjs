import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function postbuild() {
  // Generate build info
  const now = new Date()
  const buildNumber = Math.floor(now.getTime() / 1000) // Unix epoch in seconds

  const buildInfo = {
    version: process.env.npm_package_version || '1.0.1',
    buildNumber: buildNumber,
    buildTime: now.toISOString(),
    buildTimestamp: now.getTime(),
  }

  const outputPath = resolve(__dirname, '../public/build-info.json')

  writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2), 'utf-8')

  console.log('✓ Build info generated:', buildInfo)
}

postbuild()
