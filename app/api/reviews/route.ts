import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userIdHeader = request.headers.get("x-user-id");
    const bodyData = await request.json();
    const { placeId, rating, body, userId: fallbackUserId } = bodyData;

    const userId = userIdHeader || fallbackUserId;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required (set X-User-Id header or provide userId)" },
        { status: 401 }
      );
    }

    if (!placeId) {
      return NextResponse.json(
        { error: "Place ID is required" },
        { status: 400 }
      );
    }

    const numericRating = Number(rating);
    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "string" || body.trim().length === 0) {
      return NextResponse.json(
        { error: "Review text cannot be empty" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify place exists
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    // Upsert review (enforces one review per user per place)
    const review = await prisma.review.upsert({
      where: {
        placeId_userId: {
          placeId,
          userId,
        },
      },
      update: {
        rating: numericRating,
        body: body.trim(),
      },
      create: {
        placeId,
        userId,
        rating: numericRating,
        body: body.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ review }, { status: 200 });
  } catch (error) {
    console.error("Failed to submit review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

