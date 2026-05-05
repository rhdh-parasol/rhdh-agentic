export type TrustLevel = 'read-only' | 'reversible' | 'destructive';

export type ErrorCode =
  | 'AUTH_ERROR'
  | 'CONNECTION_ERROR'
  | 'INSTANCE_NOT_FOUND'
  | 'NO_AUTH_INSTANCE'
  | 'NO_SELECTED_INSTANCE'
  | 'SERVER_ERROR'
  | 'STORAGE_ERROR'
  | 'TRUST_POLICY_VIOLATION'
  | 'USAGE_ERROR';

export interface SuccessEnvelope<T = unknown> {
  data: T;
  hints: string[];
  trustLevel: TrustLevel;
  dryRun?: true;
}

export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  recovery: string;
}

export interface ErrorEnvelope {
  error: ErrorDetail;
  hints: string[];
}

export type OutputFormat = 'json' | 'text';

export function formatSuccess<T>(
  data: T,
  hints: string[],
  trustLevel: TrustLevel,
  format: OutputFormat,
  dryRun?: boolean,
): void {
  const envelope: SuccessEnvelope<T> = { data, hints, trustLevel };
  if (dryRun) {
    envelope.dryRun = true;
  }

  if (format === 'text') {
    printTextSuccess(envelope);
  } else {
    process.stdout.write(JSON.stringify(envelope, null, 2) + '\n');
  }
}

export function formatError(
  code: ErrorCode,
  message: string,
  recovery: string,
  hints: string[],
  format: OutputFormat,
  exitCode: 1 | 2 = 1,
): never {
  const envelope: ErrorEnvelope = {
    error: { code, message, recovery },
    hints,
  };

  if (format === 'text') {
    printTextError(envelope);
  } else {
    process.stderr.write(JSON.stringify(envelope, null, 2) + '\n');
  }

  process.exit(exitCode);
}

function printTextSuccess<T>(envelope: SuccessEnvelope<T>): void {
  const lines: string[] = [];

  if (envelope.dryRun) {
    lines.push('[DRY RUN]');
    lines.push('');
  }

  lines.push(`Trust level: ${envelope.trustLevel}`);
  lines.push('');
  lines.push(formatDataAsText(envelope.data));

  if (envelope.hints.length > 0) {
    lines.push('');
    lines.push('Hints:');
    for (const hint of envelope.hints) {
      lines.push(`  ${hint}`);
    }
  }

  process.stdout.write(lines.join('\n') + '\n');
}

function printTextError(envelope: ErrorEnvelope): void {
  const lines: string[] = [];

  lines.push(`Error [${envelope.error.code}]: ${envelope.error.message}`);
  lines.push(`Recovery: ${envelope.error.recovery}`);

  if (envelope.hints.length > 0) {
    lines.push('');
    lines.push('Hints:');
    for (const hint of envelope.hints) {
      lines.push(`  ${hint}`);
    }
  }

  process.stderr.write(lines.join('\n') + '\n');
}

function formatDataAsText(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => formatDataAsText(item)).join('\n');
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return entries
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          const items = value.map(item => {
            if (typeof item === 'object' && item !== null) {
              return '  ' + formatDataAsText(item).replace(/\n/g, '\n  ');
            }
            return `  - ${item}`;
          });
          return `${key}:\n${items.join('\n')}`;
        }
        if (typeof value === 'object' && value !== null) {
          return `${key}:\n  ${formatDataAsText(value).replace(/\n/g, '\n  ')}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
  }

  return String(data);
}
