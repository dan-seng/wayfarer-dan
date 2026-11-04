import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBayesianRating,
  DEFAULT_PRIOR_WEIGHT,
  DEFAULT_BASELINE_RATING,
} from "../lib/ranking";

describe("Honest Ranking Algorithm (Bayesian Weighted Average)", () => {
  it("ensures a museum with 312 reviews averaging 4.7 beats a café with 1 review of 5.0", () => {
    const museumScore = calculateBayesianRating(312, 4.7);
    const cafeScore = calculateBayesianRating(1, 5.0);

    // Museum: (312/317)*4.7 + (5/317)*3.5 ≈ 4.68
    // Cafe:   (1/6)*5.0 + (5/6)*3.5 ≈ 3.75
    assert.strictEqual(museumScore > cafeScore, true, "Museum score must be greater than Cafe score");
    assert.strictEqual(museumScore, 4.68);
    assert.strictEqual(cafeScore, 3.75);
  });

  it("handles places with 0 reviews gracefully by returning baseline", () => {
    const score = calculateBayesianRating(0, 0);
    assert.strictEqual(score, DEFAULT_BASELINE_RATING);
  });

  it("converges toward actual average as review count increases", () => {
    const lowVolumeScore = calculateBayesianRating(2, 4.8);
    const mediumVolumeScore = calculateBayesianRating(20, 4.8);
    const highVolumeScore = calculateBayesianRating(500, 4.8);

    // Confidence grows: 3.87 < 4.54 < 4.79 -> approaches 4.80
    assert.strictEqual(lowVolumeScore < mediumVolumeScore, true);
    assert.strictEqual(mediumVolumeScore < highVolumeScore, true);
    assert.strictEqual(highVolumeScore, 4.79);
  });

  it("correctly penalizes low ratings even with moderate volume", () => {
    const poorPlace = calculateBayesianRating(10, 1.5);
    const mediocrePlace = calculateBayesianRating(1, 2.0);

    // 10 reviews of 1.5 gives (10/15)*1.5 + (5/15)*3.5 = 1.0 + 1.17 = 2.17
    // 1 review of 2.0 gives (1/6)*2.0 + (5/6)*3.5 = 0.33 + 2.92 = 3.25
    assert.strictEqual(poorPlace < mediocrePlace, true);
  });
});

