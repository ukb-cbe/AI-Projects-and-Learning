import { useState } from 'react'
import toast from 'react-hot-toast'
import { removeFeed, toggleFeed } from '../api'
import AddFeedModal from './AddFeedModal'

// Generate a stable hue-based color from a feed title
function feedColor(title = '') {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 50%, 42%)`
}

export default function Sidebar({ feeds, selectedFeedId, onSelectFeed, onFeedsChanged, style }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  async function handleToggle(e, feedId, currentActive) {
    e.stopPropagation()
    try {
      await toggleFeed(feedId)
      onFeedsChanged()
    } catch {
      toast.error('Could not toggle feed.')
    }
  }

  async function handleRemove(e, feedId, feedTitle) {
    e.stopPropagation()
    if (!window.confirm(`Remove "${feedTitle}"?`)) return
    setRemoving(feedId)
    try {
      await removeFeed(feedId)
      onFeedsChanged()
      if (selectedFeedId === feedId) onSelectFeed('all')
      toast.success('Feed removed.')
    } catch {
      toast.error('Could not remove feed.')
    } finally {
      setRemoving(null)
    }
  }

  const activeFeeds = feeds.filter(f => f.active)
  const pausedFeeds = feeds.filter(f => !f.active)

  return (
    <>
      <aside className="sidebar" style={style}>
        <div className="sidebar-header">
          <span className="sidebar-title">My Feeds</span>
          <button
            className="btn btn-xs btn-outline"
            onClick={() => setShowAddModal(true)}
            title="Add a new feed"
          >
            + Add
          </button>
        </div>

        <div className="sidebar-feeds">
          {/* All Feeds */}
          <div
            className={`feed-row${selectedFeedId === 'all' ? ' selected' : ''}`}
            onClick={() => onSelectFeed('all')}
          >
            <div className="feed-avatar all-feeds">⊞</div>
            <span className="feed-name">All Feeds</span>
          </div>

          {feeds.length === 0 && (
            <div className="sidebar-empty">
              No feeds yet.<br />Click + Add to get started.
            </div>
          )}

          {/* Active feeds */}
          {activeFeeds.length > 0 && (
            <>
              {feeds.length > 0 && <div className="sidebar-section-label">Active</div>}
              {activeFeeds.map(feed => (
                <FeedRow
                  key={feed.id}
                  feed={feed}
                  selected={selectedFeedId === feed.id}
                  removing={removing === feed.id}
                  onSelect={() => onSelectFeed(feed.id)}
                  onToggle={e => handleToggle(e, feed.id, feed.active)}
                  onRemove={e => handleRemove(e, feed.id, feed.title)}
                  color={feedColor(feed.title)}
                />
              ))}
            </>
          )}

          {/* Paused feeds */}
          {pausedFeeds.length > 0 && (
            <>
              <div className="sidebar-section-label">Paused</div>
              {pausedFeeds.map(feed => (
                <FeedRow
                  key={feed.id}
                  feed={feed}
                  selected={selectedFeedId === feed.id}
                  removing={removing === feed.id}
                  onSelect={() => onSelectFeed(feed.id)}
                  onToggle={e => handleToggle(e, feed.id, feed.active)}
                  onRemove={e => handleRemove(e, feed.id, feed.title)}
                  color={feedColor(feed.title)}
                />
              ))}
            </>
          )}
        </div>
      </aside>

      {showAddModal && (
        <AddFeedModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { onFeedsChanged(); setShowAddModal(false) }}
        />
      )}
    </>
  )
}

function FeedRow({ feed, selected, removing, onSelect, onToggle, onRemove, color }) {
  const initials = feed.title
    ? feed.title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div
      className={`feed-row${selected ? ' selected' : ''}${!feed.active ? ' read' : ''}`}
      onClick={onSelect}
      title={feed.url}
    >
      <div
        className="feed-avatar"
        style={{ background: feed.active ? color : 'var(--surface-3)' }}
      >
        {initials}
      </div>
      <span className="feed-name">{feed.title}</span>
      <div className="feed-controls">
        <button
          className={`feed-toggle${feed.active ? ' on' : ''}`}
          onClick={onToggle}
          title={feed.active ? 'Pause feed' : 'Resume feed'}
        />
        <button
          className="feed-remove-btn"
          onClick={onRemove}
          disabled={removing}
          title="Remove feed"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
