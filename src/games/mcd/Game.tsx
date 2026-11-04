"use client";

import { useState } from "react";
import { divisors } from "@/lib/math";
import { mulberry32 } from "@/lib/rng";
import { ActionBar } from "../_kit/ActionBar";
import { celebrate } from "../_kit/confetti";
import { FeedbackCard, type Feedback } from "../_kit/Feedback";
import { GameShell } from "../_kit/GameShell";
import { playSound } from "../_kit/sound";
import { useHints } from "../_kit/useHints";
import type { GameProps } from "../types";
import { mcd } from "./index";
import type { McdConfig } from "./config";
import { coverage, gcd, judge } from "./engine";
import { generateMcd } from "./generator";
import { cutsMessage, hintText, smallerMessage, successMessage } from "./texts";

export function McdGame({ config, avoidKey, onResult, onNext }: GameProps<McdConfig>) {
  const [challenge] = useState(() => generateMcd(config, mulberry32(Math.floor(Math.random() * 2 ** 31)), avoidKey));
  const { width, height } = challenge;
  const maxSide = Math.min(width, height);
  const [side, setSide] = useState(1);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const hints = useHints({ seconds: config.hintSeconds, attempts: config.hintAttempts, active: !solved });

  const cover = coverage(width, height, side);
  const exactWidth = cover.cols * side;
  const exactHeight = cover.rows * side;

  function change(next: number) {
    if (solved) return;
    setSide(Math.max(1, Math.min(maxSide, next)));
    hints.touch();
    playSound("pick");
  }

  function claim() {
    const verdict = judge(width, height, side);
    if (verdict.kind === "best") {
      setSolved(true);
      setFeedback({ kind: "done", text: successMessage(width, height) });
      celebrate();
      playSound("success");
      onResult({ solved: true, attempts: hints.fails, hintsUsed: hints.level });
      return;
    }
    setFeedback({ kind: "error", text: verdict.kind === "smaller" ? smallerMessage(side) : cutsMessage(side, width, height, verdict.cuts) });
    hints.fail();
    playSound("error");
  }

  function askHint() {
    const level = hints.next();
    setFeedback({ kind: "hint", text: hintText(level, width, height) });
    playSound("pop");
  }

  const u = side;
  const best = gcd(width, height);

  return (
    <GameShell title={mcd.title} theme={mcd.theme} scene="workshop">
      <div className="grid gap-4">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold text-white drop-shadow sm:text-4xl">
            Cubre un suelo de <span className="text-yellow-200">{width}</span> × <span className="text-yellow-200">{height}</span> m
          </p>
          <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold text-rose-50 sm:text-base">
            Elige el lado de las baldosas cuadradas. Busca las más grandes que quepan sin cortar ninguna.
          </p>
        </div>

        <div className="mx-auto w-full" style={{ maxWidth: `min(100%, ${(width / height) * 46}vh)` }}>
          <div className="mb-1 text-center text-sm font-extrabold text-white">{width} m</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-white [writing-mode:vertical-rl] rotate-180">{height} m</span>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="block w-full rounded-lg"
              style={{ aspectRatio: `${width} / ${height}`, filter: solved || cover.exact ? "drop-shadow(0 0 14px rgba(253,224,71,.9))" : "drop-shadow(0 8px 14px rgba(0,0,0,.4))" }}
              role="img"
              aria-label={`Suelo de ${width} por ${height} metros cubierto con baldosas de ${side} metros: ${cover.tiles} baldosas enteras${cover.exact ? " y no sobra nada" : " y sobran tiras"}`}
            >
              <defs>
                <linearGradient id="tile-face" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fda4af" />
                  <stop offset="0.5" stopColor="#fb7185" />
                  <stop offset="1" stopColor="#be123c" />
                </linearGradient>
                <pattern id="tile" width={u} height={u} patternUnits="userSpaceOnUse">
                  <rect width={u} height={u} fill="#4c0519" />
                  <rect x={u * 0.05} y={u * 0.05} width={u * 0.9} height={u * 0.9} rx={u * 0.1} fill="url(#tile-face)" />
                  <path d={`M ${u * 0.14} ${u * 0.3} Q ${u * 0.14} ${u * 0.14} ${u * 0.3} ${u * 0.14}`} stroke="#fff" strokeOpacity="0.7" strokeWidth={u * 0.07} fill="none" strokeLinecap="round" />
                </pattern>
                <pattern id="cut" width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="1.2" height="1.2" fill="#fecaca" />
                  <rect width="0.55" height="1.2" fill="#dc2626" />
                </pattern>
              </defs>
              <rect width={width} height={height} fill="#4c0519" />
              {cover.leftoverX > 0 ? <rect x={exactWidth} y={0} width={cover.leftoverX} height={height} fill="url(#cut)" /> : null}
              {cover.leftoverY > 0 ? <rect x={0} y={exactHeight} width={exactWidth} height={cover.leftoverY} fill="url(#cut)" /> : null}
              {cover.tiles > 0 ? <rect key={side} x={0} y={0} width={exactWidth} height={exactHeight} fill="url(#tile)" className="pop-in" /> : null}
            </svg>
          </div>
        </div>

        <div className="sheet mx-auto grid w-full max-w-xl gap-3 p-4">
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-ghost" style={{ color: "#4c0519", minWidth: 52 }} aria-label="Baldosa más pequeña" onClick={() => change(side - 1)} disabled={side <= 1 || solved}>
              −
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-stone-600">Lado de la baldosa</p>
              <p className="font-display text-4xl font-extrabold text-rose-700">{side} m</p>
            </div>
            <button type="button" className="btn btn-ghost" style={{ color: "#4c0519", minWidth: 52 }} aria-label="Baldosa más grande" onClick={() => change(side + 1)} disabled={side >= maxSide || solved}>
              +
            </button>
          </div>
          <input type="range" min={1} max={maxSide} value={side} onChange={(event) => change(Number(event.target.value))} aria-label="Lado de la baldosa en metros" disabled={solved} className="w-full accent-rose-600" />
          <p role="status" className={`rounded-xl p-3 text-center font-bold ${cover.exact ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>
            {cover.exact
              ? `Cabe justo: ${cover.cols} × ${cover.rows} = ${cover.tiles} baldosas, sin cortar ninguna.`
              : `Con baldosas de ${side} m caben ${cover.tiles} enteras y sobran tiras (rayadas) que habría que cortar.`}
          </p>
        </div>

        {solved ? (
          <ul aria-label="Divisores comunes" className="mx-auto flex flex-wrap justify-center gap-2">
            {divisors(best).map((d) => (
              <li key={d} className={`pop-in rounded-full px-4 py-1 font-display text-lg font-extrabold shadow ${d === best ? "bg-yellow-300 text-amber-950" : "bg-white text-rose-900"}`}>
                {d}
              </li>
            ))}
          </ul>
        ) : null}

        <FeedbackCard feedback={feedback} />
      </div>

      <ActionBar solved={solved} hintLevel={hints.level} offered={hints.offered} onHint={askHint} onNext={() => onNext(challenge.key)} skipLabel="Otro suelo">
        <button type="button" className="btn btn-green" onClick={claim}>
          ✔ ¡Es la más grande!
        </button>
      </ActionBar>
    </GameShell>
  );
}
