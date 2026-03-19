const STATUS_COLOR = { running: '#58a6ff', success: '#3fb950', error: '#f85149', idle: '#8b949e' }
const STATUS_ICON  = { running: '●', success: '●', error: '✕', idle: '○' }

export function Sidebar({ jobs, selectedId, onSelect, onNew }) {
  return (
    <div className="sidebar">
      <div className="sidebar-label">JOBS</div>
      <div className="job-list">
        {jobs.map(job => (
          <div key={job.id}
            className={`job-item ${job.id === selectedId ? 'selected' : ''}`}
            onClick={() => onSelect(job.id)}>
            {job.is_builtin && <span>📊</span>}
            <span className="job-name">{job.name}</span>
            <span style={{ color: STATUS_COLOR[job._lastStatus ?? 'idle'] }}>
              {STATUS_ICON[job._lastStatus ?? 'idle']}
            </span>
          </div>
        ))}
      </div>
      <button className="new-job-btn" onClick={onNew}>+ New Job</button>
    </div>
  )
}
