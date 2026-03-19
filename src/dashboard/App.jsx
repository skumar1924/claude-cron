import { useState, useEffect, useCallback } from 'react'
import { fetchJobs, fetchRuns } from './api.js'
import { Sidebar } from './components/Sidebar.jsx'
import { DetailPanel } from './components/DetailPanel.jsx'
import { JobForm } from './components/JobForm.jsx'

export function App() {
  const [jobs, setJobs] = useState([])
  const [runs, setRuns] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editJob, setEditJob] = useState(null)

  const reload = useCallback(async () => {
    const [j, r] = await Promise.all([fetchJobs(), fetchRuns()])
    setJobs(j)
    setRuns(r)
    if (!selectedId && j.length > 0) setSelectedId(j[0].id)
  }, [selectedId])

  useEffect(() => {
    reload()
    const id = setInterval(reload, 5000)
    return () => clearInterval(id)
  }, [reload])

  const selectedJob = jobs.find(j => j.id === selectedId) ?? null

  function openNew() { setEditJob(null); setShowForm(true) }
  function openEdit(job) { setEditJob(job); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditJob(null) }
  function afterSave() { closeForm(); reload() }

  return (
    <div className="layout">
      <Sidebar
        jobs={jobs}
        selectedId={selectedId}
        onSelect={id => { setSelectedId(id); setShowForm(false) }}
        onNew={openNew}
      />
      <main className="detail">
        {showForm
          ? <JobForm job={editJob} onSave={afterSave} onCancel={closeForm} />
          : <DetailPanel job={selectedJob} runs={runs.filter(r => r.job_id === selectedId)} onEdit={openEdit} onRunComplete={reload} />
        }
      </main>
    </div>
  )
}
