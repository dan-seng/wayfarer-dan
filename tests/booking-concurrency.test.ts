import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { bookTourSlot } from "../lib/booking";

describe("Tour Booking Concurrency Protection", () => {
  let testPlaceId: string;
  let testSlotId: string;
  let testUsers: Array<{ id: string; name: string }> = [];

  before(async () => {
    // 1. Create a dummy test place
    const place = await prisma.place.create({
      data: {
        name: "Concurrency Test Arena",
        category: "Test",
        description: "Test place for race condition simulation",
        openingHours: "Open 00:00-24:00",
      },
    });
    testPlaceId = place.id;

    // 2. Create 25 test users
    for (let i = 0; i < 25; i++) {
      const user = await prisma.user.create({
        data: { name: `Tester_${Date.now()}_${i}` },
      });
      testUsers.push(user);
    }

    // 3. Create a tour slot with capacity 5
    const slot = await prisma.tourSlot.create({
      data: {
        placeId: testPlaceId,
        startsAt: new Date(Date.now() + 86400000), // tomorrow
        capacity: 5,
      },
    });
    testSlotId = slot.id;

    // 4. Pre-fill 3 seats so only 2 seats remain (nearly full slot)
    await prisma.booking.create({
      data: {
        slotId: testSlotId,
        userId: testUsers[0].id,
        seats: 3,
      },
    });
  });

  after(async () => {
    // Clean up test data
    if (testSlotId) {
      await prisma.booking.deleteMany({ where: { slotId: testSlotId } });
      await prisma.tourSlot.deleteMany({ where: { id: testSlotId } });
    }
    if (testPlaceId) {
      await prisma.place.deleteMany({ where: { id: testPlaceId } });
    }
    for (const u of testUsers) {
      await prisma.user.deleteMany({ where: { id: u.id } });
    }
    await prisma.$disconnect();
  });

  it("never overbooks a slot when 20 requests arrive in parallel for 2 remaining seats", async () => {
    const concurrentRequestsCount = 20;
    const candidateUsers = testUsers.slice(1, 1 + concurrentRequestsCount);

    // Fire 20 parallel booking requests at the same exact time
    const results = await Promise.all(
      candidateUsers.map((user) =>
        bookTourSlot({
          slotId: testSlotId,
          userId: user.id,
          seats: 1,
        })
      )
    );

    const successfulBookings = results.filter((r) => r.success);
    const rejectedBookings = results.filter((r) => !r.success);

    // Initial state: capacity was 5, 3 were pre-booked -> Exactly 2 seats available
    assert.strictEqual(
      successfulBookings.length,
      2,
      `Expected exactly 2 bookings to succeed, but ${successfulBookings.length} succeeded.`
    );

    assert.strictEqual(
      rejectedBookings.length,
      18,
      `Expected 18 bookings to be rejected, but ${rejectedBookings.length} were rejected.`
    );

    // Verify all rejected requests received the proper user-facing error message
    for (const rejected of rejectedBookings) {
      assert.strictEqual(rejected.error, "This tour slot is fully booked.");
      assert.strictEqual(rejected.remainingSeats, 0);
    }

    // Verify database ground truth: total booked seats must be exactly 5 (capacity), never 6 or more!
    const totalBookings = await prisma.booking.aggregate({
      where: { slotId: testSlotId },
      _sum: { seats: true },
    });

    assert.strictEqual(
      totalBookings._sum.seats,
      5,
      `Database integrity check: total booked seats should be 5, found ${totalBookings._sum.seats}`
    );
  });
});
