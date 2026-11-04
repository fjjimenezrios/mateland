"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { mulberry32 } from "@/lib/rng";
import { ActionBar } from "../_kit/ActionBar";
import { celebrate } from "../_kit/confetti";
import { FeedbackCard, type Feedback } from "../_kit/Feedback";
import { GameShell } from "../_kit/GameShell";
import { playSound } from "../_kit/sound";
import { useHints } from "../_kit/useHints";
import type { GameProps } from "../types";
import { mcm } from "./index";
import type { McmConfig } from "./config";
import { isLit, judgeClaim, lcm, multiples } from "./engine";
import { generateMcm } from "./generator";
import { hintText, laterMessage, missingMessage, successMessage } from "./texts";

const TICK = 20;
const PLAY_MS = 650;
const LAMPS = { a: { name: "A", color: "#fbbf24", glow: "rgba(251,191,36,.9)" }, b: { name: "B", color: "#22d3ee", glow: "rgba(34,211,238,.9)" } };

function Lamp({ which, period, lit, burstKey }: { which: "a" | "b"; period: number; lit: boolean; burstKey: number | null }) {
  const lamp = LAMPS[which];
  return (
    <div className="grid justify-items-center gap-2">
      <div className="relative">
        {burstKey !== null ? <span key={burstKey} className="bulb-burst" style={{ borderColor: lamp.color }} /> : null}
        <div
          className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/80 font-display text-3xl font-extrabold sm:h-28 sm:w-28"
          style={{
            background: lit ? `radial-gradient(circle at 35% 30%, #fff, ${lamp.color} 60%)` : "radial-gradient(circle at 35% 30%, #475569, #0f172a 70%)",
            color: lit ? "#422006" : "#94a3b8",
            boxShadow: lit ? `0 0 40px 14px ${lamp.glow}` : "none",
            transition: "box-shadow .12s, background .12s",
          }}
          role="img"
          aria-label={`Luz ${lamp.name}, ${lit ? "encendida" : "apagada"}`}
        >
          {lamp.name}
        </div>
        <div className="mx-auto h-4 w-10 rounded-b-lg bg-slate-500" />
      </div>
      <p className="rounded-full bg-black/35 px-3 py-1 text-sm font-extrabold text-white">Cada {period} s</p>
    </div>
  );
}

