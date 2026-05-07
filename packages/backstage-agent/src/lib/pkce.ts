import crypto from 'node:crypto';

function base64url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function generateVerifier(length = 64): string {
  const bytes = crypto.randomBytes(Math.max(32, Math.min(96, length)));
  return base64url(bytes);
}

export function challengeFromVerifier(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64url(hash);
}
