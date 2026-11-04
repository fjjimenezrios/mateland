"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { mulberry32 } from "@/lib/rng";
import { celebrate } from "../_kit/confetti";
import { GameShell } from "../_kit/GameShell";
import { playSound } from "../_kit/sound";
import type { GameProps } from "../types";
import { cazaDivisores } from "./index";
import type { CazaConfig } from "./config";
import { generateCaza } from "./generator";
import { finalMessage, foundMessage, hintText, wrongMessage } from "./texts";

type Feedback = { kind: "ok" | "error" | "hint" | "done"; text: string };

export function CazaGame({ config, avoidKey, onResult, onNext }: GameProps<CazaConfig>) {
  const reduced = useReducedMotion();
  const [challenge] = useState(() => generateCaza(config, mulberry32(Math.floor(Math.random() * 2 ** 31)), avoidKey));
  const { n, targets, bubbles } = challenge;
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [idle, setIdle] = useState(0);
  const [shakeId, setShakeId] = useState<number | null>(null);

  const solved = found.length === targets.length;
  const attempts = wrong.length;
  const pending = targets.find((d) => !found.includes(d));
  const helpOffered = hintLevel === 0 && !solved && (idle >= config.hintSeconds || attempts >= config.hintAttempts);

  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setIdle((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  const foundSorted = useMemo(() => [...found].sort((a, b) => a - b), [found]);

  function tap(value: number) {
    if (solved || found.includes(value) || wrong.includes(value)) return;
    setIdle(0);
    if (n % value === 0) {
      const nextFound = [...found, value];
      setFound(nextFound);
      playSound("pop");
      if (nextFound.length === targets.length) {
        setFeedback({ kind: "done", text: finalMessage(n, targets) });
        celebrate();
        playSound("success");
        onResult({ solved: true, attempts, hintsUsed: hintLevel });
      } else {
        setFeedback({ kind: "ok", text: foundMessage(n, value) });
      }
      return;
    }
    setWrong((current) => [...current, value]);
    setFeedback({ kind: "error", text: wrongMessage(n, value) });
    setShakeId(value);
    setTimeout(() => setShakeId(null), 450);
    playSound("error");
  }

  function askHint() {
    const level = Math.min(3, hintLevel + 1) as 1 | 2 | 3;
    setHintLevel(level);
    setFeedback({ kind: "hint", text: hintText(level, n, pending) });
    playSound("pop");
  }

  const stateOf = (value: number) => (found.includes(value) ? "found" : wrong.includes(value) ? "wrong" : "idle");
  const accent = { ok: "#16a34a", done: "#16a34a", error: "#dc2626", hint: "#f59e0b" };

  return (
    <GameShell title={cazaDivisores.title} theme={cazaDivisores.theme} scene="ocean">
      <div className="grid gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-bold text-white sm:text-lg">Encuentra todos los divisores de</p>
          <div
            className="grid h-28 w-28 place-items-center rounded-full font-display text-5xl font-extrabold text-white sm:h-36 sm:w-36 sm:text-7xl"
            style={{
              background: "radial-gradient(circle at 35% 30%, #67e8f9, #2563eb 70%)",
              boxShadow: "0 0 0 5px rgba(255,255,255,.85), 0 0 40px 10px rgba(103,232,249,.55)",
              textShadow: "0 3px 0 rgba(0,0,0,.25)",
            }}
            aria-label={`Número ${n}`}
          >
            {n}
          </div>
          <p className="max-w-xl text-sm font-semibold text-white/95 sm:text-base">
            Toca las burbujas por las que se puede dividir {n} sin que sobre nada. Has encontrado{" "}
            <b>{found.length}</b> de <b>{targets.length}</b>.
          </p>
        </div>

        <div
          className="mx-auto flex max-w-4xl flex-wrap justify-center gap-4 py-2 sm:gap-6"
          style={{ "--size": bubbles.length > 12 ? "76px" : "88px" } as CSSProperties}
        >
          {bubbles.map((value, index) => (
            <motion.button
              key={value}
              type="button"
              className={`bubble ${shakeId === value ? "shake" : ""}`}
              data-state={stateOf(value)}
              data-glow={hintLevel >= 3 && value === pending}
              aria-label={`Burbuja ${value}`}
              aria-disabled={stateOf(value) !== "idle" || solved}
              onClick={() => tap(value)}
              animate={reduced || stateOf(value) !== "found" ? undefined : { scale: [1, 1.3, 1] }}
              transition={{ duration: 0.4 }}
              style={{ "--dur": `${4 + (index % 5) * 0.7}s`, "--delay": `${-(index % 7) * 0.6}s` } as CSSProperties}
            >
              {value}
            </motion.button>
          ))}
        </div>

        {foundSorted.length > 0 ? (
          <ul aria-label="Divisores encontrados" className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
            {foundSorted.map((value) => (
              <li key={value} className="pop-in rounded-full bg-white px-4 py-1 font-display text-lg font-extrabold text-emerald-800 shadow">
                {n} = {value} × {n / value}
              </li>
            ))}
          </ul>
        ) : null}

        <div aria-live="polite" className="min-h-[3.5rem]">
          {feedback ? (
            <div key={feedback.text} className="sheet pop-in mx-auto flex max-w-3xl items-start gap-3 p-4" style={{ borderLeft: `8px solid ${accent[feedback.kind]}` }}>
              <span aria-hidden className="text-3xl">
                {feedback.kind === "done" ? "🎉" : feedback.kind === "ok" ? "✅" : feedback.kind === "error" ? "🤔" : "💡"}
              </span>
              <p className="font-bold leading-snug">{feedback.text}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-2 z-20 mt-3 flex flex-wrap items-center justify-center gap-3 rounded-full bg-black/35 p-2">
        {solved ? (
          <button type="button" className="btn btn-green" onClick={() => onNext(challenge.key)}>
            Nuevo desafío →
          </button>
        ) : (
          <>
            <span className="relative">
              {helpOffered ? (
                <span className="pop-in absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-sm font-extrabold text-blue-900">
                  ¿Quieres una pista?
                </span>
              ) : null}
              <button type="button" className={`btn btn-orange ${helpOffered ? "pulse" : ""}`} onClick={askHint}>
                💡 Pista{hintLevel > 0 ? ` (${hintLevel}/3)` : ""}
              </button>
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => onNext(challenge.key)}>
              Otro número
            </button>
          </>
        )}
      </div>
    </GameShell>
  );
}
