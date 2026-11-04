"use client";

import React, { useState, useEffect } from "react";
import { User } from "./Header";

export interface ReviewItem {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

interface ReviewFormProps {
  placeId: string;
  activeUser: User | null;
  existingReviews: ReviewItem[];
  onReviewSubmitted: () => void;
}

export function ReviewForm({
  placeId,
  activeUser,
  existingReviews,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [body, setBody] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check if active user already reviewed this place
  const existingUserReview = activeUser
    ? existingReviews.find((r) => r.user.id === activeUser.id)
    : null;

  useEffect(() => {
    if (existingUserReview) {
      setRating(existingUserReview.rating);
      setBody(existingUserReview.body);
    } else {
      setRating(5);
      setBody("");
    }
    setMessage(null);
  }, [existingUserReview, activeUser?.id, placeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeUser) {
      setMessage({
        type: "error",
        text: "Please select an acting user in the header to post a review.",
      });
      return;
    }

    if (!body.trim()) {
      setMessage({
        type: "error",
        text: "Please write a few words about your experience.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUser.id,
        },
        body: JSON.stringify({
          placeId,
          rating,
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Failed to submit review.",
        });
      } else {
        setMessage({
          type: "success",
          text: existingUserReview
            ? "Your review has been updated!"
            : "Review submitted successfully!",
        });
        onReviewSubmitted();
      }
    } catch {
      setMessage({
        type: "error",
        text: "Network error occurred while submitting.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mt-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-900">
          {existingUserReview
            ? `Update your rating as ${activeUser?.name}:`
            : `Your rating as ${activeUser?.name || "Guest"}:`}
        </label>

        {/* 1-5 Star Picker */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const activeStarLevel = hoverRating ?? rating;
            const isFilled = star <= activeStarLevel;

            return (
              <button
                type="button"
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setRating(star)}
                className="text-lg text-amber-400 hover:scale-110 transition-transform focus:outline-none"
              >
                {isFilled ? "★" : "☆"}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a short review..."
        className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
      />

      {message && (
        <div
          className={`text-xs p-2 rounded-md ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500 italic">
          {existingUserReview
            ? "Rule: 1 review per user (updates existing)"
            : "One review per user per place"}
        </span>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : existingUserReview
            ? "Update"
            : "Submit"}
        </button>
      </div>
    </form>
  );
}

