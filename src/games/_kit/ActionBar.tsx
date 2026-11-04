"use client";

import type { ReactNode } from "react";

type Props = {
  solved: boolean;
  hintLevel: number;
  offered: boolean;
  onHint: () => void;
  onNext: () => void;
  nextLabel?: string;
  skipLabel?: string;
  children?: ReactNode;
};

export function ActionBar({ solved, hintLevel, offered, onHint, onNext, nextLabel = "Nuevo desafío →", skipLabel = "Otro desafío", children }: Props) {
  return (
    <div className="sticky bottom-2 z-20 mt-3 flex flex-wrap items-center justify-center gap-3 rounded-full bg-black/35 p-2">
      {solved ? (
        <button type="button" className="btn btn-green" onClick={onNext}>
          {nextLabel}
        </button>
      ) : (
        <>
          {children}
          <span className="relative">
            {offered ? (
              <span className="pop-in absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-sm font-extrabold text-violet-900">
                ¿Quieres una pista?
              </span>
            ) : null}
            <button type="button" className={`btn btn-orange ${offered ? "pulse" : ""}`} onClick={onHint}>
              💡 Pista{hintLevel > 0 ? ` (${hintLevel}/3)` : ""}
            </button>
          </span>
          <button type="button" className="btn btn-ghost" onClick={onNext}>
            {skipLabel}
          </button>
        </>
      )}
    </div>
  );
}
