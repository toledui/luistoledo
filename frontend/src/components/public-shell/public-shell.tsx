"use client";

import { PublicNavbar } from "@/components/public-navbar/public-navbar";
import { SiteFooter } from "@/components/site-footer/site-footer";
import { usePathname } from "next/navigation";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) return children;

  return (
    <>
      <PublicNavbar />
      {children}
      <SiteFooter />
    </>
  );
}
