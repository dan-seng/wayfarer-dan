# Architectural & Engineering Decisions

This document outlines the core problem-solving choices made for **Wayfarer**, including the mathematical ranking formula, concurrency control under high load, and potential future improvements.

---

## 1. Honest Ranking Algorithm

### The Problem
A naive arithmetic average ($\bar{R} = \frac{\sum ratings}{v}$) treats every sample size with equal confidence. A newly listed café with a single 5-star review ($v = 1, R = 5.0$) achieves a perfect score and outranks an established cultural landmark with 312 reviews averaging 4.7. This misleads travellers and distorts discovery.

### The Solution: Bayesian Weighted Average (Empirical Damping)
We implemented a **Bayesian Weighted Average** (the algorithm popularized by IMDb’s Top 250):

$$W = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$

Where:
* $v$: The number of reviews for the place (`reviewCount`).
* $R$: The naive arithmetic average rating of the place (`averageRating`).
* $m$: The prior weight / confidence threshold (`DEFAULT_PRIOR_WEIGHT = 5`).
* $C$: The prior global baseline rating (`DEFAULT_BASELINE_RATING = 3.5`).

### Why This Works & Why We Defend It
* **Zero or low volume penalty:** When $v = 1$, the place receives $\frac{1}{6}$ weight on its 5.0 rating and $\frac{5}{6}$ weight on the 3.5 baseline, resulting in a score of **3.75**.
* **Statistical convergence:** When $v = 312$ with $R = 4.7$, the place receives $\frac{312}{317} \approx 98.4\%$ weight on its actual average, resulting in an honest score of **4.68**.
* **Outcome:** The museum ($4.68$) decisively and fairly outranks the single-review café ($3.75$).

### Alternatives Considered & Where They Break
1. **Naive Average with Minimum Review Gate (e.g. $v \ge 5$ to appear):**
   * *Why rejected:* Completely hides new businesses from search results until they reach arbitrary volume, harming cold starts.
2. **Wilson Score Interval (Lower Bound of Binomial Proportion):**
   * *Why rejected:* Wilson score is designed for binary (upvote/downvote) systems. While it can be adapted to continuous ratings (by scaling 1–5 to 0–1), the Bayesian formulation is more transparent to explain, directly preserves rating scale units (1–5), and translates cleanly to an inline SQL expression.
3. **Where the Bayesian Formula Breaks:**
   * It assumes a fixed prior baseline ($C = 3.5$). In a city where average ratings skew heavily (e.g. 4.2), a static $C = 3.5$ slightly drags down high-performing niche categories until a true dynamic global mean is computed.

---

## 2. Concurrency-Safe Tour Bookings (Zero Overbooking)

### The Problem
When two or more travellers click "Book" simultaneously on the last available seat, concurrent web requests enter an execution race:
1. Request A reads `available_seats = 1`.
2. Request B reads `available_seats = 1`.
3. Both validate that $1 \ge 1$.
4. Both insert a booking into the database.
5. **Overbooking occurs** (capacity exceeded, traveller turned away at the door).

### The Solution: Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)
We use PostgreSQL's pessimistic locking inside an interactive database transaction:

```sql
-- Inside interactive transaction:
SELECT id, capacity FROM tour_slots WHERE id = $1 FOR UPDATE;

SELECT COALESCE(SUM(seats), 0) AS booked_count FROM bookings WHERE slot_id = $1;

-- If (booked_count + requested_seats <= capacity):
INSERT INTO bookings (slot_id, user_id, seats, ...) VALUES ($1, $2, $3, ...);
-- Else:
ROLLBACK;
```

### Why This Solution Holds
1. **Serialization of Critical Section:** The `FOR UPDATE` clause places an exclusive lock on the specific `tour_slots` row. 
2. When 20 simultaneous requests fire, request 1 acquires the lock. Requests 2 through 20 are queued by PostgreSQL at the database engine level.
3. Once request 1 commits, request 2 reads the *updated* aggregate seat count, immediately detects `available == 0`, and aborts cleanly.
4. The remaining requests fail with a friendly `409 Conflict` (`"This tour slot is fully booked."`) without throwing uncaught 500 exceptions or creating orphan records.

### Verification
Covered by an automated stress test ([tests/booking-concurrency.test.ts](file:///home/dan-seng/Projects/wayfarer/tests/booking-concurrency.test.ts)) that fires 20 simultaneous requests at a slot with only 2 seats left. Exactly 2 succeed, 18 are rejected, and the database total booked seats never exceeds capacity.

### Alternatives Considered & Where They Break
1. **Application-level Mutex in Node.js:**
   * *Why rejected:* Node mutexes only work in a single process. In multi-instance / serverless deployments (such as Next.js across multiple pods or Vercel workers), application memory is not shared, leading to immediate race conditions.
2. **Optimistic Concurrency with Version Counter (`@version`):**
   * *Why rejected:* If 20 parallel requests collide, 19 will abort with optimistic lock conflicts. While safe, it requires complex retry backoff loops in user space. Pessimistic row locking queues requests cleanly in microseconds without user-side retry churn.

---

## 3. What We Would Do With More Time

1. **Idempotency Keys & Double-Click Deduplication:**
   * Add a client-generated UUID `Idempotency-Key` header to booking requests stored in Redis or DB for 5 minutes, ensuring network retries or fast double-taps return the existing booking instead of re-reserving.
2. **Dynamic Prior Baseline Estimation (Empirical Bayes):**
   * Compute $C$ dynamically per category (e.g. $C_{\text{History}}$ vs $C_{\text{Food}}$) or as the city-wide average rating via a cached hourly aggregation job.
3. **Real-Time Live Seat Updates:**
   * Integrate Server-Sent Events (SSE) or WebSockets to broadcast remaining seat counts to viewing travellers as bookings occur, giving travellers real-time visual feedback when a tour is filling up.
4. **Hold / Reservation Expiry Pipeline:**
   * Add a temporary 5-minute seat hold table for checkout flows so travellers can review tour details before finalizing payment.
