"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header, User } from "@/components/Header";
import { PlaceCard, PlaceListItem } from "@/components/PlaceCard";
import { PlaceDetail } from "@/components/PlaceDetail";
import { ToastProvider } from "@/components/Toast";

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const CATEGORIES = ["All", "History", "Food", "Nature"];

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortOption, setSortOption] = useState<string>("top_rated");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [places, setPlaces] = useState<PlaceListItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reset page when category or sort changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortOption(sort);
    setCurrentPage(1);
  };

  // 1. Fetch Users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          if (data.users && data.users.length > 0) {
            setActiveUser(data.users[0]); // Default to Sara
          }
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    }
    fetchUsers();
  }, []);

  // 2. Fetch Places based on category, sort option & pagination
  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "All") {
        params.set("category", selectedCategory);
      }
      params.set("sort", sortOption);
      params.set("page", currentPage.toString());
      params.set("limit", "5"); // 5 places per page for clean pagination

      const res = await fetch(`/api/places?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch places");
      }
      const data = await res.json();
      const placeList: PlaceListItem[] = data.places || [];
      setPlaces(placeList);
      setPagination(data.pagination || null);

      // Keep current selection if still in filtered list; otherwise pick the first place
      if (placeList.length > 0) {
        setSelectedPlaceId((current) => {
          const stillExists = placeList.some((p) => p.id === current);
          return stillExists ? current : placeList[0].id;
        });
      } else {
        setSelectedPlaceId(null);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading places"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortOption, currentPage]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-100/70 text-zinc-900 flex flex-col font-sans">
        {/* Header with Acting-As Switcher and Category Pills */}
        <Header
          users={users}
          selectedUser={activeUser}
          onSelectUser={setActiveUser}
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategoryChange}
        />

        {/* Main Two-Column Layout */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Places List with Backend Sort */}
            <section className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
              {/* Sorting controls */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100">
                <span className="text-xs font-bold text-zinc-700 tracking-tight">
                  Places ({pagination ? pagination.totalCount : places.length})
                </span>

                <div className="flex items-center gap-1.5 text-xs">
                  <label htmlFor="sort-select" className="text-zinc-500 font-medium">
                    Sort:
                  </label>
                  <div className="relative">
                    <select
                      id="sort-select"
                      value={sortOption}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="appearance-none bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 text-zinc-900 font-semibold rounded-lg pl-2.5 pr-7 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="top_rated">Top rated (Honest)</option>
                      <option value="most_reviewed">Most reviewed</option>
                      <option value="highest_raw">Highest raw stars</option>
                      <option value="name">Name (A-Z)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-500 text-[10px]">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Places List with Skeletons and Empty State */}
              {loading && places.length === 0 ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-zinc-100 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-xs">
                  {error}
                </div>
              ) : places.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                  <span className="text-2xl mb-1.5 block">📍</span>
                  <p className="text-xs font-semibold text-zinc-800">
                    No places found in &ldquo;{selectedCategory}&rdquo;
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1 mb-3">
                    Try switching back to &ldquo;All&rdquo; or selecting another category.
                  </p>
                  <button
                    onClick={() => handleCategoryChange("All")}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    View all places
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                  {places.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      isSelected={place.id === selectedPlaceId}
                      onSelect={() => setSelectedPlaceId(place.id)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-100 text-xs">
                  <button
                    type="button"
                    disabled={!pagination.hasPrevPage || loading}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 font-medium text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>

                  <span className="text-zinc-500 font-medium">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-300 font-medium text-zinc-700 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </section>

            {/* Right Column: Place Details, Tour Booking, Reviews */}
            <section className="lg:col-span-7">
              <PlaceDetail
                placeId={selectedPlaceId}
                activeUser={activeUser}
                onDataChanged={fetchPlaces}
              />
            </section>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
