"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = { id: string; name: string };

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
];

function avatarColor(name: string): string {
  const hash = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      if (!ignore) {
        setProfiles(data.profiles ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function selectProfile(userId: string) {
    setSelectingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/profiles/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not select profile");
        return;
      }
      router.push("/incoming");
      router.refresh();
    } finally {
      setSelectingId(null);
    }
  }

  async function handleAddProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add profile");
        return;
      }
      setProfiles((prev) => [...prev, data.profile]);
      setNewName("");
      setAdding(false);
    } catch {
      setError("Could not add profile");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <h1 className="mb-8 text-xl font-semibold text-gray-900">Who&rsquo;s working?</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => selectProfile(profile.id)}
              disabled={selectingId !== null}
              className="flex flex-col items-center gap-2 rounded-lg p-3 text-center hover:bg-gray-100 disabled:opacity-50"
            >
              <span
                className={`flex h-20 w-20 items-center justify-center rounded-lg text-2xl font-semibold text-white sm:h-24 sm:w-24 ${avatarColor(profile.name)}`}
              >
                {profile.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-gray-800">
                {selectingId === profile.id ? "Loading…" : profile.name}
              </span>
            </button>
          ))}

          {adding ? (
            <form
              onSubmit={handleAddProfile}
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-center"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-2xl text-gray-400 sm:h-24 sm:w-24">
                +
              </span>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => {
                  if (!newName.trim()) setAdding(false);
                }}
                placeholder="Name"
                className="w-20 rounded border border-gray-300 px-1 py-1 text-center text-sm sm:w-24"
              />
              <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
                Add
              </button>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex flex-col items-center gap-2 rounded-lg p-3 text-center hover:bg-gray-100"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-3xl text-gray-400 sm:h-24 sm:w-24">
                +
              </span>
              <span className="text-sm font-medium text-gray-500">Add Profile</span>
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
    </div>
  );
}
