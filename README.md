# ✦ Doozy

A delightfully simple, single-user todo app that helps you **prioritize your day**,
keep up with **daily rituals** (reading, piano, …), and get **SMS nudges** so nothing
slips. Built with React + Express + MongoDB, with SMS via [Textbelt](https://textbelt.com).

> Make today a doozy.

---

## Features

- **Prioritization** — every task has a priority (Low → Urgent); the list sorts by it,
  and you can re-prioritize with a single click.
- **Daily rituals** — recurring habits that reappear every day and reset automatically
  at midnight (tracked per-date, so your streak data stays intact).
- **SMS reminders** — per-task reminders at a chosen time, plus an optional morning
  summary of everything on your plate. Sent via Textbelt.
- **Single-password gate** — keeps your public subdomain private without a full
  accounts system.
- **Cool & calm UI** — dark theme, violet→teal gradient, Sora + Inter typography.

## Project layout

```
doozy/
├── client/     React + Vite frontend  → deploy to Netlify
├── server/     Express + MongoDB API  → deploy to Render
└── render.yaml Render blueprint for the API
```

---

## Local development

You need Node 18+ and a MongoDB connection string (free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster works great).

### 1. Server

```bash
cd server
npm install
cp .env.example .env      # then fill in MONGODB_URI, etc.
npm run dev               # http://localhost:4000
```

### 2. Client

```bash
cd client
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/api` to `localhost:4000`, so no extra config is needed in dev.

---

## Environment variables

### Server (`server/.env` → set these in Render)

| Var             | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `MONGODB_URI`   | MongoDB Atlas connection string                                      |
| `APP_PASSWORD`  | The single password used to log in (leave unset = open, dev only)    |
| `TEXTBELT_KEY`  | Your **paid** Textbelt API key (SMS won't send without it)           |
| `REMINDER_PHONE`| Default phone reminders are sent to, e.g. `+15551234567`             |
| `CLIENT_ORIGIN` | Allowed CORS origin(s), e.g. `https://doozy.andrewfbutler.com`       |
| `TZ`            | Timezone for daily resets & reminders, e.g. `America/Denver`         |

### Client (`client/.env` → set in Netlify)

| Var            | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `VITE_API_URL` | API origin, e.g. `https://api.doozy.andrewfbutler.com`   |

---

## Deployment

### API → Render

1. New → **Blueprint**, point it at this repo (`render.yaml`), or create a Web Service
   manually with **root directory `server`**, build `npm install`, start `npm start`.
2. Add the secret env vars from the table above in the Render dashboard.
3. Note the service URL (e.g. `https://doozy-api.onrender.com`). Optionally map a
   custom subdomain `api.doozy.andrewfbutler.com`.

> ⚠️ **Render free tier sleeps after ~15 min of inactivity**, and the in-process
> reminder scheduler can't fire while the service is asleep. To get reliable SMS
> reminders, either upgrade to a paid instance, or set up a free uptime pinger
> (e.g. [cron-job.org](https://cron-job.org) or UptimeRobot) hitting
> `https://<your-api>/api/health` every few minutes to keep it awake.

### Frontend → Netlify

1. New site from this repo. `netlify.toml` sets base `client/`, build `npm run build`,
   publish `dist`.
2. Add `VITE_API_URL` pointing at your Render API.
3. Under **Domain settings**, add the custom domain `doozy.andrewfbutler.com`.

### DNS (at your `andrewfbutler.com` registrar)

- `doozy` → CNAME to your Netlify site (`<site>.netlify.app`).
- `api.doozy` → CNAME to your Render service (`<service>.onrender.com`), if using a
  custom API subdomain. Otherwise just point `VITE_API_URL` at the `.onrender.com` URL.

---

## SMS notes

- Textbelt's **free** key (`textbelt`) allows just 1 text/day — fine for a smoke test.
  A paid key is needed for real daily use; only `TEXTBELT_KEY` changes.
- Use **Settings → Send test text** to confirm your key + phone are wired up.
