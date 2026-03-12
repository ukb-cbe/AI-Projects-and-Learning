import { useState } from 'react'
import toast from 'react-hot-toast'
import { removeFeed, toggleFeed } from '../api'
import AddFeedModal from './AddFeedModal'

export default function Sidebar({ feeds, selectedFeedId, onSelectFeed, onFeedsChanged, readIds }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [removing, setRemoving] = useState(null)

  // Count unread per feed from the readIds set (passed from parent)
  function unreadCount(feedId) {
    // We don't have per-feed article counts without fetching; show nothing
    // unless the parent passes article counts. Keep simple for now.
    return null
  }

  async function handleToggle(e, feedId) {
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
    if (!window.confirm(`Remove "${feedTitle}" and all its articles?`)) return
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

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Feeds</span>
          <button className="btn btn-sm btn-outline" onClick={() => setShowAddModal(true)}>
            + Add
          </button>
        </div>

        <div className="sidebar-feeds">
          {/* All Feeds row */}
          <div
            className={`feed-row${selectedFeedId === 'all' ? ' selected' : ''}`}
            onClick={() => onSelectFeed('all')}
          >
            <span style={{ fontSize: '1rem' }}>🗞</span>
            <span className="feed-name">All Feeds</span>
          </div>

          {feeds.length === 0 && (
            <div style={{ padding: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No feeds yet.<br />Click + Add to get started.
            </div>
          )}

          {feeds.map(feed => (
            <div
              key={feed.id}
              className={`feed-row${selectedFeedId === feed.id ? ' selected' : ''}${!feed.active ? ' read' : ''}`}
              onClick={() => onSelectFeed(feed.id)}
              title={feed.url}
            >
              <input
                type="checkbox"
                checked={feed.active}
                onChange={e => handleToggle(e, feed.id)}
                onClick={e => e.stopPropagation()}
                title={feed.active ? 'Pause feed' : 'Activate feed'}
                style={{ flexShrink: 0, cursor: 'pointer' }}
              />
              <span className="feed-name">{feed.title}</span>
              <button
                className="btn-icon danger"
                style={{ opacity: removing === feed.id ? 0.4 : 0, transition: 'opacity 0.1s' }}
                title="Remove feed"
                onClick={e => handleRemove(e, feed.id, feed.title)}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </aside>

      {showAddModal && (
        <AddFeedModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => onFeedsChanged()}
        />
      )}
    </>
  )
}
