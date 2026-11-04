"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { mulberry32 } from "@/lib/rng";
import { ActionBar } from "../_kit/ActionBar";
import { celebrate } from "../_kit/confetti";
import { FeedbackCard, type Feedback } from "../_kit/Feedback";
import { GameShell } from "../_kit/GameShell";
import { playSound } from "../_kit/sound";
import { useHints } from "../_kit/useHints";
import type { GameProps } from "../types";
import { criba } from "./index";
import type { CribaConfig } from "./config";
import { createSieve, isFinished, pendingPrime, remainingPrimes, tapNumber } from "./engine";
import { generateCriba } from "./generator";
import { crossedMessage, earlyMessage, finalMessage, hintText, oneMessage, primeFoundMessage } from "./texts";

const PRIME_COLORS = ["#38bdf8", "#f472b6", "#a3e635", "#fb923c", "#c084fc", "#2dd4bf", "#fde047", "#f87171"];

export function CribaGame({ config, avoidKey, onResult, onNext }: GameProps<CribaConfig>) {
  const [challenge] = useState(() => generateCriba(config, mulberry32(Math.floor(Math.random() * 2 ** 31)), avoidKey));
  const { limit } = challenge;
  const [state, setState] = useState(() => createSieve(limit));
  const [fresh, setFresh] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [shaking, setShaking] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hints = useHints({ seconds: config.hintSeconds, attempts: config.hintAttempts, active: !revealed });

  useEffect(
    () => () => {
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    },
    [],
  );

  const pending = pendingPrime(state);
  const primesLeft = remainingPrimes(state);

  function wrong(n: number, text: string) {
    setFeedback({ kind: "error", text });
    setShaking(n);
    setTimeout(() => setShaking(null), 450);
    hints.fail();
    playSound("error");
  }

  function tap(n: number) {
    if (revealed) return;
    const result = tapNumber(state, n);
    if (result.kind === "ok") {
      hints.touch();
      setState(result.state);
      setFresh(Object.fromEntries(result.crossed.map((multiple, index) => [multiple, index])));
      playSound("pop");
      const message = primeFoundMessage(n, result.crossed);
      if (isFinished(result.state)) {
        const primes = remainingPrimes(result.state);
        setRevealed(true);
        setFeedback({ kind: "done", text: `${message} ${finalMessage(limit, primes)}` });
        celebrateTimer.current = setTimeout(() => {
          celebrate();
          playSound("success");
        }, 600);
        onResult({ solved: true, attempts: hints.fails, hintsUsed: hints.level });
      } else {
        setFeedback({ kind: "ok", text: message });
      }
    } else if (result.kind === "crossed") wrong(n, crossedMessage(n, result.by));
    else if (result.kind === "early") wrong(n, earlyMessage(result.pending));
    else if (result.kind === "one") setFeedback({ kind: "hint", text: oneMessage });
  }

  function askHint() {
    const level = hints.next();
    setFeedback({ kind: "hint", text: hintText(level, pending) });
    playSound("pop");
  }

  const stateOf = (n: number) =>
    n === 1 ? "one" : state.crossedBy[n] !== undefined ? "crossed" : state.picked.includes(n) || revealed ? "prime" : "open";
  const colorOf = (prime: number) => PRIME_COLORS[state.picked.indexOf(prime) % PRIME_COLORS.length];

  return (
    <GameShell title={criba.title} theme={criba.theme} scene="space">
      <div className="grid gap-4">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold text-white drop-shadow sm:text-4xl">
            Primos del 1 al <span className="text-yellow-200">{limit}</span>
          </p>
          <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold text-violet-100 sm:text-base">
            Toca el menor número que siga sin tachar: será primo y se tacharán todos sus múltiplos. Repite hasta que no quede ninguno por tocar.
          </p>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <div className="sieve-grid" role="group" aria-label={`Tablero del 1 al ${limit}`}>
            {Array.from({ length: limit }, (_, index) => {
              const n = index + 1;
              const cellState = stateOf(n);
              const by = state.crossedBy[n];
              const guidedHint = (config.guided || hints.level >= 3) && n === pending && !revealed;
              const primeIndex = primesLeft.indexOf(n);
              return (
                <button
                  key={n}
                  type="button"
                  className="tile"
                  data-state={cellState}
                  data-hint={guidedHint}
                  data-shake={shaking === n}
                  aria-label={`Número ${n}${cellState === "crossed" ? `, tachado, múltiplo de ${by}` : cellState === "prime" ? ", primo" : ""}`}
                  onClick={() => tap(n)}
                  style={
                    {
                      "--by": by !== undefined ? colorOf(by) : undefined,
                      "--i": fresh[n] ?? 0,
                      "--w": revealed && primeIndex >= 0 ? `${primeIndex * 0.05}s` : "0s",
                    } as CSSProperties
                  }
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {state.picked.length > 0 ? (
          <ul aria-label="Primos encontrados" className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2">
            {state.picked.map((prime) => (
              <li key={prime} className="pop-in rounded-full px-4 py-1 font-display text-base font-extrabold text-white shadow" style={{ background: colorOf(prime) }}>
                {prime} tacha sus múltiplos
              </li>
            ))}
            {revealed ? (
              <li className="pop-in rounded-full bg-yellow-300 px-4 py-1 font-display text-base font-extrabold text-amber-950 shadow">
                {primesLeft.length} primos en total
              </li>
            ) : null}
          </ul>
        ) : null}

        <FeedbackCard feedback={feedback} />
      </div>

      <ActionBar solved={revealed} hintLevel={hints.level} offered={hints.offered} onHint={askHint} onNext={() => onNext(challenge.key)} skipLabel="Otro tablero" />
    </GameShell>
  );
}
