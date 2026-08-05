"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { NavMenu } from "./NavMenu";

const CHROME_LESS_PATHS = new Set(["/login", "/admin/reset-pin"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showChrome = !CHROME_LESS_PATHS.has(pathname);

  if (!showChrome) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-gray-900">MDC Quotation Board</span>
          <NavMenu />
        </div>
        <TopNav />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
