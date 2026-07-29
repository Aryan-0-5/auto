"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const MENU_ITEMS = [
  { href: "/history", label: "History" },
  { href: "/templates", label: "Templates" },
];

export function SideMenu() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      {MENU_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={pathname === item.href ? "font-medium text-gray-900 underline" : "text-gray-500 hover:text-gray-800"}
        >
          {item.label}
        </Link>
      ))}
      <button onClick={handleLogout} className="text-gray-500 hover:text-gray-800">
        Log out
      </button>
    </div>
  );
}
