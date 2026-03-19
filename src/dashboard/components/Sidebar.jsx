export function Sidebar({ jobs, selectedId, onSelect, onNew }) {
  return (
    <nav>
      {jobs.map(j => <div key={j.id} onClick={() => onSelect(j.id)}>{j.name}</div>)}
      <button onClick={onNew}>+ New Job</button>
    </nav>
  )
}
