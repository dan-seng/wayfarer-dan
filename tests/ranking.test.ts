import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBayesianRating,
  DEFAULT_PRIOR_WEIGHT,
  DEFAULT_BASELINE_RATING,
} from "../lib/ranking";

describe("Honest Ranking Algorithm (Bayesian Weighted Average)", () => {
  it("proves that a place with one 5-star review doesn't outrank an established place with hundreds of reviews and a strong average", () => {
    const brandNewPlace = {
      name: "Brand-new café",
      reviews: 1,
      averageRating: 5.0,
      naiveScore: 5.0,
      honestScore: calculateBayesianRating(1, 5.0),
    };

    const establishedPlace = {
      name: "National Museum",
      reviews: 312,
      averageRating: 4.7,
      naiveScore: 4.7,
      honestScore: calculateBayesianRating(312, 4.7),
    };

    // 1. Under naive arithmetic average, the 1-review cafe erroneously outranks the museum
    assert.strictEqual(
      brandNewPlace.naiveScore > establishedPlace.naiveScore,
      true,
      "Demonstrating the original bug: naive average ranks 5.0 > 4.7"
    );

    // 2. Under Bayesian honest ranking, the high-volume museum decisively wins
    assert.strictEqual(
      establishedPlace.honestScore > brandNewPlace.honestScore,
      true,
      "Established place must outrank single-review place"
    );
    assert.strictEqual(brandNewPlace.honestScore, 3.75);
    assert.strictEqual(establishedPlace.honestScore, 4.68);

    // 3. Verify resulting sort order: established place is ranked #1
    const rankedList = [brandNewPlace, establishedPlace].sort(
      (a, b) => b.honestScore - a.honestScore
    );
    assert.strictEqual(rankedList[0].name, "National Museum");
    assert.strictEqual(rankedList[1].name, "Brand-new café");
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

