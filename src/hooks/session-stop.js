import { createDb, updateRun } from '../server/db.js'
import { homedir } from 'os'
import { join } from 'path'
import { fileURLToPath } from 'url'

const DB_PATH = join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', 'data.db')

export function handleSessionStop(db, { exitCode, output, usage }) {
  const running = db.prepare(
    `SELECT * FROM runs WHERE status = 'running' ORDER BY started_at DESC, rowid DESC LIMIT 1`
  ).get()
  if (!running) return

  updateRun(db, running.id, {
    status: exitCode === 0 ? 'success' : 'error',
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - new Date(running.started_at).getTime(),
    input_tokens: usage?.inputTokens ?? null,
    output_tokens: usage?.outputTokens ?? null,
    cost_usd: usage?.costUsd ?? null,
    output: output ?? null,
    error: exitCode !== 0 ? (output ?? 'Session exited with non-zero code') : null,
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let raw = ''
  process.stdin.on('data', chunk => (raw += chunk))
  process.stdin.on('end', () => {
    try {
      const ctx = JSON.parse(raw)
      const db = createDb(DB_PATH)
      handleSessionStop(db, {
        exitCode: ctx.exitCode ?? 0,
        output: ctx.output ?? ctx.result,
        usage: ctx.usage,
      })
      db.close()
    } catch (e) {
      process.stderr.write(`claude-cron session-stop hook error: ${e.message}\n`)
    }
  })
}
