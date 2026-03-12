import { useState } from 'react'
import toast from 'react-hot-toast'
import { addFeed } from '../api'

export default function AddFeedModal({ onClose, onAdded }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')  // status message shown below input

  async function handleAdd() {
    const trimmed = url.trim()
    if (!trimmed) return
    setLoading(true)
    setStatus('Detecting feed…')
    try {
      const feed = await addFeed(trimmed)
      toast.success(`"${feed.title}" added!`)
      onAdded(feed)
      onClose()
    } catch (e) {
      const msg = e.response?.data?.detail || 'Could not add feed.'
      setStatus('')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Add a Feed</div>
            <div className="modal-subtitle">Paste any website or RSS feed URL</div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="input-group" style={{ marginTop: 0 }}>
            <input
              autoFocus
              type="url"
              placeholder="https://nytimes.com  or  https://example.com/feed.xml"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
          </div>
          {status && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
              {status}
            </div>
          )}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10 }}>
            Works with regular websites (auto-detects RSS) and direct feed URLs.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={loading || !url.trim()}>
            {loading ? 'Adding…' : 'Add Feed'}
          </button>
        </div>
      </div>
    </div>
  )
}
