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
