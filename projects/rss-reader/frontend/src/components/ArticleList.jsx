import { useState } from 'react'
import { relativeTime, highlight, readState, favState } from '../utils'

function ArticleCard({ article, keyword, isSelected, onSelect, onReadChange }) {
  const [isRead, setIsRead] = useState(() => readState.isRead(article.id))
  const [isFav, setIsFav] = useState(() => favState.isFav(article.id))

  function handleClick() {
    onSelect(article)
    if (!isRead) {
      readState.markRead(article.id)
      setIsRead(true)
      onReadChange()
    }
  }

  function handleToggleRead(e) {
    e.stopPropagation()
    readState.toggle(article.id)
    setIsRead(readState.isRead(article.id))
    onReadChange()
  }

  function handleToggleFav(e) {
    e.stopPropagation()
    favState.toggle(article.id)
    setIsFav(favState.isFav(article.id))
  }

  const titleHtml = highlight(article.title, keyword)
  const summaryHtml = highlight(article.summary, keyword)

  return (
    <div
      className={`article-card${isRead ? ' read' : ''}${isSelected ? ' selected' : ''}`}
      onClick={handleClick}
    >
      <div className="article-meta">
        <div className="article-source-wrap">
          <span className="article-source-dot" />
          <span className="article-source">
            {article.feed_title}
            {article.published_at && (
              <> · <span title={new Date(article.published_at).toLocaleString()}>
                {relativeTime(article.published_at)}
              </span></>
            )}
          </span>
        </div>
        <div className="article-actions">
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
            title={isRead ? 'Mark unread' : 'Mark read'}
          >
            {isRead ? '✓' : '○'}
          </button>
        </div>
      </div>

      <span
        className="article-title"
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

export default function ArticleList({
  articles, loading, filters, favoritesOnly, unreadOnly,
  selectedArticleId, onSelectArticle, onReadChange
}) {
  const readIds = readState.getAll()
  const favIds = favState.getAll()

  let visible = articles
  if (unreadOnly)    visible = visible.filter(a => !readIds.has(a.id))
  if (favoritesOnly) visible = visible.filter(a => favIds.has(a.id))

  if (loading) {
    return (
      <div className="article-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-wrap">
          <div className="spinner" />
          <span>Fetching articles…</span>
        </div>
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="article-area" style={{ display: 'flex' }}>
        <div className="empty-state">
          <div className="empty-icon">{articles.length === 0 ? '◈' : '⊘'}</div>
          <h3>{articles.length === 0 ? 'No articles yet' : 'No results'}</h3>
          <p>
            {articles.length === 0
              ? 'Add feeds from the sidebar to get started.'
              : 'Try adjusting your filters or search term.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="article-area">
      <div className="article-count">{visible.length} article{visible.length !== 1 ? 's' : ''}</div>
      {visible.map((article, i) => (
        <ArticleCard
          key={article.id}
          article={article}
          keyword={filters.keyword}
          isSelected={article.id === selectedArticleId}
          onSelect={onSelectArticle}
          onReadChange={onReadChange}
          style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
        />
      ))}
    </div>
  )
}
