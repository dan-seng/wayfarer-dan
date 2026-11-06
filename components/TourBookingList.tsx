"use client";

import React, { useState } from "react";
import { User } from "./Header";
import { useToast } from "./Toast";

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
  const { addToast } = useToast();
  const [loadingSlotId, setLoadingSlotId] = useState<string | null>(null);
  const [inlineAlert, setInlineAlert] = useState<{
    type: "success" | "error" | "warning";
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
      addToast(
        "error",
        "Please select an active traveller persona from the header switcher.",
        "Select User"
      );
      setInlineAlert({
        type: "error",
        message: "Please choose an active user in the header to book a tour.",
      });
      return;
    }

    if (loadingSlotId) return; // Prevent double-clicks / concurrent requests in flight

    setLoadingSlotId(slotId);
    setInlineAlert(null);

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
        // Specific error for race condition when another user took the last seat
        if (res.status === 409) {
          const raceMsg =
            "Booking failed: Another traveller just booked the last available seat for this tour!";
          addToast("error", raceMsg, "Slot Fully Booked");
          setInlineAlert({
            type: "error",
            message: raceMsg,
          });
          // Refresh list immediately so the UI reflects the fully booked status
          onBookingSuccess();
        } else {
          const errMsg = data.error || "Could not complete booking.";
          addToast("error", errMsg, "Booking Error");
          setInlineAlert({
            type: "error",
            message: errMsg,
          });
        }
      } else {
        const successMsg = data.isDuplicateRetry
          ? `Booking already confirmed for ${activeUser.name}!`
          : `Seat booked successfully for ${activeUser.name}! (${data.remainingSeats} seats remaining)`;
        addToast("success", successMsg, "Booking Confirmed");
        setInlineAlert({
          type: "success",
          message: successMsg,
        });
        onBookingSuccess();
      }
    } catch {
      const netMsg = "Network error occurred while booking. Please try again.";
      addToast("error", netMsg, "Network Error");
      setInlineAlert({
        type: "error",
        message: netMsg,
      });
    } finally {
      setLoadingSlotId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-zinc-900 tracking-tight">
            Guided tours
          </h4>
          <p className="text-xs text-zinc-500">Live seat availability</p>
        </div>
        <span className="text-[11px] font-medium bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
          Instant booking
        </span>
      </div>

      {inlineAlert && (
        <div
          role="alert"
          className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
            inlineAlert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{inlineAlert.message}</span>
          <button
            onClick={() => setInlineAlert(null)}
            className="text-zinc-400 hover:text-zinc-600 font-bold ml-2 text-sm p-1 touch-manipulation"
          >
            ×
          </button>
        </div>
      )}

      {slots.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
          <p className="text-xs text-zinc-500 font-medium">
            No guided tour slots currently scheduled for this location.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {slots.map((slot) => {
            const isBookingThis = loadingSlotId === slot.id;
            const isLowSeats = slot.seatsLeft > 0 && slot.seatsLeft <= 2;

            return (
              <div
                key={slot.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-lg border transition-all ${
                  slot.isFull
                    ? "bg-zinc-100/60 border-zinc-200/60 opacity-80"
                    : "bg-zinc-50 border-zinc-200/70 hover:border-zinc-300"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="font-semibold text-xs text-zinc-900 min-w-[70px]">
                    {formatSlotTime(slot.startsAt)}
                  </span>

                  {/* Explicitly show available seats for every tour */}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      slot.isFull
                        ? "bg-zinc-200 text-zinc-600 font-semibold"
                        : isLowSeats
                        ? "bg-amber-100 text-amber-800 font-semibold"
                        : "bg-emerald-100 text-emerald-800 font-medium"
                    }`}
                  >
                    {slot.isFull
                      ? "Fully booked (0 seats left)"
                      : `${slot.seatsLeft} of ${slot.capacity} seats left`}
                  </span>
                </div>

                <div className="w-full sm:w-auto flex justify-end">
                  {slot.isFull ? (
                    <button
                      disabled
                      title="This tour is fully booked"
                      className="w-full sm:w-auto px-4 py-2 sm:py-1.5 text-xs font-semibold rounded-md bg-zinc-200 text-zinc-500 cursor-not-allowed border border-zinc-300/60 text-center"
                    >
                      Full
                    </button>
                  ) : (
                    <button
                      disabled={isBookingThis}
                      onClick={() => handleBook(slot.id)}
                      className={`w-full sm:w-auto justify-center px-4 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-all shadow-xs touch-manipulation ${
                        isLowSeats
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      } ${
                        isBookingThis
                          ? "opacity-60 cursor-wait flex items-center gap-1.5"
                          : ""
                      }`}
                    >
                      {isBookingThis ? (
                        <>
                          <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Booking...</span>
                        </>
                      ) : (
                        "Book"
                      )}
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
