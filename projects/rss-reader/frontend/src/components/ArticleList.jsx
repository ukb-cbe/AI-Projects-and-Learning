import { useState, useCallback } from 'react'
import { relativeTime, highlight, readState, favState } from '../utils'

function ArticleCard({ article, keyword, onReadChange }) {
  const [isRead, setIsRead] = useState(() => readState.isRead(article.id))
  const [isFav, setIsFav] = useState(() => favState.isFav(article.id))

  function handleTitleClick() {
    if (!isRead) {
      readState.markRead(article.id)
      setIsRead(true)
      onReadChange()
    }
  }

  function handleToggleRead(e) {
    e.preventDefault()
    readState.toggle(article.id)
    const next = readState.isRead(article.id)
    setIsRead(next)
    onReadChange()
  }

  function handleToggleFav(e) {
    e.preventDefault()
    favState.toggle(article.id)
    setIsFav(favState.isFav(article.id))
  }

  const titleHtml = highlight(article.title, keyword)
  const summaryHtml = highlight(article.summary, keyword)

  return (
    <div className={`article-card${isRead ? ' read' : ''}`}>
      <div className="article-meta">
        <span className="article-source">
          {article.feed_title}
          {article.published_at && (
            <> · <span title={new Date(article.published_at).toLocaleString()}>
              {relativeTime(article.published_at)}
            </span></>
          )}
          {article.author && <> · {article.author}</>}
        </span>
        <div className="article-actions">
          <button
            className={`btn-icon${isFav ? ' starred' : ''}`}
            onClick={handleToggleFav}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? '⭐' : '☆'}
          </button>
          <button
            className={`btn-icon${isRead ? ' read' : ''}`}
            onClick={handleToggleRead}
            title={isRead ? 'Mark as unread' : 'Mark as read'}
          >
            {isRead ? '✉' : '📧'}
          </button>
        </div>
      </div>

      <a
        href={article.link}
        target="_blank"
        rel="noreferrer"
        className="article-title"
        onClick={handleTitleClick}
        dangerouslySetInnerHTML={{ __html: titleHtml }}
      />

      {article.summary && (
        <div
          className="article-summary"
          dangerouslySetInnerHTML={{ __html: summaryHtml }}
        />
      )}
    </div>
  )
}

export default function ArticleList({ articles, loading, filters, favoritesOnly, unreadOnly, onReadChange }) {
  const readIds = readState.getAll()
  const favIds = favState.getAll()

  let visible = articles

  // Client-side read/fav filtering (state is in localStorage)
  if (unreadOnly) {
    visible = visible.filter(a => !readIds.has(a.id))
  }
  if (favoritesOnly) {
    visible = visible.filter(a => favIds.has(a.id))
  }

  if (loading) {
    return (
      <div className="spinner-wrap">
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
        <div>Fetching articles…</div>
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
          {articles.length === 0 ? '📭' : '🔍'}
        </div>
        <h3>{articles.length === 0 ? 'No articles yet' : 'No results'}</h3>
        <p>
          {articles.length === 0
            ? 'Add feeds from the sidebar to get started.'
            : 'Try adjusting your filters or search term.'}
        </p>
      </div>
    )
  }

  return (
    <div className="article-area">
      {visible.map(article => (
        <ArticleCard
          key={article.id}
          article={article}
          keyword={filters.keyword}
          onReadChange={onReadChange}
        />
      ))}
    </div>
  )
}
