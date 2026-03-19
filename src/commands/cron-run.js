// /cron run <id> — manually trigger a job
const jobId = process.argv[2]
if (!jobId) { console.error('Usage: /cron run <job-id>'); process.exit(1) }

const PORT = 52141
const res = await fetch(`http://localhost:${PORT}/api/jobs/${jobId}/run`, { method: 'POST' })

if (res.status === 404) { console.error(`Job '${jobId}' not found.`); process.exit(1) }
if (res.status === 202) { console.log(`Job '${jobId}' triggered. Check the dashboard for status.`) }
else { console.error(`Unexpected response: ${res.status}`); process.exit(1) }
