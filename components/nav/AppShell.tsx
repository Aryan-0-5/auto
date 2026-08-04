"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { SideMenu } from "./SideMenu";
import { MobileNav } from "./MobileNav";

const CHROME_LESS_PATHS = new Set(["/login", "/profiles"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showChrome = !CHROME_LESS_PATHS.has(pathname);
  const [activeUserName, setActiveUserName] = useState<string | null>(null);

  useEffect(() => {
    if (!showChrome) return;
    let ignore = false;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore) setActiveUserName(data?.userName ?? null);
      });
    return () => {
      ignore = true;
    };
  }, [showChrome]);

  if (!showChrome) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-900">MDC Quotation Board</span>
          <TopNav />
        </div>
        <SideMenu activeUserName={activeUserName} />
        <MobileNav activeUserName={activeUserName} />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
