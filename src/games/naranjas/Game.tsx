"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { mulberry32 } from "@/lib/rng";
import { celebrate } from "../_kit/confetti";
import { GameShell } from "../_kit/GameShell";
import { MIN_LASSO_LENGTH, pathLength, selectInside, type Marked, type Point } from "../_kit/lasso";
import { playSound } from "../_kit/sound";
import { naranjas } from "./index";
import type { GameProps } from "../types";
import { MODES, type Mode, type NaranjasConfig } from "./config";
import { PILE, emptyPlacement, evaluate, moveOranges, solution, surplusZone, type Verdict } from "./engine";
import { generateChallenge } from "./generator";
import { hintText, primeNote, successMessage, verdictMessage } from "./texts";

const MODE_KEY = "mates:naranjas:mode";
const BASKET_HUES = [28, 205, 145, 335, 268, 8, 48, 178, 295, 100];
const DRAG_THRESHOLD = 8;
const MODE_LABELS: Record<Mode, string> = { drag: "Arrastrar", group: "Agrupar" };
const INSTRUCTIONS: Record<Mode, string> = {
  drag: "Arrastra cada naranja a un cesto. También puedes tocar una naranja y después un cesto.",
  group: "Rodea varias naranjas con el dedo o el ratón y toca un cesto para guardarlas. También puedes arrastrarlas.",
};

type Feedback = { kind: "error" | "success" | "hint"; text: string };
type Press = { id: number; x: number; y: number; moved: boolean; ids: number[] };
type FieldPress = { path: Point[] };
type DragState = { ids: number[]; x: number; y: number; over: number | null };

const pileSize = (count: number) => (count <= 12 ? 48 : count <= 20 ? 42 : count <= 30 ? 38 : 34);
const basketSize = (perBasket: number) => (perBasket <= 4 ? 40 : perBasket <= 8 ? 34 : perBasket <= 12 ? 30 : 26);

function zoneAt(x: number, y: number): number | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const zone = (element as HTMLElement).dataset?.zone;
    if (zone !== undefined) return Number(zone);
  }
  return null;
}

