"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_MENU_ITEMS } from "@/lib/nav-items";

export function SideMenu({ activeUserName }: { activeUserName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSwitchProfile() {
    await fetch("/api/auth/switch-profile", { method: "POST" });
    router.push("/profiles");
    router.refresh();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="hidden items-center gap-4 text-sm sm:flex">
      {NAV_MENU_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname === item.href ? "font-medium text-gray-900 underline" : "text-gray-500 hover:text-gray-800"}
        >
          {item.label}
        </Link>
      ))}
      {activeUserName && <span className="text-gray-400">{activeUserName}</span>}
      <button onClick={handleSwitchProfile} className="text-gray-500 hover:text-gray-800">
        Switch profile
      </button>
      <button onClick={handleLogout} className="text-gray-500 hover:text-gray-800">
        Log out
      </button>
    </div>
  );
}
