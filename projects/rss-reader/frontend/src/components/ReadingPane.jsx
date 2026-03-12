import { useState, useEffect, useRef } from 'react'
import { relativeTime, readState, favState } from '../utils'
import { getArticleContent } from '../api'

// Simple in-memory cache so re-selecting the same article doesn't re-fetch
const contentCache = new Map()

export default function ReadingPane({ article, onClose, onReadChange, style }) {
  const [isRead, setIsRead]         = useState(false)
  const [isFav, setIsFav]           = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [content, setContent]       = useState(null)   // fetched HTML
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError]     = useState(false)
  const abortRef = useRef(null)

  // When article changes: reset state, auto-mark read, fetch full content
  useEffect(() => {
    setContent(null)
    setContentError(false)
    setFullscreen(false)

    if (!article) return

    setIsRead(readState.isRead(article.id))
    setIsFav(favState.isFav(article.id))

    if (!readState.isRead(article.id)) {
      readState.markRead(article.id)
      setIsRead(true)
      onReadChange()
    }

    // Check cache first
    if (contentCache.has(article.link)) {
      setContent(contentCache.get(article.link))
      return
    }

    // Abort any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setContentLoading(true)
    getArticleContent(article.link)
      .then(data => {
        if (controller.signal.aborted) return
        contentCache.set(article.link, data.html)
        setContent(data.html)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setContentError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setContentLoading(false)
      })

    return () => controller.abort()
  }, [article?.id])

  // Escape to exit fullscreen
  useEffect(() => {
    if (!fullscreen) return
    const onKey = e => { if (e.key === 'Escape') setFullscreen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [fullscreen])

  function handleToggleFav(e) {
    e.preventDefault()
    favState.toggle(article.id)
    setIsFav(favState.isFav(article.id))
  }

  function handleToggleRead(e) {
    e.preventDefault()
    readState.toggle(article.id)
    setIsRead(readState.isRead(article.id))
    onReadChange()
  }

  // Plain-text summary fallback
  const plainSummary = article?.summary
    ? article.summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : null

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!article) {
    return (
      <aside className="reading-pane" style={style}>
        <div className="reading-pane-empty">
          <div className="reading-empty-icon">◈</div>
          <p className="reading-empty-text">Select an article to read it here</p>
        </div>
      </aside>
    )
  }

  // Shared article body content (used in both normal + fullscreen)
  const ArticleBody = () => {
    if (contentLoading) {
      return (
        <div className="article-body-loading">
          <div className="article-body-skeleton" />
          <div className="article-body-skeleton short" />
          <div className="article-body-skeleton" />
          <div className="article-body-skeleton medium" />
          <div className="article-body-skeleton" />
        </div>
      )
    }
    if (content) {
      return (
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }
    // Fallback: summary or error note
    return (
      <div className="article-body">
        {plainSummary && <p>{plainSummary}</p>}
        {contentError && (
          <p className="article-body-error">
            Could not load the full article.{' '}
            <a href={article.link} target="_blank" rel="noreferrer">
              Open in browser ↗
            </a>
          </p>
        )}
      </div>
    )
  }

  // Shared header metadata
  const ArticleMeta = ({ badge = true }) => (
    <div className="reading-source-line">
      {badge && <span className="reading-feed-badge">{article.feed_title}</span>}
      {article.published_at && (
        <span className="reading-date" title={new Date(article.published_at).toLocaleString()}>
          {relativeTime(article.published_at)}
        </span>
      )}
      {article.author && <span className="reading-author">· {article.author}</span>}
    </div>
  )

  // ── Fullscreen overlay ───────────────────────────────────────────────────
  if (fullscreen) {
    return (
      <div className="reading-fullscreen">
        <div className="reading-fullscreen-topbar">
          <span className="reading-fullscreen-feed-badge">{article.feed_title}</span>
          <div className="reading-fullscreen-spacer" />
          <button
            className={`btn-icon${isFav ? ' starred' : ''}`}
            onClick={handleToggleFav}
            title={isFav ? 'Remove from favorites' : 'Save'}
          >
            {isFav ? '⭐' : '☆'}
          </button>
          <button
            className="btn-icon"
            onClick={() => setFullscreen(false)}
            title="Exit fullscreen (Esc)"
          >
            ⊠
          </button>
        </div>

        <div className="reading-fullscreen-body">
          <div className="reading-fullscreen-inner">
            <ArticleMeta badge={false} />
            <h1 className="reading-fullscreen-title">{article.title}</h1>
            <div className="reading-fullscreen-divider" />
            <ArticleBody />
          </div>
        </div>

        <div className="reading-fullscreen-footer">
          <a href={article.link} target="_blank" rel="noreferrer" className="btn btn-primary">
            Open original ↗
          </a>
        </div>
      </div>
    )
  }

  // ── Normal pane ──────────────────────────────────────────────────────────
  return (
    <aside className="reading-pane" style={style}>
      <div className="reading-pane-content">
        <ArticleMeta />
        <h1 className="reading-title">{article.title}</h1>
        <div className="reading-divider" />
        <ArticleBody />
      </div>

      <div className="reading-pane-footer">
        <a
          href={article.link}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Open original ↗
        </a>
        <button
          className="btn-icon"
          onClick={() => setFullscreen(true)}
          title="Fullscreen"
        >
          ⛶
        </button>
        <button
          className={`btn-icon${isFav ? ' starred' : ''}`}
          onClick={handleToggleFav}
          title={isFav ? 'Remove from favorites' : 'Save'}
        >
          {isFav ? '⭐' : '☆'}
        </button>
        <button
          className={`btn-icon${isRead ? ' read-mark' : ''}`}
          onClick={handleToggleRead}
          title={isRead ? 'Mark as unread' : 'Mark as read'}
        >
          {isRead ? '✓' : '○'}
        </button>
        <button className="btn-icon" onClick={onClose} title="Close">✕</button>
      </div>
    </aside>
  )
}
