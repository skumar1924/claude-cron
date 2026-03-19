import { readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import cronstrue from 'cronstrue'
import cronParser from 'cron-parser'

const DEFAULT_SETTINGS = join(homedir(), '.claude', 'settings.json')

export function injectJobTag(prompt, jobId) {
  const clean = prompt
    .replace(/^<!-- job:[^\s>]+ -->\n?/, '')  // strip from start
    .replace(/\n<!-- job:[^\s>]+ -->$/, '')   // strip from end
  return `${clean}\n<!-- job:${jobId} -->`
}

export function extractJobId(prompt) {
  const match = prompt?.match(/<!-- job:([^\s>]+) -->/)
  return match ? match[1] : null
}

export function parseSchedule(cron) {
  cronParser.parseExpression(cron) // throws if invalid
  return cronstrue.toString(cron)
}

function readSettings(path = DEFAULT_SETTINGS) {
  try {
    const s = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(s.scheduledTasks)) s.scheduledTasks = []
    return s
  } catch {
    return { scheduledTasks: [] }
  }
}

function writeSettings(settings, path = DEFAULT_SETTINGS) {
  writeFileSync(path, JSON.stringify(settings, null, 2))
}

export function syncJobToSettings(job, settingsPath = DEFAULT_SETTINGS) {
  const settings = readSettings(settingsPath)
  settings.scheduledTasks = settings.scheduledTasks.filter(t => t._claudeCronId !== job.id)
  settings.scheduledTasks.push({
    _claudeCronId: job.id,
    schedule: job.schedule,
    prompt: job.prompt,
  })
  writeSettings(settings, settingsPath)
}

export function removeJobFromSettings(jobId, settingsPath = DEFAULT_SETTINGS) {
  const settings = readSettings(settingsPath)
  settings.scheduledTasks = settings.scheduledTasks.filter(t => t._claudeCronId !== jobId)
  writeSettings(settings, settingsPath)
}
