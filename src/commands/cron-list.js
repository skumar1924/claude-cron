// /cron list — print all jobs inline
import { createDb, listJobs } from '../server/db.js'
import { parseSchedule } from '../server/scheduler.js'
import { homedir } from 'os'
import { join } from 'path'

const db = createDb(join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', 'data.db'))
const jobs = listJobs(db)

if (jobs.length === 0) {
  console.log('No cron jobs defined. Run /cron to open the dashboard and add one.')
} else {
  for (const j of jobs) {
    const status = j.enabled ? '●' : '○'
    const human = parseSchedule(j.schedule)
    console.log(`${status} ${j.name.padEnd(24)} ${j.schedule.padEnd(14)} (${human})`)
  }
}
db.close()
