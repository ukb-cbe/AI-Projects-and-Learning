import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "stock_alert.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS config (
                id                INTEGER PRIMARY KEY,
                email_to          TEXT    DEFAULT '',
                opted_in          INTEGER DEFAULT 1,
                schedule_mode     TEXT    DEFAULT 'interval',
                interval_hours    REAL    DEFAULT 1.0,
                specific_times    TEXT    DEFAULT '["09:15","12:00","15:30"]',
                market_hours_only INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS stocks (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol       TEXT    UNIQUE NOT NULL,
                display_name TEXT    NOT NULL,
                active       INTEGER DEFAULT 1,
                added_at     TEXT    DEFAULT (datetime('now'))
            );
        """)

        # Migrate: rename whatsapp_to -> email_to if old column exists
        columns = [row[1] for row in conn.execute("PRAGMA table_info(config)").fetchall()]
        if "whatsapp_to" in columns and "email_to" not in columns:
            conn.execute("ALTER TABLE config RENAME COLUMN whatsapp_to TO email_to")

        # Ensure the single config row exists
        exists = conn.execute("SELECT id FROM config WHERE id = 1").fetchone()
        if not exists:
            conn.execute("INSERT INTO config (id) VALUES (1)")
        conn.commit()


# ---------- Config ----------

def get_config() -> dict:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM config WHERE id = 1").fetchone()
        cfg = dict(row)
        cfg["specific_times"] = json.loads(cfg["specific_times"])
        return cfg


def save_config(data: dict):
    times = json.dumps(data.get("specific_times", ["09:15", "12:00", "15:30"]))
    with get_conn() as conn:
        conn.execute("""
            UPDATE config SET
                email_to          = ?,
                schedule_mode     = ?,
                interval_hours    = ?,
                specific_times    = ?,
                market_hours_only = ?
            WHERE id = 1
        """, (
            data.get("email_to", ""),
            data.get("schedule_mode", "interval"),
            float(data.get("interval_hours", 1.0)),
            times,
            1 if data.get("market_hours_only") else 0,
        ))
        conn.commit()


def set_opted_in(value: bool):
    with get_conn() as conn:
        conn.execute("UPDATE config SET opted_in = ? WHERE id = 1", (1 if value else 0,))
        conn.commit()


# ---------- Stocks ----------

def get_active_stocks() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT symbol, display_name FROM stocks WHERE active = 1 ORDER BY display_name"
        ).fetchall()
        return [dict(r) for r in rows]


def get_all_stocks() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, symbol, display_name, active FROM stocks ORDER BY display_name"
        ).fetchall()
        return [dict(r) for r in rows]


def add_stock(symbol: str, display_name: str) -> bool:
    """Returns True if added, False if already exists."""
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO stocks (symbol, display_name) VALUES (?, ?)",
                (symbol, display_name),
            )
            conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False


def toggle_stock(stock_id: int):
    with get_conn() as conn:
        conn.execute(
            "UPDATE stocks SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?",
            (stock_id,),
        )
        conn.commit()


def remove_stock(symbol: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM stocks WHERE symbol = ?", (symbol,))
        conn.commit()
