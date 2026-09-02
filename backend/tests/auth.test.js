const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const { isValidEmail } = require('../src/services/authService');

describe('Authentication Unit Tests', () => {
  describe('Email Validator', () => {
    test('accepts valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('alice.smith@sub.domain.co')).toBe(true);
    });

    test('rejects invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('Password Hashing with bcrypt', () => {
    test('hashes password so plaintext is never stored', async () => {
      const password = 'mySecurePassword123';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).not.toEqual(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt signature

      const matches = await bcrypt.compare(password, hash);
      expect(matches).toBe(true);

      const wrongPasswordMatches = await bcrypt.compare('wrongPassword', hash);
      expect(wrongPasswordMatches).toBe(false);
    });
  });

  describe('JWT Token Generation and Verification', () => {
    test('signs payload and verifies valid signature', () => {
      const payload = { id: 'user-uuid-1', email: 'test@example.com' };
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });

      expect(typeof token).toBe('string');
      const decoded = jwt.verify(token, config.jwt.secret);
      expect(decoded.id).toBe('user-uuid-1');
      expect(decoded.email).toBe('test@example.com');
    });

    test('rejects token with invalid secret', () => {
      const payload = { id: 'user-uuid-1', email: 'test@example.com' };
      const token = jwt.sign(payload, 'wrong-secret');

      expect(() => {
        jwt.verify(token, config.jwt.secret);
      }).toThrow();
    });
  });
});
