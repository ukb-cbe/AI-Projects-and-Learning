# Feedline — RSS Reader

A personal RSS reader with a dark editorial UI, full article extraction, and a three-column reading pane. Built with FastAPI and React.

---

## Features

- **Feed management** — Add any RSS/Atom feed URL or paste a regular website URL (auto-detects the feed)
- **Feed discovery** — Crawls `<link rel="alternate">` tags and tries common paths (`/feed`, `/rss`, etc.)
- **Full article reading** — Extracts and renders the full article body in-app using [trafilatura](https://trafilatura.readthedocs.io/) — no need to open a browser tab
- **Filters** — Search by keyword, filter by date range, toggle unread/saved views, and save filter presets
- **Resizable panes** — Drag the handles between sidebar, article list, and reading pane
- **Fullscreen reading** — Expand any article to a distraction-free full-screen view (Esc to exit)
- **Dark / light mode** — Toggle in the navbar, persists across sessions
- **Read & favorite state** — Stored in `localStorage`, no account needed
- **Auto-refresh** — Configurable interval (5 min, 15 min, 30 min, 1 hour, or manual)
- **Onboarding** — Curated starter feeds on first launch

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| Article extraction | trafilatura |
| RSS parsing | feedparser |
| Storage | JSON files (no database required) |
| Frontend | React + Vite |
| Styling | Plain CSS with CSS custom properties |
| Fonts | Fraunces (display) + Plus Jakarta Sans (UI) |

---

## Project Structure

```
rss-reader/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── fetcher.py       # RSS discovery, parsing, article extraction
│   ├── storage.py       # JSON file read/write
│   ├── requirements.txt
│   └── data/            # Auto-created on first run
│       ├── feeds.json
│       ├── settings.json
│       └── filters.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── utils.js
    │   ├── index.css
    │   └── components/
    │       ├── Sidebar.jsx
    │       ├── ArticleList.jsx
    │       ├── ReadingPane.jsx
    │       ├── FilterBar.jsx
    │       ├── OnboardingModal.jsx
    │       ├── AddFeedModal.jsx
    │       └── SettingsModal.jsx
    ├── package.json
    └── vite.config.js
```

---

## Prerequisites

- Python 3.9+
- Node.js 18+

---

## Setup & Running

### 1. Backend

```bash
cd rss-reader/backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd rss-reader/frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

> The Vite dev server proxies `/api` requests to `http://localhost:8000` — no CORS setup needed.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/feeds` | List all feeds |
| POST | `/api/feeds` | Add a feed (body: `{ url }`) |
| DELETE | `/api/feeds/{id}` | Remove a feed |
| POST | `/api/feeds/{id}/toggle` | Pause / resume a feed |
| GET | `/api/articles` | Fetch articles (params: `feed_id`, `q`, `since`) |
| GET | `/api/article-content` | Extract full article body (param: `url`) |
| GET | `/api/settings` | Get settings |
| POST | `/api/settings` | Update settings |
| GET | `/api/filters` | List saved filter presets |
| POST | `/api/filters` | Save a filter preset |
| DELETE | `/api/filters/{id}` | Remove a filter preset |

---

## Adding Feeds

Three ways to subscribe to a feed:

1. **Onboarding** — Curated suggestions on first launch (BBC News, TechCrunch, Hacker News, etc.)
2. **+ Add button** in the sidebar — Paste any website URL or direct RSS URL. The app auto-detects the feed.
3. **Any RSS/Atom URL** — Direct feed URLs like `https://example.com/feed.xml` always work

---

## Storage

All data is stored as local JSON files — no database setup required:

| File | Contents |
|------|---------|
| `backend/data/feeds.json` | Configured feeds |
| `backend/data/settings.json` | App settings (refresh interval, article limit) |
| `backend/data/filters.json` | Saved filter presets |

Article content is never persisted — it's fetched live from RSS feeds on demand.
