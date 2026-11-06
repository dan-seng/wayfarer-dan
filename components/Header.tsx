"use client";

import React from "react";
import { useToast } from "./Toast";

export interface User {
  id: string;
  name: string;
}

interface HeaderProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function Header({
  users,
  selectedUser,
  onSelectUser,
  categories,
  selectedCategory,
  onSelectCategory,
}: HeaderProps) {
  const { addToast } = useToast();

  const handleUserChange = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      onSelectUser(found);
      addToast(
        "info",
        `Now acting as ${found.name}. Bookings and reviews will be saved under this persona.`,
        "Persona Switched"
      );
    }
  };
  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Wayfarer
            </h1>
          </div>

          {/* Category Filter Pills */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-zinc-100 p-1 rounded-lg">
            {categories.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Switcher (Acting As...) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xs text-zinc-500 font-medium hidden sm:inline">Acting as:</span>
          <span className="text-sm sm:hidden" title="Acting as" aria-hidden="true">👤</span>
          <div className="relative">
            <select
              value={selectedUser?.id ?? ""}
              onChange={(e) => handleUserChange(e.target.value)}
              aria-label="Acting as persona"
              className="appearance-none bg-zinc-50 hover:bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-zinc-500 text-xs">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Category Bar (Smooth horizontal scroll) */}
      <div className="sm:hidden px-4 pb-2.5 pt-0.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all touch-manipulation ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </header>
  );
}

