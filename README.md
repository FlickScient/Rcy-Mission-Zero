# RCY — MISSION ZERO
**Think Fast. Act Smart. Save Lives.**

Independent educational decision game for Red Crescent Youth, Chatkhil; separate from the existing RCY website.

## Features
Six server-owned Mission Mode scenarios; Command Mode resource-allocation simulation; bcrypt registration/login and expiring JWT; player profiles, XP, best scores and achievements; daily challenge using Bangladesh time; weekly, monthly and all-time leaderboard; admin-managed RCY/college verification; first-admin bootstrap, admin overview and attempt review; PostgreSQL persistence, server-side scoring, duplicate protection, Helmet, CORS and rate limits.

## Setup
Node.js 20+ and PostgreSQL 14+ required.
```bash
npm install
cp .env.example .env
psql "$DATABASE_URL" -f server/schema.sql
npm run api:dev
npm run dev
```
Configure DATABASE_URL, JWT_SECRET (32+ random characters), ADMIN_BOOTSTRAP_KEY (separate private secret), CLIENT_ORIGIN and VITE_API_BASE_URL. Run API and frontend separately. Never commit server secrets.

## First admin
Register the intended account, retrieve its UUID from the users table, then use the admin bootstrap endpoint/panel with that UUID and server-side ADMIN_BOOTSTRAP_KEY. It only works while no admin exists. Rotate/remove the bootstrap secret afterward.

## API
GET /health, /api/missions; POST /api/auth/register, /api/auth/login; GET /api/me; POST /api/missions/:id/attempts; GET /api/daily; POST /api/daily/attempts; POST /api/command/attempts; GET /api/leaderboard?period=weekly|monthly|all-time. Admin: POST /api/admin/bootstrap; GET /api/admin/overview, /api/admin/users and /api/admin/attempts; PATCH /api/admin/users/:id/verification and /api/admin/attempts/:id/review.

## Fair play and deployment
Scores are server-calculated. XP is awarded only when best results improve; daily completion is unique per account/day. Weekly ranking currently aggregates recorded weekly mission scores. In-process rate limiting is only a baseline. Public competition still needs shared rate limiting, stronger identity verification, moderation, monitoring, backups, security review and load testing. Production requires owner-controlled frontend/API hosting, managed PostgreSQL, TLS, secrets, exact CORS origins, schema application and smoke tests. No hosting credentials are included.

## Safety
This is a game, not certified first-aid, medical, disaster-response or emergency training. All scenarios and answer keys are illustrative drafts and have **not** been reviewed or approved by BDRCS/IFRC. Qualified, authorized RCY/BDRCS reviewers must validate every educational item against current official guidance before public release. Game scores are not proof of real-world competence. In emergencies, contact appropriate emergency services and follow trained responders.
