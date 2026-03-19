import { render, screen, waitFor } from '@testing-library/react'
import { App } from '../../src/dashboard/App.jsx'

jest.mock('../../src/dashboard/api.js', () => ({
  fetchJobs: () => Promise.resolve([
    { id: 'j1', name: 'daily-report', schedule: '0 9 * * *', enabled: 1, is_builtin: 0 }
  ]),
  fetchRuns: () => Promise.resolve([]),
}))

test('renders job list from API', async () => {
  render(<App />)
  await waitFor(() => expect(screen.getAllByText('daily-report')[0]).toBeInTheDocument())
})
