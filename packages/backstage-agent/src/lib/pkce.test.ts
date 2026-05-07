import { describe, it, expect } from 'vitest';
import { generateVerifier, challengeFromVerifier } from './pkce.js';

describe('PKCE', () => {
  describe('generateVerifier', () => {
    it('produces a URL-safe base64 string', () => {
      const verifier = generateVerifier();
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('contains no padding characters', () => {
      const verifier = generateVerifier();
      expect(verifier).not.toContain('=');
    });

    it('contains no standard base64 characters', () => {
      const verifier = generateVerifier();
      expect(verifier).not.toContain('+');
      expect(verifier).not.toContain('/');
    });

    it('has reasonable length', () => {
      const verifier = generateVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(32);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it('respects the length parameter', () => {
      const short = generateVerifier(32);
      const long = generateVerifier(96);
      expect(short.length).toBeLessThan(long.length);
    });

    it('clamps length to minimum 32 bytes', () => {
      const verifier = generateVerifier(1);
      expect(verifier.length).toBeGreaterThanOrEqual(32);
    });

    it('produces unique values', () => {
      const a = generateVerifier();
      const b = generateVerifier();
      expect(a).not.toBe(b);
    });
  });

  describe('challengeFromVerifier', () => {
    it('produces a deterministic challenge for a known verifier', () => {
      const verifier = 'test-verifier-value';
      const a = challengeFromVerifier(verifier);
      const b = challengeFromVerifier(verifier);
      expect(a).toBe(b);
    });

    it('produces URL-safe base64 output', () => {
      const challenge = challengeFromVerifier('any-verifier');
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('produces different challenges for different verifiers', () => {
      const a = challengeFromVerifier('verifier-1');
      const b = challengeFromVerifier('verifier-2');
      expect(a).not.toBe(b);
    });

    it('produces a SHA-256 sized output (43 chars in base64url)', () => {
      const challenge = challengeFromVerifier('test');
      expect(challenge.length).toBe(43);
    });
  });
});
