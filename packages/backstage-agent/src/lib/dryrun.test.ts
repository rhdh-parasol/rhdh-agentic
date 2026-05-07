import { describe, it, expect } from 'vitest';
import { Command } from 'commander';
import { addDryRunOption, isDryRun } from './dryrun.js';

describe('Dry-Run Framework', () => {
  describe('addDryRunOption', () => {
    it('adds --no-dry-run for destructive commands', () => {
      const cmd = new Command('test');
      addDryRunOption(cmd, 'destructive');
      const option = cmd.options.find(o => o.long === '--no-dry-run');
      expect(option).toBeDefined();
    });

    it('adds --dry-run for reversible commands', () => {
      const cmd = new Command('test');
      addDryRunOption(cmd, 'reversible');
      const option = cmd.options.find(o => o.long === '--dry-run');
      expect(option).toBeDefined();
    });

    it('adds no dry-run option for read-only commands', () => {
      const cmd = new Command('test');
      addDryRunOption(cmd, 'read-only');
      const dryRunOptions = cmd.options.filter(
        o => o.long === '--dry-run' || o.long === '--no-dry-run',
      );
      expect(dryRunOptions).toHaveLength(0);
    });
  });

  describe('isDryRun', () => {
    it('destructive commands default to dry-run', () => {
      const cmd = new Command('test');
      addDryRunOption(cmd, 'destructive');
      cmd.parse([], { from: 'user' });
      expect(isDryRun(cmd, 'destructive')).toBe(true);
    });

    it('destructive commands execute with --no-dry-run', () => {
      const cmd = new Command('test');
      addDryRunOption(cmd, 'destructive');
      cmd.parse(['--no-dry-run'], { from: 'user' });
      expect(isDryRun(cmd, 'destructive')).toBe(false);
    });

    it('reversible commands do not default to dry-run', () => {
      const cmd = new Command('test');
      addDryRunOption(cmd, 'reversible');
      cmd.parse([], { from: 'user' });
      expect(isDryRun(cmd, 'reversible')).toBe(false);
    });

    it('reversible commands support opt-in --dry-run', () => {
      const cmd = new Command('test');
      addDryRunOption(cmd, 'reversible');
      cmd.parse(['--dry-run'], { from: 'user' });
      expect(isDryRun(cmd, 'reversible')).toBe(true);
    });

    it('read-only commands always return false', () => {
      const cmd = new Command('test');
      cmd.parse([], { from: 'user' });
      expect(isDryRun(cmd, 'read-only')).toBe(false);
    });
  });
});
