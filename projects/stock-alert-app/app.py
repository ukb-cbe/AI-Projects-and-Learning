import os
import json

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv

import database
import scheduler as sched

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key")

# Load NSE symbol list once at startup
_NSE_SYMBOLS_PATH = os.path.join(os.path.dirname(__file__), "nse_symbols.json")
with open(_NSE_SYMBOLS_PATH) as f:
    _NSE_SYMBOLS: list[dict] = json.load(f)

# Build scheduler (shared instance)
_scheduler = sched.build_scheduler()


# ──────────────────────────────────────────
# Startup
# ──────────────────────────────────────────

def _startup():
    database.init_db()
    cfg = database.get_config()
    _scheduler.start()
    sched.reschedule_jobs(_scheduler, cfg)
    print("[app] Scheduler started.")


# ──────────────────────────────────────────
# Routes — pages
# ──────────────────────────────────────────

@app.route("/")
def index():
    cfg = database.get_config()
    stocks = database.get_all_stocks()
    return render_template("index.html", cfg=cfg, stocks=stocks)


# ──────────────────────────────────────────
# Routes — stocks API
# ──────────────────────────────────────────

@app.route("/api/search")
def api_search():
    q = request.args.get("q", "").strip().lower()
    if len(q) < 2:
        return jsonify([])
    results = [
        s for s in _NSE_SYMBOLS
        if q in s["name"].lower() or q in s["symbol"].lower()
    ]
    return jsonify(results[:20])


@app.route("/api/stocks")
def api_stocks():
    return jsonify(database.get_all_stocks())


@app.route("/stocks/add", methods=["POST"])
def add_stock():
    data = request.get_json()
    symbol = data.get("symbol", "").strip().upper()
    name = data.get("name", "").strip()
    if not symbol or not name:
        return jsonify({"error": "symbol and name required"}), 400
    added = database.add_stock(symbol, name)
    if not added:
        return jsonify({"error": "Stock already in your list"}), 409
    return jsonify({"ok": True})


@app.route("/stocks/<symbol>", methods=["DELETE"])
def remove_stock(symbol):
    database.remove_stock(symbol.upper())
    return jsonify({"ok": True})


@app.route("/stocks/<int:stock_id>/toggle", methods=["POST"])
def toggle_stock(stock_id):
    database.toggle_stock(stock_id)
    return jsonify({"ok": True})


# ──────────────────────────────────────────
# Routes — settings
# ──────────────────────────────────────────

@app.route("/settings", methods=["POST"])
def save_settings():
    data = request.get_json()

    email = data.get("email_to", "").strip()

    times = data.get("specific_times", [])
    # Accept comma-separated string or list
    if isinstance(times, str):
        times = [t.strip() for t in times.split(",") if t.strip()]

    database.save_config({
        "email_to": email,
        "schedule_mode": data.get("schedule_mode", "interval"),
        "interval_hours": data.get("interval_hours", 1.0),
        "specific_times": times,
        "market_hours_only": data.get("market_hours_only", True),
    })

    cfg = database.get_config()
    sched.reschedule_jobs(_scheduler, cfg)
    return jsonify({"ok": True, "message": "Settings saved!"})


# ──────────────────────────────────────────
# Routes — alerts
# ──────────────────────────────────────────

@app.route("/alerts/optout", methods=["POST"])
def optout():
    database.set_opted_in(False)
    sched.reschedule_jobs(_scheduler)
    return jsonify({"ok": True, "opted_in": False})


@app.route("/alerts/optin", methods=["POST"])
def optin():
    database.set_opted_in(True)
    cfg = database.get_config()
    sched.reschedule_jobs(_scheduler, cfg)
    return jsonify({"ok": True, "opted_in": True})


@app.route("/alerts/send-now", methods=["POST"])
def send_now():
    success, err = sched.send_now()
    if success:
        return jsonify({"ok": True, "message": "Alert sent to your email!"})
    return jsonify({"error": err or "Failed to send. Check the console for details."}), 500


# ──────────────────────────────────────────
# Main
# ──────────────────────────────────────────

if __name__ == "__main__":
    # Guard against APScheduler being started twice by Flask's reloader
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        _startup()
    app.run(debug=True, use_reloader=True)
