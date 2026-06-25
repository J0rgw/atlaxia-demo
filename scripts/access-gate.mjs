#!/usr/bin/env node
// ---------------------------------------------------------------------------
// AtlaXia demo access gate — password tooling.
//
// The public demo is a fully static, client-side bundle. The password is
// verified in the browser (src/lib/accessGate.ts) against a hash we ship in
// src/config/accessGate.json. This script generates/updates that hash.
//
// Hashing: PBKDF2-HMAC-SHA256 with a random per-password salt and a high
// iteration count (OWASP baseline). The exact same algorithm runs in the
// browser via the Web Crypto API, so a hash produced here verifies there.
// This is NOT base64 "obfuscation" — recovering the password from the stored
// hash requires brute force.
//
// Commands:
//   node scripts/access-gate.mjs generate   # invent a strong password + hash it
//   node scripts/access-gate.mjs hash        # hash a password you choose
//   node scripts/access-gate.mjs status      # show the current gate config
//
// (Run them via npm: `npm run gate:generate`, `gate:hash`, `gate:status`.)
// ---------------------------------------------------------------------------

import { pbkdf2Sync, randomBytes, randomInt, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Writable } from 'node:stream';
import readline from 'node:readline';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, '..');
const CONFIG_PATH = join(ROOT, 'src', 'config', 'accessGate.json');

// Hashing parameters. Keep in lockstep with src/lib/accessGate.ts.
const ALGORITHM = 'PBKDF2-HMAC-SHA256';
const ITERATIONS = 210_000; // OWASP minimum for PBKDF2-SHA256
const KEY_LENGTH = 32; // derived key bytes (256-bit)
const SALT_LENGTH = 16; // random salt bytes (128-bit)
const DIGEST = 'sha256';

// Alphabet for generated passwords: omits look-alike characters (0/O, 1/l/I)
// so the password survives being read aloud or copied from a screenshot.
const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

// ---- colours (no deps; degrade to plain text when not a TTY) --------------
const tty = process.stdout.isTTY;
const c = {
  bold: (s) => (tty ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s) => (tty ? `\x1b[2m${s}\x1b[0m` : s),
  green: (s) => (tty ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (tty ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s) => (tty ? `\x1b[31m${s}\x1b[0m` : s),
  cyan: (s) => (tty ? `\x1b[36m${s}\x1b[0m` : s),
};

// ---------------------------------------------------------------------------

/** Derive the PBKDF2 hash for `password` and return the JSON-serialisable config. */
function buildConfig(password, salt = randomBytes(SALT_LENGTH)) {
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return {
    algorithm: ALGORITHM,
    iterations: ITERATIONS,
    keyLength: KEY_LENGTH,
    digest: DIGEST,
    salt: salt.toString('base64'),
    hash: hash.toString('base64'),
    updatedAt: new Date().toISOString(),
  };
}

function writeConfig(config) {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function readConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/** A short, non-reversible fingerprint of the stored hash, for identifying
 *  which password is active without revealing anything about it. */
function fingerprint(config) {
  return createHash('sha256')
    .update(`${config.salt}:${config.hash}`)
    .digest('hex')
    .slice(0, 12);
}

/** Generate a strong, human-friendly password: 4 groups of 5 chars, ~114 bits. */
function generatePassword(groups = 4, groupLength = 5) {
  const parts = [];
  for (let g = 0; g < groups; g += 1) {
    let part = '';
    for (let i = 0; i < groupLength; i += 1) {
      part += SAFE_ALPHABET[randomInt(SAFE_ALPHABET.length)];
    }
    parts.push(part);
  }
  return parts.join('-');
}

/** Prompt for a password without echoing it to the terminal. */
function promptHidden(question) {
  return new Promise((resolve) => {
    let muted = false;
    const mutedOut = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    });
    const rl = readline.createInterface({
      input: process.stdin,
      output: mutedOut,
      terminal: true,
    });
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true; // mute echo for everything typed after the question is shown
  });
}

