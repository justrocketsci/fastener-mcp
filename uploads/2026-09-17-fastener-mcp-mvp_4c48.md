# Handoff — Fastener MCP MVP

- **Date:** 2026-09-17 (PT)
- **From:** Michael Scott (CoS)
- **Room:** Fastener MCP
- **Status:** queued — thin Vercel MVP
- **Idea:** MCP / agent-facing fastener knowledge: size, length, spec (aerospace/mil/ISO), material capabilities. Backbone = fastener DB. Monetization TBD (paid MCP access later).
- **v0 scope (ship this):**
  1. Marketing landing (problem → MCP for AI CAD → sample query demo CTA)
  2. Small seeded fastener DB (JSON/SQLite or static) with ~20–50 representative parts across ISO / AN / MS-style examples (clearly labeled sample data)
  3. Public HTTP API on Vercel that agents can call: search by diameter/length/spec/material; return structured fastener cards
  4. Simple web UI: search/browse demo using Paper DS (Agent Page / default design system — primary `#C4453C`, cool neutrals)
  5. MCP stub docs page describing tools (list_fasteners, get_fastener, recommend_fastener) wired to the same API — full MCP stdio optional if easy; HTTP is the deployable MVP
- **Out of v0:** full catalog licensing, live paid billing, Onshape/Adam integration, real mil-spec completeness claims
- **Stack:** Next.js + TS, Tailwind + shadcn, Paper DS tokens, Vercel. Clerk/Stripe stubs only if cheap; don’t block MVP.
- **Owners:**
  - Design Bot: landing + search UI chrome from Paper DS; flag forks
  - Engineer: Origin repo, seed DB, API + UI, Vercel deploy
- **Output:** live URL + how to verify; ping Anu in room when MVP is up
- **Do not assume:** authoritative mil/aerospace data; paid customers; MCP marketplace listing
- **Forbidden:** send/publish/spend without Anu yes; oversell sample data as certified catalog
