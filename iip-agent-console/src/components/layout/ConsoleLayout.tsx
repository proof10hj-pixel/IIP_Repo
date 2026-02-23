"use client";

import React from "react";
import Link from "next/link";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4">
        <h1 className="text-xl font-bold mb-6">IIP Agent Console</h1>
        <nav className="space-y-2">
          <Link href="/projects" className="block p-2 rounded hover:bg-gray-200">
            Projects
          </Link>
          <Link href="/settings" className="block p-2 rounded hover:bg-gray-200">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">
            Agentic Integration Console
          </h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded">
              DEV
            </span>
            <span className="px-3 py-1 text-sm bg-gray-200 rounded">
              Operator
            </span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}