function relConfig() {
  return relative(ROOT, CONFIG_PATH);
}

function printSavedReminder() {
  console.log(c.dim(`  Config written to ${relConfig()}`));
  console.log(
    c.dim('  Commit that file and redeploy for the new password to take effect.'),
  );
}

// ---- commands -------------------------------------------------------------

function cmdGenerate() {
  const password = generatePassword();
  const config = buildConfig(password);
  writeConfig(config);

  console.log(c.green(c.bold('\n  New demo access password generated\n')));
  console.log(`  ${c.bold('Password:')}  ${c.cyan(c.bold(password))}\n`);
  console.log(
    c.yellow(
      '  Copy it now — only the hash is stored, so it cannot be recovered later.',
    ),
  );
  console.log(c.dim(`  Fingerprint: ${fingerprint(config)}\n`));
  printSavedReminder();
  console.log();
}

async function cmdHash() {
  // Accept the password from argv or the GATE_PASSWORD env var (scriptable),
  // otherwise prompt interactively with confirmation.
  const argPassword = process.argv[3];
  let password = argPassword ?? process.env.GATE_PASSWORD ?? '';

  if (!password) {
    password = await promptHidden('  Enter new demo password: ');
    const confirm = await promptHidden('  Confirm password:       ');
    if (password !== confirm) {
      console.error(c.red('\n  Passwords do not match. Nothing was written.\n'));
      process.exitCode = 1;
      return;
    }
  }

  password = password.trim();
  if (password.length < 6) {
    console.error(
      c.red('\n  Password must be at least 6 characters. Nothing was written.\n'),
    );
    process.exitCode = 1;
    return;
  }

  const config = buildConfig(password);
  writeConfig(config);

  console.log(c.green(c.bold('\n  Demo access password updated\n')));
  console.log(c.dim(`  Fingerprint: ${fingerprint(config)}\n`));
  printSavedReminder();
  console.log();
}

function cmdStatus() {
  const config = readConfig();

  console.log(c.bold('\n  Demo access gate status\n'));
  console.log(`  Config file: ${c.dim(relConfig())}`);

  if (!config || !config.hash || !config.salt) {
    console.log(`  Configured:  ${c.red('no')}`);
    console.log(
      c.yellow('\n  Run `npm run gate:generate` to create a password.\n'),
    );
    return;
  }

  console.log(`  Configured:  ${c.green('yes')}`);
  console.log(`  Algorithm:   ${config.algorithm}`);
  console.log(`  Iterations:  ${config.iterations.toLocaleString('en-US')}`);
  console.log(`  Key length:  ${config.keyLength} bytes (${config.keyLength * 8}-bit)`);
  console.log(`  Updated at:  ${config.updatedAt ?? 'unknown'}`);
  console.log(`  Fingerprint: ${c.cyan(fingerprint(config))}`);
  console.log(
    c.dim('\n  The password itself is not stored and cannot be shown here.\n'),
  );
}

function printHelp() {
  console.log(`
  ${c.bold('AtlaXia demo access gate')}

  ${c.bold('Usage:')}
    npm run gate:generate          ${c.dim('Invent a strong password, hash it, save it')}
    npm run gate:hash              ${c.dim('Hash a password you choose (prompts you)')}
    npm run gate:hash -- "secret"  ${c.dim('Hash a password passed as an argument')}
    npm run gate:status            ${c.dim('Show the current gate configuration')}

  Hashing: ${ALGORITHM}, ${ITERATIONS.toLocaleString('en-US')} iterations.
`);
}

// ---- entry ----------------------------------------------------------------

const command = process.argv[2];

switch (command) {
  case 'generate':
    cmdGenerate();
    break;
  case 'hash':
    await cmdHash();
    break;
  case 'status':
    cmdStatus();
    break;
  default:
    printHelp();
    if (command && command !== 'help' && command !== '--help') {
      process.exitCode = 1;
    }
}
