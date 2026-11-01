// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from '../../src/App'
import { spawnApiServer, type SpawnedServer } from '../spawnServer'
import { setApiBase } from '../setup'

let server: SpawnedServer

beforeAll(async () => {
  server = await spawnApiServer()
  setApiBase(server.baseUrl)
}, 30_000)

afterAll(async () => {
  setApiBase(undefined)
  await server.stop()
}, 15_000)

beforeEach(async () => {
  // A clean workspace for every test keeps assertions deterministic.
  await fetch('/api/workspace/reset', { method: 'POST' })
  window.history.pushState({}, '', '/')
})

afterEach(() => {
  cleanup()
})

async function apiWorkspace() {
  const res = await fetch('/api/workspace')
  const body = (await res.json()) as { data: { saved: string[]; stages: Record<string, string>; notes: Record<string, string> } }
  return body.data
}

describe('workspace boot', () => {
  it('shows a loading state, then the landing page from API data', async () => {
    render(<App />)

    // Loading state is shown before the bootstrap request resolves.
    expect(screen.getByText(/Opening the demo workspace/i)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText(/Know the street/i)).toBeInTheDocument(), { timeout: 8000 })
    expect(screen.getAllByText('421').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/1,246|1246/).length).toBeGreaterThan(0)
  }, 15_000)
})

describe('prospects → save → pipeline', () => {
  it('saves an account through the API and survives a reload', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/app/prospects')
    render(<App />)

    await waitFor(() => expect(screen.getByText('KRS Home Textiles')).toBeInTheDocument(), { timeout: 8000 })

    // KRS Home Textiles (TH-1006) starts unsaved.
    let workspace = await apiWorkspace()
    expect(workspace.saved).not.toContain('TH-1006')

    const row = screen.getByText('KRS Home Textiles').closest('.prospect-row') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /Save to list/i }))

    await waitFor(async () => {
      workspace = await apiWorkspace()
      expect(workspace.saved).toContain('TH-1006')
    })

    // A fresh mount (i.e. a refresh) reads the saved state back from SQLite.
    cleanup()
    render(<App />)
    await waitFor(() => expect(screen.getByText('KRS Home Textiles')).toBeInTheDocument(), { timeout: 8000 })
    const refreshedRow = screen.getByText('KRS Home Textiles').closest('.prospect-row') as HTMLElement
    await waitFor(() =>
      expect(within(refreshedRow).getByRole('button', { name: /Remove from list/i })).toBeInTheDocument(),
    )
  }, 20_000)

  it('filters through the API and reports the filtered total', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/app/prospects')
    render(<App />)

    await waitFor(() => expect(screen.getByText(/Every account/i)).toBeInTheDocument(), { timeout: 8000 })
    await waitFor(() => expect(screen.getByText('421')).toBeInTheDocument())

    await user.type(screen.getByRole('textbox', { name: /Search accounts/i }), 'Anandhaa')

    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getByText('Anandhaa Knitwear')).toBeInTheDocument()
    expect(screen.queryByText('KRS Home Textiles')).not.toBeInTheDocument()
  }, 20_000)
})

describe('pipeline board', () => {
  it('moves a card to another stage and persists it', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/app/list')
    render(<App />)

    await waitFor(() => expect(screen.getByText(/The conversations in motion/i)).toBeInTheDocument(), { timeout: 8000 })
    await waitFor(() => expect(screen.getAllByText('Vanathi Technologies').length).toBeGreaterThan(0))

    const card = screen.getAllByText('Vanathi Technologies')[0].closest('.kanban-card, li, article') as HTMLElement
    const next = within(card ?? document.body).getAllByRole('button')[0]
    // The card exposes "move forward"/"move back" controls; the first one that
    // is enabled moves it along the pipeline.
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.kanban-card button')).filter(
      (b) => b.getAttribute('aria-label')?.match(/move/i),
    )
    expect(buttons.length).toBeGreaterThan(0)
    const forward = buttons.find((b) => !b.disabled) ?? next
    await user.click(forward)

    await waitFor(async () => {
      const workspace = await apiWorkspace()
      expect(['contacted', 'meeting', 'customer']).toContain(workspace.stages['TH-1003'])
    })
  }, 20_000)
})

describe('account drawer notes', () => {
  it('saves a note to the API', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/app?account=TH-1010')
    render(<App />)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument(), { timeout: 8000 })

    const box = await screen.findByPlaceholderText(/What did you learn/i)
    await user.clear(box)
    await user.type(box, 'Confirmed the compliance cycle; call back in March.')
    await user.click(screen.getByRole('button', { name: /Save note/i }))

    await waitFor(async () => {
      const workspace = await apiWorkspace()
      expect(workspace.notes['TH-1010']).toMatch(/call back in March/i)
    })
  }, 20_000)
})
