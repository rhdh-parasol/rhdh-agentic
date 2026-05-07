import type { TrustLevel } from '../output/formatter.js';
import type { TrustPolicy } from './config.js';

const TRUST_LEVEL_ORDER: Record<TrustLevel, number> = {
  'read-only': 0,
  'reversible': 1,
  'destructive': 2,
};

const POLICY_MAX_LEVEL: Record<TrustPolicy, TrustLevel> = {
  'read-only': 'read-only',
  'reversible': 'reversible',
  'all': 'destructive',
};

export function isTrustLevelAllowed(commandLevel: TrustLevel, policy: TrustPolicy): boolean {
  const maxAllowed = POLICY_MAX_LEVEL[policy];
  return TRUST_LEVEL_ORDER[commandLevel] <= TRUST_LEVEL_ORDER[maxAllowed];
}
