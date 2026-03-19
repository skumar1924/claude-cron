export function DetailPanel({ job, runs, onEdit, onReload }) {
  if (!job) return <div>Select a job</div>
  return <div>{job.name}</div>
}
