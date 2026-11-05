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

  it("rejects zero or negative seat quantities", async () => {
    const zeroSeats = await bookTourSlot({
      slotId: testSlotId,
      userId: testUsers[0].id,
      seats: 0,
    });
    assert.strictEqual(zeroSeats.success, false);
    assert.strictEqual(zeroSeats.statusCode, 400);

    const negativeSeats = await bookTourSlot({
      slotId: testSlotId,
      userId: testUsers[0].id,
      seats: -3,
    });
    assert.strictEqual(negativeSeats.success, false);
    assert.strictEqual(negativeSeats.statusCode, 400);
  });

  it("rejects booking if the user does not exist in the database", async () => {
    const invalidUser = await bookTourSlot({
      slotId: testSlotId,
      userId: "non-existent-user-id",
      seats: 1,
    });
    assert.strictEqual(invalidUser.success, false);
    assert.strictEqual(invalidUser.statusCode, 404);
    assert.match(invalidUser.error || "", /User does not exist/);
  });

  it("rejects bookings for past tour slots", async () => {
    const pastSlot = await prisma.tourSlot.create({
      data: {
        placeId: testPlaceId,
        startsAt: new Date(Date.now() - 86400000), // yesterday
        capacity: 10,
      },
    });

    const result = await bookTourSlot({
      slotId: pastSlot.id,
      userId: testUsers[0].id,
      seats: 1,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 400);
    assert.match(result.error || "", /past/i);

    await prisma.tourSlot.delete({ where: { id: pastSlot.id } });
  });

  it("prevents duplicate bookings when a user retries rapidly (double-click safety)", async () => {
    const freshSlot = await prisma.tourSlot.create({
      data: {
        placeId: testPlaceId,
        startsAt: new Date(Date.now() + 100000000),
        capacity: 5,
      },
    });

    const user = testUsers[0];

    const firstBooking = await bookTourSlot({
      slotId: freshSlot.id,
      userId: user.id,
      seats: 1,
    });
    assert.strictEqual(firstBooking.success, true);
    assert.strictEqual(firstBooking.remainingSeats, 4);

    // Immediate duplicate retry with the same user and slot
    const duplicateRetry = await bookTourSlot({
      slotId: freshSlot.id,
      userId: user.id,
      seats: 1,
    });

    assert.strictEqual(duplicateRetry.success, true);
    assert.strictEqual(duplicateRetry.isDuplicateRetry, true);
    assert.strictEqual(duplicateRetry.bookingId, firstBooking.bookingId);
    assert.strictEqual(duplicateRetry.remainingSeats, 4);

    const dbCount = await prisma.booking.count({
      where: { slotId: freshSlot.id, userId: user.id },
    });
    assert.strictEqual(dbCount, 1);

    await prisma.booking.deleteMany({ where: { slotId: freshSlot.id } });
    await prisma.tourSlot.delete({ where: { id: freshSlot.id } });
  });
});

