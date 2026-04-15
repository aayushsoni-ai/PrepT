"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ interval = 10000, condition = true }) {
  const router = useRouter();

  useEffect(() => {
    if (!condition) return;

    const tickId = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(tickId);
  }, [condition, interval, router]);

  return null;
}
