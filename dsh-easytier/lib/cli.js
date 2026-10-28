/**
 * Thin `easytier-cli` transport.
 *
 * Every read and every mutation the plugin performs goes through this module,
 * so there is exactly one place that knows how the CLI is invoked, how its
 * optional `-o json` output is decoded, and how a failure is reported.
 *
 * The CLI speaks to a running `easytier-core` RPC portal; a wrong portal shows
 * up as a ~5 s "deadline has elapsed" timeout rather than a refused connection,
 * so callers get a bound on how long a bad portal can cost them.
 *
 * @module dsh-easytier/lib/cli
 */

import { runFile, parseLooseJson } from './discover.js'

/** Default per-call deadline. EasyTier's own portal deadline is ~5 s. */
const DEFAULT_TIMEOUT = 20000

/**
 * Invoke `easytier-cli` against one portal.
 * @param {string} cliPath - resolved CLI executable.
 * @param {string} rpcPortal - `host:port` of the core's RPC portal.
 * @param {string[]} args - subcommand argv (without the global options).
 * @param {{timeoutMs?: number, json?: boolean, noTrunc?: boolean}} options - transport options.
 * @returns {Promise<{ok: boolean, code: number|null, stdout: string, stderr: string, raw: string, timedOut: boolean, data?: unknown, error?: string}>}
 */
export async function runCli(cliPath, rpcPortal, args, options = {}) {
  const argv = []
  if (rpcPortal !== undefined && rpcPortal !== '') argv.push('-p', rpcPortal)
  if (options.json !== false) argv.push('-o', 'json')
  if (options.noTrunc === true) argv.push('--no-trunc')
  argv.push(...args)

  const result = await runFile(cliPath, argv, options.timeoutMs ?? DEFAULT_TIMEOUT)
  const raw = `${result.stdout}${result.stderr}`
  const timedOut = result.timedOut
  const ok = result.code === 0 && !timedOut && result.stderr.trim() === ''
  const payload = {
    ok,
    code: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
    raw: raw.trim(),
    timedOut,
  }
  if (!ok) {
    payload.error = describeFailure(result, timedOut)
  }
  return payload
}

/**
 * Invoke the CLI and decode its JSON payload.
 * @param {string} cliPath - resolved CLI executable.
 * @param {string} rpcPortal - `host:port` portal.
 * @param {string[]} args - subcommand argv.
 * @param {{timeoutMs?: number}} options - transport options.
 * @returns {Promise<{ok: boolean, code: number|null, data?: unknown, raw: string, stderr: string, timedOut: boolean, error?: string}>}
 */
export async function cliJson(cliPath, rpcPortal, args, options = {}) {
  const result = await runCli(cliPath, rpcPortal, args, { timeoutMs: options.timeoutMs, json: true })
  const data = result.ok ? parseLooseJson(result.stdout) : undefined
  return {
    ok: result.ok && data !== undefined,
    code: result.code,
    data,
    raw: result.raw,
    stderr: result.stderr.trim(),
    timedOut: result.timedOut,
    ...(result.ok && data === undefined ? { error: `unexpected non-JSON output: ${result.raw.slice(0, 300)}` } : {}),
    ...(result.error !== undefined ? { error: result.error } : {}),
  }
}

/** Turn a failed exec into an actionable message instead of raw stderr. */
function describeFailure(result, timedOut) {
  if (timedOut) return 'easytier-cli did not answer before the deadline (wrong RPC portal or core not responding)'
  const text = `${result.stderr}\n${result.stdout}`.trim()
  if (text === '') return `easytier-cli exited with code ${result.code ?? 'null'} and no output`
  if (/拒绝访问|Access is denied|os error 5/i.test(text)) return `Access denied: this operation needs an elevated (Administrator) session. ${text}`
  return text
}

/**
 * Run a command and return its plain text output (table surfaces, generate output).
 * @param {string} cliPath - resolved CLI executable.
 * @param {string} rpcPortal - `host:port` portal.
 * @param {string[]} args - subcommand argv.
 * @param {{timeoutMs?: number}} options - transport options.
 * @returns {Promise<{ok: boolean, text: string, code: number|null, timedOut: boolean, error?: string}>}
 */
export async function cliText(cliPath, rpcPortal, args, options = {}) {
  const result = await runCli(cliPath, rpcPortal, args, { timeoutMs: options.timeoutMs, json: false, noTrunc: true })
  return {
    ok: result.ok,
    text: result.raw,
    code: result.code,
    timedOut: result.timedOut,
    ...(result.error !== undefined ? { error: result.error } : {}),
  }
}
