import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateBayesianRating, DEFAULT_PRIOR_WEIGHT, DEFAULT_BASELINE_RATING } from "@/lib/ranking";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const place = await prisma.place.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        tourSlots: {
          include: {
            bookings: {
              select: {
                seats: true,
              },
            },
          },
          orderBy: { startsAt: "asc" },
        },
      },
    });

    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    // Compute tour slot capacities and remaining seats
    const slots = place.tourSlots.map((slot) => {
      const bookedSeats = slot.bookings.reduce((sum, b) => sum + b.seats, 0);
      const seatsLeft = Math.max(0, slot.capacity - bookedSeats);
      return {
        id: slot.id,
        startsAt: slot.startsAt,
        capacity: slot.capacity,
        bookedSeats,
        seatsLeft,
        isFull: seatsLeft === 0,
      };
    });

    // Compute review statistics
    const reviewCount = place.reviews.length;
    const averageRating =
      reviewCount > 0
        ? Math.round(
            (place.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10
          ) / 10
        : 0;

    // Use centralized Bayesian rating calculation for consistency
    const bayesianRating = calculateBayesianRating(reviewCount, averageRating, {
      priorWeight: DEFAULT_PRIOR_WEIGHT,
      baselineRating: DEFAULT_BASELINE_RATING,
    });

    return NextResponse.json({
      place: {
        id: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        openingHours: place.openingHours,
        reviewCount,
        averageRating,
        bayesianRating,
        reviews: place.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          createdAt: r.createdAt,
          user: r.user,
        })),
        tourSlots: slots,
      },
    });
  } catch (error) {
    console.error("Failed to query place detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch place detail" },
      { status: 500 }
    );
  }
}
