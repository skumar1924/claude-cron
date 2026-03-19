import { createDb, insertJob, getJob, listJobs, updateJob, deleteJob,
         insertRun, updateRun, listRuns, seedBuiltinJobs } from '../src/server/db.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlinkSync } from 'fs'

const dbPath = join(tmpdir(), `test-claude-cron-${Date.now()}.db`)
let db

beforeAll(() => { db = createDb(dbPath) })
afterAll(() => { db.close(); unlinkSync(dbPath) })

test('insertJob and getJob round-trip', () => {
  const job = { id: 'j1', name: 'test', schedule: '0 9 * * *',
    prompt: 'do stuff <!-- job:j1 -->', enabled: 1, is_builtin: 0 }
  insertJob(db, job)
  expect(getJob(db, 'j1')).toMatchObject({ name: 'test', schedule: '0 9 * * *' })
})

test('listJobs returns all jobs ordered by created_at', () => {
  insertJob(db, { id: 'j2', name: 'second', schedule: '0 8 * * *',
    prompt: '<!-- job:j2 -->', enabled: 1, is_builtin: 0 })
  const jobs = listJobs(db)
  expect(jobs.length).toBeGreaterThanOrEqual(2)
})

test('updateJob mutates fields', () => {
  updateJob(db, 'j1', { name: 'renamed', schedule: '0 10 * * *' })
  expect(getJob(db, 'j1').name).toBe('renamed')
})

test('deleteJob removes the row', () => {
  deleteJob(db, 'j2')
  expect(getJob(db, 'j2')).toBeUndefined()
})

test('is_builtin job cannot be deleted', () => {
  insertJob(db, { id: 'builtin', name: 'digest', schedule: '0 8 * * 1',
    prompt: '<!-- job:builtin -->', enabled: 1, is_builtin: 1 })
  expect(() => deleteJob(db, 'builtin')).toThrow('Cannot delete built-in job')
})

test('insertRun and updateRun round-trip', () => {
  insertRun(db, { id: 'r1', job_id: 'j1', started_at: new Date().toISOString(),
    status: 'running' })
  updateRun(db, 'r1', { status: 'success', finished_at: new Date().toISOString(),
    duration_ms: 5000, input_tokens: 100, output_tokens: 200,
    cost_usd: 0.01, output: 'done', error: null })
  const runs = listRuns(db, { jobId: 'j1' })
  expect(runs[0].status).toBe('success')
  expect(runs[0].duration_ms).toBe(5000)
})

test('listRuns with days filter excludes old runs', () => {
  insertRun(db, { id: 'r2', job_id: null, started_at: '2000-01-01T00:00:00Z',
    status: 'success' })
  const recent = listRuns(db, { days: 7 })
  expect(recent.find(r => r.id === 'r2')).toBeUndefined()
})

test('seedBuiltinJobs inserts digest job once and is idempotent', () => {
  seedBuiltinJobs(db)
  seedBuiltinJobs(db) // second call must not throw
  const digest = getJob(db, 'cron-health-digest')
  expect(digest.is_builtin).toBe(1)
  expect(digest.schedule).toBe('0 8 * * 1')
})
