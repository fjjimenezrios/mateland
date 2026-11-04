"use client";

import type { ReactNode } from "react";

export type FeedbackKind = "ok" | "error" | "hint" | "done";
export type Feedback = { kind: FeedbackKind; text: string };

const ACCENT: Record<FeedbackKind, string> = { ok: "#16a34a", done: "#16a34a", error: "#dc2626", hint: "#f59e0b" };
const ICON: Record<FeedbackKind, string> = { ok: "✅", done: "🎉", error: "🤔", hint: "💡" };

export function FeedbackCard({ feedback, children }: { feedback: Feedback | null; children?: ReactNode }) {
  return (
    <div aria-live="polite" className="min-h-[3.5rem]">
      {feedback ? (
        <div key={feedback.text} className="sheet pop-in mx-auto flex max-w-3xl items-start gap-3 p-4" style={{ borderLeft: `8px solid ${ACCENT[feedback.kind]}` }}>
          <span aria-hidden className="text-3xl">
            {ICON[feedback.kind]}
          </span>
          <div>
            <p className="font-bold leading-snug">{feedback.text}</p>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
