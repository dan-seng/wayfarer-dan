"use client";

import React, { useEffect, useState, useCallback } from "react";
import { User } from "./Header";
import { TourBookingList, TourSlot } from "./TourBookingList";
import { ReviewsList } from "./ReviewsList";
import { ReviewForm, ReviewItem } from "./ReviewForm";

export interface PlaceDetailData {
  id: string;
  name: string;
  category: string;
  description: string;
  openingHours: string;
  reviewCount: number;
  averageRating: number;
  bayesianRating: number;
  reviews: ReviewItem[];
  tourSlots: TourSlot[];
}

interface PlaceDetailProps {
  placeId: string | null;
  activeUser: User | null;
  onDataChanged: () => void;
}

export function PlaceDetail({
  placeId,
  activeUser,
  onDataChanged,
}: PlaceDetailProps) {
  const [place, setPlace] = useState<PlaceDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaceDetail = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${placeId}`);
      if (!res.ok) {
        throw new Error("Could not load place details");
      }
      const data = await res.json();
      setPlace(data.place);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load place details"
      );
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    fetchPlaceDetail();
  }, [fetchPlaceDetail]);

  const handleUpdate = () => {
    fetchPlaceDetail();
    onDataChanged();
  };

  if (!placeId) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-400 text-sm">
        Select a place from the list to view tours and reviews.
      </div>
    );
  }

  if (loading && !place) {
    return (
      <div className="p-8 bg-white border border-zinc-200 rounded-2xl space-y-4 animate-pulse">
        <div className="h-7 bg-zinc-200 rounded-md w-1/3" />
        <div className="h-4 bg-zinc-100 rounded-md w-1/2" />
        <div className="h-16 bg-zinc-100 rounded-md w-full" />
        <div className="h-32 bg-zinc-100 rounded-xl w-full" />
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
        {error || "Place not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Place Header Info */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              {place.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-900">
                {place.category}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="font-bold text-zinc-900 flex items-center gap-0.5">
                {place.averageRating.toFixed(1)}{" "}
                <span className="text-amber-500">★</span>
              </span>
              <span>
                ({place.reviewCount}{" "}
                {place.reviewCount === 1 ? "review" : "reviews"})
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-700">{place.openingHours}</span>
            </div>
          </div>

          {/* Honest Bayesian Score Pill */}
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 px-3 py-1.5 rounded-xl self-start sm:self-center">
            <span className="text-[11px] font-semibold text-blue-900">
              Honest Score:
            </span>
            <span className="text-sm font-black text-blue-700">
              {place.bayesianRating.toFixed(2)}
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-zinc-600 leading-relaxed">
          {place.description}
        </p>
      </div>

      {/* Guided Tour Slots */}
      <TourBookingList
        slots={place.tourSlots}
        activeUser={activeUser}
        onBookingSuccess={handleUpdate}
      />

      {/* Reviews & Submission Form */}
      <div>
        <ReviewsList reviews={place.reviews} />
        <ReviewForm
          placeId={place.id}
          activeUser={activeUser}
          existingReviews={place.reviews}
          onReviewSubmitted={handleUpdate}
        />
      </div>
    </div>
  );
}
