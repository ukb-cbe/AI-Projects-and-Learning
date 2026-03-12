import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getFeeds = () => api.get('/feeds').then(r => r.data)
export const addFeed = (url) => api.post('/feeds', { url }).then(r => r.data)
export const removeFeed = (id) => api.delete(`/feeds/${id}`).then(r => r.data)
export const toggleFeed = (id) => api.post(`/feeds/${id}/toggle`).then(r => r.data)

export const getArticles = (params = {}) =>
  api.get('/articles', { params }).then(r => r.data)

export const getSettings = () => api.get('/settings').then(r => r.data)
export const saveSettings = (data) => api.post('/settings', data).then(r => r.data)
export const markOnboardingDone = () => api.post('/settings/onboarding-done').then(r => r.data)

export const getFilters = () => api.get('/filters').then(r => r.data)
export const saveFilter = (data) => api.post('/filters', data).then(r => r.data)
export const removeFilter = (id) => api.delete(`/filters/${id}`).then(r => r.data)
