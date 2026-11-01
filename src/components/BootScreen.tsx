import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Brand } from './Brand'

/**
 * Shown while the workspace is loading its data from the local API, and if the
 * API cannot be reached. The demo has no server-side rendering, so this is the
 * first thing a visitor sees — it should feel like part of the product.
 */
export function BootScreen() {
  return (
    <div className="boot" role="status" aria-live="polite">
      <div className="boot__card">
        <Brand />
        <div className="boot__rule" />
        <p className="boot__kicker">தெரு · field intelligence</p>
        <h1 className="boot__title">Opening the demo workspace.</h1>
        <p className="boot__body">Loading synthetic accounts from the local SQLite demo database.</p>
        <div className="boot__bar" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  )
}

export function BootError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="boot" role="alert">
      <div className="boot__card boot__card--error">
        <Brand />
        <div className="boot__rule" />
        <p className="boot__kicker">
          <AlertTriangle size={13} /> Demo API offline
        </p>
        <h1 className="boot__title">The workspace could not load.</h1>
        <p className="boot__body">{message ?? 'The local API did not respond.'}</p>
        <div className="boot__actions">
          <button className="btn btn--sm" onClick={onRetry}>
            <RotateCcw size={14} /> Try again
          </button>
        </div>
        <pre className="boot__cmd">
          <code>npm run dev</code>
        </pre>
        <p className="boot__hint">
          One command starts the API on port 3001 and the app on port 5173. After a production build,{' '}
          <code>npm start</code> serves both from port 3001.
        </p>
      </div>
    </div>
  )
}
