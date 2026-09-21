# RNI Realestate — Property Portal

Full-stack real estate marketplace: **React (Vite)** + **Node/Express** + **MySQL/MariaDB**.

Four account types with separate logins and dashboards — **Owner**, **Agent**, **Builder**,
**Services** — plus 3D walkthrough embeds on property listings.

---

## Quick start

```bash
# 1. Database (XAMPP MySQL/MariaDB must be running on 3306)
cd server
cp .env.example .env          # edit credentials if yours differ
npm install
npm run db:reset              # creates the schema and seeds demo data

# 2. API  →  http://localhost:5001  (production: https://nri-0iyj.onrender.com)
npm run dev

# 3. Client  →  http://localhost:5173   (new terminal)
cd ../client
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to `http://localhost:5001`, so no CORS setup is needed in dev.

### Demo logins — password `Test@123`

| Role | Email | Dashboard |
|---|---|---|
| Owner | `owner@demo.com` | listings, enquiries, shortlist |
| Agent | `agent@demo.com` | full inventory + lead pipeline |
| Builder | `builder@demo.com` | projects + properties |
| Services | `service@demo.com` | service listings + leads |
| Admin | `admin@demo.com` | everything |

The login screen has the four role tabs from the reference design. Logging in under the
wrong tab is rejected with a message naming the correct one.

---

## 3D walkthrough / virtual tour

Listings support an embedded 3D tour. On **Post Property → Photos & 3D**, paste either a
full `<iframe …>` snippet or a plain share link.

**How it is handled (this matters):** the pasted HTML is never stored or re-rendered.
`server/src/utils/embed.js` extracts the `src`, checks the host against an allowlist,
normalises share links to their embeddable form (a YouTube `watch?v=` URL becomes a
`youtube-nocookie.com/embed/` URL), and stores only that URL in `properties.tour_url`.
The client builds its own sandboxed `<iframe>` around it. Anything off the allowlist is
rejected with a 422.

Allowed providers: Matterport, Kuula, YouTube, Vimeo, Sketchfab, Google Street View,
Roundme, Momento360, InsideMaps, Cupix, Panoee.

On the detail page the tour is a tab next to Photos, click-to-load (so a listing page
doesn't pay for the Matterport bundle unless the visitor asks), with a fullscreen mode.
Listings with a tour show a **3D** badge in search results.

---

## AI property assistant

Every property page carries a floating assistant (bottom-right launcher, opens on
click). It summarises the listing and answers follow-up questions about it.

**Grounding:** the model never sees the raw database row. `server/src/services/propertyBot.js`
builds a labelled **fact sheet** from the listing and instructs the model to use nothing
else — missing fields are written as `Not specified` so it can tell "no lift" apart from
"we don't know". It is explicitly forbidden from inventing nearby schools, commute times,
price trends, or legal/loan opinions.

- Model: `claude-opus-5`, low effort (summarising is not a hard reasoning task).
- Server-side refusal fallbacks are enabled, so a false-positive safety decline is
  re-served by another model inside the same call rather than erroring.
- The stable system prompt carries a cache breakpoint; the per-property fact sheet goes
  after it, so the prefix is reused across properties.
- Summaries are cached in `properties.ai_summary` and cleared automatically when the
  listing is edited. Nothing is fetched until the visitor opens the widget.
- Rate limited to 40 calls per 10 minutes per IP.

**Without an API key** the summary falls back to a deterministic template built from the
same fact sheet (so the widget still works), and follow-up chat returns a 503 explaining
what to set. Add `ANTHROPIC_API_KEY` to `server/.env` to enable the real thing.

| Route | Purpose |
|---|---|
| `GET /api/properties/:id/summary` | Cached summary; `?refresh=1` regenerates |
| `POST /api/properties/:id/ask` | Follow-up question (`{question, history}`) |
| `GET /api/properties/meta/assistant` | Whether the bot is live + suggested questions |

## Project layout

```
server/
  src/
    config/db.js            mysql2 pool + helpers
    db/schema.sql           all tables
    db/init.js              creates DB, applies schema
    db/seed.js              10 users, 20 properties, 6 projects, 8 services, 25 leads
    middleware/auth.js      JWT sign/verify, requireAuth, requireRole
    utils/embed.js          3D tour URL extraction + host allowlist
    utils/helpers.js        slugs, pagination, null-coercion
    routes/                 auth, property, project, service, lead, user, stats, upload
client/
  src/
    api/client.js           axios instance, token interceptor, error helpers
    context/                AuthContext, ToastContext
    components/             Navbar, Footer, cards, RoleTabs, TourEmbed, ImagePicker, ui.jsx
    pages/                  public pages
    pages/dashboard/        role-aware dashboard
    styles/globals.css      the whole design system
```

## API

| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/register` | role-aware validation (builder needs a company, service needs a category) |
| POST | `/api/auth/login` | optional `role` must match the account |
| GET | `/api/auth/me` · PUT `/profile` · PUT `/password` | |
| GET | `/api/properties` | filters: purpose, type, city, bhk, min/maxPrice, minArea, furnishing, possession, postedBy, verified, q, sort, page |
| GET | `/api/properties/:idOrSlug` | images, amenities, similar, is_favorite |
| GET | `/api/properties/meta/cities` · `/meta/localities` · `/meta/tour-providers` | |
| GET | `/api/properties/mine/list` · `/favorites/mine` | auth |
| POST/PUT/DELETE | `/api/properties[/:id]` | owner/agent/builder; ownership enforced |
| POST | `/api/properties/:id/favorite` | toggle |
| CRUD | `/api/projects` | builder only |
| CRUD | `/api/services` | service partner only |
| POST | `/api/leads` | public enquiry, routed to the listing's owner |
| GET/PATCH/DELETE | `/api/leads[/:id]` | received leads, status pipeline |
| GET | `/api/users` · `/api/users/:id` | agent/builder directory + public profiles |
| GET | `/api/stats/public` · `/api/stats/dashboard` | homepage counters, role-aware KPIs |
| POST | `/api/upload` | multipart `images`, 5 MB each, images only |

## Design

Navy `#0b1b3f` + gold `#e4a11b`, Plus Jakarta Sans headings / Inter body, soft elevation,
fully responsive. All styling lives in `client/src/styles/globals.css` — no CSS framework,
no icon package (icons are inline SVG in `components/Icons.jsx`).

## Notes

- The dev database is MariaDB 10.4 via XAMPP. MariaDB stores `JSON` as `LONGTEXT`, so the
  API parses those columns defensively — it works the same on real MySQL 8.
- Passwords are bcrypt hashed; the auth routes are rate limited; every write route checks
  ownership before touching a row.
- Uploaded files go to `server/uploads/` and are served from `/uploads`. For production,
  move this to S3 or similar.
- `JWT_SECRET` in `.env` is a local dev value — replace it before deploying.
