export function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function highlight(text, keyword) {
  if (!keyword || !text) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === keyword.toLowerCase()
      ? `<mark>${p}</mark>`
      : p
  ).join('')
}

// Read/favorite state lives in localStorage (no DB needed)
const READ_KEY = 'rss_read'
const FAV_KEY = 'rss_fav'

function getSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) }
  catch { return new Set() }
}
function saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]))
}

export const readState = {
  isRead: (id) => getSet(READ_KEY).has(id),
  markRead: (id) => { const s = getSet(READ_KEY); s.add(id); saveSet(READ_KEY, s) },
  markUnread: (id) => { const s = getSet(READ_KEY); s.delete(id); saveSet(READ_KEY, s) },
  toggle: (id) => readState.isRead(id) ? readState.markUnread(id) : readState.markRead(id),
  getAll: () => getSet(READ_KEY),
}

export const favState = {
  isFav: (id) => getSet(FAV_KEY).has(id),
  toggle: (id) => {
    const s = getSet(FAV_KEY)
    s.has(id) ? s.delete(id) : s.add(id)
    saveSet(FAV_KEY, s)
  },
  getAll: () => getSet(FAV_KEY),
}
