"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPinPage() {
  const [token, setToken] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Reset failed");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">Reset shared PIN</h1>
        <p className="mb-6 text-sm text-gray-500">
          Break-glass recovery. Requires the reset token from your Vercel environment variables.
        </p>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">PIN updated.</p>
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="token">
                Reset token
              </label>
              <input
                id="token"
                type="password"
                autoComplete="off"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="newPin">
                New PIN
              </label>
              <input
                id="newPin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-gray-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !token || !newPin}
              className="w-full rounded-md bg-gray-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Resetting…" : "Reset PIN"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
