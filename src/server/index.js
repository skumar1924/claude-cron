import express from 'express'
import { createDb, insertJob, getJob, listJobs, updateJob,
         deleteJob, listRuns, insertRun, tryInsertRun, updateRun, seedBuiltinJobs,
         cleanupStaleRuns, deleteRun, deleteRunsForJob } from './db.js'
import { syncJobToSettings, removeJobFromSettings, injectJobTag, shouldRunNow } from './scheduler.js'
import { v4 as uuidv4 } from 'uuid'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PORT = 52141
const DB_PATH = join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', 'data.db')
const PID_PATH = join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', '.server.pid')

// createTestServer accepts an injected db and skips settings.json writes
export function createTestServer(db) {
  return buildApp(db, { sync: false })
}

function runJob(db, job, triggeredBy = 'manual') {
  const runId = uuidv4()
  const startedAt = new Date().toISOString()
  const inserted = tryInsertRun(db, { id: runId, job_id: job.id, started_at: startedAt, triggered_by: triggeredBy })
  if (!inserted) {
    console.log(`[cron] skipping ${job.name} — already running`)
    return null
  }

  // Strip nesting-guard vars so claude isn't blocked as a nested session
  const env = { ...process.env }
  delete env.CLAUDECODE
  delete env.CLAUDE_CODE

  const child = spawn('claude', [
    '-p',
    '--dangerously-skip-permissions',
    '--output-format', 'json',
    job.prompt,
  ], {
    detached: true,
    stdio: ['ignore', 'pipe', 'ignore'],
    env,
  })

  let output = ''
  let timedOut = false
  child.stdout.on('data', chunk => { output += chunk.toString() })

  const timeout = setTimeout(() => {
    timedOut = true
    child.kill()
  }, 10 * 60 * 1000)

  child.on('close', code => {
    clearTimeout(timeout)
    let textOutput = output.trim()
    let cost_usd = null, input_tokens = null, output_tokens = null
    if (textOutput) {
      try {
        const parsed = JSON.parse(textOutput)
        textOutput = parsed.result ?? textOutput
        cost_usd = parsed.total_cost_usd ?? parsed.cost_usd ?? null
        input_tokens = parsed.usage?.input_tokens ?? null
        output_tokens = parsed.usage?.output_tokens ?? null
      } catch {}
    }
    updateRun(db, runId, {
      status: timedOut ? 'error' : code === 0 ? 'success' : 'error',
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      error: timedOut ? 'Timeout (exceeded 10 minutes)' : code !== 0 ? `Exit code ${code}` : null,
      output: textOutput || null,
      cost_usd,
      input_tokens,
      output_tokens,
    })
  })

  child.unref()
  return runId
}

// Fires every minute, aligned to the wall clock
function startScheduler(db) {
  function tick() {
    const due = listJobs(db).filter(j => j.enabled && shouldRunNow(j.schedule))
    for (const job of due) {
      console.log(`[cron] firing ${job.name}`)
      runJob(db, job, 'scheduler')
    }
    // Reschedule for the next minute boundary
    const msUntilNext = 60000 - (Date.now() % 60000) + 50
    setTimeout(tick, msUntilNext)
  }
  const msUntilFirst = 60000 - (Date.now() % 60000) + 50
  setTimeout(tick, msUntilFirst)
  console.log(`Scheduler started — first tick in ${Math.round(msUntilFirst / 1000)}s`)
}

function buildApp(db, { sync = true } = {}) {
  const app = express()
  app.use(express.json())
  app.use(express.static(join(__dirname, 'public')))

  app.get('/api/jobs', (_req, res) => res.json(listJobs(db)))

  app.post('/api/jobs', (req, res) => {
    const { name, schedule, prompt } = req.body
    const id = uuidv4()
    const taggedPrompt = injectJobTag(prompt, id)
    const job = { id, name, schedule, prompt: taggedPrompt, enabled: 1, is_builtin: 0 }
    insertJob(db, job)
    if (sync) syncJobToSettings(job)
    res.status(201).json(getJob(db, id))
  })

  app.put('/api/jobs/:id', (req, res) => {
    const { id } = req.params
    if (!getJob(db, id)) return res.status(404).end()
    const fields = { ...req.body }
    if (fields.prompt) fields.prompt = injectJobTag(fields.prompt, id)
    updateJob(db, id, fields)
    const updated = getJob(db, id)
    if (sync && (fields.prompt || fields.schedule)) syncJobToSettings(updated)
    res.json(updated)
  })

  app.delete('/api/jobs/:id', (req, res) => {
    try {
      deleteJob(db, req.params.id)
      if (sync) removeJobFromSettings(req.params.id)
      res.status(204).end()
    } catch (e) {
      if (e.message.includes('Cannot delete')) return res.status(403).json({ error: e.message })
      res.status(500).json({ error: e.message })
    }
  })

  app.post('/api/jobs/:id/run', (req, res) => {
    const job = getJob(db, req.params.id)
    if (!job) return res.status(404).end()
    const runId = runJob(db, job, 'manual')
    if (!runId) return res.status(409).json({ error: 'Job is already running' })
    res.status(202).end()
  })

  app.get('/api/digest', (_req, res) => {
    const run = db.prepare(`
      SELECT * FROM runs
      WHERE job_id = 'cron-health-digest' AND status = 'success' AND output IS NOT NULL
      ORDER BY started_at DESC LIMIT 1
    `).get()
    res.json(run ?? null)
  })

  app.get('/api/runs', (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : undefined
    const jobId = req.query.jobId
    res.json(listRuns(db, { jobId, days }))
  })

  app.delete('/api/runs/:id', (req, res) => {
    deleteRun(db, req.params.id)
    res.status(204).end()
  })

  app.delete('/api/runs', (req, res) => {
    const { jobId } = req.query
    if (!jobId) return res.status(400).json({ error: 'jobId query param required' })
    const count = deleteRunsForJob(db, jobId)
    res.json({ deleted: count })
  })

  return app
}

// Entry point for background server process
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = createDb(DB_PATH)
  cleanupStaleRuns(db)
  seedBuiltinJobs(db)
  syncJobToSettings(getJob(db, 'cron-health-digest'))
  const app = buildApp(db)
  startScheduler(db)
  app.listen(PORT, '127.0.0.1', () => {
    writeFileSync(PID_PATH, String(process.pid))
    console.log(`claude-cron server running on http://localhost:${PORT}`)
  })
}
