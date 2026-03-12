import { useState } from 'react'
import toast from 'react-hot-toast'
import { saveFilter, removeFilter } from '../api'

const DATE_OPTIONS = [
  { label: 'Any time', value: null },
  { label: 'Today', value: 0 },
  { label: 'This week', value: 6 },
  { label: 'This month', value: 29 },
]

function sinceDate(daysAgo) {
  if (daysAgo === null) return null
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export default function FilterBar({ filters, onFiltersChange, savedFilters, onSavedFiltersChange }) {
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')

  function setFilter(key, val) {
    onFiltersChange({ ...filters, [key]: val })
  }

  async function handleSaveFilter() {
    if (!saveName.trim()) return
    try {
      await saveFilter({
        name: saveName.trim(),
        include_kw: filters.keyword || '',
        exclude_kw: '',
        feed_ids: filters.feedId ? [filters.feedId] : [],
      })
      toast.success('Filter saved!')
      onSavedFiltersChange()
      setShowSaveModal(false)
      setSaveName('')
    } catch {
      toast.error('Could not save filter.')
    }
  }

  async function handleRemoveSaved(e, id) {
    e.stopPropagation()
    try {
      await removeFilter(id)
      onSavedFiltersChange()
    } catch {
      toast.error('Could not remove filter.')
    }
  }

  function applyPreset(preset) {
    onFiltersChange({
      ...filters,
      keyword: preset.include_kw || '',
      feedId: preset.feed_ids?.[0] || null,
    })
  }

  const hasActiveFilters = filters.keyword || filters.unreadOnly || filters.favoritesOnly || filters.since

  return (
    <>
      <div className="filter-bar">
        {/* Keyword search */}
        <input
          className="filter-input"
          type="search"
          placeholder="🔍 Search articles…"
          value={filters.keyword}
          onChange={e => setFilter('keyword', e.target.value)}
        />

        <div className="filter-divider" />

        {/* Date filter */}
        <select
          className="filter-select"
          value={filters.sinceDays ?? ''}
          onChange={e => {
            const val = e.target.value === '' ? null : Number(e.target.value)
            setFilter('sinceDays', val)
            setFilter('since', sinceDate(val))
          }}
        >
          {DATE_OPTIONS.map(o => (
            <option key={String(o.value)} value={o.value ?? ''}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="filter-divider" />

        {/* Toggle buttons */}
        <button
          className={`filter-toggle${filters.unreadOnly ? ' active' : ''}`}
          onClick={() => setFilter('unreadOnly', !filters.unreadOnly)}
          title="Show only unread articles"
        >
          Unread
        </button>
        <button
          className={`filter-toggle${filters.favoritesOnly ? ' active' : ''}`}
          onClick={() => setFilter('favoritesOnly', !filters.favoritesOnly)}
          title="Show only starred articles"
        >
          ⭐ Favorites
        </button>

        {/* Save current filter */}
        {hasActiveFilters && (
          <button className="filter-toggle" onClick={() => setShowSaveModal(true)} title="Save this filter">
            💾 Save
          </button>
        )}

        {/* Saved filter presets */}
        {savedFilters.length > 0 && <div className="filter-divider" />}
        {savedFilters.map(f => (
          <span key={f.id} className="filter-pill" onClick={() => applyPreset(f)} title="Apply filter">
            {f.name}
            <span
              style={{ marginLeft: 2, opacity: 0.6, fontSize: '0.7rem' }}
              onClick={e => handleRemoveSaved(e, f.id)}
              title="Delete filter"
            >
              ✕
            </span>
          </span>
        ))}

        {/* Clear all */}
        {hasActiveFilters && (
          <>
            <div className="filter-divider" />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onFiltersChange({ keyword: '', unreadOnly: false, favoritesOnly: false, since: null, sinceDays: null })}
            >
              Clear
            </button>
          </>
        )}
      </div>

      {/* Save filter mini-modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSaveModal(false)}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div className="modal-header">
              <div className="modal-title">Save Filter</div>
              <button className="btn-icon" onClick={() => setShowSaveModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                autoFocus
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.88rem' }}
                placeholder="Filter name (e.g. Morning Tech)"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveFilter} disabled={!saveName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
