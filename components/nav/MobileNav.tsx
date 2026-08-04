"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_TABS, NAV_MENU_ITEMS } from "@/lib/nav-items";

export function MobileNav({ activeUserName }: { activeUserName: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  function close() {
    setOpen(false);
  }

  async function handleSwitchProfile() {
    close();
    await fetch("/api/auth/switch-profile", { method: "POST" });
    router.push("/profiles");
    router.refresh();
  }

  async function handleLogout() {
    close();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={close} />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">MDC Quotation Board</span>
              <button
                onClick={close}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {activeUserName && <p className="mb-3 text-sm text-gray-400">{activeUserName}</p>}

            <nav className="flex flex-col gap-1">
              {NAV_TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={close}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname === tab.href ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>

            <div className="my-3 border-t border-gray-200" />

            <nav className="flex flex-col gap-1">
              {NAV_MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    pathname === item.href ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="my-3 border-t border-gray-200" />

            <button
              onClick={handleSwitchProfile}
              className="rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Switch profile
            </button>
            <button onClick={handleLogout} className="rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
