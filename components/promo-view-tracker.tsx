"use client";

import { useEffect } from "react";

export function PromoViewTracker({ code }: { code: string }) {
  useEffect(() => {
    void fetch("/api/promo-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      keepalive: true,
    });
  }, [code]);

  return null;
}
