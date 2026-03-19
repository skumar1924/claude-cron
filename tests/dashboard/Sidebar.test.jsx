import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../../src/dashboard/components/Sidebar.jsx'

const jobs = [
  { id: 'j1', name: 'daily-report', is_builtin: 0, enabled: 1, _lastStatus: 'success' },
  { id: 'digest', name: 'cron-health-digest', is_builtin: 1, enabled: 1, _lastStatus: 'idle' },
]

test('renders all job names', () => {
  render(<Sidebar jobs={jobs} selectedId="j1" onSelect={() => {}} onNew={() => {}} />)
  expect(screen.getByText('daily-report')).toBeInTheDocument()
  expect(screen.getByText('cron-health-digest')).toBeInTheDocument()
})

test('calls onSelect when job clicked', () => {
  const onSelect = jest.fn()
  render(<Sidebar jobs={jobs} selectedId="j1" onSelect={onSelect} onNew={() => {}} />)
  fireEvent.click(screen.getByText('daily-report'))
  expect(onSelect).toHaveBeenCalledWith('j1')
})

test('calls onNew when + New Job clicked', () => {
  const onNew = jest.fn()
  render(<Sidebar jobs={jobs} selectedId="j1" onSelect={() => {}} onNew={onNew} />)
  fireEvent.click(screen.getByText('+ New Job'))
  expect(onNew).toHaveBeenCalled()
})

test('builtin job shows 📊 icon', () => {
  render(<Sidebar jobs={jobs} selectedId="j1" onSelect={() => {}} onNew={() => {}} />)
  expect(screen.getByText('📊')).toBeInTheDocument()
})
