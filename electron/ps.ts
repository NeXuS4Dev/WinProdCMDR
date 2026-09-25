/**
 * WinProdCMDR — PowerShell bridge.
 *
 * Runs Windows PowerShell (available on every Windows installation) in
 * -NoProfile -NonInteractive mode, passing scripts as base64 UTF-16LE
 * encoded commands (immune to quoting issues) and parsing JSON output.
 *
 * Dynamic values (user text) are always passed via environment variables,
 * never interpolated into the script itself.
 */

import { spawn } from 'node:child_process';

export function isWindows(): boolean {
  return process.platform === 'win32';
}

function encodeCommand(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64');
}

export interface PsRunResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function runPS(
  script: string,
  env: Record<string, string> = {},
  timeoutMs = 25_000,
): Promise<PsRunResult> {
  return new Promise((resolve) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodeCommand(script)],
      { env: { ...process.env, ...env }, windowsHide: true },
    );

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      resolve({ ok: false, error: `PowerShell timed out after ${Math.round(timeoutMs / 1000)}s.` });
    }, timeoutMs);

    child.stdout.on('data', (d) => (stdout += d.toString('utf8')));
    child.stderr.on('data', (d) => (stderr += d.toString('utf8')));

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: `Failed to start PowerShell: ${err.message}` });
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const out = stdout.trim();
      if (code !== 0 && !out) {
        resolve({ ok: false, error: stderr.trim() || `PowerShell exited with code ${code}.` });
        return;
      }
      if (!out) {
        resolve({ ok: false, error: stderr.trim() || 'PowerShell returned no data.' });
        return;
      }
      try {
        resolve({ ok: true, data: JSON.parse(out) });
      } catch {
        resolve({ ok: false, error: out.slice(0, 400) || 'Unexpected PowerShell output.' });
      }
    });
  });
}
