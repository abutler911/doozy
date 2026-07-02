# ✦ Doozy

A delightfully simple, single-user todo app that helps you **prioritize your day**,
keep up with **daily rituals** (reading, piano, …), and get **SMS nudges** so nothing
slips. Built with React + Express + MongoDB, with SMS via [Textbelt](https://textbelt.com).

> Make today a doozy.

---

## Features

- **Smart quick-add** — just type naturally and Doozy parses it. `pay rent fri 9am
  !urgent` becomes a task due Friday, with a 9am reminder, at Urgent priority. A live
  preview shows exactly what it detected before you hit Add. Understands dates (`today`,
  `tomorrow`, `next tue`, `apr 15`, `in 3 days`), times (`9am`, `at 14:30`), priorities
  (`!urgent`/`!high`/`!low`, `p1`–`p4`, `!!!`), recurrence (`daily`, `weekdays`,
  `every mon wed fri`), and repeating to-dos (`weekly`, `monthly`, `yearly`).
- **Prioritization** — every task has a priority (Low → Urgent); the list sorts by it,
  and you can re-prioritize with a single click.
- **Recurring to-dos** — give any one-off task a weekly, monthly, or yearly cadence
  (rent on the 1st, trash every week, a yearly renewal). Checking it off doesn't file it
  away — it rolls forward to the next due date automatically, so it's always waiting when
  it's next due.
- **Daily rituals** — recurring habits that reappear every day and reset automatically
  at midnight (tracked per-date, so your streak data stays intact). A progress bar
  tracks the day, and finishing every ritual earns a little confetti.
- **Keyboard shortcuts** — `n` focuses the composer, `/` opens search, `Esc`
  backs out of anything.
- **Notes** — a Google Keep-style board for jotting things down: color-tinted cards you
  can pin to the top, archive out of the way, and search through. Switch between Tasks
  and Notes from the header.
- **SMS reminders** — per-task reminders at a chosen time, plus an optional morning
  summary of everything on your plate. Sent via Textbelt.
- **Actionable push reminders** — task reminders arrive as push notifications with
  **Done ✓** and **Snooze 30m** buttons, so you can act without opening the app.
- **Streak-at-risk nudges** — an optional evening warning (Settings → streak nudge)
  listing rituals with a live 🔥 streak you haven't done yet today.
- **Single-password gate** — keeps your public subdomain private without a full
  accounts system.
- **Cool & calm UI** — dark theme, violet→teal gradient, Sora + Inter typography.
- **Installable PWA** — add to your Android/iOS home screen; works offline (app
  shell cached, API is network-first). An in-app **Install** button appears when
  your browser supports it.

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
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys (`npx web-push generate-vapid-keys`) |
| `VAPID_SUBJECT` | Contact URI for push, e.g. `mailto:you@example.com`                  |

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

> ⚠️ The blueprint pins a paid **starter** instance: the in-process reminder
> scheduler can only fire while the service is awake, and Render's free tier
> sleeps after ~15 min of inactivity. If you drop back to `plan: free`, set up
> an uptime pinger (e.g. [cron-job.org](https://cron-job.org) or UptimeRobot)
> hitting `https://<your-api>/api/health` every few minutes — but reminders,
> streak nudges, and snoozes are only reliable on an always-on instance.

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

## Push notifications

Doozy can send **free web push** notifications in addition to SMS:

1. Generate VAPID keys: `npx web-push generate-vapid-keys`, then set
   `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` on the server.
2. Open **Settings → Push notifications** and toggle *Send reminders as push on
   this device*. Grant the browser permission, then hit **Send test push**.
3. Reminders and the daily summary then fire as push to every subscribed device,
   alongside SMS (SMS behavior is unchanged).

> Push requires the app to be served over **HTTPS** (or `localhost`) and, on iOS,
> the app must be **installed to the home screen** first.

## SMS notes

- Textbelt's **free** key (`textbelt`) allows just 1 text/day — fine for a smoke test.
  A paid key is needed for real daily use; only `TEXTBELT_KEY` changes.
- Use **Settings → Send test text** to confirm your key + phone are wired up.
