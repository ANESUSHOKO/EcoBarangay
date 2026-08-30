import crypto from 'crypto';

/**
 * Hashes a password using PBKDF2 with SHA-512 and a random 16-byte salt.
 * Returns formatted salt:hash string.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [salt, originalHash] = parts;
  if (!salt || !originalHash) {
    return false;
  }

  try {
    const derivedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const hashBuffer = Buffer.from(derivedHash, 'hex');
    const originalBuffer = Buffer.from(originalHash, 'hex');
    if (hashBuffer.length !== originalBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, originalBuffer);
  } catch (err) {
    return false;
  }
}

export interface OtpRecord {
  email: string;
  userId: string;
  otp: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP session cache
const otpStore = new Map<string, OtpRecord>();
// In-memory Password Reset OTP cache
const resetOtpStore = new Map<string, OtpRecord>();

/**
 * Generates a 6-digit verification OTP and saves it with a 10-minute expiry.
 */
export function createOtpSession(email: string, userId: string): { otp: string; expiresAt: number } {
  const normalizedEmail = email.trim().toLowerCase();
  const otpNumber = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(normalizedEmail, {
    email: normalizedEmail,
    userId,
    otp: otpNumber,
    expiresAt,
    attempts: 0,
  });

  return { otp: otpNumber, expiresAt };
}

/**
 * Verifies the OTP entered by the user.
 */
export function verifyOtpSession(email: string, enteredOtp: string): { valid: boolean; error?: string; userId?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return { valid: false, error: 'No verification session found. Please sign in again.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'Too many incorrect attempts. Please sign in again to receive a fresh code.' };
  }

  record.attempts += 1;

  if (record.otp !== enteredOtp.trim()) {
    return { valid: false, error: 'Invalid verification code. Please check your email and try again.' };
  }

  // Successfully verified - clear session
  otpStore.delete(normalizedEmail);
  return { valid: true, userId: record.userId };
}

/**
 * Creates a password reset OTP session.
 */
export function createPasswordResetSession(email: string, userId: string): { otp: string; expiresAt: number } {
  const normalizedEmail = email.trim().toLowerCase();
  const otpNumber = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  resetOtpStore.set(normalizedEmail, {
    email: normalizedEmail,
    userId,
    otp: otpNumber,
    expiresAt,
    attempts: 0,
  });

  return { otp: otpNumber, expiresAt };
}

/**
 * Verifies a password reset OTP.
 */
export function verifyPasswordResetSession(email: string, enteredOtp: string): { valid: boolean; error?: string; userId?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const record = resetOtpStore.get(normalizedEmail);

  if (!record) {
    return { valid: false, error: 'No password reset request found. Please request a reset code first.' };
  }

  if (Date.now() > record.expiresAt) {
    resetOtpStore.delete(normalizedEmail);
    return { valid: false, error: 'Password reset code has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    resetOtpStore.delete(normalizedEmail);
    return { valid: false, error: 'Too many invalid attempts. Please request a fresh reset code.' };
  }

  record.attempts += 1;

  if (record.otp !== enteredOtp.trim()) {
    return { valid: false, error: 'Invalid password reset code. Please check your email and try again.' };
  }

  return { valid: true, userId: record.userId };
}

/**
 * Clears password reset session after successful password update.
 */
export function clearPasswordResetSession(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  resetOtpStore.delete(normalizedEmail);
}
