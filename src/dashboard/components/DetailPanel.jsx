export function DetailPanel({ job, runs, onEdit, onRunComplete }) {
  if (!job) return <div>Select a job</div>
  return <div>{job.name}</div>
}
