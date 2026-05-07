import { describe, it, expect } from 'vitest';
import { isTrustLevelAllowed } from './trust.js';

describe('Trust Level Comparison', () => {
  describe('read-only policy', () => {
    it('allows read-only commands', () => {
      expect(isTrustLevelAllowed('read-only', 'read-only')).toBe(true);
    });

    it('blocks reversible commands', () => {
      expect(isTrustLevelAllowed('reversible', 'read-only')).toBe(false);
    });

    it('blocks destructive commands', () => {
      expect(isTrustLevelAllowed('destructive', 'read-only')).toBe(false);
    });
  });

  describe('reversible policy', () => {
    it('allows read-only commands', () => {
      expect(isTrustLevelAllowed('read-only', 'reversible')).toBe(true);
    });

    it('allows reversible commands', () => {
      expect(isTrustLevelAllowed('reversible', 'reversible')).toBe(true);
    });

    it('blocks destructive commands', () => {
      expect(isTrustLevelAllowed('destructive', 'reversible')).toBe(false);
    });
  });

  describe('all policy', () => {
    it('allows read-only commands', () => {
      expect(isTrustLevelAllowed('read-only', 'all')).toBe(true);
    });

    it('allows reversible commands', () => {
      expect(isTrustLevelAllowed('reversible', 'all')).toBe(true);
    });

    it('allows destructive commands', () => {
      expect(isTrustLevelAllowed('destructive', 'all')).toBe(true);
    });
  });
});
