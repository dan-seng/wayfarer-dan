# Wayfarer — Honest Ratings, Fair Bookings

A full-stack city guide and tour booking application built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, and **Prisma ORM 7**.

Wayfarer fixes two critical flaws by design:
1. **Honest Ratings:** Uses a Bayesian weighted average (IMDb damping model) so heavily-reviewed attractions (e.g. 312 reviews @ 4.7★) outrank brand-new places with a single 5-star review.
2. **Fair Bookings (Zero Overbooking):** Uses PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) inside interactive transactions to guarantee zero overbooking under high-concurrency race conditions.

---

## ⚡ Quick Start (Fresh Clone in 3 Commands)

From a fresh clone of this repository, run:

```bash
# 1. Start the PostgreSQL database container
docker compose up -d

# 2. Install dependencies, run schema migrations, and seed initial data
npm install && npm run setup

# 3. Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Environment Variables:** A pre-configured [.env.example](file:///.env.example) is provided out of the box with standard PostgreSQL defaults (`localhost:5432`, db: `wayfarer_db`, user: `wayfarer`). `npm run setup` automatically copies it to `.env` if not already present.

---

## 🧪 Running the Automated Tests

All tests run in **one single command**:

```bash
npm test
```

This runs both required test suites using Node's native test runner with `tsx`:
1. **Honest Ranking Unit Test (`tests/ranking.test.ts`):** Proves that a place with 312 reviews at 4.7★ decisively outranks a 1-review 5.0★ café, verifies convergence as volume grows, and tests 0-review edge cases.
2. **Parallel Booking Stress Test (`tests/booking-concurrency.test.ts`):** Creates a nearly-full slot (2 seats remaining) and fires **20 simultaneous booking requests in parallel**. Proves that exactly 2 succeed, 18 receive clean "fully booked" responses, and the database capacity integrity holds without overbooking.

---

## 🌟 Key Features & Interface

```text
┌────────────────────────────────────────────────────────────────────────┐
│  ● Wayfarer   [All] [History] [Food] [Nature]         Acting as: [Sara ▼]│
├───────────────────────────────────┬────────────────────────────────────┤
│ Sort: [Top rated (Honest) ▼]      │ National Museum                    │
│                                   │ History · 4.7 ★ (312 reviews)      │
│ National Museum                   │                                    │
│ 4.7 ★ · 312 reviews · Honest: 4.68│ Guided tours                       │
│                                   │ • Sat 09:00  4 of 10 left  [ Book ]│
│ Holy Trinity Cathedral            │ • Sat 11:00  1 of 10 left  [ Book ]│
│ 4.6 ★ · 188 reviews · Honest: 4.57│ • Sat 14:00  Fully booked  [ Full ]│
│                                   │                                    │
│ Brand-new café                    │ Reviews                            │
│ 5.0 ★ · 1 review   · Honest: 3.75 │ ★★★★★ "Must see in Addis!" - Abel  │
│ ↑ 1 review doesn't beat 312 reviews│                                   │
│                                   │ Rate as Sara: ★★★★★                │
│ [← Previous]  Page 1 of 2  [Next →]│ [Write a review...]      [Submit]  │
└───────────────────────────────────┴────────────────────────────────────┘
```

* **"Acting as" User Switcher:** Seamlessly switch between seeded personas (**Sara**, **Abel**, **Liya**) in the top-right header via `x-user-id`. No password authentication required.
* **Backend Category Filtering & Sorting:** Filter places by `All`, `History`, `Food`, and `Nature`. Sort by `Top rated (Honest)`, `Most reviewed`, `Highest raw stars`, or `Name`. All filtering and mathematical sorting happen strictly on the PostgreSQL backend.
* **Review System with Upsert:** 1–5 star rating with text review. Enforces **one review per user per place**; reviewing again updates the user's existing review in place.
* **Real-Time Seat Indicators & Booking:** Displays real-time seats left (e.g. `4 of 10 seats left`, `1 of 10 seats left`, `Fully booked`). Prevents double-clicks and gracefully communicates when a slot is full.
* **Responsive Desktop & Mobile:** Clean two-column desktop discovery layout with responsive Master-Detail segmentation on phone screens.
* **Dedicated Standalone Route:** Deep-linkable place pages at `/places/[id]` with `← Back to all places` navigation.

---

## 📂 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── bookings/route.ts      # Concurrency-safe tour booking endpoint
│   │   ├── places/route.ts        # Backend filtered and Bayesian sorted places
│   │   ├── places/[id]/route.ts   # Detailed place view with slots and reviews
│   │   ├── reviews/route.ts       # Review submission with upsert logic
│   │   └── users/route.ts         # User list for persona switcher
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main 2-column interactive client
├── components/
│   ├── Header.tsx                 # Branding, category filters, and persona switcher
│   ├── PlaceCard.tsx              # Place card with rating indicators and benchmark tip
│   ├── PlaceDetail.tsx            # Detail pane orchestrator
│   ├── ReviewForm.tsx             # Interactive 1-5 star selector & submission
│   ├── ReviewsList.tsx            # Formatted traveller reviews list
│   └── TourBookingList.tsx        # Guided tours with seat status & booking actions
├── lib/
│   ├── booking.ts                 # Pessimistic locking (FOR UPDATE) booking engine
│   ├── prisma.ts                  # Prisma 7 client singleton with pg driver adapter
│   └── ranking.ts                 # Pure Bayesian Weighted Average ranking function
├── prisma/
│   ├── schema.prisma              # Relational schema (User, Place, Review, TourSlot, Booking)
│   └── seed.ts                    # Realistic seed script for places, slots, and users
├── tests/
│   ├── booking-concurrency.test.ts # 20-request parallel race condition test
│   └── ranking.test.ts            # Mathematical ranking algorithm unit tests
├── DECISIONS.md                   # Problem solving explanation (ranking & locking)
├── AI_USAGE.md                    # Transparent report of AI tools and prompts used
├── docker-compose.yml             # PostgreSQL 16 container definition
└── package.json                   # Scripts: dev, build, seed, setup, test
```

---

## ⚠️ Known Limitations

1. **Fixed Prior Baseline ($C = 3.5$):** The Bayesian ranking currently uses a fixed neutral baseline of 3.5. With more time, $C$ could be computed dynamically as the real-time average across all places in the city or per-category.
2. **In-Memory Hold Timers:** The current implementation immediately books the seat upon clicking. In a full production checkout flow, a temporary 5-minute seat hold with an expiration worker (e.g., Redis TTL) would hold seats during payment entry.
