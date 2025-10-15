#!/usr/bin/env node
/**
 * Admin Setup Script
 * Creates the single admin user in MongoDB
 *
 * Usage: yarn setup-admin
 */

import * as readline from 'readline'
import mongoose from 'mongoose'
import { hashPassword, validatePasswordStrength } from '../lib/auth/password'
import User from '../models/user'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Create readline interface for prompting
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

/**
 * Prompt for user input
 */
function prompt(question: string): Promise<string> {
  const rl = createInterface()
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * Prompt for password (hidden input)
 */
function promptPassword(question: string): Promise<string> {
  const rl = createInterface()
  return new Promise((resolve) => {
    // Hide input for password
    const stdin = process.stdin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(stdin as any).setRawMode(true)

    let password = ''
    process.stdout.write(question)

    stdin.on('data', (char) => {
      const str = char.toString('utf-8')

      switch (str) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(stdin as any).setRawMode(false)
          stdin.pause()
          process.stdout.write('\n')
          rl.close()
          resolve(password)
          break
        case '\u0003': // Ctrl+C
          process.exit()
          break
        case '\u007f': // Backspace
          password = password.slice(0, -1)
          process.stdout.clearLine(0)
          process.stdout.cursorTo(0)
          process.stdout.write(question + '*'.repeat(password.length))
          break
        default:
          password += str
          process.stdout.write('*')
          break
      }
    })
  })
}

/**
 * Main setup function
 */
async function setupAdmin() {
  console.log('========================================')
  console.log('   Admin User Setup')
  console.log('========================================\n')

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI not found in environment variables')
      process.exit(1)
    }

    console.log('Connecting to MongoDB...')
    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB\n')

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' })
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!')
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Name: ${existingAdmin.name}`)
      console.log('\n❌ Only one admin user is allowed.')
      console.log(
        '   If you need to change admin credentials, please delete the existing admin first.\n'
      )
      process.exit(1)
    }

    // Prompt for admin details
    console.log('Please provide admin user details:\n')

    const email = await prompt('Email: ')
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      console.error('\n❌ Invalid email address')
      process.exit(1)
    }

    const name = await prompt('Name: ')
    if (!name) {
      console.error('\n❌ Name is required')
      process.exit(1)
    }

    // Prompt for password with validation
    let password = ''
    let passwordValid = false

    while (!passwordValid) {
      password = await promptPassword('Password: ')
      const errors = validatePasswordStrength(password)

      if (errors.length > 0) {
        console.log('\n❌ Password does not meet requirements:')
        errors.forEach((error) => console.log(`   - ${error}`))
        console.log()
      } else {
        passwordValid = true
      }
    }

    // Confirm password
    const confirmPassword = await promptPassword('Confirm Password: ')
    if (password !== confirmPassword) {
      console.error('\n❌ Passwords do not match')
      process.exit(1)
    }

    // Create admin user
    console.log('\nCreating admin user...')
    const passwordHash = await hashPassword(password)

    const admin = new User({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'admin',
    })

    await admin.save()

    console.log('\n✅ Admin user created successfully!')
    console.log('\n========================================')
    console.log('   Admin Credentials')
    console.log('========================================')
    console.log(`Email: ${email}`)
    console.log(`Name: ${name}`)
    console.log('========================================\n')
    console.log('You can now sign in at /signin\n')
  } catch (error) {
    console.error('\n❌ Error creating admin user:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(error)
    }
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

// Run the setup
setupAdmin().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
