import { render, screen } from '@testing-library/react'
import { DetailPanel } from '../../src/dashboard/components/DetailPanel.jsx'

jest.mock('../../src/dashboard/api.js', () => ({
  runJob: () => Promise.resolve(),
  deleteJob: () => Promise.resolve(),
}))

const job = { id: 'j1', name: 'daily-report', schedule: '0 9 * * *', is_builtin: 0 }
const runs = [
  { id: 'r1', job_id: 'j1', status: 'success', started_at: '2026-03-19T09:00:00Z',
    duration_ms: 134000, input_tokens: 1000, output_tokens: 500, cost_usd: 0.03, output: 'done' },
  { id: 'r2', job_id: 'j1', status: 'error', started_at: '2026-03-18T09:00:00Z',
    duration_ms: 12000, input_tokens: 100, output_tokens: 50, cost_usd: 0.00, error: 'timeout' },
]

test('shows job name and schedule', () => {
  render(<DetailPanel job={job} runs={runs} onEdit={() => {}} onReload={() => {}} />)
  expect(screen.getByText('daily-report')).toBeInTheDocument()
  expect(screen.getByText(/every day/i)).toBeInTheDocument()
})

test('shows success rate metric', () => {
  render(<DetailPanel job={job} runs={runs} onEdit={() => {}} onReload={() => {}} />)
  expect(screen.getByText('50%')).toBeInTheDocument()
})

test('shows run history rows', () => {
  render(<DetailPanel job={job} runs={runs} onEdit={() => {}} onReload={() => {}} />)
  expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(2)
})

test('no job selected shows placeholder', () => {
  render(<DetailPanel job={null} runs={[]} onEdit={() => {}} onReload={() => {}} />)
  expect(screen.getByText(/select a job/i)).toBeInTheDocument()
})
