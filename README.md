# Pichavaram Poster Studio

Event posters for **Pichavaram House** (IIT Madras BS Degree), made by the house design team.

Regional Coordinators sign in with an email code and send a poster request: the event (Music Night, Game Night,
Movie Night, Fun Night, Meetup or anything else), the date and time, the Meet link or venue, and the collaborating
houses. The Web Admin assigns it to a designer, the designer uploads the finished poster, and it is emailed to the
RC. Everything runs on free tiers.

**Live:** https://pichavaram-poster-studio.vercel.app

## How it works

```
RC ──► /login (email OTP, allowlist only)
   ──► /studio   event type → houses → details → "Send request"
          └─ saved; every admin gets an email with the brief
Admin ──► /requests/<id>   pick a designer
          └─ the designer gets the brief by email, with the house crests attached
Designer ──► /work → /requests/<id>   upload the poster (PNG/JPG, up to 4 MB)
          └─ the poster is emailed to the RC (from MAIL_FROM) and the request is marked Delivered
RC ──► /requests   track it: Received → In design → Delivered, download the poster
```

- **Roles** (`people.role`): `rc` asks for posters, `designer` makes the ones assigned to them, `admin` assigns
  requests, sees everything and manages people and house logos at `/admin`.
- **Who is hosting** is kept with the request for the records. It is left out of every email so it never ends
  up on a poster.
- **House crests:** the real crests ship in `assets/houses/*.png` (full size, emailed to designers) and
  `public/crests/` (for the site). An admin can upload a replacement for any house.
- **Security:** only allowlisted emails can sign in; codes expire in 10 min, 5 wrong tries lock the code, one
  resend per minute; sessions are signed httpOnly cookies re-checked against the allowlist on every request, so
  removing someone locks them out at once. RCs only see their own requests; designers see the ones assigned to them.

## Run locally

```bash
npm install
echo ADMIN_EMAILS=you@ds.study.iitm.ac.in > .env.local
npm run dev
```

No other setup: the database is a SQLite file in `data/`, and emails (including sign-in codes) are written to
`.outbox/` instead of being sent. Open http://localhost:3000, sign in with the admin email (the code is in the
newest `.outbox/*.json`), then add RCs and designers at `/admin`.

| Command | What it does |
| --- | --- |
| `npm test` | unit tests: auth and validation |
| `npm run build && npm run e2e` | the whole journey (request → assign → upload → delivery) against a production server |

## Deploy for free (Vercel + Turso + Gmail)

1. **Database (Turso, free):** create it from the Vercel Storage tab (Turso) and connect it to the project; it
   sets `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, which the app reads (or set `DATABASE_URL` /
   `DATABASE_AUTH_TOKEN` yourself).
2. **Email (Gmail, free, ~500 mails/day):** turn on 2-Step Verification for the sending Google account, then
   create an App Password (Google Account → Security → App passwords).
3. **Vercel (Hobby, free):** set `AUTH_SECRET` (32+ random chars), `ADMIN_EMAILS`, `SMTP_USER`, `SMTP_PASS`,
   `MAIL_FROM` and `APP_URL` (see `.env.example`), then deploy.
4. Sign in with an admin email and add people at `/admin`; bulk import takes `email, name, region, role` per
   line (role is `rc` or `designer`, default `rc`).

---

Made by Angad Jangid, IIT Madras — Web Admin
