# Pichavaram Poster Studio

Event posters for **Pichavaram House** (IIT Madras BS Degree), designed and emailed in about a minute.

Regional Coordinators sign in with an email code, describe their event (Music Night, Game Night, Movie Night,
Fun Night, Meetup or anything else), pick the collaborating houses, preview the poster, try other designs, and
get a 1080×1350 PNG in their inbox. Everything runs on free tiers.

## How it works

```
RC ──► /login (email OTP, allowlist only)
   ──► /studio  event type → houses → details → preview ("Try another design")
   ──► POST /api/requests
          ├─ validate (zod)
          ├─ pick a design: event type + mood words, skips your last 2 designs
          ├─ render: satori (JSX → SVG) → resvg (SVG → PNG), ~1 s
          ├─ save request + seed (the poster can be re-rendered any time, no file storage)
          └─ email the PNG (Gmail SMTP)
Admin ──► /admin  stats, every request (with who is hosting), RC list, house logos
```

- **Designs** live in `src/poster/templates/`: 10 original templates × 3 colourways. They are code, so they
  never look AI-generated and always fit the text: long titles shrink, logos wrap into balanced rows, online
  events get a QR code for the Meet link.
- **Who is hosting** is stored with the request and shown to admins. It is never printed on the poster.
- **Security:** only allowlisted emails can sign in; codes expire in 10 min, 5 wrong tries lock the code, one
  resend per minute; sessions are signed httpOnly cookies and are re-checked against the allowlist on every
  request, so removing an RC locks them out immediately. RCs can only see their own posters.

## Run locally

```bash
npm install
echo ADMIN_EMAILS=you@ds.study.iitm.ac.in > .env.local
npm run dev
```

No other setup: the database is a SQLite file in `data/`, and emails (including sign-in codes) are written to
`.outbox/` instead of being sent. Open http://localhost:3000, sign in with the admin email (code is in the
newest `.outbox/*.json`), then add RCs and house logos at `/admin`.

| Command | What it does |
| --- | --- |
| `npm test` | unit tests: auth, validation, template selection, every template renders |
| `npm run build && npm run e2e` | full journey against a production server |
| `npm run gallery [-- <id>] [-- --stress]` | renders every design into `gallery/` for review |
| `npm run showcase` | regenerates the sample posters on the landing page |

## Deploy for free (Vercel + Turso + Gmail)

1. **Database (Turso, free):** `turso db create poster-studio`, then `turso db show poster-studio --url`
   and `turso db tokens create poster-studio`.
2. **Email (Gmail, free, ~500 mails/day):** turn on 2-Step Verification for the sending Google account, then
   create an App Password (Google Account → Security → App passwords).
3. **Vercel (Hobby, free):** import this repo and set the environment variables from `.env.example`:
   `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET` (32+ random chars), `ADMIN_EMAILS`, `SMTP_USER`,
   `SMTP_PASS`, `MAIL_FROM`, `APP_URL`.
4. Deploy, sign in with an admin email, and add the RCs (bulk import accepts `email, name, region` per line).

## Adding a design

Create `src/poster/templates/<id>.tsx` exporting a `Template` (see `velvet-stage.tsx`), register it in a
`group-*.ts` file, then `npm run gallery -- <id> --stress` and look at the PNGs. Satori rules: every element
with more than one child needs `display: flex`; decorative art goes in an SVG string via `<Art>`; text inside
that SVG is not rendered.

---

Made by Angad Jangid, IIT Madras — Web Admin
