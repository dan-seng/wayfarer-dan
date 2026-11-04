# AI Usage Transparency Report

In accordance with Section 5 of the take-home specification, this document transparently describes how AI assistance was leveraged, how generated outputs were reviewed, and where engineering judgement corrected automated suggestions.

---

## 1. Tools Used & Scope

* **Antigravity (Gemini 3.8 Flash):**
  * **Database Architecture & Seed Script:** Scaffolding the initial relational schema in `prisma/schema.prisma` and generating the seed data for places, tour slots, and reviews.
  * **Statistical Ranking Formulation:** Formulating the mathematical Bayesian weighted average equation and translating it into an inline SQL aggregation for backend sorting.
  * **Concurrency Test Harness:** Writing the parallel Promise stress test in `tests/booking-concurrency.test.ts` to fire 20 simultaneous booking requests against a nearly-full slot.
  * **UI Component Scaffolding:** Drafting Tailwind CSS layout components for the two-column desktop interface.

---

## 2. Example Prompts & Workflow

### Prompt 1: Honest Ranking Formula
> *"How should we calculate 'top rated' so a single 5-star review doesn't beat a 4.7 museum with 312 reviews, and how can we do this directly in PostgreSQL?"*
* **Action taken:** The AI proposed several methods (Wilson Score vs Bayesian Average). We selected the Bayesian Average ($m=5, C=3.5$) because it directly preserves the 1–5 star scale and is straightforward to explain in `DECISIONS.md`. We adapted the formula into a pure TypeScript function covered by unit tests, as well as an inline PostgreSQL `ORDER BY` clause to guarantee sorting remains on the backend.

### Prompt 2: Parallel Booking Race Condition
> *"How should we prevent overbooking in PostgreSQL when 20 requests hit the last seat at the exact same millisecond?"*
* **Action taken:** The AI suggested both application-level locks and database-level locking. We rejected application-level mutexes because they fail in multi-process/serverless environments. We verified and implemented PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) inside an interactive transaction, and then validated the implementation with an automated concurrent stress test.

---

## 3. When the AI Was Wrong or Unhelpful (And What We Did)

### 1. Next.js 16 Route Segment Configuration Conflict
* **The Issue:** When attempting to ensure the API routes were always dynamically evaluated, the AI added `export const dynamic = "force-dynamic"` to `app/api/places/route.ts`. 
* **How we noticed:** During `next build`, Turbopack failed with the error:
  `Route segment config "dynamic" is not compatible with nextConfig.cacheComponents. Please remove it.`
* **Resolution:** We recognized that Next.js 16 with `cacheComponents` manages dynamic rendering without the legacy route segment config flag. We immediately removed the incompatible export, and the build compiled cleanly.

### 2. Local Database Port Collision
* **The Issue:** The AI originally suggested running Docker Compose with standard port mapping `5432:5432`.
* **How we noticed:** Running `docker run` failed with `address already in use` because a local host PostgreSQL service was already running on port 5432.
* **Resolution:** We mapped port `5433:5432` in `docker-compose.yml` with a configurable fallback (`${POSTGRES_PORT:-5433}`), updated `.env` and `.env.example`, and verified connection health without disturbing the host system.
