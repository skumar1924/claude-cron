import { injectJobTag, extractJobId, parseSchedule,
         syncJobToSettings, removeJobFromSettings } from '../src/server/scheduler.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'

test('injectJobTag appends tag to prompt', () => {
  expect(injectJobTag('do stuff', 'abc')).toBe('do stuff\n<!-- job:abc -->')
})

test('injectJobTag replaces existing tag', () => {
  expect(injectJobTag('do stuff\n<!-- job:old -->', 'new')).toBe('do stuff\n<!-- job:new -->')
})

test('extractJobId returns null when tag absent', () => {
  expect(extractJobId('no tag here')).toBeNull()
})

test('extractJobId returns id when tag present', () => {
  expect(extractJobId('prompt\n<!-- job:abc123 -->')).toBe('abc123')
})

test('parseSchedule returns human-readable string', () => {
  expect(parseSchedule('0 9 * * *')).toMatch(/9:00 AM/i)
})

test('parseSchedule throws on invalid cron', () => {
  expect(() => parseSchedule('not-a-cron')).toThrow()
})

describe('settings.json sync', () => {
  const settingsPath = join(tmpdir(), `settings-${Date.now()}.json`)
  beforeEach(() => writeFileSync(settingsPath, JSON.stringify({ scheduledTasks: [] })))
  afterAll(() => unlinkSync(settingsPath))

  test('syncJobToSettings adds new entry', () => {
    syncJobToSettings({ id: 'j1', name: 'test', schedule: '0 9 * * *',
      prompt: 'do stuff\n<!-- job:j1 -->' }, settingsPath)
    const s = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(s.scheduledTasks).toHaveLength(1)
    expect(s.scheduledTasks[0].schedule).toBe('0 9 * * *')
  })

  test('syncJobToSettings replaces existing entry by id', () => {
    syncJobToSettings({ id: 'j1', name: 'test', schedule: '0 9 * * *',
      prompt: 'v1\n<!-- job:j1 -->' }, settingsPath)
    syncJobToSettings({ id: 'j1', name: 'test', schedule: '0 10 * * *',
      prompt: 'v2\n<!-- job:j1 -->' }, settingsPath)
    const s = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(s.scheduledTasks).toHaveLength(1)
    expect(s.scheduledTasks[0].schedule).toBe('0 10 * * *')
  })

  test('removeJobFromSettings removes the entry', () => {
    syncJobToSettings({ id: 'j1', name: 'test', schedule: '0 9 * * *',
      prompt: '<!-- job:j1 -->' }, settingsPath)
    removeJobFromSettings('j1', settingsPath)
    const s = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(s.scheduledTasks).toHaveLength(0)
  })
})
