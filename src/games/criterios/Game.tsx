"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { mulberry32 } from "@/lib/rng";
import { ActionBar } from "../_kit/ActionBar";
import { celebrate } from "../_kit/confetti";
import { FeedbackCard, type Feedback } from "../_kit/Feedback";
import { GameShell } from "../_kit/GameShell";
import { playSound } from "../_kit/sound";
import { useHints } from "../_kit/useHints";
import type { GameProps } from "../types";
import { criterios } from "./index";
import { type Criterion, type CriteriosConfig, matchingCriteria } from "./config";
import { explain, hintText, noneMessage, noneOk } from "./engine";
import { generateCriterios } from "./generator";

const NONE = 0;
const COLORS: Record<number, string> = { 2: "#38bdf8", 3: "#f472b6", 4: "#a78bfa", 5: "#fb923c", 6: "#facc15", 9: "#4ade80", 10: "#f87171", 11: "#2dd4bf", [NONE]: "#94a3b8" };
const ADVANCE_MS = 1100;

function tubeAt(x: number, y: number): number | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const tube = (element as HTMLElement).dataset?.tube;
    if (tube !== undefined) return Number(tube);
  }
  return null;
}

export function CriteriosGame({ config, avoidKey, onResult, onNext }: GameProps<CriteriosConfig>) {
  const [challenge] = useState(() => generateCriterios(config, mulberry32(Math.floor(Math.random() * 2 ** 31)), avoidKey));
  const { numbers, criteria } = challenge;
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [inTube, setInTube] = useState<Record<number, number[]>>({});
  const [finished, setFinished] = useState<number[]>([]);
  const [selected, setSelected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; over: number | null } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [shakeTube, setShakeTube] = useState<number | null>(null);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solved = finished.length === numbers.length;
  const hints = useHints({ seconds: config.hintSeconds, attempts: config.hintAttempts, active: !solved });
  const current = numbers[index];
  const matches = useMemo(() => (current === undefined ? [] : matchingCriteria(current, criteria)), [current, criteria]);
  const tubes = [...criteria, NONE];

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function wrong(target: number, text: string) {
    setFeedback({ kind: "error", text });
    setShakeTube(target);
    setTimeout(() => setShakeTube(null), 450);
    hints.fail();
    playSound("error");
  }

  function completeNumber(text: string) {
    setBusy(true);
    setSelected(false);
    setFeedback({ kind: "ok", text });
    playSound("success");
    timer.current = setTimeout(() => {
      const nextFinished = [...finished, current];
      setFinished(nextFinished);
      setBusy(false);
      if (nextFinished.length === numbers.length) {
        setFeedback({ kind: "done", text: "¡Todos los números clasificados! Fíjate en cómo ha cambiado cada tubo: un mismo número puede cumplir varios criterios." });
        celebrate();
        onResult({ solved: true, attempts: hints.fails, hintsUsed: hints.level });
      } else {
        setIndex(index + 1);
        setPlaced([]);
        setFeedback(null);
      }
    }, ADVANCE_MS);
  }

  function drop(target: number) {
    if (solved || busy || current === undefined) return;
    hints.touch();
    if (target === NONE) {
      if (matches.length === 0) return completeNumber(noneOk(current, criteria));
      return wrong(target, noneMessage(current, matches));
    }
    if (placed.includes(target)) return;
    const result = explain(current, target as Criterion);
    if (!result.ok) return wrong(target, result.text);
    const nextPlaced = [...placed, target];
    setPlaced(nextPlaced);
    setInTube((tubesNow) => ({ ...tubesNow, [target]: [...(tubesNow[target] ?? []), current] }));
    playSound("pop");
    if (nextPlaced.length === matches.length) {
      const also = matches.length > 1 ? ` Va en ${matches.length} tubos: ${matches.map((d) => `÷${d}`).join(", ")}.` : "";
      return completeNumber(`¡Sí! ${result.text}${also}`);
    }
    setFeedback({ kind: "ok", text: `¡Sí! ${result.text} Pero puede que ese número encaje también en otro tubo.` });
  }

  function onCardDown(event: PointerEvent<HTMLButtonElement>) {
    if (solved || busy || event.button > 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = { x: event.clientX, y: event.clientY, moved: false };
  }

  function onCardMove(event: PointerEvent<HTMLButtonElement>) {
    const active = press.current;
    if (!active) return;
    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 8) return;
    active.moved = true;
    setDrag({ x: event.clientX, y: event.clientY, over: tubeAt(event.clientX, event.clientY) });
  }

  function onCardUp(event: PointerEvent<HTMLButtonElement>) {
    const state = press.current;
    press.current = null;
    if (!state) return;
    if (!state.moved) {
      playSound("pick");
      return setSelected((value) => !value);
    }
    setDrag(null);
    const target = tubeAt(event.clientX, event.clientY);
    if (target !== null) drop(target);
  }

  function onCardKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setSelected((value) => !value);
  }

  function tapTube(target: number) {
    if (selected) {
      setSelected(false);
      return drop(target);
    }
    setFeedback({ kind: "hint", text: "Arrastra el número hasta el tubo, o toca el número y después el tubo." });
  }

  function askHint() {
    const level = hints.next();
    setFeedback({ kind: "hint", text: hintText(level, current, criteria, matches.filter((d) => !placed.includes(d))) });
    playSound("pop");
  }

  return (
    <GameShell title={criterios.title} theme={criterios.theme} scene="factory">
      <div className="grid gap-4">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold text-white drop-shadow sm:text-4xl">Manda cada número a su tubo</p>
          <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold text-teal-50 sm:text-base">
            Un número puede ir en varios tubos. Si no cumple ningún criterio, va a «Ninguno».
          </p>
        </div>

        <ol aria-label="Progreso" className="flex flex-wrap items-center justify-center gap-2">
          {numbers.map((n, i) => (
            <li
              key={n}
              className={`min-w-12 rounded-full px-3 py-1 text-center font-display text-base font-extrabold ${finished.includes(n) ? "bg-emerald-300 text-emerald-950" : i === index ? "bg-white text-teal-900 ring-4 ring-teal-300" : "bg-black/30 text-white/80"}`}
            >
              {finished.includes(n) ? "✓ " : ""}
              {n}
            </li>
          ))}
        </ol>

        <div className="relative mx-auto flex h-40 w-full max-w-2xl items-center justify-center rounded-3xl bg-black/25">
          <div className="absolute inset-x-6 bottom-4 h-3 rounded-full bg-teal-950/60" />
          {!solved && current !== undefined ? (
            <button
              key={current}
              type="button"
              className="number-card pop-in"
              data-selected={selected}
              aria-label={`Número ${current}`}
              aria-pressed={selected}
              onPointerDown={onCardDown}
              onPointerMove={onCardMove}
              onPointerUp={onCardUp}
              onPointerCancel={() => {
                press.current = null;
                setDrag(null);
              }}
              onKeyDown={onCardKey}
              style={{ opacity: drag ? 0.3 : 1 }}
            >
              {current}
            </button>
          ) : (
            <p className="font-display text-3xl font-extrabold text-white">¡Hecho!</p>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6" role="group" aria-label="Tubos">
          {tubes.map((tube) => {
            const count = inTube[tube]?.length ?? 0;
            return (
              <div key={tube} className="grid justify-items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 font-display text-lg font-extrabold text-teal-950 shadow">{tube === NONE ? "Ninguno" : `÷${tube}`}</span>
                <div
                  className={`tube ${shakeTube === tube ? "shake" : ""}`}
                  data-tube={tube}
                  data-over={drag?.over === tube}
                  role="button"
                  tabIndex={0}
                  aria-label={tube === NONE ? "Tubo Ninguno" : `Tubo divisible entre ${tube}, ${count} números`}
                  onClick={() => tapTube(tube)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      tapTube(tube);
                    }
                  }}
                >
                  <div className="tube-fill" style={{ "--c": COLORS[tube], "--fill": count === 0 ? 0 : Math.min(1, 0.2 + (0.8 * count) / numbers.length) } as CSSProperties} />
                  <span className="absolute inset-x-0 bottom-3 text-center font-display text-sm font-extrabold text-white" style={{ textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>
                    {(inTube[tube] ?? []).join(" · ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <FeedbackCard feedback={feedback} />
      </div>

      <ActionBar solved={solved} hintLevel={hints.level} offered={hints.offered} onHint={askHint} onNext={() => onNext(challenge.key)} skipLabel="Otros números" />

      {drag ? (
        <div aria-hidden className="pointer-events-none fixed z-50" style={{ left: drag.x - 70, top: drag.y - 40 }}>
          <div className="number-card" style={{ transform: "scale(.8) rotate(-4deg)" }}>
            {current}
          </div>
        </div>
      ) : null}
    </GameShell>
  );
}
