// Browser-side verification for the demo access gate.
//
// The public demo is a static bundle, so the password is checked here in the
// browser. We ship only a PBKDF2-HMAC-SHA256 hash (src/config/accessGate.json,
// produced by scripts/access-gate.mjs) and re-derive the same hash from the
// visitor's input using the Web Crypto API. Matching the CLI's algorithm,
// salt, iteration count and key length is what makes a CLI-produced hash
// verifiable here.
//
// This gate hides the demo from casual visitors; it is not a substitute for
// server-side auth (the bundle is downloadable). That trade-off is acceptable
// for a gated marketing demo with a strong password.

import gateConfig from '@/config/accessGate.json';

interface AccessGateConfig {
  algorithm: string;
  iterations: number;
  keyLength: number;
  digest: string;
  salt: string; // base64
  hash: string; // base64
  updatedAt: string | null;
}

const config = gateConfig as AccessGateConfig;

export function isAccessGateConfigured(): boolean {
  return Boolean(config.salt && config.hash);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Length-independent comparison so verification timing doesn't leak how many
// leading bytes matched.
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function verifyAccessPassword(password: string): Promise<boolean> {
  if (!isAccessGateConfigured()) return false;
  if (typeof crypto?.subtle?.deriveBits !== 'function') return false;

  const encoder = new TextEncoder();
  const salt = base64ToBytes(config.salt);
  const expected = base64ToBytes(config.hash);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: config.iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      config.keyLength * 8,
    ),
  );

  return constantTimeEqual(derived, expected);
}
