import { useState } from 'react'
import toast from 'react-hot-toast'
import { saveFilter, removeFilter } from '../api'

const DATE_OPTIONS = [
  { label: 'Any time', value: null },
  { label: 'Today',     value: 0  },
  { label: 'This week', value: 6  },
  { label: 'This month',value: 29 },
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
        feed_ids: [],
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
    onFiltersChange({ ...filters, keyword: preset.include_kw || '' })
  }

  const hasActiveFilters = filters.keyword || filters.unreadOnly || filters.favoritesOnly || filters.since

  return (
    <>
      <div className="filter-bar">
        {/* Search */}
        <div className="filter-search-wrap">
          <span className="filter-search-icon">⌕</span>
          <input
            className="filter-input"
            type="search"
            placeholder="Search articles…"
            value={filters.keyword}
            onChange={e => setFilter('keyword', e.target.value)}
          />
        </div>

        <div className="filter-divider" />

        {/* Date */}
        <select
          className="filter-select"
          value={filters.sinceDays ?? ''}
          onChange={e => {
            const val = e.target.value === '' ? null : Number(e.target.value)
            onFiltersChange({ ...filters, sinceDays: val, since: sinceDate(val) })
          }}
        >
          {DATE_OPTIONS.map(o => (
            <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>
          ))}
        </select>

        <div className="filter-divider" />

        {/* Toggles */}
        <button
          className={`filter-toggle${filters.unreadOnly ? ' active' : ''}`}
          onClick={() => setFilter('unreadOnly', !filters.unreadOnly)}
        >
          Unread
        </button>
        <button
          className={`filter-toggle${filters.favoritesOnly ? ' active' : ''}`}
          onClick={() => setFilter('favoritesOnly', !filters.favoritesOnly)}
        >
          ⭐ Saved
        </button>

        {/* Save filter */}
        {hasActiveFilters && (
          <button className="filter-toggle" onClick={() => setShowSaveModal(true)}>
            + Save View
          </button>
        )}

        {/* Saved presets */}
        {savedFilters.length > 0 && <div className="filter-divider" />}
        {savedFilters.map(f => (
          <span key={f.id} className="filter-pill" onClick={() => applyPreset(f)}>
            {f.name}
            <span className="pill-x" onClick={e => handleRemoveSaved(e, f.id)}>✕</span>
          </span>
        ))}

        {/* Clear */}
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

      {/* Save filter modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSaveModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Save View</div>
                <div className="modal-subtitle">Name this filter preset</div>
              </div>
              <button className="btn-icon" onClick={() => setShowSaveModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                autoFocus
                className="input"
                placeholder="e.g. Morning Tech, Security News…"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveFilter} disabled={!saveName.trim()}>
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
