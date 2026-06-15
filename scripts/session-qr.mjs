#!/usr/bin/env node
/**
 * session-qr.mjs — render a scannable QR code for a Claude Code
 * Remote Control session URL.
 *
 * The Remote Control URL for a session is always:
 *   https://claude.ai/code/session_<SESSION_ID>
 *
 * Usage:
 *   node scripts/session-qr.mjs <url|session-id>   # explicit
 *   node scripts/session-qr.mjs                      # read SESSION ID from
 *                                                    # CLAUDE_SESSION_ID env
 *   <hook json on stdin> | node scripts/session-qr.mjs   # hook mode
 *
 * As a SessionStart hook, Claude Code pipes JSON containing `session_id`
 * on stdin. In that mode this script writes the QR straight to the user's
 * terminal (the controlling TTY, since hook stdout is captured by Claude
 * Code) and also emits a SessionStart JSON payload so the URL shows in the
 * transcript.
 */

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

const BASE = 'https://claude.ai/code/session_';

function urlFromSessionId(id) {
  // Accept a bare id or an already-prefixed "session_xxx".
  const clean = id.startsWith('session_') ? id.slice('session_'.length) : id;
  return `${BASE}${clean}`;
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

// Resolve { url, hookMode } from args / stdin / env, in that order.
async function resolveTarget() {
  const arg = process.argv[2];
  if (arg) {
    return { url: arg.startsWith('http') ? arg : urlFromSessionId(arg), hookMode: false };
  }

  const stdin = await readStdin();
  if (stdin) {
    try {
      const obj = JSON.parse(stdin);
      if (obj && obj.session_id) {
        return { url: urlFromSessionId(obj.session_id), hookMode: true };
      }
    } catch {
      // Not JSON — fall through to env.
    }
  }

  const envId = process.env.CLAUDE_SESSION_ID;
  if (envId) return { url: urlFromSessionId(envId), hookMode: false };

  return { url: null, hookMode: false };
}

function generate(qrcode, url) {
  return new Promise((resolve) => {
    qrcode.setErrorLevel?.('M');
    qrcode.generate(url, { small: true }, (qr) => resolve(qr));
  });
}

// Install qrcode-terminal locally (without touching package.json) so the
// next import succeeds. Used only when the dependency is missing.
function installRenderer() {
  return new Promise((resolve) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npm, ['install', 'qrcode-terminal', '--no-save'], {
      stdio: 'ignore',
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

// Render an ASCII QR. Prefer the locally installed renderer; if it is
// missing, install it on the fly and retry. Returns the QR string, or null
// if it could not be produced (e.g. offline with nothing installed).
async function renderAsciiQr(url) {
  try {
    const { default: qrcode } = await import('qrcode-terminal');
    return await generate(qrcode, url);
  } catch {
    // Not installed — attempt a one-time install, then retry once.
  }

  if (!(await installRenderer())) return null;
  try {
    const { default: qrcode } = await import('qrcode-terminal');
    return await generate(qrcode, url);
  } catch {
    return null;
  }
}

// Write text to the user's controlling terminal. Hook stdout is captured by
// Claude Code, so for hook mode we target the real terminal device directly.
function writeToTerminal(text) {
  const dev = process.platform === 'win32' ? '\\\\.\\CONOUT$' : '/dev/tty';
  try {
    const tty = createWriteStream(dev);
    tty.write(text);
    tty.end();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { url, hookMode } = await resolveTarget();

  if (!url) {
    console.error(
      'No session URL found. Pass a URL or session id, or set CLAUDE_SESSION_ID.',
    );
    process.exit(hookMode ? 0 : 1); // never block session startup
    return;
  }

  const qr = await renderAsciiQr(url);
  const banner = '\nRemote Control — scan to view & control this session:\n';
  const block = qr ? `${banner}\n${qr}\n${url}\n` : `${banner}\n${url}\n`;

  if (hookMode) {
    // Show the QR in the live terminal; fall back to the transcript message.
    const shown = writeToTerminal(block);
    const systemMessage = shown
      ? `Remote Control QR shown in terminal · ${url}`
      : `Remote Control: ${url}\n${qr ?? ''}`;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: `Remote Control URL for this session: ${url}`,
        },
        systemMessage,
      }),
    );
    process.exit(0);
    return;
  }

  process.stdout.write(block);
}

main().catch((err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});
