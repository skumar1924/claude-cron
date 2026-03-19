import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JobForm } from '../../src/dashboard/components/JobForm.jsx'

const mockCreateJob = jest.fn()
const mockUpdateJob = jest.fn()

jest.mock('../../src/dashboard/api.js', () => ({
  createJob: (...args) => mockCreateJob(...args),
  updateJob: (...args) => mockUpdateJob(...args),
}))

beforeEach(() => {
  mockCreateJob.mockReset()
  mockUpdateJob.mockReset()
})

test('create mode shows empty fields', () => {
  render(<JobForm onSave={() => {}} onCancel={() => {}} />)
  expect(screen.getByPlaceholderText(/job name/i)).toHaveValue('')
})

test('edit mode pre-fills fields', () => {
  const job = { id: 'j1', name: 'my-job', schedule: '0 9 * * *', prompt: 'do stuff' }
  render(<JobForm job={job} onSave={() => {}} onCancel={() => {}} />)
  expect(screen.getByPlaceholderText(/job name/i)).toHaveValue('my-job')
})

test('shows human-readable schedule preview', () => {
  render(<JobForm onSave={() => {}} onCancel={() => {}} />)
  fireEvent.change(screen.getByPlaceholderText(/cron/i), { target: { value: '0 9 * * *' } })
  expect(screen.getByText(/at 09:00 am/i)).toBeInTheDocument()
})

test('shows invalid cron error', () => {
  render(<JobForm onSave={() => {}} onCancel={() => {}} />)
  fireEvent.change(screen.getByPlaceholderText(/cron/i), { target: { value: 'bad-cron' } })
  expect(screen.getByText(/invalid/i)).toBeInTheDocument()
})

test('calls createJob on submit in create mode', async () => {
  mockCreateJob.mockResolvedValue({ id: 'new' })
  render(<JobForm onSave={() => {}} onCancel={() => {}} />)
  fireEvent.change(screen.getByPlaceholderText(/job name/i), { target: { value: 'test' } })
  fireEvent.change(screen.getByPlaceholderText(/cron/i), { target: { value: '0 9 * * *' } })
  fireEvent.change(screen.getByPlaceholderText(/prompt/i), { target: { value: 'do stuff' } })
  fireEvent.click(screen.getByText('Create Job'))
  await waitFor(() => expect(mockCreateJob).toHaveBeenCalled())
})
