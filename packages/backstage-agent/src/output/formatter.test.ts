import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatSuccess, formatError, type TrustLevel } from './formatter.js';

describe('Output Formatter', () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;
  let processExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    processExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  describe('formatSuccess (JSON)', () => {
    it('writes a valid success envelope to stdout', () => {
      formatSuccess({ items: [1, 2] }, ['Try: next'], 'read-only', 'json');

      const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
      expect(output).toEqual({
        data: { items: [1, 2] },
        hints: ['Try: next'],
        trustLevel: 'read-only',
      });
    });

    it('includes dryRun field when dry run', () => {
      formatSuccess({ preview: {} }, ['hint'], 'destructive', 'json', true);

      const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
      expect(output.dryRun).toBe(true);
    });

    it('omits dryRun field when not dry run', () => {
      formatSuccess({ result: 'ok' }, [], 'reversible', 'json');

      const output = JSON.parse(stdoutWrite.mock.calls[0][0] as string);
      expect(output.dryRun).toBeUndefined();
    });
  });

  describe('formatSuccess (text)', () => {
    it('writes human-readable output to stdout', () => {
      formatSuccess({ name: 'test' }, ['Try: next'], 'read-only', 'text');

      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain('Trust level: read-only');
      expect(output).toContain('name: test');
      expect(output).toContain('Try: next');
    });

    it('shows DRY RUN header when dry run', () => {
      formatSuccess({ preview: {} }, [], 'destructive', 'text', true);

      const output = stdoutWrite.mock.calls[0][0] as string;
      expect(output).toContain('[DRY RUN]');
    });
  });

  describe('formatError (JSON)', () => {
    it('writes error envelope to stderr with exit code 1', () => {
      expect(() => formatError('NOT_FOUND', 'Entity not found', 'Try searching', ['hint'], 'json', 1))
        .toThrow('process.exit called');

      const output = JSON.parse(stderrWrite.mock.calls[0][0] as string);
      expect(output.error.code).toBe('NOT_FOUND');
      expect(output.error.message).toBe('Entity not found');
      expect(output.error.recovery).toBe('Try searching');
      expect(output.hints).toEqual(['hint']);
      expect(processExit).toHaveBeenCalledWith(1);
    });

    it('exits with code 2 for usage errors', () => {
      expect(() => formatError('USAGE_ERROR', 'Bad arg', 'Fix it', [], 'json', 2))
        .toThrow('process.exit called');

      expect(processExit).toHaveBeenCalledWith(2);
    });
  });

  describe('formatError (text)', () => {
    it('writes human-readable error to stderr', () => {
      expect(() => formatError('NOT_FOUND', 'Entity not found', 'Try searching', ['hint'], 'text'))
        .toThrow('process.exit called');

      const output = stderrWrite.mock.calls[0][0] as string;
      expect(output).toContain('Error [NOT_FOUND]: Entity not found');
      expect(output).toContain('Recovery: Try searching');
      expect(output).toContain('hint');
    });
  });
});
