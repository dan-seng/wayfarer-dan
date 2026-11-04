/**
 * Bayesian Weighted Average (Honest Rating) Formula
 * 
 * Formula:
 *   W = (v / (v + m)) * R + (m / (v + m)) * C
 * 
 * Where:
 *   - v: Number of reviews for the place
 *   - R: Naive average rating of the place (1.0 to 5.0)
 *   - m: Minimum review weight threshold / damping factor (default: 5)
 *   - C: Prior / baseline average rating (default: 3.5, the neutral midpoint)
 * 
 * Rationale:
 * A place with a single 5-star review has high uncertainty. Pulling it toward
 * the baseline (C) prevents it from unfairly outranking well-established places
 * with hundreds of glowing reviews (e.g. 312 reviews @ 4.7 stars).
 */

export const DEFAULT_PRIOR_WEIGHT = 5;
export const DEFAULT_BASELINE_RATING = 3.5;

export interface RatingStats {
  reviewCount: number;
  averageRating: number;
}

export function calculateBayesianRating(
  reviewCount: number,
  averageRating: number,
  options?: {
    priorWeight?: number;
    baselineRating?: number;
  }
): number {
  const m = options?.priorWeight ?? DEFAULT_PRIOR_WEIGHT;
  const C = options?.baselineRating ?? DEFAULT_BASELINE_RATING;

  if (reviewCount <= 0) {
    return C;
  }

  // Clamped naive rating between 1 and 5
  const R = Math.max(1, Math.min(5, averageRating));
  const v = reviewCount;

  // Bayesian weighted average
  const weightedRating = (v / (v + m)) * R + (m / (v + m)) * C;

  // Return rounded to 2 decimal places for clean display and consistency
  return Math.round(weightedRating * 100) / 100;
}
