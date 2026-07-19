"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ScrollToTop() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const changedPage = previousPathname.current !== pathname;
    previousPathname.current = pathname;

    if (changedPage && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}
