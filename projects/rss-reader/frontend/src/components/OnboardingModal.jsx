import { useState } from 'react'
import toast from 'react-hot-toast'
import { addFeed, markOnboardingDone } from '../api'

const SUGGESTED = [
  { name: 'BBC News',     url: 'https://feeds.bbci.co.uk/news/rss.xml',         desc: 'World & UK news',          hue: 210 },
  { name: 'TechCrunch',  url: 'https://techcrunch.com/feed/',                   desc: 'Tech startup news',        hue: 18  },
  { name: 'Hacker News', url: 'https://news.ycombinator.com/rss',               desc: 'Developer community',      hue: 35  },
  { name: 'The Verge',   url: 'https://www.theverge.com/rss/index.xml',         desc: 'Consumer tech & culture',  hue: 270 },
  { name: 'Reuters',     url: 'https://feeds.reuters.com/reuters/topNews',       desc: 'Breaking global news',     hue: 0   },
  { name: 'Ars Technica',url: 'https://feeds.arstechnica.com/arstechnica/index', desc: 'In-depth tech journalism', hue: 195 },
]

function feedColor(hue) {
  return `hsl(${hue}, 50%, 42%)`
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function OnboardingModal({ onDone }) {
  const [added, setAdded]               = useState({})
  const [customUrl, setCustomUrl]       = useState('')
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

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        {/* Hero header */}
        <div className="onboarding-hero">
          <div className="onboarding-logo">📰</div>
          <div className="onboarding-title">Welcome to Feedline</div>
          <div className="onboarding-subtitle">
            Your personal news command center. Add feeds below to get started — or paste any website URL.
          </div>
        </div>

        <div className="modal-body">
          <div className="suggest-section-title">Popular Sources</div>

          {SUGGESTED.map(s => {
            const state = added[s.url] || 'idle'
            return (
              <div key={s.url} className={`suggest-card${state === 'done' ? ' added' : ''}`}>
                <div
                  className="suggest-avatar"
                  style={{ background: state === 'done' ? 'var(--success)' : feedColor(s.hue) }}
                >
                  {state === 'done' ? '✓' : initials(s.name)}
                </div>
                <div className="suggest-info">
                  <div className="suggest-name">{s.name}</div>
                  <div className="suggest-desc">{s.desc}</div>
                </div>
                <button
                  className={`btn btn-sm ${state === 'done' ? 'btn-ghost' : 'btn-outline'}`}
                  disabled={state === 'loading' || state === 'done'}
                  onClick={() => handleAdd(s.url, s.url)}
                  style={state === 'done' ? { color: 'var(--success)', cursor: 'default' } : {}}
                >
                  {state === 'loading' ? '…' : state === 'done' ? 'Added' : state === 'error' ? 'Retry' : '+ Add'}
                </button>
              </div>
            )
          })}

          {/* Custom URL */}
          <div className="suggest-section-title">Add Any Feed</div>
          <div className="input-group" style={{ marginTop: 0 }}>
            <input
              className="input"
              type="url"
              placeholder="Paste any website or RSS feed URL…"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustom()}
            />
            <button
              className="btn btn-primary"
              onClick={handleCustom}
              disabled={customLoading || !customUrl.trim()}
            >
              {customLoading ? '…' : 'Add'}
            </button>
          </div>
          <div className="input-hint">
            Works with regular websites (auto-detects RSS) and direct feed URLs like example.com/feed.xml
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleGetStarted}>
            Skip
          </button>
          <button className="btn btn-primary" onClick={handleGetStarted}>
            Start Reading →
          </button>
        </div>
      </div>
    </div>
  )
}
