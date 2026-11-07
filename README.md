# RCY — MISSION ZERO

**Think Fast. Act Smart. Save Lives.**

A standalone learning-game prototype for Red Crescent Youth, Chatkhil. This repository is intentionally separate from the existing RCY community website.

## Current build

- Responsive landing page with Mission Zero visual identity
- One playable, scenario-based Mission Mode demo
- Decision feedback focused on scene safety
- Command Mode and leaderboard shown as clearly labelled future features

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Project status

This is an early frontend prototype. It does **not** yet include player accounts, a backend, database persistence, real leaderboards, admin tools, multiplayer, or verified RCY membership. Demo decisions and outcomes are illustrative and are not saved.

## Safety and educational scope

Mission Zero is a learning-game concept, not a substitute for certified first-aid, disaster-response, or emergency training. Any educational scenario or guidance must be reviewed by trained and authorized RCY/BDRCS personnel and aligned with current Bangladesh Red Crescent Society / IFRC guidance before public release. In a real emergency, contact the appropriate local emergency services and follow trained responders' instructions.

## Architecture direction

Keep this game independent from the existing RCY community website. Future integration should use a controlled link or documented API rather than coupling the two frontends. Scoring, attempt validation, rate limiting, and leaderboard updates must be server-authoritative before competitive features launch.
