"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { Header, User } from "@/components/Header";
import { PlaceDetail } from "@/components/PlaceDetail";
import { ToastProvider } from "@/components/Toast";

const CATEGORIES = ["All", "History", "Food", "Nature"];

function PlaceDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Fetch Users on mount
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          if (data.users && data.users.length > 0) {
            setActiveUser(data.users[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    }
    fetchUsers();
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-100/70 text-zinc-900 flex flex-col font-sans">
        <Header
          users={users}
          selectedUser={activeUser}
          onSelectUser={setActiveUser}
          categories={CATEGORIES}
          selectedCategory="All"
          onSelectCategory={() => {}}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto p-3.5 sm:p-6 lg:p-8">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors bg-white border border-zinc-200 px-3.5 py-2 sm:py-1.5 rounded-lg shadow-2xs hover:bg-zinc-50 touch-manipulation"
            >
              ← Back to all places
            </Link>
          </div>

          <PlaceDetail
            placeId={id}
            activeUser={activeUser}
            onDataChanged={() => {}}
          />
        </main>
      </div>
    </ToastProvider>
  );
}

export default function PlaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-100/70 flex items-center justify-center text-xs text-zinc-500">
          Loading place details...
        </div>
      }
    >
      <PlaceDetailContent params={params} />
    </Suspense>
  );
}
