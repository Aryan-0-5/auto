"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { SideMenu } from "./SideMenu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-900">MDC Quotation Board</span>
          <TopNav />
        </div>
        <SideMenu />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
