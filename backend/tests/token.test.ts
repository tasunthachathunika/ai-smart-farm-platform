import {
  createAccessToken,
  verifyAccessToken,
  generateRandomRefreshToken,
  hashToken,
} from '../src/utils/token';

describe('Token Utilities', () => {
  it('should create and verify valid 15-minute access token', () => {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      role: 'farmer',
      email: 'farmer@goviya.lk',
    };

    const token = createAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.email).toBe(payload.email);
  });

  it('should generate cryptographically random 64-hex-char refresh token', () => {
    const token1 = generateRandomRefreshToken();
    const token2 = generateRandomRefreshToken();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('should hash refresh token consistently with SHA-256', () => {
    const rawToken = 'sample-refresh-token-1234567890';
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(rawToken);
  });
});
