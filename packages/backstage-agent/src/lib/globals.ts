import type { Command } from 'commander';
import type { OutputFormat } from '../output/formatter.js';

export interface GlobalOptions {
  output: OutputFormat;
  instance?: string;
}

export function getGlobalOptions(cmd: Command): GlobalOptions {
  const opts = cmd.optsWithGlobals();
  return {
    output: opts.output === 'text' ? 'text' : 'json',
    instance: opts.instance,
  };
}
