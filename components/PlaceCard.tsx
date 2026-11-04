"use client";

import React from "react";

export interface PlaceListItem {
  id: string;
  name: string;
  category: string;
  description: string;
  openingHours: string;
  reviewCount: number;
  averageRating: number;
  bayesianRating: number;
}

interface PlaceCardProps {
  place: PlaceListItem;
  isSelected: boolean;
  onSelect: () => void;
}

export function PlaceCard({ place, isSelected, onSelect }: PlaceCardProps) {
  const isOneReviewBenchmark = place.reviewCount === 1 && place.averageRating === 5.0;

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl cursor-pointer border transition-all duration-150 ${
        isSelected
          ? "border-blue-600 bg-blue-50/60 shadow-xs"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/70"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`font-semibold text-sm ${
            isSelected ? "text-blue-900" : "text-zinc-900"
          }`}
        >
          {place.name}
        </h3>
        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
          {place.category}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-600">
        <span className="font-bold text-zinc-900 flex items-center gap-0.5">
          {place.averageRating.toFixed(1)}{" "}
          <span className="text-amber-500">★</span>
        </span>
        <span className="text-zinc-400">·</span>
        <span>
          {place.reviewCount} {place.reviewCount === 1 ? "review" : "reviews"}
        </span>
        <span className="text-zinc-400">·</span>
        <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
          Honest: {place.bayesianRating.toFixed(2)}
        </span>
      </div>

      {isOneReviewBenchmark && (
        <div className="mt-2 text-[11px] font-medium text-amber-700 bg-amber-50/80 border border-amber-200/60 rounded-md p-1.5 flex items-start gap-1">
          <span>↑</span>
          <span>1 five-star review shouldn&apos;t beat established places!</span>
        </div>
      )}
    </div>
  );
}
