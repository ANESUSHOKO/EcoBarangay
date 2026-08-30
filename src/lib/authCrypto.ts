/**
 * Client-side cryptographic helper using Web Crypto API.
 * Computes salted PBKDF2 / SHA-256 password hash for offline client store persistence.
 */

export async function hashPasswordClient(password: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Basic fallback if crypto.subtle is not available
    let simpleHash = 0;
    for (let i = 0; i < password.length; i++) {
      simpleHash = (simpleHash << 5) - simpleHash + password.charCodeAt(i);
      simpleHash |= 0;
    }
    return `salt_client:${Math.abs(simpleHash).toString(16)}`;
  }

  const saltBytes = new Uint8Array(16);
  window.crypto.getRandomValues(saltBytes);
  const saltHex = Array.from(saltBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(saltHex);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 50000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `${saltHex}:${hashHex}`;
}

export async function verifyPasswordClient(password: string, storedHash?: string): Promise<boolean> {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [saltHex, originalHash] = parts;
  if (!saltHex || !originalHash) {
    return false;
  }

  if (saltHex === 'salt_client') {
    let simpleHash = 0;
    for (let i = 0; i < password.length; i++) {
      simpleHash = (simpleHash << 5) - simpleHash + password.charCodeAt(i);
      simpleHash |= 0;
    }
    return Math.abs(simpleHash).toString(16) === originalHash;
  }

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = encoder.encode(saltHex);

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 50000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    const derivedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return derivedHash === originalHash;
  } catch (err) {
    console.error('Client password verification error:', err);
    return false;
  }
}
