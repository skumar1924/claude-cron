import { createDb, insertRun } from '../server/db.js'
import { extractJobId } from '../server/scheduler.js'
import { v4 as uuidv4 } from 'uuid'
import { homedir } from 'os'
import { join } from 'path'
import { fileURLToPath } from 'url'

const DB_PATH = join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', 'data.db')

export function handleSessionStart(db, { prompt, startedAt }) {
  const jobId = extractJobId(prompt)
  if (!jobId) return null

  const runId = uuidv4()
  insertRun(db, { id: runId, job_id: jobId, started_at: startedAt ?? new Date().toISOString(), status: 'running' })
  return runId
}

// Entry point when invoked as a hook
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let raw = ''
  process.stdin.on('data', chunk => (raw += chunk))
  process.stdin.on('end', () => {
    try {
      const ctx = JSON.parse(raw)
      const db = createDb(DB_PATH)
      handleSessionStart(db, {
        prompt: ctx.prompt ?? ctx.message ?? '',
        startedAt: ctx.startedAt ?? new Date().toISOString(),
      })
      db.close()
    } catch (e) {
      process.stderr.write(`claude-cron session-start hook error: ${e.message}\n`)
    }
  })
}
