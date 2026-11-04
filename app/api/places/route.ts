import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRIOR_WEIGHT, DEFAULT_BASELINE_RATING } from "@/lib/ranking";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "top_rated";

    const filterCategory =
      category && category.toLowerCase() !== "all" ? category : null;

    const m = DEFAULT_PRIOR_WEIGHT;
    const C = DEFAULT_BASELINE_RATING;

    // Execute backend aggregation, Bayesian rating calculation, filtering, and sorting in PostgreSQL
    const places = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        category: string;
        description: string;
        openingHours: string;
        reviewCount: number;
        averageRating: number;
        bayesianRating: number;
      }>
    >`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.description,
        p.opening_hours AS "openingHours",
        COUNT(r.id)::int AS "reviewCount",
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float AS "averageRating",
        ROUND(
          (
            (COUNT(r.id)::float / (COUNT(r.id)::float + ${m}::float)) * COALESCE(AVG(r.rating), ${C})::float
            + (${m}::float / (COUNT(r.id)::float + ${m}::float)) * ${C}::float
          )::numeric,
          2
        )::float AS "bayesianRating"
      FROM places p
      LEFT JOIN reviews r ON r.place_id = p.id
      WHERE (${filterCategory}::text IS NULL OR LOWER(p.category) = LOWER(${filterCategory}::text))
      GROUP BY p.id
      ORDER BY 
        CASE WHEN ${sort} = 'top_rated' THEN 
          (
            (COUNT(r.id)::float / (COUNT(r.id)::float + ${m}::float)) * COALESCE(AVG(r.rating), ${C})::float
            + (${m}::float / (COUNT(r.id)::float + ${m}::float)) * ${C}::float
          )
        END DESC NULLS LAST,
        CASE WHEN ${sort} = 'most_reviewed' THEN COUNT(r.id) END DESC NULLS LAST,
        CASE WHEN ${sort} = 'highest_raw' THEN COALESCE(AVG(r.rating), 0) END DESC NULLS LAST,
        p.name ASC
    `;

    return NextResponse.json({ places });
  } catch (error) {
    console.error("Failed to query places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