export function NaranjasGame({ config, avoidKey, onResult, onNext }: GameProps<NaranjasConfig>) {
  const reduced = useReducedMotion();
  const [challenge] = useState(() => generateChallenge(config, mulberry32(Math.floor(Math.random() * 2 ** 31)), avoidKey));
  const { oranges, baskets } = challenge;
  const [placement, setPlacement] = useState(() => emptyPlacement(oranges));
  const [selected, setSelected] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>(config.modes[0]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [lasso, setLasso] = useState<Point[] | null>(null);
  const [preview, setPreview] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [idle, setIdle] = useState(0);
  const [shaking, setShaking] = useState(false);

  const fieldRef = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const fieldPress = useRef<FieldPress | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY) as Mode | null;
      if (saved && MODES.includes(saved) && config.modes.includes(saved)) setMode(saved);
    } catch {
      return;
    }
  }, [config.modes]);

  useEffect(() => {
    if (solved) return;
    const timer = setInterval(() => setIdle((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [solved]);

  useEffect(() => setIdle(0), [placement, selected]);

  const verdict = useMemo(() => evaluate(placement, baskets), [placement, baskets]);
  const byZone = useMemo(() => {
    const zones = new Map<number, number[]>();
    placement.forEach((zone, id) => zones.set(zone, [...(zones.get(zone) ?? []), id]));
    return zones;
  }, [placement]);

  const helpOffered = hintLevel === 0 && !solved && (idle >= config.hintSeconds || attempts >= config.hintAttempts);
  const spring = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 34, mass: 0.7 };
  const perBasket = Math.ceil(oranges / baskets);

  const place = useCallback((ids: number[], zone: number) => {
    if (ids.length === 0) return;
    setPlacement((current) => moveOranges(current, ids, zone));
    setSelected([]);
    setFeedback(null);
    playSound("drop");
    if ("vibrate" in navigator) navigator.vibrate(8);
  }, []);

  const toggleSelect = (id: number) => {
    playSound("pick");
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const centers = (): Marked[] =>
    [...(fieldRef.current?.querySelectorAll<HTMLElement>("[data-orange]") ?? [])].map((element) => {
      const rect = element.getBoundingClientRect();
      return { id: Number(element.dataset.orange), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });

  function onOrangeDown(event: PointerEvent<HTMLDivElement>, id: number) {
    if (solved || event.button > 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const ids = mode === "group" && selected.includes(id) ? selected : [id];
    press.current = { id, x: event.clientX, y: event.clientY, moved: false, ids };
  }

  function onOrangeMove(event: PointerEvent<HTMLDivElement>, id: number) {
    const current = press.current;
    if (!current || current.id !== id) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_THRESHOLD) return;
    if (!current.moved) playSound("pick");
    current.moved = true;
    setDrag({ ids: current.ids, x: event.clientX, y: event.clientY, over: zoneAt(event.clientX, event.clientY) });
  }

  function onOrangeUp(event: PointerEvent<HTMLDivElement>, id: number) {
    const current = press.current;
    press.current = null;
    if (!current || current.id !== id) return;
    if (!current.moved) return toggleSelect(id);
    setDrag(null);
    const zone = zoneAt(event.clientX, event.clientY);
    if (zone !== null) place(current.ids, zone);
  }

  const onOrangeCancel = () => {
    press.current = null;
    setDrag(null);
  };

  function onFieldDown(event: PointerEvent<HTMLDivElement>) {
    if (solved || event.button > 0) return;
    fieldPress.current = { path: [{ x: event.clientX, y: event.clientY }] };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onFieldMove(event: PointerEvent<HTMLDivElement>) {
    const current = fieldPress.current;
    if (!current || mode !== "group") return;
    current.path.push({ x: event.clientX, y: event.clientY });
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      setLasso([...current.path]);
      setPreview(selectInside(centers(), current.path));
    });
  }

  function onFieldUp(event: PointerEvent<HTMLDivElement>) {
    const current = fieldPress.current;
    fieldPress.current = null;
    cancelAnimationFrame(frame.current);
    setLasso(null);
    setPreview([]);
    if (!current) return;
    if (mode === "group" && pathLength(current.path) >= MIN_LASSO_LENGTH) {
      const ids = selectInside(centers(), current.path);
      setSelected(ids);
      if (ids.length > 0) playSound("pop");
      return;
    }
    const zone = zoneAt(event.clientX, event.clientY);
    if (selected.length === 0) return;
    if (zone === null) setSelected([]);
    else place(selected, zone);
  }

  function onZoneKey(event: KeyboardEvent<HTMLElement>, zone: number) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (selected.length > 0 && !solved) place(selected, zone);
  }

  function onOrangeKey(event: KeyboardEvent<HTMLElement>, id: number) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    if (!solved) toggleSelect(id);
  }

  function failureMessage(result: Verdict, attemptsAfter: number): string {
    if (result.status === "unequal") {
      const impossible = !solution(oranges, baskets).exact && result.surplus === 0 && attemptsAfter >= config.hintAttempts;
      if (impossible) {
        return `Ese reparto es imposible: con ${oranges} naranjas no se pueden dejar ${baskets} cestos iguales sin que sobre alguna. Deja las que no se pueden repartir en «Sobran».`;
      }
    }
    return result.status === "correct" ? "" : verdictMessage[result.status];
  }

  function check() {
    if (verdict.status === "correct") {
      setSolved(true);
      setFeedback({ kind: "success", text: `${successMessage(oranges, baskets)} ${primeNote(oranges)}` });
      celebrate();
      playSound("success");
      onResult({ solved: true, attempts, hintsUsed: hintLevel });
      return;
    }
    setAttempts((value) => value + 1);
    setFeedback({ kind: "error", text: failureMessage(verdict, attempts + 1) });
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
    playSound("error");
  }

  function askHint() {
    const level = Math.min(3, hintLevel + 1) as 1 | 2 | 3;
    setHintLevel(level);
    setFeedback({ kind: "hint", text: hintText(level, oranges, baskets) });
    playSound("pop");
  }

  function restart() {
    setPlacement(emptyPlacement(oranges));
    setSelected([]);
    setFeedback(null);
  }

  function chooseMode(next: Mode) {
    setMode(next);
    setSelected([]);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      return;
    }
  }

  const { each, surplus: leftover, exact } = solution(oranges, baskets);
  const operation = exact ? `${oranges} = ${baskets} × ${each}` : `${oranges} = ${baskets} × ${each} + ${leftover}`;

  const renderOranges = (zone: number) =>
    (byZone.get(zone) ?? []).map((id) => (
      <motion.div
        key={id}
        layout="position"
        layoutId={`orange-${id}`}
        transition={spring}
        data-orange={id}
        role="button"
        tabIndex={0}
        aria-pressed={selected.includes(id)}
        aria-label={`Naranja ${id + 1}`}
        onPointerDown={(event) => onOrangeDown(event, id)}
        onPointerMove={(event) => onOrangeMove(event, id)}
        onPointerUp={(event) => onOrangeUp(event, id)}
        onPointerCancel={onOrangeCancel}
        onKeyDown={(event) => onOrangeKey(event, id)}
        style={{ width: "var(--o)", height: "var(--o)", touchAction: "none" }}
      >
        <div
          className="orange"
          data-selected={selected.includes(id)}
          data-preview={preview.includes(id) && !selected.includes(id)}
          data-dragging={drag?.ids.includes(id) ?? false}
          style={{ "--rot": `${((id * 47) % 31) - 15}deg` } as CSSProperties}
        />
      </motion.div>
    ));

  const zoneProps = (zone: number, label: string) => ({
    "data-zone": zone,
    "data-over": drag?.over === zone,
    role: "group" as const,
    tabIndex: 0,
    "aria-label": label,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => onZoneKey(event, zone),
  });

  const modeToggle =
    config.modes.length > 1 ? (
      <div role="radiogroup" aria-label="Modalidad" className="flex gap-1 rounded-full bg-black/25 p-1">
        {config.modes.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => chooseMode(value)}
            className="rounded-full px-4 py-2 text-sm font-extrabold text-white"
            style={mode === value ? { background: "#fff", color: "#3b1d00" } : undefined}
          >
            {MODE_LABELS[value]}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <GameShell title={naranjas.title} theme={naranjas.theme} scene="orchard" controls={modeToggle}>
      <LayoutGroup>
        <div
          ref={fieldRef}
          className="grid gap-3"
          style={{ touchAction: mode === "group" ? "none" : "pan-y" }}
          onPointerDown={onFieldDown}
          onPointerMove={onFieldMove}
          onPointerUp={onFieldUp}
          onPointerCancel={() => {
            fieldPress.current = null;
            setLasso(null);
            setPreview([]);
          }}
        >
          <p className="text-center font-display text-2xl font-extrabold text-white drop-shadow sm:text-4xl">
            Reparte <span className="text-yellow-200">{oranges}</span> naranjas entre <span className="text-yellow-200">{baskets}</span> cestos
          </p>
          <p className="mx-auto max-w-2xl text-center text-sm font-semibold text-white/95 sm:text-base">{INSTRUCTIONS[mode]}</p>

          <div className={`grid select-none gap-4 ${shaking ? "shake" : ""}`}>
            <section className="pile zone p-2" {...zoneProps(PILE, "Montón de naranjas")}>
              <p className="px-2 text-sm font-extrabold text-white">
                Montón · {byZone.get(PILE)?.length ?? 0} {byZone.get(PILE)?.length === 1 ? "naranja" : "naranjas"}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 p-2" style={{ "--o": `${pileSize(oranges)}px`, minHeight: 56 } as CSSProperties}>
                {renderOranges(PILE)}
              </div>
            </section>

            <section
              aria-label="Cestos"
              className="grid gap-x-3 gap-y-7 pt-5"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(clamp(118px, 20vw, 190px), 1fr))" }}
            >
              {Array.from({ length: baskets }, (_, index) => (
                <div
                  key={index}
                  className={`basket zone ${solved && !reduced ? "hop" : ""}`}
                  style={{ "--tint": BASKET_HUES[index % BASKET_HUES.length], "--hop-delay": `${index * 0.08}s` } as CSSProperties}
                  {...zoneProps(index, `Cesto ${index + 1}, ${verdict.perBasket[index]} naranjas`)}
                >
                  <span className="count-badge" aria-hidden>
                    {verdict.perBasket[index]}
                  </span>
                  <div className="basket-inner" style={{ "--o": `${basketSize(perBasket)}px` } as CSSProperties}>
                    {renderOranges(index)}
                  </div>
                  <div className="basket-front">Cesto {index + 1}</div>
                </div>
              ))}
            </section>

            <section className="tray zone p-2" {...zoneProps(surplusZone(baskets), "Zona de naranjas sobrantes")}>
              <p className="px-2 text-sm font-extrabold text-white">
                Sobran · {verdict.surplus} <span className="font-semibold text-white/80">(las que no se pueden repartir)</span>
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 p-2" style={{ "--o": "34px", minHeight: 42 } as CSSProperties}>
                {renderOranges(surplusZone(baskets))}
              </div>
            </section>
          </div>

          <div aria-live="polite" className="min-h-[3.5rem]">
            {feedback ? (
              <div
                key={feedback.text}
                className="sheet pop-in mx-auto flex max-w-3xl items-start gap-3 p-4"
                style={{ borderLeft: `8px solid ${feedback.kind === "success" ? "#16a34a" : feedback.kind === "error" ? "#dc2626" : "#f59e0b"}` }}
              >
                <span aria-hidden className="text-3xl">
                  {feedback.kind === "success" ? "🎉" : feedback.kind === "error" ? "🤔" : "💡"}
                </span>
                <div>
                  <p className="font-bold leading-snug">{feedback.text}</p>
                  {feedback.kind === "success" ? (
                    <p className="mt-2 inline-block rounded-full bg-orange-100 px-4 py-1 font-display text-xl font-extrabold text-orange-900">{operation}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-2 z-20 mt-3 flex flex-wrap items-center justify-center gap-3 rounded-full bg-black/35 p-2">
          {selected.length > 0 && !solved ? (
            <span className="rounded-full bg-white px-3 py-2 text-sm font-extrabold text-violet-900">
              {selected.length} {selected.length === 1 ? "seleccionada" : "seleccionadas"}: toca un cesto
            </span>
          ) : null}
          {solved ? (
            <button type="button" className="btn btn-green" onClick={() => onNext(challenge.key)}>
              Nuevo desafío →
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-green" onClick={check}>
                ✔ Comprobar
              </button>
              <span className="relative">
                {helpOffered ? (
                  <span className="pop-in absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-sm font-extrabold text-violet-900">
                    ¿Quieres una pista?
                  </span>
                ) : null}
                <button type="button" className={`btn btn-orange ${helpOffered ? "pulse" : ""}`} onClick={askHint}>
                  💡 Pista{hintLevel > 0 ? ` (${hintLevel}/3)` : ""}
                </button>
              </span>
              <button type="button" className="btn btn-ghost" onClick={restart}>
                ↺ Reiniciar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => onNext(challenge.key)}>
                Otro desafío
              </button>
            </>
          )}
        </div>
      </LayoutGroup>

      {lasso && lasso.length > 1 ? (
        <svg aria-hidden className="pointer-events-none fixed inset-0 z-40 h-full w-full">
          <polyline
            points={lasso.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="rgba(255,255,255,0.12)"
            stroke="#fff"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 8px #fde68a)" }}
          />
        </svg>
      ) : null}

      {drag ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50"
          style={{ left: drag.x - 26, top: drag.y - 26, width: 52, height: 52 }}
        >
          <div className="orange" data-ghost="true" style={{ "--o": "52px" } as CSSProperties} />
          {drag.ids.length > 1 ? <span className="count-badge" style={{ top: -14, right: -14, minWidth: 30, height: 30, fontSize: "1rem" }}>{drag.ids.length}</span> : null}
        </div>
      ) : null}
    </GameShell>
  );
}
