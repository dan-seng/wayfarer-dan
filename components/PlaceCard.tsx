"use client";

import React from "react";
import Link from "next/link";

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
      className={`p-3.5 sm:p-4 rounded-xl cursor-pointer border transition-all duration-150 touch-manipulation ${
        isSelected
          ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/70"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <h3
            className={`font-semibold text-sm truncate ${
              isSelected ? "text-blue-900" : "text-zinc-900"
            }`}
          >
            {place.name}
          </h3>
          <Link
            href={`/places/${place.id}`}
            onClick={(e) => e.stopPropagation()}
            title="Open dedicated place page"
            className="text-zinc-400 hover:text-blue-600 text-xs p-1 rounded transition-colors shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
          >
            ↗
          </Link>
        </div>
        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 shrink-0">
          {place.category}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600">
        {place.reviewCount === 0 ? (
          <>
            <span className="font-medium text-zinc-500 italic">No ratings yet</span>
            <span className="text-zinc-400">·</span>
            <span className="text-[11px] text-zinc-600 font-medium bg-zinc-100 px-1.5 py-0.5 rounded">
              Honest: {place.bayesianRating.toFixed(2)}
            </span>
          </>
        ) : (
          <>
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
          </>
        )}
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

