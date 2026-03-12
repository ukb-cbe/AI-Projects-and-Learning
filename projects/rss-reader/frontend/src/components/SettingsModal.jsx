import { useState } from 'react'
import toast from 'react-hot-toast'
import { saveSettings } from '../api'

export default function SettingsModal({ settings, onClose, onSaved }) {
  const [interval, setInterval] = useState(settings.refresh_interval)
  const [maxArticles, setMaxArticles] = useState(settings.max_articles_per_feed)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await saveSettings({ refresh_interval: interval, max_articles_per_feed: maxArticles })
      toast.success('Settings saved.')
      onSaved()
      onClose()
    } catch {
      toast.error('Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Settings</div>
            <div className="modal-subtitle">Configure your reading experience</div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="settings-row">
            <div>
              <div className="settings-label">Auto-refresh interval</div>
              <div className="settings-desc">How often new articles are fetched (0 = manual only)</div>
            </div>
            <select
              className="settings-select"
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
            >
              <option value={0}>Manual only</option>
              <option value={5}>Every 5 min</option>
              <option value={15}>Every 15 min</option>
              <option value={30}>Every 30 min</option>
              <option value={60}>Every hour</option>
            </select>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-label">Max articles per feed</div>
              <div className="settings-desc">Limits how many articles are loaded per feed</div>
            </div>
            <select
              className="settings-select"
              value={maxArticles}
              onChange={e => setMaxArticles(Number(e.target.value))}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
