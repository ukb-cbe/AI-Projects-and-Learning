"""
Alert job and scheduler management.
"""
import os
import smtplib
import pytz
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import yfinance as yf
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

import database

IST = pytz.timezone("Asia/Kolkata")
DB_PATH = database.DB_PATH

JOB_ID_PREFIX = "stock_alert"


def _is_market_open() -> bool:
    now = datetime.now(IST)
    if now.weekday() >= 5:  # Saturday=5, Sunday=6
        return False
    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)
    return market_open <= now <= market_close


def _fetch_prices(symbols: list[str]) -> dict:
    results = {}
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            price = info.last_price
            prev_close = info.previous_close
            if price and prev_close and prev_close != 0:
                change = price - prev_close
                change_pct = (change / prev_close) * 100
                results[symbol] = {
                    "price": round(price, 2),
                    "change": round(change, 2),
                    "change_pct": round(change_pct, 2),
                }
            else:
                results[symbol] = None
        except Exception as e:
            print(f"[scheduler] Error fetching {symbol}: {e}")
            results[symbol] = None
    return results


def _format_email(stock_data: dict, names: dict) -> tuple[str, str]:
    """Returns (subject, html_body)."""
    now_str = datetime.now(IST).strftime("%d %b %Y, %I:%M %p IST")
    subject = f"NSE Stock Alert — {now_str}"

    rows = []
    for symbol, data in stock_data.items():
        name = names.get(symbol, symbol.replace(".NS", ""))
        if data:
            color = "#16a34a" if data["change"] >= 0 else "#dc2626"
            arrow = "▲" if data["change"] >= 0 else "▼"
            sign = "+" if data["change"] >= 0 else ""
            rows.append(f"""
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
                    <strong>{name}</strong><br/>
                    <span style="color:#999;font-size:0.78em;">{symbol}</span>
                  </td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-variant-numeric:tabular-nums;">
                    ₹{data['price']:,.2f}
                  </td>
                  <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:{color};font-weight:600;">
                    {arrow} {sign}{data['change_pct']:.2f}%
                  </td>
                </tr>""")
        else:
            rows.append(f"""
                <tr>
                  <td colspan="3" style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#999;">
                    ⚠️ {name} — data unavailable
                  </td>
                </tr>""")

    html = f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);">
      <div style="background:#1a1a2e;color:#fff;padding:18px 20px;">
        <h2 style="margin:0;font-size:1.1em;font-weight:700;">📊 NSE Stock Alert</h2>
        <p style="margin:5px 0 0;font-size:0.82em;opacity:.65;">{now_str}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:9px 16px;text-align:left;font-size:0.75em;color:#888;font-weight:600;letter-spacing:.04em;">STOCK</th>
            <th style="padding:9px 16px;text-align:right;font-size:0.75em;color:#888;font-weight:600;letter-spacing:.04em;">PRICE</th>
            <th style="padding:9px 16px;text-align:right;font-size:0.75em;color:#888;font-weight:600;letter-spacing:.04em;">CHANGE</th>
          </tr>
        </thead>
        <tbody>{''.join(rows)}</tbody>
      </table>
      <p style="padding:12px 20px;color:#bbb;font-size:0.72em;margin:0;">
        Manage alerts at <a href="http://localhost:5000" style="color:#6c8ebf;">localhost:5000</a>
      </p>
    </div>
    """
    return subject, html


def _send_email(to: str, subject: str, html_body: str) -> tuple[bool, str]:
    """Returns (success, error_message)."""
    try:
        smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ["SMTP_USER"]
        smtp_pass = os.environ["SMTP_PASSWORD"]
        email_from = os.environ.get("EMAIL_FROM", smtp_user)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = email_from
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(email_from, to, msg.as_string())

        print(f"[scheduler] Email sent to {to}")
        return True, ""
    except Exception as e:
        err = str(e)
        print(f"[scheduler] Email error: {err}")
        return False, err


def run_alert_job():
    """Entry point called by APScheduler."""
    cfg = database.get_config()
    if not cfg["opted_in"]:
        return
    if not cfg["email_to"]:
        print("[scheduler] No email configured — skipping alert.")
        return
    if cfg["market_hours_only"] and not _is_market_open():
        print("[scheduler] Outside market hours — skipping alert.")
        return

    stocks = database.get_active_stocks()
    if not stocks:
        print("[scheduler] No active stocks — skipping alert.")
        return

    symbols = [s["symbol"] for s in stocks]
    names = {s["symbol"]: s["display_name"] for s in stocks}

    print(f"[scheduler] Fetching prices for: {', '.join(symbols)}")
    stock_data = _fetch_prices(symbols)

    subject, html = _format_email(stock_data, names)
    success, err = _send_email(cfg["email_to"], subject, html)
    if not success:
        print(f"[scheduler] Failed to send alert: {err}")


def send_now() -> tuple[bool, str]:
    """Send an alert immediately, bypassing the market-hours check."""
    cfg = database.get_config()
    if not cfg["email_to"]:
        return False, "No email address configured. Set it in Settings."
    stocks = database.get_active_stocks()
    if not stocks:
        return False, "No active stocks to alert on."
    symbols = [s["symbol"] for s in stocks]
    names = {s["symbol"]: s["display_name"] for s in stocks}
    print(f"[scheduler] Manual send: fetching {', '.join(symbols)}")
    stock_data = _fetch_prices(symbols)
    subject, html = _format_email(stock_data, names)
    return _send_email(cfg["email_to"], subject, html)


def build_scheduler() -> BackgroundScheduler:
    jobstores = {"default": SQLAlchemyJobStore(url=f"sqlite:///{DB_PATH}")}
    scheduler = BackgroundScheduler(jobstores=jobstores, timezone=IST)
    return scheduler


def reschedule_jobs(scheduler: BackgroundScheduler, cfg: dict | None = None):
    """Remove all existing alert jobs and add new ones based on current config."""
    for job in scheduler.get_jobs():
        if job.id.startswith(JOB_ID_PREFIX):
            job.remove()

    if cfg is None:
        cfg = database.get_config()

    if not cfg["opted_in"] or not cfg["email_to"]:
        return

    if cfg["schedule_mode"] == "interval":
        hours = float(cfg["interval_hours"])
        scheduler.add_job(
            run_alert_job,
            IntervalTrigger(hours=hours),
            id=JOB_ID_PREFIX,
            replace_existing=True,
            misfire_grace_time=300,
        )
        print(f"[scheduler] Scheduled interval job every {hours}h")

    elif cfg["schedule_mode"] == "specific_times":
        for i, time_str in enumerate(cfg["specific_times"]):
            hour, minute = map(int, time_str.split(":"))
            scheduler.add_job(
                run_alert_job,
                CronTrigger(hour=hour, minute=minute, timezone=IST),
                id=f"{JOB_ID_PREFIX}_{i}",
                replace_existing=True,
                misfire_grace_time=300,
            )
        print(f"[scheduler] Scheduled {len(cfg['specific_times'])} time-based jobs")
