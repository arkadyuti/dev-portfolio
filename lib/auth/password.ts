import bcrypt from 'bcryptjs'

/**
 * Password validation requirements
 */
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
}

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  const hash = await bcrypt.hash(password, saltRounds)
  return hash
}

/**
 * Compare a plain text password with a hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Error comparing passwords:', error)
    return false
  }
}

/**
 * Validate password strength
 * Returns array of error messages, or empty array if valid
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = []

  if (!password) {
    errors.push('Password is required')
    return errors
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`)
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (
    PASSWORD_REQUIREMENTS.requireSpecialChar &&
    // eslint-disable-next-line no-useless-escape
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character')
  }

  return errors
}

/**
 * Check if password is valid (returns boolean)
 */
export function isPasswordValid(password: string): boolean {
  return validatePasswordStrength(password).length === 0
}

/**
 * Generate a random secure password
 * Useful for temporary passwords or testing
 */
export function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const all = uppercase + lowercase + numbers + special

  let password = ''

  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}
