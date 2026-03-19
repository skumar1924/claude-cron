import request from 'supertest'
import { createTestServer } from '../src/server/index.js'
import { createDb } from '../src/server/db.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { unlinkSync } from 'fs'

const dbPath = join(tmpdir(), `server-test-${Date.now()}.db`)
let app, db

beforeAll(() => {
  db = createDb(dbPath)
  app = createTestServer(db)
})
afterAll(() => { db.close(); unlinkSync(dbPath) })

test('GET /api/jobs returns empty array initially', async () => {
  const res = await request(app).get('/api/jobs')
  expect(res.status).toBe(200)
  expect(res.body).toEqual([])
})

test('POST /api/jobs creates a job', async () => {
  const res = await request(app).post('/api/jobs').send({
    name: 'my-job', schedule: '0 9 * * *', prompt: 'do stuff'
  })
  expect(res.status).toBe(201)
  expect(res.body.id).toBeTruthy()
  expect(res.body.prompt).toContain('<!-- job:')
})

test('PUT /api/jobs/:id updates a job', async () => {
  const create = await request(app).post('/api/jobs').send({
    name: 'old', schedule: '0 9 * * *', prompt: 'old prompt'
  })
  const id = create.body.id
  const res = await request(app).put(`/api/jobs/${id}`).send({ name: 'new' })
  expect(res.status).toBe(200)
  expect(res.body.name).toBe('new')
})

test('DELETE /api/jobs/:id removes a job', async () => {
  const create = await request(app).post('/api/jobs').send({
    name: 'bye', schedule: '0 9 * * *', prompt: 'bye'
  })
  const id = create.body.id
  const del = await request(app).delete(`/api/jobs/${id}`)
  expect(del.status).toBe(204)
  const list = await request(app).get('/api/jobs')
  expect(list.body.find(j => j.id === id)).toBeUndefined()
})

test('GET /api/runs returns run history', async () => {
  const res = await request(app).get('/api/runs?days=7')
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body)).toBe(true)
})

test('DELETE /api/jobs/:id on builtin returns 403', async () => {
  db.prepare(`INSERT INTO jobs (id, name, schedule, prompt, is_builtin)
              VALUES ('builtin', 'digest', '0 8 * * 1', 'x', 1)`).run()
  const res = await request(app).delete('/api/jobs/builtin')
  expect(res.status).toBe(403)
})

test('PUT /api/jobs/:id on unknown id returns 404', async () => {
  const res = await request(app).put('/api/jobs/does-not-exist').send({ name: 'x' })
  expect(res.status).toBe(404)
})
