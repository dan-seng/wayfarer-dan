# Architectural & Engineering Decisions

## 1. Honest Ranking (Bayesian Weighted Average)

### Problem
A naive arithmetic average ($\frac{\sum ratings}{v}$) treats 1 review of 5.0★ as superior to 312 reviews averaging 4.7★, misleading travellers.

### Solution & Formula
We implemented a **Bayesian Weighted Average** (IMDb model) with prior weight $m = 5$ and baseline rating $C = 3.5$:

$$W = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$

* **1-review 5.0★ café:** $\frac{1}{6}(5.0) + \frac{5}{6}(3.5) = \mathbf{3.75}$ (damped toward baseline).
* **312-review 4.7★ museum:** $\frac{312}{317}(4.7) + \frac{5}{317}(3.5) = \mathbf{4.68}$ (decisively outranks the 1-review café).
* **Places with 0 reviews:** Handled consistently via SQL fallback to baseline ($3.50$).
* **Where it breaks:** A fixed baseline ($C = 3.5$) slightly drags down niche high-performing categories in cities where average ratings skew higher (e.g. 4.3). A dynamic category-level empirical mean would resolve this.

### Database Aggregation & CTE Optimization
* **Single-Pass Mean:** Global average rating is computed once in a CTE (`WITH global_stats AS (SELECT AVG(rating)...)`) and joined via `CROSS JOIN`, eliminating per-row subquery overhead.
* **Backend Sorting & Pagination:** Sorting (`ORDER BY bayesian_rating DESC`) and pagination (`LIMIT`/`OFFSET`) execute in PostgreSQL, not in Node.js memory.

---

## 2. Concurrency-Safe Bookings (Pessimistic Locking)

### Problem
Concurrent requests for the last seat cause race conditions where both read `available = 1` and insert bookings, causing overbooking.

### Solution: `SELECT ... FOR UPDATE`
Bookings run inside an interactive PostgreSQL transaction:
```sql
SELECT id, capacity, starts_at FROM tour_slots WHERE id = $1 FOR UPDATE;
SELECT COALESCE(SUM(seats), 0) AS booked_count FROM bookings WHERE slot_id = $1;
-- If booked_count + seats <= capacity -> INSERT INTO bookings; else -> ROLLBACK & return 409 Conflict.
```

### Backend Enforcement (Zero Reliance on Frontend Validation)
* **Pessimistic Lock:** Queues parallel requests at the database engine level. Subsequent requests read updated booked seats and fail cleanly.
* **HTTP 409 Conflict:** Returned when seats are insufficient (avoids 500s).
* **Strict Rules:** Rejects non-positive seats (`seats <= 0`), past tours (`startsAt <= NOW()`), and non-existent users.
* **Double-Click Deduplication:** Identical booking requests within a 5-second window return the existing booking with HTTP 200 (idempotency).
* **Automated Proof:** Verified by [`tests/booking-concurrency.test.ts`](file:///home/dan-seng/Projects/wayfarer/tests/booking-concurrency.test.ts) (20 parallel requests for 2 seats $\rightarrow$ exactly 2 succeed, 18 receive 409).
* **Where it breaks:** Under massive hyper-scale (thousands of bookings/sec for a single hot slot), row-level locks hold database connection threads open. At that scale, an in-memory queue (Redis Lua / BullMQ) should serialize requests before hitting PostgreSQL.

---

## 3. Responsive UX & Routing

* **Dual Views:** Side-by-side 2-column discovery on desktop; dedicated deep-linkable route at `/places/[id]` (wrapped in `<Suspense>` for Next.js 16 Partial Prerendering).
* **Mobile Master-Detail:** Below 1024px, a segmented switcher toggles between list and details. Tapping a card automatically transitions to details with a `← Back to places list` action.
* **Touch-Friendly:** Padded touch targets ($\ge 44$px, `touch-manipulation`) and mobile-centered toasts.

---

## 4. Setup in $\le 3$ Commands & Standard Port 5432

* **Standard Port:** Mapped to standard PostgreSQL port `5432:5432` with pre-configured `wayfarer` and `postgres` roles for instant pgAdmin connection.
* **Self-Bootstrapping (`npm run setup`):** Automatically copies `.env.example` to `.env` if missing, applies schema migrations, and seeds realistic data.
* **Run in 3 commands:**
  1. `docker compose up -d`
  2. `npm install && npm run setup`
  3. `npm run dev` (or `npm test` for 1-command testing)

---

## 5. Future Improvements

1. **Redis Idempotency Keys:** Client-generated UUID `Idempotency-Key` headers for multi-instance horizontal scale.
2. **Dynamic Empirical Bayes:** Compute $C$ dynamically per category or city-wide via background jobs.
3. **Live Seat Updates:** Server-Sent Events (SSE) or WebSockets for live remaining seat counters.
4. **Seat Reservation Holds:** 5-minute checkout reservation hold pipeline with TTLs.
