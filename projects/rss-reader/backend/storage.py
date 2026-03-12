"""
JSON file-based persistence. No database needed.
All data lives in ./data/*.json files.
"""
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

FEEDS_FILE = DATA_DIR / "feeds.json"
SETTINGS_FILE = DATA_DIR / "settings.json"
FILTERS_FILE = DATA_DIR / "filters.json"


def _read(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def _write(path: Path, data):
    path.write_text(json.dumps(data, indent=2, default=str))


# ── Settings ──────────────────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "refresh_interval": 15,
    "max_articles_per_feed": 50,
    "onboarding_done": False,
}


def get_settings() -> dict:
    s = _read(SETTINGS_FILE, {})
    return {**DEFAULT_SETTINGS, **s}


def save_settings(patch: dict) -> dict:
    current = get_settings()
    current.update(patch)
    _write(SETTINGS_FILE, current)
    return current


# ── Feeds ─────────────────────────────────────────────────────────────────────

def get_feeds() -> list[dict]:
    return _read(FEEDS_FILE, [])


def get_feed(feed_id: str) -> dict | None:
    return next((f for f in get_feeds() if f["id"] == feed_id), None)


def add_feed(url: str, title: str, description: str, site_url: str) -> dict:
    feeds = get_feeds()
    # Deduplicate by URL
    if any(f["url"] == url for f in feeds):
        raise ValueError("This feed is already added.")
    feed = {
        "id": str(uuid.uuid4()),
        "url": url,
        "title": title or url,
        "description": description,
        "site_url": site_url,
        "active": True,
        "last_fetched": None,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    feeds.append(feed)
    _write(FEEDS_FILE, feeds)
    return feed


def remove_feed(feed_id: str) -> bool:
    feeds = get_feeds()
    new_feeds = [f for f in feeds if f["id"] != feed_id]
    if len(new_feeds) == len(feeds):
        return False
    _write(FEEDS_FILE, new_feeds)
    return True


def toggle_feed(feed_id: str) -> dict | None:
    feeds = get_feeds()
    for f in feeds:
        if f["id"] == feed_id:
            f["active"] = not f["active"]
            _write(FEEDS_FILE, feeds)
            return f
    return None


def update_last_fetched(feed_id: str):
    feeds = get_feeds()
    for f in feeds:
        if f["id"] == feed_id:
            f["last_fetched"] = datetime.now(timezone.utc).isoformat()
    _write(FEEDS_FILE, feeds)


# ── Saved Filters ─────────────────────────────────────────────────────────────

def get_filters() -> list[dict]:
    return _read(FILTERS_FILE, [])


def add_filter(name: str, include_kw: str, exclude_kw: str, feed_ids: list[str]) -> dict:
    filters = get_filters()
    f = {
        "id": str(uuid.uuid4()),
        "name": name,
        "include_kw": include_kw,
        "exclude_kw": exclude_kw,
        "feed_ids": feed_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    filters.append(f)
    _write(FILTERS_FILE, filters)
    return f


def remove_filter(filter_id: str) -> bool:
    filters = get_filters()
    new_filters = [f for f in filters if f["id"] != filter_id]
    if len(new_filters) == len(filters):
        return False
    _write(FILTERS_FILE, new_filters)
    return True
