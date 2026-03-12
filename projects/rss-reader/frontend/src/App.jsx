import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getFeeds, getArticles, getSettings, getFilters } from './api'
import { readState } from './utils'

import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'
import ArticleList from './components/ArticleList'
import ReadingPane from './components/ReadingPane'
import OnboardingModal from './components/OnboardingModal'
import SettingsModal from './components/SettingsModal'

const DEFAULT_FILTERS = {
  keyword: '',
  unreadOnly: false,
  favoritesOnly: false,
  since: null,
  sinceDays: null,
}

const SIDEBAR_DEFAULT  = 244
const READING_DEFAULT  = 400
const SIDEBAR_MIN      = 160
const SIDEBAR_MAX      = 420
const READING_MIN      = 280
const READING_MAX      = 600

export default function App() {
  const [feeds, setFeeds]               = useState([])
  const [articles, setArticles]         = useState([])
  const [settings, setSettings]         = useState(null)
  const [savedFilters, setSavedFilters] = useState([])
  const [selectedFeedId, setSelectedFeedId] = useState('all')
  const [filters, setFilters]           = useState(DEFAULT_FILTERS)
  const [loading, setLoading]           = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [, forceUpdate]                 = useState(0)

  // ── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('fl-theme') || 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fl-theme', theme)
  }, [theme])
  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  // ── Resizable panes ──────────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [readingWidth, setReadingWidth] = useState(READING_DEFAULT)
  const [draggingHandle, setDraggingHandle] = useState(null) // 'sidebar' | 'reading' | null

  function startResize(e, type) {
    e.preventDefault()
    const startX      = e.clientX
    const startSidebar = sidebarWidth
    const startReading = readingWidth
    setDraggingHandle(type)

    function onMove(e) {
      const delta = e.clientX - startX
      if (type === 'sidebar') {
        setSidebarWidth(Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startSidebar + delta)))
      } else {
        setReadingWidth(Math.max(READING_MIN, Math.min(READING_MAX, startReading - delta)))
      }
    }
    function onUp() {
      setDraggingHandle(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const refreshTimerRef = useRef(null)
  const keywordTimerRef = useRef(null)

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
    } catch {
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

  function handleSelectFeed(feedId) {
    setSelectedFeedId(feedId)
    setSelectedArticle(null)
    loadArticles({ feedId, filters })
  }

  function handleFiltersChange(next) {
    setFilters(next)
    setSelectedArticle(null)
    clearTimeout(keywordTimerRef.current)
    if (next.keyword !== filters.keyword) {
      keywordTimerRef.current = setTimeout(() => {
        loadArticles({ feedId: selectedFeedId, filters: next })
      }, 280)
    } else {
      loadArticles({ feedId: selectedFeedId, filters: next })
    }
  }

  async function handleSettingsSaved() {
    const s = await getSettings()
    setSettings(s)
    scheduleAutoRefresh(s.refresh_interval)
  }

  async function handleOnboardingDone() {
    setShowOnboarding(false)
    await loadFeeds()
    await loadArticles()
  }

  function handleReadChange() {
    forceUpdate(n => n + 1)
  }

  const lastRefreshedStr = lastRefreshed
    ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">📰</div>
          <span className="brand-name">Feed<span className="brand-dot">line</span></span>
        </div>
        <div className="navbar-spacer" />
        <span className="navbar-meta">Updated {lastRefreshedStr}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleRefreshAll}
          disabled={loading}
          title="Refresh all feeds"
        >
          {loading ? '…' : '↺ Refresh'}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ fontSize: '1rem' }}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        <button
          className="btn btn-ghost btn-sm"
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

      {/* Body: sidebar + resize + articles + resize + reading pane */}
      <div className="body-area">
        <Sidebar
          feeds={feeds}
          selectedFeedId={selectedFeedId}
          onSelectFeed={handleSelectFeed}
          onFeedsChanged={async () => { await loadFeeds(); await loadArticles() }}
          readIds={readState.getAll()}
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
        />

        <div
          className={`resize-handle${draggingHandle === 'sidebar' ? ' dragging' : ''}`}
          onMouseDown={e => startResize(e, 'sidebar')}
          title="Drag to resize sidebar"
        />

        <ArticleList
          articles={articles}
          loading={loading}
          filters={filters}
          unreadOnly={filters.unreadOnly}
          favoritesOnly={filters.favoritesOnly}
          selectedArticleId={selectedArticle?.id}
          onSelectArticle={setSelectedArticle}
          onReadChange={handleReadChange}
        />

        <div
          className={`resize-handle${draggingHandle === 'reading' ? ' dragging' : ''}`}
          onMouseDown={e => startResize(e, 'reading')}
          title="Drag to resize reading pane"
        />

        <ReadingPane
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onReadChange={handleReadChange}
          style={{ width: readingWidth, minWidth: readingWidth }}
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
