const BASE = 'http://localhost:52141'

export const fetchJobs = () => fetch(`${BASE}/api/jobs`).then(r => r.json())
export const fetchRuns = (params = {}) => {
  const q = new URLSearchParams(params).toString()
  return fetch(`${BASE}/api/runs?${q}`).then(r => r.json())
}
export const createJob = body =>
  fetch(`${BASE}/api/jobs`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
export const updateJob = (id, body) =>
  fetch(`${BASE}/api/jobs/${id}`, { method: 'PUT',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
export const deleteJob = id =>
  fetch(`${BASE}/api/jobs/${id}`, { method: 'DELETE' })
export const runJob = id =>
  fetch(`${BASE}/api/jobs/${id}/run`, { method: 'POST' })
