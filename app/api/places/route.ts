import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PRIOR_WEIGHT, DEFAULT_BASELINE_RATING } from "@/lib/ranking";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "top_rated";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "5", 10)));
    const offset = (page - 1) * limit;

    const filterCategory =
      category && category.toLowerCase() !== "all" ? category : null;

    const m = DEFAULT_PRIOR_WEIGHT;
    const C = DEFAULT_BASELINE_RATING;

    // Get total count matching category filter
    const totalCount = await prisma.place.count({
      where: filterCategory
        ? { category: { equals: filterCategory, mode: "insensitive" } }
        : undefined,
    });
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    // Execute backend aggregation, Bayesian rating calculation, filtering, sorting, and pagination directly in PostgreSQL.
    // The global average rating across all reviews is computed ONCE in a CTE (global_stats)
    // and injected into each place via a CROSS JOIN, avoiding redundant per-row recalculations.
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
      WITH global_stats AS (
        SELECT COALESCE(ROUND(AVG(rating)::numeric, 2)::float, ${C}::float) AS global_avg
        FROM reviews
      ),
      place_ratings AS (
        SELECT 
          p.id,
          p.name,
          p.category,
          p.description,
          p.opening_hours AS "openingHours",
          COUNT(r.id)::int AS "reviewCount",
          COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float AS "averageRating",
          -- For places with 0 reviews, Bayesian rating evaluates cleanly to the precalculated global_avg
          ROUND(
            (
              (COUNT(r.id)::float / (COUNT(r.id)::float + ${m}::float)) * COALESCE(AVG(r.rating), g.global_avg)
              + (${m}::float / (COUNT(r.id)::float + ${m}::float)) * g.global_avg
            )::numeric,
            2
          )::float AS "bayesianRating"
        FROM places p
        CROSS JOIN global_stats g
        LEFT JOIN reviews r ON r.place_id = p.id
        WHERE (${filterCategory}::text IS NULL OR LOWER(p.category) = LOWER(${filterCategory}::text))
        GROUP BY p.id, g.global_avg
      )
      SELECT 
        id,
        name,
        category,
        description,
        "openingHours",
        "reviewCount",
        "averageRating",
        "bayesianRating"
      FROM place_ratings
      ORDER BY 
        CASE WHEN ${sort} = 'top_rated' THEN "bayesianRating" END DESC NULLS LAST,
        CASE WHEN ${sort} = 'most_reviewed' THEN "reviewCount" END DESC NULLS LAST,
        CASE WHEN ${sort} = 'highest_raw' THEN "averageRating" END DESC NULLS LAST,
        name ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    return NextResponse.json({
      places,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Failed to query places:", error);
    return NextResponse.json(
      { error: "Failed to fetch places" },
      { status: 500 }
    );
  }
}
