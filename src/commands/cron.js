// /cron — ensure server is running, open dashboard
import { PORT } from '../server/index.js'
import { homedir } from 'os'
import { join } from 'path'
import { spawn } from 'child_process'
import open from 'open'

const SERVER_PATH = join(homedir(), '.claude', 'plugins', 'local', 'claude-cron', 'server', 'index.js')
const URL = `http://localhost:${PORT}`

async function isAlive() {
  try {
    const r = await fetch(`${URL}/api/jobs`, { signal: AbortSignal.timeout(1000) })
    return r.ok
  } catch { return false }
}

async function startServer() {
  // spawn with explicit args array — no shell involved
  spawn('node', [SERVER_PATH], { detached: true, stdio: 'ignore' }).unref()
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 500))
    if (await isAlive()) return true
  }
  return false
}

const alive = await isAlive()
if (!alive) {
  process.stdout.write('Starting claude-cron server...\n')
  const ok = await startServer()
  if (!ok) {
    process.stderr.write('Failed to start claude-cron server. Check logs.\n')
    process.exit(1)
  }
}
await open(URL)
process.stdout.write(`Dashboard open at ${URL}\n`)
