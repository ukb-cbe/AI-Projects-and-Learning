# NSE Stock Alert — Email

Get hourly (or scheduled) email alerts for NSE stock prices. Fully configurable via a local web UI.

## Quick Start

### 1. Install dependencies
```bash
cd projects/stock-alert-app
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Set up Gmail smtp
SMTP credentials for sending alert emails
# Gmail: use an App Password (not your regular password)
# Generate one at: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your Twilio credentials and WhatsApp number
```

### 4. Run the app
```bash
python app.py
```

Open **http://localhost:5000** in your browser.

---

## Usage

**Stocks tab** — search for any NSE-listed company and click to add it. Toggle stocks on/off without removing them. Remove stocks permanently with ✕.

**Settings tab** — choose between:
- **Every N hours** (30 min, 1h, 2h, 3h, 4h, 6h, 8h)
- **At specific times** (e.g. 09:15, 12:00, 15:30)

Enable **Market hours only** to skip alerts when NSE is closed (weekends + outside 9:15–15:30 IST).

**Pause/Resume** — click ⏸ Pause All Alerts at any time. Your stocks and settings are preserved.

**Send Alert Now** — manually trigger an immediate alert for testing.

---

## Sample WhatsApp Message

```
📊 NSE Stock Alert
11 Mar 2026, 12:00 PM IST

📈 Reliance Industries
   ₹2,847.30  (+1.25%)
📉 Infosys
   ₹1,923.45  (-0.45%)
📈 HDFC Bank
   ₹1,678.90  (+0.89%)

Reply STOP to pause alerts
```

---

## Tech Stack
- **Flask** — web UI and API
- **APScheduler** — background scheduling (jobs survive restarts via SQLite)
- **yfinance** — NSE stock price data (`.NS` suffix)
- **Twilio** — WhatsApp delivery
- **SQLite** — local persistence (no external DB needed)
