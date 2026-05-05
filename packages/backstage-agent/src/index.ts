import { Command } from 'commander';
import { formatSuccess, formatError, type OutputFormat, type TrustLevel } from './output/formatter.js';
import { readConfig } from './lib/config.js';
import { readInstances } from './lib/instance.js';
import { enforceTrustPolicy } from './lib/enforce.js';
import { getGlobalOptions } from './lib/globals.js';
import { loginHint, tryCommand } from './output/hints.js';
import { createLoginCommand } from './commands/auth/login.js';
import { createStatusCommand } from './commands/auth/status.js';
import { createSelectCommand } from './commands/auth/select.js';
import { createLogoutCommand } from './commands/auth/logout.js';
import { createWhoamiCommand } from './commands/auth/whoami.js';
import { createSetTrustPolicyCommand } from './commands/config/set-trust-policy.js';

const program = new Command();

program
  .name('backstage-agent')
  .description('Intent-based CLI for AI coding agents to interact with Backstage')
  .version('0.1.0')
  .option('--output <format>', 'Output format (json, text)', 'json')
  .option('--instance <name>', 'Target a specific stored auth instance')
  .exitOverride()
  .configureOutput({
    writeErr: () => {},
    writeOut: (str: string) => process.stdout.write(str),
    outputError: () => {},
  });

interface CommandMetadata {
  trustLevel: TrustLevel;
  exempt?: boolean;
  examples?: string[];
  related?: string[];
}

const commandMeta = new Map<Command, CommandMetadata>();

function registerMeta(cmd: Command, meta: CommandMetadata): void {
  commandMeta.set(cmd, meta);
  cmd.exitOverride();
  cmd.configureOutput({ writeErr: () => {}, outputError: () => {} });

  cmd.addHelpText('after', () => {
    const lines: string[] = [''];
    lines.push(`Trust level: ${meta.trustLevel}`);

    if (meta.examples && meta.examples.length > 0) {
      lines.push('');
      lines.push('Examples:');
      for (const example of meta.examples) {
        lines.push(`  $ ${example}`);
      }
    }

    if (meta.related && meta.related.length > 0) {
      lines.push('');
      lines.push('Related commands:');
      for (const rel of meta.related) {
        lines.push(`  backstage-agent ${rel}`);
      }
    }

    return lines.join('\n');
  });

  if (!meta.exempt) {
    cmd.hook('preAction', (_thisCmd, actionCmd) => {
      const { output } = getGlobalOptions(actionCmd);
      const fullName = getFullCommandName(actionCmd);
      enforceTrustPolicy(fullName, meta.trustLevel, output);
    });
  }
}

function getFullCommandName(cmd: Command): string {
  const parts: string[] = [];
  let current: Command | null = cmd;
  while (current && current !== program) {
    parts.unshift(current.name());
    current = current.parent;
  }
  return parts.join(' ');
}

// Auth command group
const authGroup = new Command('auth').description('Authentication and instance management')
  .exitOverride()
  .configureOutput({ writeErr: () => {}, outputError: () => {} });

const loginCmd = createLoginCommand();
registerMeta(loginCmd, {
  trustLevel: 'reversible',
  exempt: true,
  examples: [
    'backstage-agent auth login --backend-url https://backstage.example.com',
    'backstage-agent auth login --backend-url https://backstage.example.com --instance production',
    'backstage-agent auth login --backend-url https://backstage.example.com --trust-policy read-only',
    'backstage-agent auth login --backend-url https://backstage.example.com --no-browser',
  ],
  related: ['auth status', 'auth logout'],
});
authGroup.addCommand(loginCmd);

const statusCmd = createStatusCommand();
registerMeta(statusCmd, {
  trustLevel: 'read-only',
  exempt: true,
  examples: ['backstage-agent auth status'],
  related: ['auth login', 'auth select', 'auth logout'],
});
authGroup.addCommand(statusCmd);

const selectCmd = createSelectCommand();
registerMeta(selectCmd, {
  trustLevel: 'reversible',
  exempt: true,
  examples: ['backstage-agent auth select staging'],
  related: ['auth status', 'auth login'],
});
authGroup.addCommand(selectCmd);

const logoutCmd = createLogoutCommand();
registerMeta(logoutCmd, {
  trustLevel: 'reversible',
  exempt: true,
  examples: [
    'backstage-agent auth logout',
    'backstage-agent --instance staging auth logout',
  ],
  related: ['auth login', 'auth status'],
});
authGroup.addCommand(logoutCmd);

const whoamiCmd = createWhoamiCommand();
registerMeta(whoamiCmd, {
  trustLevel: 'read-only',
  exempt: true,
  examples: ['backstage-agent auth whoami'],
  related: ['auth status', 'auth login'],
});
authGroup.addCommand(whoamiCmd);

program.addCommand(authGroup);

// Config command group
const configGroup = new Command('config').description('CLI configuration')
  .exitOverride()
  .configureOutput({ writeErr: () => {}, outputError: () => {} });

const setTrustPolicyCmd = createSetTrustPolicyCommand();
registerMeta(setTrustPolicyCmd, {
  trustLevel: 'reversible',
  exempt: true,
  examples: [
    'backstage-agent config set-trust-policy read-only',
    'backstage-agent config set-trust-policy reversible',
    'backstage-agent config set-trust-policy all',
  ],
  related: ['auth login --trust-policy'],
});
configGroup.addCommand(setTrustPolicyCmd);

program.addCommand(configGroup);

// No-arg status summary
if (process.argv.length <= 2) {
  const format: OutputFormat = 'json';
  const instances = readInstances();
  const selected = instances.find(i => i.selected);
  const config = readConfig();

  const data = {
    instance: selected
      ? { name: selected.name, authenticated: true }
      : null,
    trustPolicy: config.trustPolicy,
    commandGroups: [
      { name: 'auth', description: 'Authentication and instance management' },
      { name: 'config', description: 'CLI configuration' },
    ],
  };

  const hints = selected
    ? [tryCommand('auth status'), tryCommand('config set-trust-policy')]
    : [loginHint()];

  formatSuccess(data, hints, 'read-only', format);
} else {
  (async () => {
    try {
      await program.parseAsync(process.argv);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: string }).code === 'string') {
        const code = (err as { code: string }).code;
        if (code === 'commander.helpDisplayed' || code === 'commander.version') {
          process.exit(0);
        }
      }

      const format: OutputFormat = program.opts().output === 'text' ? 'text' : 'json';
      const rawMessage = err instanceof Error ? err.message : String(err);
      const message = rawMessage.replace(/^error:\s*/i, '');
      formatError(
        'USAGE_ERROR',
        message,
        'Run with --help for usage information',
        [tryCommand('--help')],
        format,
        2,
      );
    }
  })();
}
