"""
FastAPI backend for the RSS Reader.
Run: uvicorn main:app --reload --port 8000
"""
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import fetcher
import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure data dir and default files exist on startup
    storage.get_settings()
    yield


app = FastAPI(title="RSS Reader API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ────────────────────────────────────────────────────────────

class AddFeedRequest(BaseModel):
    url: str

class SettingsUpdate(BaseModel):
    refresh_interval: Optional[int] = None
    max_articles_per_feed: Optional[int] = None

class SaveFilterRequest(BaseModel):
    name: str
    include_kw: str = ""
    exclude_kw: str = ""
    feed_ids: list[str] = []


# ── Feeds ──────────────────────────────────────────────────────────────────────

@app.get("/api/feeds")
def list_feeds():
    return storage.get_feeds()


@app.post("/api/feeds", status_code=201)
def add_feed(body: AddFeedRequest):
    url = body.url.strip()
    if not url:
        raise HTTPException(400, "URL is required.")
    try:
        meta = fetcher.probe_feed(url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(400, f"Could not reach the feed: {e}")

    try:
        feed = storage.add_feed(
            url=meta["url"],
            title=meta["title"],
            description=meta["description"],
            site_url=meta["site_url"],
        )
    except ValueError as e:
        raise HTTPException(409, str(e))

    return feed


@app.delete("/api/feeds/{feed_id}")
def remove_feed(feed_id: str):
    if not storage.remove_feed(feed_id):
        raise HTTPException(404, "Feed not found.")
    return {"ok": True}


@app.post("/api/feeds/{feed_id}/toggle")
def toggle_feed(feed_id: str):
    feed = storage.toggle_feed(feed_id)
    if not feed:
        raise HTTPException(404, "Feed not found.")
    return feed


# ── Articles ───────────────────────────────────────────────────────────────────

@app.get("/api/articles")
def get_articles(
    feed_id: Optional[str] = None,
    q: Optional[str] = None,
    since: Optional[str] = None,
    favorites_only: bool = False,
):
    """
    Fetch and filter articles. Articles are always fetched live from RSS.
    Read/favorite state is client-managed (stored in localStorage).
    """
    if feed_id:
        articles = fetcher.fetch_feed(feed_id)
    else:
        articles = fetcher.fetch_all_feeds()

    # Keyword filter
    if q:
        q_lower = q.lower()
        articles = [
            a for a in articles
            if q_lower in a["title"].lower() or q_lower in a["summary"].lower()
        ]

    # Date filter (since = ISO date string like "2024-01-01")
    if since:
        articles = [
            a for a in articles
            if a["published_at"] and a["published_at"] >= since
        ]

    return articles


@app.get("/api/article-content")
def get_article_content(url: str):
    """
    Fetch and extract the full article body from any URL.
    Returns {"html": str} with clean, safe article HTML.
    """
    if not url:
        raise HTTPException(400, "url parameter is required.")
    try:
        return fetcher.extract_article_content(url)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Extraction failed: {e}")


@app.post("/api/feeds/{feed_id}/refresh")
def refresh_feed(feed_id: str):
    feed = storage.get_feed(feed_id)
    if not feed:
        raise HTTPException(404, "Feed not found.")
    articles = fetcher.fetch_feed(feed_id)
    return {"ok": True, "count": len(articles)}


@app.post("/api/feeds/refresh-all")
def refresh_all():
    articles = fetcher.fetch_all_feeds()
    return {"ok": True, "count": len(articles)}


# ── Settings ───────────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    return storage.get_settings()


@app.post("/api/settings")
def update_settings(body: SettingsUpdate):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    return storage.save_settings(patch)


@app.post("/api/settings/onboarding-done")
def onboarding_done():
    storage.save_settings({"onboarding_done": True})
    return {"ok": True}


# ── Saved Filters ──────────────────────────────────────────────────────────────

@app.get("/api/filters")
def list_filters():
    return storage.get_filters()


@app.post("/api/filters", status_code=201)
def save_filter(body: SaveFilterRequest):
    return storage.add_filter(
        name=body.name,
        include_kw=body.include_kw,
        exclude_kw=body.exclude_kw,
        feed_ids=body.feed_ids,
    )


@app.delete("/api/filters/{filter_id}")
def remove_filter(filter_id: str):
    if not storage.remove_filter(filter_id):
        raise HTTPException(404, "Filter not found.")
    return {"ok": True}
