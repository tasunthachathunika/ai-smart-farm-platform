import crypto from 'crypto';
import { env } from '../config/env';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt plaintext using AES-256-GCM adhering to AGENTS.md Rule 4.
 * Key must be 32 bytes (64-character hex string).
 */
export function encryptGps(plaintext: string): EncryptedData {
  const key = Buffer.from(env.GPS_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypt AES-256-GCM ciphertext back to plaintext.
 * Strictly permitted only for the plot owner.
 */
export function decryptGps(ciphertext: string, ivHex: string, authTagHex: string): string {
  const key = Buffer.from(env.GPS_ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
