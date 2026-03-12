import { useState } from 'react'
import toast from 'react-hot-toast'
import { addFeed, markOnboardingDone } from '../api'

const SUGGESTED = [
  { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', desc: 'World & UK news' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', desc: 'Tech startup news' },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', desc: 'Developer & tech community' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', desc: 'Consumer tech & culture' },
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', desc: 'Breaking global news' },
]

export default function OnboardingModal({ onDone }) {
  const [added, setAdded] = useState({})       // { url: 'idle'|'loading'|'done'|'error' }
  const [customUrl, setCustomUrl] = useState('')
  const [customLoading, setCustomLoading] = useState(false)

  async function handleAdd(url, key) {
    setAdded(p => ({ ...p, [key]: 'loading' }))
    try {
      await addFeed(url)
      setAdded(p => ({ ...p, [key]: 'done' }))
    } catch (e) {
      setAdded(p => ({ ...p, [key]: 'error' }))
      toast.error(e.response?.data?.detail || 'Could not add feed.')
    }
  }

  async function handleCustom() {
    if (!customUrl.trim()) return
    setCustomLoading(true)
    try {
      await addFeed(customUrl.trim())
      toast.success('Feed added!')
      setCustomUrl('')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not add feed.')
    } finally {
      setCustomLoading(false)
    }
  }

  async function handleGetStarted() {
    await markOnboardingDone()
    onDone()
  }

  const anyAdded = Object.values(added).some(v => v === 'done') || customUrl === ''

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">📰 Welcome to RSS Reader</div>
            <div className="modal-subtitle">Add feeds to get started — click any suggestion or paste a URL.</div>
          </div>
        </div>

        <div className="modal-body">
          {SUGGESTED.map(s => {
            const state = added[s.url] || 'idle'
            return (
              <div key={s.url} className={`suggest-card${state === 'done' ? ' added' : ''}`}>
                <div className="suggest-info">
                  <div className="suggest-name">{s.name}</div>
                  <div className="suggest-desc">{s.desc}</div>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={state === 'loading' || state === 'done'}
                  onClick={() => handleAdd(s.url, s.url)}
                  style={state === 'done' ? { background: '#22c55e', color: 'white', borderColor: '#22c55e' } : {}}
                >
                  {state === 'loading' ? '…' : state === 'done' ? '✓ Added' : state === 'error' ? 'Retry' : '+ Add'}
                </button>
              </div>
            )
          })}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Or paste any website or RSS feed URL:
            </div>
            <div className="input-group">
              <input
                type="url"
                placeholder="https://example.com or https://example.com/feed"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustom()}
              />
              <button className="btn btn-primary" onClick={handleCustom} disabled={customLoading || !customUrl.trim()}>
                {customLoading ? '…' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleGetStarted}>
            Get Started →
          </button>
        </div>
      </div>
    </div>
  )
}
