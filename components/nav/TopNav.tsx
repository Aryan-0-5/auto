"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TABS } from "@/lib/nav-items";

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full border-b border-gray-200 bg-white">
      {NAV_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 border-b-2 px-2 py-2.5 text-center text-sm font-medium ${
              active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
