import { handleSessionStart } from '../src/hooks/session-start.js'
import { handleSessionStop } from '../src/hooks/session-stop.js'
import { createDb, insertJob, listRuns } from '../src/server/db.js'
import { tmpdir } from 'os'; import { join } from 'path'; import { unlinkSync } from 'fs'

const dbPath = join(tmpdir(), `hooks-test-${Date.now()}.db`)
let db

beforeAll(() => {
  db = createDb(dbPath)
  insertJob(db, { id: 'j1', name: 'test', schedule: '0 9 * * *',
    prompt: 'do stuff\n<!-- job:j1 -->', enabled: 1, is_builtin: 0 })
})
afterAll(() => { db.close(); unlinkSync(dbPath) })

test('handleSessionStart creates a running run for known job tag', () => {
  const runId = handleSessionStart(db, {
    prompt: 'do stuff\n<!-- job:j1 -->',
    startedAt: new Date().toISOString(),
  })
  expect(runId).toBeTruthy()
  const runs = listRuns(db, { jobId: 'j1' })
  expect(runs[0].status).toBe('running')
})

test('handleSessionStart returns null for untagged prompt', () => {
  const runId = handleSessionStart(db, {
    prompt: 'a regular session',
    startedAt: new Date().toISOString(),
  })
  expect(runId).toBeNull()
})

test('handleSessionStop marks the run completed', () => {
  // Create a running run first
  handleSessionStart(db, { prompt: 'do stuff\n<!-- job:j1 -->', startedAt: new Date().toISOString() })
  handleSessionStop(db, { exitCode: 0, output: 'all done',
    usage: { inputTokens: 100, outputTokens: 50, costUsd: 0.01 } })
  const runs = listRuns(db, { jobId: 'j1' })
  expect(runs[0].status).toBe('success')
  expect(runs[0].output).toBe('all done')
})

test('handleSessionStop marks error on non-zero exit code', () => {
  handleSessionStart(db, { prompt: 'do stuff\n<!-- job:j1 -->', startedAt: new Date().toISOString() })
  handleSessionStop(db, { exitCode: 1, output: 'something broke', usage: {} })
  const runs = listRuns(db, { jobId: 'j1' })
  expect(runs[0].status).toBe('error')
})
