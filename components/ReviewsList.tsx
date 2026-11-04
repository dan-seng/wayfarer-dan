"use client";

import React from "react";
import { ReviewItem } from "./ReviewForm";

interface ReviewsListProps {
  reviews: ReviewItem[];
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  const renderStars = (rating: number) => {
    return (
      <span className="text-amber-400 tracking-wider">
        {"★".repeat(rating)}
        {"☆".repeat(Math.max(0, 5 - rating))}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-zinc-900 tracking-tight">
          Reviews ({reviews.length})
        </h4>
        <span className="text-xs text-zinc-500">Verified traveller reviews</span>
      </div>

      {reviews.length === 0 ? (
        <p className="text-xs text-zinc-500 italic py-2">
          No reviews yet. Be the first traveller to review this place!
        </p>
      ) : (
        <div className="space-y-3.5 divide-y divide-zinc-100">
          {reviews.map((review, idx) => (
            <div
              key={review.id}
              className={`text-xs ${idx > 0 ? "pt-3" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {renderStars(review.rating)}
                <span className="font-semibold text-zinc-800">
                  {review.user?.name || "Traveller"}
                </span>
              </div>
              <p className="text-zinc-700 italic pl-0.5 leading-relaxed">
                &ldquo;{review.body}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