export function McmGame({ config, avoidKey, onResult, onNext }: GameProps<McmConfig>) {
  const [challenge] = useState(() => generateMcm(config, mulberry32(Math.floor(Math.random() * 2 ** 31)), avoidKey));
  const { a, b } = challenge;
  const total = config.maxLcm;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const hints = useHints({ seconds: config.hintSeconds, attempts: config.hintAttempts, active: !solved });

  const litA = isLit(time, a);
  const litB = isLit(time, b);
  const first = lcm(a, b);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setTime((value) => (value >= total ? value : value + 1)), PLAY_MS);
    return () => clearInterval(timer);
  }, [playing, total]);

  useEffect(() => {
    if (playing && time >= total) setPlaying(false);
    if (isLit(time, a)) playSound("pick");
    if (isLit(time, b)) playSound("pop");
    const element = track.current;
    if (element) element.scrollTo({ left: time * TICK - element.clientWidth / 2, behavior: "smooth" });
  }, [time, a, b, total, playing]);

  function go(next: number) {
    if (solved) return;
    setTime(Math.max(0, Math.min(total, next)));
    hints.touch();
  }

  function seek(event: PointerEvent<HTMLDivElement>) {
    const element = track.current;
    if (!element || solved) return;
    const rect = element.getBoundingClientRect();
    go(Math.round((event.clientX - rect.left + element.scrollLeft - TICK / 2) / TICK));
    setPlaying(false);
  }

  function claim() {
    setPlaying(false);
    const verdict = judgeClaim(a, b, time);
    if (verdict.kind === "first") {
      setSolved(true);
      setFeedback({ kind: "done", text: successMessage(a, b) });
      celebrate();
      playSound("success");
      onResult({ solved: true, attempts: hints.fails, hintsUsed: hints.level });
      return;
    }
    setFeedback({ kind: "error", text: verdict.kind === "later" ? laterMessage(time, verdict.first) : missingMessage(a, b, time, verdict.which) });
    hints.fail();
    playSound("error");
  }

  function askHint() {
    const level = hints.next();
    setFeedback({ kind: "hint", text: hintText(level, a, b) });
    playSound("pop");
  }

  const rows: { which: "a" | "b"; period: number }[] = [{ which: "a", period: a }, { which: "b", period: b }];
  const trackWidth = (total + 1) * TICK;

  return (
    <GameShell title={mcm.title} theme={mcm.theme} scene="night">
      <div className="grid gap-4">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold text-white drop-shadow sm:text-4xl">¿Cuándo parpadean a la vez?</p>
          <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold text-indigo-100 sm:text-base">
            Mueve el tiempo con los botones, la barra o tocando la línea, o pulsa Reproducir. Cuando veas las dos luces encendidas, pulsa «¡Coinciden!» — pero tiene que ser la primera vez.
          </p>
        </div>

        <div className="flex items-start justify-center gap-8 sm:gap-16">
          <Lamp which="a" period={a} lit={litA} burstKey={litA && litB ? time : null} />
          <Lamp which="b" period={b} lit={litB} burstKey={litA && litB ? time : null} />
        </div>

        <div className="rounded-3xl bg-black/35 p-3">
          <div className="mb-2 flex items-center justify-between px-1 text-sm font-extrabold text-white">
            <span>Línea de tiempo</span>
            <span className="rounded-full bg-white px-3 py-1 font-display text-lg text-indigo-950">Segundo {time}</span>
          </div>
          <div ref={track} className="overflow-x-auto pb-2" onPointerDown={seek} aria-label="Línea de tiempo, toca un segundo para moverte" role="group">
            <div className="relative select-none" style={{ width: trackWidth, height: 128 }}>
              {rows.map((row, rowIndex) => (
                <div key={row.which} className="absolute left-0 right-0 h-9" style={{ top: 10 + rowIndex * 44 }}>
                  <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" />
                  {multiples(row.period, total).map((m) => (
                    <span
                      key={m}
                      className="absolute top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px] font-extrabold text-slate-900"
                      style={{ left: m * TICK + TICK / 2, background: LAMPS[row.which].color, outline: solved && m === first ? "4px solid #fff" : undefined }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ))}
              <div className="absolute inset-x-0 bottom-0 h-6">
                {Array.from({ length: Math.floor(total / 5) + 1 }, (_, i) => i * 5).map((tick) => (
                  <span key={tick} className="absolute -translate-x-1/2 text-[11px] font-bold text-white/70" style={{ left: tick * TICK + TICK / 2 }}>
                    {tick}
                  </span>
                ))}
              </div>
              {solved ? (
                <span className="pop-in absolute top-0 h-[104px] w-1.5 -translate-x-1/2 rounded-full bg-yellow-300" style={{ left: first * TICK + TICK / 2, boxShadow: "0 0 14px 4px rgba(253,224,71,.9)" }} />
              ) : null}
              <span className="absolute top-0 h-[108px] w-0.5 -translate-x-1/2 bg-white" style={{ left: time * TICK + TICK / 2, transition: playing ? `left ${PLAY_MS}ms linear` : undefined } as CSSProperties} />
            </div>
          </div>
        </div>

        <div className="sheet mx-auto grid w-full max-w-xl gap-3 p-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn btn-ghost" style={{ color: "#1e1b4b" }} onClick={() => { setPlaying(false); go(0); }} disabled={solved} aria-label="Volver al principio">
              ⏮
            </button>
            <button type="button" className="btn btn-ghost" style={{ color: "#1e1b4b" }} onClick={() => { setPlaying(false); go(time - 1); }} disabled={solved || time <= 0} aria-label="Un segundo menos">
              ◀ −1
            </button>
            <button type="button" className="btn" onClick={() => setPlaying((value) => !value)} disabled={solved || time >= total}>
              {playing ? "⏸ Pausa" : "▶ Reproducir"}
            </button>
            <button type="button" className="btn btn-ghost" style={{ color: "#1e1b4b" }} onClick={() => { setPlaying(false); go(time + 1); }} disabled={solved || time >= total} aria-label="Un segundo más">
              +1 ▶
            </button>
          </div>
          <input type="range" min={0} max={total} value={time} onChange={(event) => { setPlaying(false); go(Number(event.target.value)); }} aria-label="Segundo actual" disabled={solved} className="w-full accent-indigo-600" />
        </div>

        <FeedbackCard feedback={feedback} />
      </div>

      <ActionBar solved={solved} hintLevel={hints.level} offered={hints.offered} onHint={askHint} onNext={() => onNext(challenge.key)} skipLabel="Otras luces">
        <button type="button" className="btn btn-green" onClick={claim}>
          ✔ ¡Coinciden!
        </button>
      </ActionBar>
    </GameShell>
  );
}
