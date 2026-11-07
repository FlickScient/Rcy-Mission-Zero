# RCY — MISSION ZERO

**Think Fast. Act Smart. Save Lives.**

A standalone learning-game project for Red Crescent Youth, Chatkhil. This repository is intentionally separate from the existing RCY community website.

## Current build

- Responsive Mission Zero landing page and visual identity
- Playable Mission Mode scenario prototype
- Standalone Express API with a mission catalogue endpoint
- Server-side decision evaluation and score calculation
- PostgreSQL attempt persistence with duplicate-attempt protection
- Basic API hardening: Helmet headers, CORS allow-list, JSON size limit and rate limiting
- Command Mode, accounts, admin tools and competitive leaderboard are not implemented yet

## Requirements

- Node.js 20+
- PostgreSQL 14+ (for saving attempts)

## Run the frontend

```bash
npm install
npm run dev
```

## Run the API

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Apply the schema once:

```bash
psql "$DATABASE_URL" -f server/schema.sql
```

4. Start the API:

```bash
npm run api:dev
```

The API listens on port 3001 by default. The mission screen submits decisions to the API when `VITE_API_BASE_URL=http://localhost:3001` is set in the frontend environment. Without that variable, it runs in clearly labelled local demo mode.

## API routes

- `GET /health` — process and database readiness
- `GET /api/missions` — published demo mission catalogue
- `GET /api/missions/:missionId` — one mission briefing and its choices
- `POST /api/missions/:missionId/attempts` — validate a choice and calculate its result on the server

Attempt request:

```json
{
  "attemptId": "a-valid-uuid",
  "choiceId": "secure"
}
```

The API computes the score; it never trusts a score supplied by the browser. A repeated attempt ID is rejected. Attempts are currently anonymous and are not eligible for a public leaderboard.

## Important limitations

This is an early development foundation, not a production competition platform. There is no player authentication, account ownership, admin authorization, multi-instance rate-limit store, or leaderboard. Do not publish competitive rankings until authenticated player identity, abuse controls, review workflows and server-side validation are in place. The in-memory rate limiter is per process.

## Safety and educational scope

Mission Zero is a learning-game concept, not a substitute for certified first-aid, disaster-response, or emergency training. Any educational scenario or guidance must be reviewed by trained and authorized RCY/BDRCS personnel and aligned with current Bangladesh Red Crescent Society / IFRC guidance before public release. In a real emergency, contact the appropriate local emergency services and follow trained responders' instructions.

## Architecture direction

Keep this game independent from the existing RCY community website. Future integration should use a controlled link or documented API rather than coupling the two frontends.
