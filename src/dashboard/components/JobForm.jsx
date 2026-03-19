import { useState } from 'react'
import cronstrue from 'cronstrue'
import { createJob, updateJob } from '../api.js'

export function JobForm({ job, onSave, onCancel }) {
  const isEdit = !!job
  const [name, setName] = useState(job?.name ?? '')
  const [schedule, setSchedule] = useState(job?.schedule ?? '')
  const [prompt, setPrompt] = useState(
    job?.prompt?.replace(/\n<!-- job:[^\s>]+ -->$/, '') ?? ''
  )
  const [preview, setPreview] = useState('')
  const [scheduleError, setScheduleError] = useState('')

  function handleScheduleChange(val) {
    setSchedule(val)
    try {
      setPreview(cronstrue.toString(val))
      setScheduleError('')
    } catch {
      setPreview('')
      setScheduleError('Invalid cron expression')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (scheduleError) return
    const body = { name, schedule, prompt }
    isEdit ? await updateJob(job.id, body) : await createJob(body)
    onSave()
  }

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <h2>{isEdit ? 'Edit Job' : 'New Job'}</h2>
      <label>Name
        <input placeholder="job name" value={name}
          onChange={e => setName(e.target.value)} required />
      </label>
      <label>Schedule
        <input placeholder="cron expression e.g. 0 9 * * *" value={schedule}
          onChange={e => handleScheduleChange(e.target.value)} required />
        {preview && <span className="cron-preview">{preview}</span>}
        {scheduleError && <span className="cron-error">{scheduleError}</span>}
      </label>
      <label>Prompt
        <textarea placeholder="prompt for Claude..." value={prompt}
          onChange={e => setPrompt(e.target.value)} required rows={6} />
      </label>
      <div className="form-actions">
        <button type="submit">{isEdit ? 'Save Changes' : 'Create Job'}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
