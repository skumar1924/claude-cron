import Database from 'better-sqlite3'

export function createDb(path) {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  // migrate pre-existing DBs (noop if column already exists)
  try { db.prepare(`ALTER TABLE runs ADD COLUMN triggered_by TEXT NOT NULL DEFAULT 'manual'`).run() } catch {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      prompt TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      triggered_by TEXT NOT NULL DEFAULT 'manual',
      duration_ms INTEGER,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd REAL,
      output TEXT,
      error TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );
  `)
  return db
}

export function insertJob(db, { id, name, schedule, prompt, enabled = 1, is_builtin = 0 }) {
  db.prepare(`INSERT INTO jobs (id, name, schedule, prompt, enabled, is_builtin)
              VALUES (?, ?, ?, ?, ?, ?)`).run(id, name, schedule, prompt, enabled, is_builtin)
}

export function getJob(db, id) {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id)
}

export function listJobs(db) {
  return db.prepare('SELECT * FROM jobs ORDER BY is_builtin DESC, created_at ASC').all()
}

export function updateJob(db, id, fields) {
  const cols = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE jobs SET ${cols} WHERE id = ?`).run(...Object.values(fields), id)
}

export function deleteJob(db, id) {
  const job = getJob(db, id)
  if (job?.is_builtin) throw new Error('Cannot delete built-in job')
  db.prepare('DELETE FROM runs WHERE job_id = ?').run(id)
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id)
}

export function insertRun(db, { id, job_id, started_at, status = 'running', triggered_by = 'manual' }) {
  db.prepare(`INSERT INTO runs (id, job_id, started_at, status, triggered_by)
              VALUES (?, ?, ?, ?, ?)`).run(id, job_id ?? null, started_at, status, triggered_by)
}

// Returns true if the run was inserted (no concurrent running run existed).
// Atomic via SQLite's single-writer guarantee — safe across multiple server instances.
export function tryInsertRun(db, { id, job_id, started_at, triggered_by = 'manual' }) {
  const result = db.prepare(`
    INSERT INTO runs (id, job_id, started_at, status, triggered_by)
    SELECT ?, ?, ?, 'running', ?
    WHERE NOT EXISTS (
      SELECT 1 FROM runs WHERE job_id = ? AND status = 'running'
    )
  `).run(id, job_id, started_at, triggered_by, job_id)
  return result.changes === 1
}

export function deleteRun(db, id) {
  db.prepare('DELETE FROM runs WHERE id = ?').run(id)
}

export function deleteRunsForJob(db, jobId) {
  return db.prepare('DELETE FROM runs WHERE job_id = ?').run(jobId).changes
}

export function updateRun(db, id, fields) {
  const cols = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE runs SET ${cols} WHERE id = ?`).run(...Object.values(fields), id)
}

export function cleanupStaleRuns(db) {
  db.prepare(`UPDATE runs SET status='error', finished_at=datetime('now'),
              error='Interrupted (server restarted)' WHERE status='running'`).run()
}

export function listRuns(db, { jobId, days } = {}) {
  let query = 'SELECT * FROM runs WHERE 1=1'
  const params = []
  if (jobId) { query += ' AND job_id = ?'; params.push(jobId) }
  if (days)  { query += ` AND started_at >= datetime('now', ?)`; params.push(`-${days} days`) }
  query += ' ORDER BY started_at DESC, rowid DESC'
  return db.prepare(query).all(...params)
}

export function seedBuiltinJobs(db) {
  if (getJob(db, 'cron-health-digest')) return

  const prompt = `<!-- job:cron-health-digest -->
You are a job health monitor. Call GET http://localhost:52141/api/runs?days=7 to fetch
the last 7 days of run data. Analyse it and write a concise weekly digest covering:
success rates per job, any regressions vs the prior week, total cost, and any missed runs.
Keep it under 200 words. Use markdown. Be direct -- no filler phrases.`

  insertJob(db, {
    id: 'cron-health-digest',
    name: 'cron-health-digest',
    schedule: '0 8 * * 1',
    prompt,
    enabled: 1,
    is_builtin: 1,
  })
}
