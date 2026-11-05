import { prisma } from "./prisma";

export interface BookSlotParams {
  slotId: string;
  userId: string;
  seats?: number;
}

export interface BookingResult {
  success: boolean;
  statusCode?: number;
  bookingId?: string;
  remainingSeats?: number;
  isDuplicateRetry?: boolean;
  message?: string;
  error?: string;
}

/**
 * Concurrency-safe tour slot booking with comprehensive backend and database-level enforcement:
 * 
 * 1. Validates positive integer seat quantities (rejects 0, negative, fractional).
 * 2. Validates that the acting user exists in the database.
 * 3. Locks the tour_slots row using PostgreSQL pessimistic locking (`SELECT ... FOR UPDATE`).
 * 4. Rejects bookings for tour slots scheduled in the past.
 * 5. Double-click safety: absorbs rapid duplicate requests/retries (5-second window) for the same user and slot without consuming additional seats.
 * 6. Capacity check: returns HTTP 409 Conflict if requested seats exceed remaining capacity.
 * 7. Atomically creates the booking record.
 */
export async function bookTourSlot(
  params: BookSlotParams
): Promise<BookingResult> {
  const { slotId, userId, seats = 1 } = params;

  // 1. Reject zero, negative, or non-integer seat quantities
  if (
    typeof seats !== "number" ||
    !Number.isInteger(seats) ||
    seats <= 0
  ) {
    return {
      success: false,
      statusCode: 400,
      error: "Seat quantity must be a positive integer (at least 1 seat).",
    };
  }

  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      statusCode: 400,
      error: "User ID is required.",
    };
  }

  if (!slotId || typeof slotId !== "string") {
    return {
      success: false,
      statusCode: 400,
      error: "Tour slot ID is required.",
    };
  }

  return await prisma.$transaction(async (tx) => {
    // 2. Validate user exists in the database
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return {
        success: false,
        statusCode: 404,
        error: "User does not exist in the database.",
      };
    }

    // 3. Acquire pessimistic lock on the tour slot row in PostgreSQL
    const slots = await tx.$queryRaw<
      Array<{ id: string; capacity: number; startsAt: Date }>
    >`
      SELECT id, capacity, starts_at AS "startsAt"
      FROM tour_slots 
      WHERE id = ${slotId} 
      FOR UPDATE
    `;

    if (!slots || slots.length === 0) {
      return {
        success: false,
        statusCode: 404,
        error: "Tour slot not found.",
      };
    }

    const slot = slots[0];

    // 4. Reject bookings for past tours
    const now = new Date();
    if (new Date(slot.startsAt) < now) {
      return {
        success: false,
        statusCode: 400,
        error: "Cannot book tours that have already started or occurred in the past.",
      };
    }

    // 5. Compute currently booked seats for this slot
    const bookedResult = await tx.$queryRaw<Array<{ booked_seats: bigint | number }>>`
      SELECT COALESCE(SUM(seats), 0) AS booked_seats
      FROM bookings
      WHERE slot_id = ${slotId}
    `;

    const currentlyBooked = Number(bookedResult[0]?.booked_seats ?? 0);
    const available = slot.capacity - currentlyBooked;

    // 6. Double-click safety: Check for rapid duplicate retry from this user within 5 seconds
    const recentDuplicate = await tx.booking.findFirst({
      where: {
        slotId,
        userId,
        createdAt: {
          gte: new Date(Date.now() - 5000), // 5-second double-click/retry window
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentDuplicate) {
      return {
        success: true,
        statusCode: 200,
        isDuplicateRetry: true,
        bookingId: recentDuplicate.id,
        remainingSeats: available,
        message: "Booking already confirmed (duplicate request absorbed).",
      };
    }

    // 7. Enforce capacity limit (HTTP 409 Conflict when there aren't enough seats)
    if (available < seats) {
      return {
        success: false,
        statusCode: 409,
        remainingSeats: Math.max(0, available),
        error: "This tour slot is fully booked.",
      };
    }

    // 8. Insert confirmed booking
    const booking = await tx.booking.create({
      data: {
        slotId,
        userId,
        seats,
      },
    });

    return {
      success: true,
      statusCode: 201,
      bookingId: booking.id,
      remainingSeats: available - seats,
      message: "Booking confirmed successfully!",
    };
  });
}
