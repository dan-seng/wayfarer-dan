"use client";

import React, { useState } from "react";
import { User } from "./Header";

export interface TourSlot {
  id: string;
  startsAt: string;
  capacity: number;
  bookedSeats: number;
  seatsLeft: number;
  isFull: boolean;
}

interface TourBookingListProps {
  slots: TourSlot[];
  activeUser: User | null;
  onBookingSuccess: () => void;
}

export function TourBookingList({
  slots,
  activeUser,
  onBookingSuccess,
}: TourBookingListProps) {
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const formatSlotTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return isoString;
    }
  };

  const handleBook = async (slotId: string) => {
    if (!activeUser) {
      setNotification({
        type: "error",
        message: "Please choose an active user in the header to book a tour.",
      });
      return;
    }

    if (loadingSlotId) return; // Prevent double-clicks / concurrent requests in flight

    setLoadingSlotId(slotId);
    setNotification(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUser.id,
        },
        body: JSON.stringify({
          slotId,
          seats: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setNotification({
          type: "error",
          message: data.error || "Could not complete booking.",
        });
      } else {
        setNotification({
          type: "success",
          message: `Seat booked successfully for ${activeUser.name}! (${data.remainingSeats} seats remaining)`,
        });
        onBookingSuccess();
      }
    } catch {
      setNotification({
        type: "error",
        message: "Network error occurred while booking. Please try again.",
      });
    } finally {
      setLoadingSlotId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-zinc-900 tracking-tight">
          Guided tours
        </h4>
        <span className="text-xs text-zinc-500">Instant confirmation</span>
      </div>

      {notification && (
        <div
          className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-zinc-400 hover:text-zinc-600 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {slots.length === 0 ? (
        <p className="text-xs text-zinc-500 italic py-2">
          No guided tour slots currently scheduled for this location.
        </p>
      ) : (
        <div className="space-y-2.5">
          {slots.map((slot) => {
            const isBookingThis = loadingSlotId === slot.id;
            const isLowSeats = slot.seatsLeft > 0 && slot.seatsLeft <= 2;

            return (
              <div
                key={slot.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-xs text-zinc-900 min-w-[70px]">
                    {formatSlotTime(slot.startsAt)}
                  </span>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      slot.isFull
                        ? "bg-zinc-200 text-zinc-600"
                        : isLowSeats
                        ? "bg-amber-100 text-amber-800 font-semibold"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {slot.isFull
                      ? "Fully booked"
                      : `${slot.seatsLeft} of ${slot.capacity} seats left`}
                  </span>
                </div>

                <div>
                  {slot.isFull ? (
                    <button
                      disabled
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-zinc-200 text-zinc-500 cursor-not-allowed border border-zinc-300/50"
                    >
                      Full
                    </button>
                  ) : (
                    <button
                      disabled={isBookingThis}
                      onClick={() => handleBook(slot.id)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all shadow-xs ${
                        isLowSeats
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } ${isBookingThis ? "opacity-60 cursor-wait" : ""}`}
                    >
                      {isBookingThis ? "Booking..." : "Book"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

