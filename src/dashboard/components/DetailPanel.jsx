import cronstrue from 'cronstrue'
import { RunRow } from './RunRow.jsx'
import { runJob, deleteJob } from '../api.js'

function avgOf(runs, key) {
  const vals = runs.map(r => r[key]).filter(v => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export function DetailPanel({ job, runs, onEdit, onReload }) {
  if (!job) return <div className="detail-panel empty">Select a job to see details</div>

  const successCount = runs.filter(r => r.status === 'success').length
  const successRate = runs.length ? Math.round((successCount / runs.length) * 100) : null

  const avgDur  = avgOf(runs, 'duration_ms')
  const avgIn   = avgOf(runs, 'input_tokens')
  const avgOut  = avgOf(runs, 'output_tokens')
  const avgCost = avgOf(runs, 'cost_usd')

  const isDigest = job.id === 'cron-health-digest'
  const latestOutput = runs[0]?.output

  let humanSchedule = ''
  try { humanSchedule = cronstrue.toString(job.schedule, { verbose: true }) } catch { humanSchedule = job.schedule }

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <h2>{job.name}</h2>
          <span className="schedule-label">{job.schedule} · {humanSchedule}</span>
        </div>
        <div className="header-actions">
          {!job.is_builtin && <button onClick={onEdit}>edit</button>}
          <button onClick={() => runJob(job.id).then(onReload)}>▶ run</button>
          {!job.is_builtin && (
            <button className="danger" onClick={() => deleteJob(job.id).then(onReload)}>delete</button>
          )}
        </div>
      </div>

      {isDigest && latestOutput ? (
        <div className="digest-output">{latestOutput}</div>
      ) : (
        <>
          <div className="metrics">
            <div className="metric-card">
              <label>AVG DURATION</label>
              <span>{avgDur != null ? fmtDuration(avgDur) : '—'}</span>
            </div>
            <div className="metric-card">
              <label>SUCCESS RATE</label>
              <span>{successRate != null ? `${successRate}%` : '—'}</span>
            </div>
            <div className="metric-card">
              <label>AVG TOKENS</label>
              <span>{avgIn != null ? `${(((avgIn ?? 0) + (avgOut ?? 0)) / 1000).toFixed(1)}k` : '—'}</span>
            </div>
            <div className="metric-card">
              <label>AVG COST</label>
              <span>{avgCost != null ? `$${avgCost.toFixed(4)}` : '—'}</span>
            </div>
          </div>

          <table className="runs-table">
            <thead>
              <tr><th>Time</th><th>Duration</th><th>Tokens</th><th>Cost</th><th></th></tr>
            </thead>
            <tbody>
              {runs.map(r => <RunRow key={r.id} run={r} />)}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function fmtDuration(ms) {
  if (!ms) return '—'
  return ms >= 60000
    ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
    : `${Math.round(ms / 1000)}s`
}
