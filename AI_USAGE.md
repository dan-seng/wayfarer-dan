# AI Usage Transparency Report

This document transparently describes how AI assistance was leveraged, how generated code was audited, and where human engineering judgment corrected automated suggestions.

---

## 1. Tools & Scope

* **Tool:** Antigravity (powered by Gemini 3.8 Flash).
* **Scope of Assistance:**
  * Initial Prisma schema scaffolding and realistic seed data generation.
  * Mathematical formulation of the Bayesian average damping curve ($m=5, C=3.5$).
  * Parallel Promise test harness in [`tests/booking-concurrency.test.ts`](file:///home/dan-seng/Projects/wayfarer/tests/booking-concurrency.test.ts).
  * Tailwind CSS layout scaffolding and mobile touch optimizations.

---

## 2. Key Prompts & Iterations

### Ranking Implementation
* **Prompt:** *"How should we calculate 'top rated' so a single 5-star review doesn't beat a 4.7 museum with 312 reviews, and how can we do this directly in PostgreSQL without computing the global average per-row?"*
* **Outcome:** Evaluated Wilson Score vs Bayesian Average. Selected Bayesian Average for transparent 1–5 star interpretability. Combined with a single-pass CTE (`WITH global_stats AS ...`) and `CROSS JOIN` directly in PostgreSQL.

### High-Concurrency Booking Protection
* **Prompt:** *"How should we prevent overbooking in PostgreSQL when 20 requests hit the last seat simultaneously?"*
* **Outcome:** Rejected Node.js in-memory mutexes (which fail across multi-process/serverless workers). Selected PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) inside an interactive transaction. Validated with a 20-worker parallel stress test.

---

## 3. Where the AI Was Wrong or Corrected

1. **Next.js 16 Route Segment Config Conflict:**
   * *Issue:* The AI added `export const dynamic = "force-dynamic"` to `app/api/places/route.ts`.
   * *Error:* `next build` failed with `Route segment config "dynamic" is not compatible with nextConfig.cacheComponents`.
   * *Correction:* Removed the legacy export; Next.js 16 handles dynamic evaluation automatically.

2. **Next.js 16 Prerender Bailout Interception:**
   * *Issue:* Reading `request.url` in an API route during build prerendering throws `NEXT_PRERENDER_INTERRUPTED` by design to signal dynamic evaluation. The AI caught this in a generic `catch (error)` block and logged a misleading query failure.
   * *Correction:* Added `if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") throw error;` so Next.js handles prerender bailouts silently and cleanly.

3. **Host Port Collision & pgAdmin Superusers:**
   * *Issue:* The AI initially overlooked host port collisions with existing native PostgreSQL services on port 5432.
   * *Correction:* Managed Docker port bindings cleanly, and configured both `wayfarer` and `postgres` superuser roles inside the container so external GUIs (pgAdmin) connect with standard credentials out of the box.
