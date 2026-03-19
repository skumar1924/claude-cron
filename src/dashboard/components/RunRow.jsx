import { useState } from 'react'

function fmtDuration(ms) {
  if (!ms) return '—'
  return ms >= 60000
    ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
    : `${Math.round(ms / 1000)}s`
}

export function RunRow({ run }) {
  const [expanded, setExpanded] = useState(false)
  const isError = run.status === 'error'
  const text = isError ? run.error : run.output
  const tokens = (run.input_tokens ?? 0) + (run.output_tokens ?? 0)

  return (
    <>
      <tr className={`run-row ${run.status}`}>
        <td>{isError ? '✕' : '✓'} {new Date(run.started_at).toLocaleString()}</td>
        <td>{fmtDuration(run.duration_ms)}</td>
        <td>{tokens ? `${(tokens / 1000).toFixed(1)}k` : '—'}</td>
        <td>{run.cost_usd != null ? `$${run.cost_usd.toFixed(4)}` : '—'}</td>
        <td>
          {text && (
            <button className="link-btn" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'hide' : isError ? 'view error' : 'view output'}
            </button>
          )}
        </td>
      </tr>
      {expanded && text && (
        <tr><td colSpan={5}><pre className="run-output">{text}</pre></td></tr>
      )}
    </>
  )
}
