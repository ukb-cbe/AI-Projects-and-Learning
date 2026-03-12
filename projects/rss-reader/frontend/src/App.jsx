import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { getFeeds, getArticles, getSettings, getFilters } from './api'
import { readState } from './utils'

import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'
import ArticleList from './components/ArticleList'
import OnboardingModal from './components/OnboardingModal'
import SettingsModal from './components/SettingsModal'

const DEFAULT_FILTERS = {
  keyword: '',
  unreadOnly: false,
  favoritesOnly: false,
  since: null,
  sinceDays: null,
}

export default function App() {
  const [feeds, setFeeds] = useState([])
  const [articles, setArticles] = useState([])
  const [settings, setSettings] = useState(null)
  const [savedFilters, setSavedFilters] = useState([])
  const [selectedFeedId, setSelectedFeedId] = useState('all')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [, forceUpdate] = useState(0)   // for read/fav re-renders

  const refreshTimerRef = useRef(null)
  const keywordTimerRef = useRef(null)

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const [s, f, sf] = await Promise.all([getSettings(), getFeeds(), getFilters()])
      setSettings(s)
      setFeeds(f)
      setSavedFilters(sf)
      if (!s.onboarding_done) setShowOnboarding(true)
      await loadArticles({ feedId: 'all', filters: DEFAULT_FILTERS })
      scheduleAutoRefresh(s.refresh_interval)
    }
    init()
    return () => clearInterval(refreshTimerRef.current)
  }, [])

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadFeeds() {
    const f = await getFeeds()
    setFeeds(f)
    return f
  }

  async function loadArticles({ feedId = selectedFeedId, filters: f = filters } = {}) {
    setLoading(true)
    try {
      const params = {}
      if (feedId !== 'all') params.feed_id = feedId
      if (f.keyword) params.q = f.keyword
      if (f.since) params.since = f.since
      const data = await getArticles(params)
      setArticles(data)
      setLastRefreshed(new Date())
    } catch (e) {
      toast.error('Failed to load articles.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefreshAll() {
    toast.loading('Refreshing feeds…', { id: 'refresh' })
    try {
      await loadArticles()
      toast.success('Feeds refreshed.', { id: 'refresh' })
    } catch {
      toast.error('Refresh failed.', { id: 'refresh' })
    }
  }

  function scheduleAutoRefresh(minutes) {
    clearInterval(refreshTimerRef.current)
    if (minutes > 0) {
      refreshTimerRef.current = setInterval(() => loadArticles(), minutes * 60 * 1000)
    }
  }

  // ── Feed selection ────────────────────────────────────────────────────────

  function handleSelectFeed(feedId) {
    setSelectedFeedId(feedId)
    loadArticles({ feedId, filters })
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  function handleFiltersChange(next) {
    setFilters(next)
    // Debounce keyword changes, apply others immediately
    clearTimeout(keywordTimerRef.current)
    if (next.keyword !== filters.keyword) {
      keywordTimerRef.current = setTimeout(() => {
        loadArticles({ feedId: selectedFeedId, filters: next })
      }, 280)
    } else {
      loadArticles({ feedId: selectedFeedId, filters: next })
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async function handleSettingsSaved() {
    const s = await getSettings()
    setSettings(s)
    scheduleAutoRefresh(s.refresh_interval)
  }

  // ── Onboarding ────────────────────────────────────────────────────────────

  async function handleOnboardingDone() {
    setShowOnboarding(false)
    await loadFeeds()
    await loadArticles()
  }

  // ── Read state re-render ──────────────────────────────────────────────────

  function handleReadChange() {
    forceUpdate(n => n + 1)
  }

  // ── Format last refreshed ─────────────────────────────────────────────────

  const lastRefreshedStr = lastRefreshed
    ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="layout">
      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar-brand">📰 <span>RSS</span> Reader</span>
        <span className="navbar-spacer" />
        <span className="navbar-meta">Updated {lastRefreshedStr}</span>
        <button
          className="btn btn-ghost"
          style={{ color: '#94a3b8', fontSize: '0.8rem' }}
          onClick={handleRefreshAll}
          disabled={loading}
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
        <button
          className="btn btn-ghost"
          style={{ color: '#94a3b8' }}
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          ⚙
        </button>
      </nav>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        savedFilters={savedFilters}
        onSavedFiltersChange={async () => setSavedFilters(await getFilters())}
      />

      {/* Body: sidebar + articles */}
      <div className="body-area">
        <Sidebar
          feeds={feeds}
          selectedFeedId={selectedFeedId}
          onSelectFeed={handleSelectFeed}
          onFeedsChanged={async () => {
            await loadFeeds()
            await loadArticles()
          }}
          readIds={readState.getAll()}
        />

        <ArticleList
          articles={articles}
          loading={loading}
          filters={filters}
          unreadOnly={filters.unreadOnly}
          favoritesOnly={filters.favoritesOnly}
          onReadChange={handleReadChange}
        />
      </div>

      {/* Modals */}
      {showOnboarding && <OnboardingModal onDone={handleOnboardingDone} />}
      {showSettings && settings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
        />
      )}
    </div>
  )
}
