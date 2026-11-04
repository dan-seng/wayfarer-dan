import { prisma } from "./prisma";

export interface BookSlotParams {
  slotId: string;
  userId: string;
  seats?: number;
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  remainingSeats?: number;
  error?: string;
}

/**
 * Concurrency-safe tour slot booking using PostgreSQL pessimistic locking (FOR UPDATE).
 * 
 * Flow:
 * 1. Begins an interactive database transaction.
 * 2. Locks the tour_slots row using `SELECT ... FOR UPDATE` so concurrent requests queue.
 * 3. Aggregates the committed booked seats.
 * 4. Checks if remaining seats can accommodate the request.
 * 5. Creates the booking record if seats remain; otherwise aborts cleanly with a friendly error.
 */
export async function bookTourSlot(
  params: BookSlotParams
): Promise<BookingResult> {
  const { slotId, userId, seats = 1 } = params;

  if (seats <= 0) {
    return { success: false, error: "Seats requested must be at least 1." };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Acquire pessimistic lock on the tour slot row
    const slots = await tx.$queryRaw<Array<{ id: string; capacity: number }>>`
      SELECT id, capacity 
      FROM tour_slots 
      WHERE id = ${slotId} 
      FOR UPDATE
    `;

    if (!slots || slots.length === 0) {
      return { success: false, error: "Tour slot not found." };
    }

    const slot = slots[0];

    // 2. Compute committed booked seats for this slot
    const bookedResult = await tx.$queryRaw<Array<{ booked_seats: bigint | number }>>`
      SELECT COALESCE(SUM(seats), 0) AS booked_seats
      FROM bookings
      WHERE slot_id = ${slotId}
    `;

    const currentlyBooked = Number(bookedResult[0]?.booked_seats ?? 0);
    const available = slot.capacity - currentlyBooked;

    // 3. Prevent overbooking
    if (available < seats) {
      return {
        success: false,
        remainingSeats: Math.max(0, available),
        error: "This tour slot is fully booked.",
      };
    }

    // 4. Insert booking
    const booking = await tx.booking.create({
      data: {
        slotId,
        userId,
        seats,
      },
    });

    return {
      success: true,
      bookingId: booking.id,
      remainingSeats: available - seats,
    };
  });
}

