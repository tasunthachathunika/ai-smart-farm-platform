import { encryptGps, decryptGps } from '../src/utils/crypto';

describe('GPS Privacy & Cryptography (AES-256-GCM)', () => {
  it('should encrypt exact coordinates and decrypt them accurately', () => {
    const rawGpsCoordinates = JSON.stringify({
      latitude: 7.4863,
      longitude: 80.3623,
    });

    const encrypted = encryptGps(rawGpsCoordinates);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.ciphertext).not.toContain('7.4863');
    expect(encrypted.iv).toHaveLength(24); // 12 bytes = 24 hex chars
    expect(encrypted.authTag).toHaveLength(32); // 16 bytes = 32 hex chars

    const decrypted = decryptGps(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(rawGpsCoordinates);
  });

  it('should fail decryption if auth tag is tampered with', () => {
    const rawGpsCoordinates = '7.2906,80.6337';
    const encrypted = encryptGps(rawGpsCoordinates);

    // Tamper with the auth tag
    const tamperedAuthTag = encrypted.authTag.replace(/^./, (c) => (c === 'a' ? 'b' : 'a'));

    expect(() => {
      decryptGps(encrypted.ciphertext, encrypted.iv, tamperedAuthTag);
    }).toThrow();
  });
});
