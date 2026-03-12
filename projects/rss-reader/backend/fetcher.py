"""
RSS feed discovery, validation, and article fetching.
"""
import re
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import feedparser
import requests

import storage

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    "Accept-Language": "en-US,en;q=0.9",
}
TIMEOUT = 12
COMMON_PATHS = ["/feed", "/feed.xml", "/rss", "/rss.xml", "/atom.xml",
                "/feeds/posts/default", "/blog/feed", "/news/rss"]


# ── Feed Discovery ─────────────────────────────────────────────────────────────

class _LinkParser(HTMLParser):
    """Extracts RSS/Atom <link rel="alternate"> hrefs from HTML."""
    def __init__(self):
        super().__init__()
        self.feed_urls: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag != "link":
            return
        attrs = dict(attrs)
        if attrs.get("rel") == "alternate" and attrs.get("type", "").lower() in (
            "application/rss+xml", "application/atom+xml"
        ):
            href = attrs.get("href", "").strip()
            if href:
                self.feed_urls.append(href)


def _is_valid_feed(parsed) -> bool:
    """A feed is valid if it has entries OR a non-empty feed title."""
    return bool(parsed.entries or parsed.feed.get("title"))


def _fetch(url: str) -> requests.Response:
    """Fetch a URL using requests with browser-like headers."""
    return requests.get(url, timeout=TIMEOUT, headers=HEADERS, allow_redirects=True)


def _try_as_feed(url: str):
    """
    Use requests for HTTP (bypasses feedparser's own client which gets blocked
    by Cloudflare/WAF), then hand the raw bytes to feedparser for parsing.
    Returns parsed feedparser object, or None on any error.
    """
    try:
        resp = _fetch(url)
        resp.raise_for_status()
        # Passing bytes (not a URL) makes feedparser skip HTTP entirely
        return feedparser.parse(resp.content)
    except Exception:
        return None


def discover_feed(url: str) -> str:
    """
    Given any URL (website homepage or direct RSS/Atom URL), return
    the resolved RSS feed URL. Raises ValueError if nothing found.

    3-step cascade:
    1. Fetch URL with requests → try parsing as feed directly
    2. If response looks like HTML, scan for <link rel="alternate" type="application/rss+xml">
    3. Try common path suffixes (/feed, /rss, etc.)
    """
    # Normalise — add scheme if missing
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Step 1: fetch URL and try parsing as feed
    try:
        resp = _fetch(url)
        resp.raise_for_status()
        content_type = resp.headers.get("Content-Type", "")

        # If the server returned XML/RSS/Atom content, parse it directly
        if any(t in content_type for t in ("xml", "rss", "atom")):
            parsed = feedparser.parse(resp.content)
            if _is_valid_feed(parsed):
                return url

        # Even if content-type says HTML, try parsing as feed
        # (some servers send wrong content-type)
        parsed = feedparser.parse(resp.content)
        if _is_valid_feed(parsed):
            return url

        # Step 2: treat as HTML, scan for <link rel="alternate">
        html_text = resp.text[:80_000]
        link_parser = _LinkParser()
        link_parser.feed(html_text)
        for href in link_parser.feed_urls:
            abs_href = urljoin(url, href)
            p = _try_as_feed(abs_href)
            if p and _is_valid_feed(p):
                return abs_href

    except requests.RequestException:
        pass

    # Step 3: try common path suffixes
    base = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
    for path in COMMON_PATHS:
        candidate = base + path
        p = _try_as_feed(candidate)
        if p and _is_valid_feed(p):
            return candidate

    raise ValueError(
        "Couldn't find an RSS feed at this URL. "
        "Try pasting the direct RSS feed URL (e.g. https://example.com/feed)."
    )


def probe_feed(raw_url: str) -> dict:
    """Discover + validate a feed, return metadata. Called before saving."""
    rss_url = discover_feed(raw_url)
    parsed = _try_as_feed(rss_url) or feedparser.parse(rss_url)
    feed = parsed.feed
    return {
        "url": rss_url,
        "title": feed.get("title") or raw_url,
        "description": feed.get("subtitle") or feed.get("description") or "",
        "site_url": feed.get("link") or "",
    }


# ── Article Fetching ───────────────────────────────────────────────────────────

def _parse_date(entry) -> str | None:
    for attr in ("published_parsed", "updated_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                return datetime(*val[:6], tzinfo=timezone.utc).isoformat()
            except Exception:
                pass
    return None


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


def _summary(entry) -> str:
    raw = (getattr(entry, "summary", None)
           or getattr(entry, "description", None)
           or "")
    return _strip_html(raw)[:500]


def fetch_feed(feed_id: str) -> list[dict]:
    """
    Fetch and parse articles for one feed. Returns list of article dicts.
    Caller is responsible for any caching/dedup logic.
    """
    feed_row = storage.get_feed(feed_id)
    if not feed_row or not feed_row["active"]:
        return []

    settings = storage.get_settings()
    limit = settings.get("max_articles_per_feed", 50)

    parsed = _try_as_feed(feed_row["url"]) or feedparser.parse(feed_row["url"])
    articles = []
    for entry in parsed.entries[:limit]:
        guid = getattr(entry, "id", None) or getattr(entry, "link", None) or ""
        articles.append({
            "id": f"{feed_id}::{guid}",
            "feed_id": feed_id,
            "feed_title": feed_row["title"],
            "feed_url": feed_row["url"],
            "guid": guid,
            "title": getattr(entry, "title", "") or "",
            "summary": _summary(entry),
            "link": getattr(entry, "link", "") or "",
            "author": getattr(entry, "author", "") or "",
            "published_at": _parse_date(entry),
        })

    storage.update_last_fetched(feed_id)
    return articles


# ── Full Article Extraction ────────────────────────────────────────────────────

def extract_article_content(url: str) -> dict:
    """
    Fetch a URL and extract the main article body as clean HTML.
    Uses trafilatura (Mozilla Readability-style extraction).
    Returns {"html": str, "title": str} or raises ValueError on failure.
    """
    try:
        import trafilatura
        downloaded = trafilatura.fetch_url(url)
        if not downloaded:
            # Fall back to requests if trafilatura's fetcher fails
            resp = _fetch(url)
            resp.raise_for_status()
            downloaded = resp.text

        html = trafilatura.extract(
            downloaded,
            output_format="html",
            include_images=True,
            include_links=True,
            include_tables=True,
            no_fallback=False,
        )
        if not html:
            raise ValueError("No article content could be extracted.")

        return {"html": html}
    except ImportError:
        raise ValueError("trafilatura not installed. Run: pip install trafilatura")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Could not extract article content: {e}")


def fetch_all_feeds() -> list[dict]:
    """Fetch articles from all active feeds. Returns merged, date-sorted list."""
    feeds = storage.get_feeds()
    all_articles: list[dict] = []
    for feed in feeds:
        if not feed["active"]:
            continue
        try:
            all_articles.extend(fetch_feed(feed["id"]))
        except Exception:
            pass  # broken feed doesn't abort the rest

    # Sort newest first; entries without a date sort to the end
    all_articles.sort(
        key=lambda a: a["published_at"] or "0000",
        reverse=True,
    )
    return all_articles
