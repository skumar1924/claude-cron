import express from 'express'
import { createDb, insertJob, getJob, listJobs, updateJob,
         deleteJob, listRuns, seedBuiltinJobs } from './db.js'
import { syncJobToSettings, removeJobFromSettings, injectJobTag } from './scheduler.js'
import { v4 as uuidv4 } from 'uuid'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const PORT = 52141
const DB_PATH = join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', 'data.db')
const PID_PATH = join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', '.server.pid')

// createTestServer accepts an injected db and skips settings.json writes
export function createTestServer(db) {
  return buildApp(db, { sync: false })
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
    // Use spawn with array args — no shell, no injection risk
    spawn('claude', ['-p', job.prompt], { detached: true, stdio: 'ignore' }).unref()
    res.status(202).end()
  })

  app.get('/api/runs', (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : undefined
    const jobId = req.query.jobId
    res.json(listRuns(db, { jobId, days }))
  })

  return app
}

// Entry point for background server process
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = createDb(DB_PATH)
  seedBuiltinJobs(db)
  syncJobToSettings(getJob(db, 'cron-health-digest'))
  const app = buildApp(db)
  app.listen(PORT, '127.0.0.1', () => {
    writeFileSync(PID_PATH, String(process.pid))
    console.log(`claude-cron server running on http://localhost:${PORT}`)
  })
}
