export function tryCommand(command: string): string {
  return `Try: backstage-agent ${command}`;
}

export function toExecute(command: string): string {
  return `To execute: backstage-agent ${command}`;
}

export function loginHint(): string {
  return tryCommand('auth login --backend-url <url>');
}

export function authStatusHint(): string {
  return tryCommand('auth status');
}

export function authSelectHint(name?: string): string {
  return tryCommand(`auth select ${name ?? '<name>'}`);
}

export function configSetTrustPolicyHint(): string {
  return tryCommand('config set-trust-policy <level>');
}
