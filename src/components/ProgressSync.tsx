"use client";

import { useEffect } from "react";
import { currentAccount, leaveAccount, syncNow } from "@/lib/progress-client";

export function ProgressSync() {
  useEffect(() => {
    if (currentAccount()) {
      fetch("/api/me", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((me: { student: unknown } | null) => {
          if (me && !me.student) leaveAccount();
        })
        .catch(() => undefined);
    }
    const timer = setInterval(() => void syncNow(), 60_000);
    const onHide = () => void syncNow({ exiting: true });
    const onVisibility = () => document.visibilityState === "hidden" && onHide();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);
  return null;
}
