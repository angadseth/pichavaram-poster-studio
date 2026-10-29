# Pichavaram Poster Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private, premium web app where Pichavaram House RCs log in with email OTP, raise a poster request, and get a designer-grade poster (PNG) emailed to them in under a minute — zero paid services.

**Architecture:** Next.js (App Router, Node runtime) serves the UI and API. Posters are code templates (Satori JSX → SVG → PNG via resvg) chosen by a rule-based selector with a stored seed, so any poster can be re-rendered byte-identically without file storage. Data lives in libSQL (local SQLite file in dev, Turso free tier in prod); mail goes through Gmail SMTP (nodemailer), with a file outbox in dev.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, satori, @resvg/resvg-js, @libsql/client, nodemailer, jose, zod, qrcode, vitest, Playwright.

**Spec:** Angad's brief (Hinglish, 2026-10-29) summarised in `PROJECT_MEMORY.md` → "Project". Angad opted out of Q&A, so decisions below marked *(call)* are Claude's.

## Global Constraints

- Zero paid services. Free tiers only: Vercel Hobby, Turso free, Gmail SMTP (app password).
- Only allowlisted emails (RCs + admins) can log in. Login = 6-digit email OTP.
- Event types: `music-night`, `game-night`, `movie-night`, `fun-night`, `meetup`, `others`. Meetup is offline (venue); all others online (Meet link). `others` lets the user pick mode.
- Pichavaram House is always on the poster; extra collaborating houses are multi-select and their logos are placed on the poster.
- "Who is hosting" is stored in DB only, never drawn on the poster.
- Poster size 1080×1350 PNG *(call: Instagram/WhatsApp portrait)*.
- Posters must look hand-designed, not AI: original code templates, real typography, grain/texture; Angad's Canva templates get recreated as extra templates when he shares them.
- Site footer text exactly: `Made by Angad Jangid, IIT Madras — Web Admin`.
- Poster emailed to the requester within 60 s of submit.
- Dark luxury UI: near-black `#0A0A0C`, champagne gold `#D9B26F`, mangrove emerald `#0E5C4A`, display serif + clean sans.

## Review Focus

- Expired / wrong / reused OTP and OTP spam → reject with clear message; max 5 tries, 1 send per 60 s per email.
- Very long titles/descriptions or many collab houses (up to 10) → text auto-shrinks, logos wrap; nothing overflows the poster.
- Gmail SMTP missing or failing → request saved with status `failed`, user sees "Retry email", poster still downloadable.
- Non-owner tries to open someone else's poster URL → 404.
- Invalid Meet link / past date → form validation error before submit.

---

## File Structure

```
src/lib/db.ts            libSQL client + ensureSchema()
src/lib/auth.ts          OTP create/verify, session JWT, getSession()
src/lib/mail.ts          sendMail() → Gmail SMTP or .outbox/ files
src/lib/validation.ts    zod schemas (RequestInput)
src/lib/houses.ts        house list + logo lookup (DB + defaults)
src/poster/types.ts      PosterData, Template, Palette
src/poster/fonts.ts      font loading for satori
src/poster/kit/*.tsx     shared poster parts (LogoRow, DateBlock, Qr, Grain)
src/poster/templates/*   one file per template
src/poster/registry.ts   templates[] with metadata
src/poster/select.ts     selectTemplate(data, recent, seed)
src/poster/render.ts     renderPoster(data, choice) → Buffer (PNG)
src/app/...              pages: / (landing), /login, /studio (wizard), /requests, /admin
src/app/api/...          auth/send-otp, auth/verify, auth/logout, requests, posters/[id], preview, admin/*
tests/                   vitest unit tests; e2e/ Playwright
scripts/render-gallery.ts renders every template×palette to gallery/ for design review
```

## Task 1: Scaffold + DB + design tokens
Next app, Tailwind, fonts, `ensureSchema()` tables: `users(email PK, name, region, role 'rc'|'admin', active)`, `otps(email, code_hash, expires_at, attempts, created_at)`, `houses(id PK, name, logo_data_uri)`, `requests(id PK, email, event_type, data_json, template_id, palette_id, seed, status 'sent'|'failed'|'pending', error, render_ms, created_at, sent_at)`.
Test: `ensureSchema` idempotent on `file::memory:`.

## Task 2: Auth (OTP + session)
`requestOtp(email)` → `{ok}|{error:'not_allowed'|'rate_limited'}`; `verifyOtp(email, code)` → `{ok}|{error:'invalid'|'expired'|'too_many'}`; codes HMAC-SHA256 hashed with `AUTH_SECRET`; 10-min expiry; consumed on success. Session = HS256 JWT cookie `pps_session`, 7 days, httpOnly, sameSite lax.
Tests: allowlist, rate limit, wrong code ×5 lockout, expiry, reuse rejected.

## Task 3: Poster engine
`renderPoster(data: PosterData, choice: {templateId, paletteId, seed}) → Promise<{png: Buffer, ms: number}>`; `selectTemplate(data, recentTemplateIds: string[], seed: number) → {templateId, paletteId}` scores by event type + mode + logo count, excludes the requester's last 2 templates when alternatives exist, seeded PRNG (mulberry32) picks among top scores. ≥10 templates × 3 palettes. Meet link → QR code on online posters.
Tests: every template×palette renders a 1080×1350 PNG; 300-char title and 10 logos render without throwing; selector never returns a template not allowed for the event type; same seed → same choice.

## Task 4: Mail
`sendMail({to, subject, html, attachments})` → Gmail if `SMTP_USER`/`SMTP_PASS` set, else writes `.outbox/<ts>-<to>.json` (dev + e2e). Poster email + OTP email HTML in brand style.

## Task 5: API + request pipeline
`POST /api/requests` (zod-validate → select → render → save → email → status). `POST /api/preview` returns PNG for live preview + shuffle (`seed` param). `GET /api/posters/[id]` owner/admin only. `POST /api/requests/[id]/resend`. Admin: users CRUD, houses CRUD (logo upload ≤300 KB → data URI), stats.

## Task 6: UI
Landing (hero, how-it-works, gallery), Login (email → OTP 6 boxes), Studio wizard (type → houses → details → preview with Shuffle → submit → success), My Requests, Admin. Footer on every page.

## Task 7: Verification
Playwright e2e: login via outbox OTP → create request → poster email lands in outbox → download works → foreign poster 404. Design-judge subagent reviews `gallery/` PNGs; fix what it flags. README with free deploy steps (Turso, Vercel, Gmail app password).
