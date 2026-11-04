import { NextRequest, NextResponse } from "next/server";
import { bookTourSlot } from "@/lib/booking";

export async function POST(request: NextRequest) {
  try {
    const userIdHeader = request.headers.get("x-user-id");
    const bodyData = await request.json();
    const { slotId, seats = 1, userId: fallbackUserId } = bodyData;

    const userId = userIdHeader || fallbackUserId;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required (set X-User-Id header or provide userId)" },
        { status: 401 }
      );
    }

    if (!slotId) {
      return NextResponse.json(
        { error: "Tour slot ID is required" },
        { status: 400 }
      );
    }

    const requestedSeats = Number(seats);
    if (!Number.isInteger(requestedSeats) || requestedSeats <= 0) {
      return NextResponse.json(
        { error: "Number of seats must be a positive integer" },
        { status: 400 }
      );
    }

    const result = await bookTourSlot({
      slotId,
      userId,
      seats: requestedSeats,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error ?? "Failed to complete booking",
          remainingSeats: result.remainingSeats ?? 0,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Booking confirmed successfully!",
        bookingId: result.bookingId,
        remainingSeats: result.remainingSeats,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to process booking:", error);
    return NextResponse.json(
      { error: "Internal server error while processing booking" },
      { status: 500 }
    );
  }
}
