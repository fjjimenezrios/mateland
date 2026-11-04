"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { isPrime } from "@/lib/math";
import { mulberry32 } from "@/lib/rng";
import { ActionBar } from "../_kit/ActionBar";
import { celebrate } from "../_kit/confetti";
import { FeedbackCard, type Feedback } from "../_kit/Feedback";
import { GameShell } from "../_kit/GameShell";
import { playSound } from "../_kit/sound";
import { useHints } from "../_kit/useHints";
import type { GameProps } from "../types";
import { arbol } from "./index";
import type { ArbolConfig } from "./config";
import { createTree, declarePrime, factorizationText, factorPairs, isComplete, layoutTree, leaves, splitNode, type Tree } from "./engine";
import { generateArbol } from "./generator";
import { compositeAsPrime, finalMessage, hintText, primeOkMessage, splitMessage, splitPrime } from "./texts";

const UNIT = 92;
const LEVEL = 100;
const RADIUS = 34;

export function ArbolGame({ config, avoidKey, onResult, onNext }: GameProps<ArbolConfig>) {
  const [challenge] = useState(() => generateArbol(config, mulberry32(Math.floor(Math.random() * 2 ** 31)), avoidKey));
  const [history, setHistory] = useState<Tree[]>(() => [createTree(challenge.n)]);
  const [selected, setSelected] = useState<number | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const tree = history[history.length - 1];
  const solved = isComplete(tree);
  const hints = useHints({ seconds: config.hintSeconds, attempts: config.hintAttempts, active: !solved });
  const layout = useMemo(() => layoutTree(tree, UNIT, LEVEL, RADIUS), [tree]);
  const node = selected === null ? null : tree[selected];
  const openLeaf = leaves(tree).find((leaf) => !leaf.prime);

  function push(next: Tree) {
    setHistory((items) => [...items, next]);
    setSelected(null);
    setChoosing(false);
    hints.touch();
  }

  function select(id: number) {
    const target = tree[id];
    if (solved || target.children !== null || target.prime) return;
    playSound("pick");
    setSelected(id);
    setChoosing(false);
    hints.touch();
  }

  function markPrime() {
    if (!node) return;
    const result = declarePrime(tree, node.id);
    if (!result.ok) {
      if (result.reason === "composite") {
        setFeedback({ kind: "error", text: compositeAsPrime(node.value, result.pair) });
        hints.fail();
        playSound("error");
      }
      return;
    }
    playSound("pop");
    push(result.tree);
    if (isComplete(result.tree)) {
      setFeedback({ kind: "done", text: finalMessage(challenge.n) });
      celebrate();
      playSound("success");
      onResult({ solved: true, attempts: hints.fails, hintsUsed: hints.level });
    } else {
      setFeedback({ kind: "ok", text: primeOkMessage(node.value) });
    }
  }

  function startSplit() {
    if (!node) return;
    if (isPrime(node.value)) {
      setFeedback({ kind: "error", text: splitPrime(node.value) });
      hints.fail();
      playSound("error");
      return;
    }
    setChoosing(true);
  }

  function pick(factor: number) {
    if (!node) return;
    const result = splitNode(tree, node.id, factor);
    if (!result.ok) return;
    playSound("drop");
    setFeedback({ kind: "ok", text: splitMessage(node.value, factor, node.value / factor) });
    push(result.tree);
  }

  function undo() {
    if (history.length <= 1 || solved) return;
    setHistory((items) => items.slice(0, -1));
    setSelected(null);
    setChoosing(false);
    setFeedback(null);
  }

  function restart() {
    setHistory([createTree(challenge.n)]);
    setSelected(null);
    setChoosing(false);
    setFeedback(null);
  }

  function askHint() {
    const level = hints.next();
    setFeedback({ kind: "hint", text: hintText(level, openLeaf?.value ?? null) });
    playSound("pop");
  }

  function onKey(event: KeyboardEvent<SVGGElement>, id: number) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    select(id);
  }

  const fontSize = (value: number) => (String(value).length >= 3 ? 22 : 28);

  return (
    <GameShell title={arbol.title} theme={arbol.theme} scene="forest">
      <div className="grid gap-4">
        <div className="text-center">
          <p className="font-display text-2xl font-extrabold text-white drop-shadow sm:text-4xl">
            Descompón <span className="text-yellow-200">{challenge.n}</span> en factores primos
          </p>
          <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold text-green-50 sm:text-base">
            Toca una bola. Si no es prima, pártela en dos factores; si es prima, márcala. Termina cuando todas sean doradas.
          </p>
        </div>

        <div className="rounded-3xl bg-black/25 p-3">
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="mx-auto block w-full"
            style={{ maxWidth: Math.max(layout.width * 1.25, 300), maxHeight: "52vh" }}
            role="group"
            aria-label="Árbol de factores"
          >
            <defs>
              <radialGradient id="ball-green" cx="35%" cy="30%" r="80%">
                <stop offset="0" stopColor="#d9f99d" />
                <stop offset="0.5" stopColor="#4ade80" />
                <stop offset="1" stopColor="#15803d" />
              </radialGradient>
              <radialGradient id="ball-gold" cx="35%" cy="30%" r="80%">
                <stop offset="0" stopColor="#fff7c2" />
                <stop offset="0.55" stopColor="#fbbf24" />
                <stop offset="1" stopColor="#b45309" />
              </radialGradient>
            </defs>

            {tree.map((item) =>
              item.children
                ? item.children.map((child) => {
                    const from = layout.positions[item.id];
                    const to = layout.positions[child];
                    const length = Math.hypot(to.x - from.x, to.y - from.y);
                    return (
                      <path
                        key={`${item.id}-${child}`}
                        className="branch"
                        d={`M ${from.x} ${from.y + RADIUS * 0.8} L ${to.x} ${to.y - RADIUS * 0.8}`}
                        stroke="#fef9c3"
                        strokeWidth="5"
                        strokeLinecap="round"
                        opacity="0.85"
                        style={{ ["--len" as string]: length }}
                      />
                    );
                  })
                : null,
            )}

            {tree.map((item) => {
              const { x, y } = layout.positions[item.id];
              const isLeaf = item.children === null;
              const active = isLeaf && !item.prime && !solved;
              return (
                <g
                  key={item.id}
                  className="ball"
                  transform={`translate(${x} ${y})`}
                  role={active ? "button" : undefined}
                  tabIndex={active ? 0 : undefined}
                  aria-label={`${item.value}${item.prime ? ", primo" : isLeaf ? ", por descomponer" : ", ya partido"}`}
                  onClick={() => select(item.id)}
                  onKeyDown={(event) => onKey(event, item.id)}
                  style={{ cursor: active ? "pointer" : "default" }}
                >
                  <g className="ball-inner">
                    {item.id === selected ? <circle r={RADIUS + 9} fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="8 6" /> : null}
                    <circle className="body" r={RADIUS} fill={item.prime ? "url(#ball-gold)" : "url(#ball-green)"} stroke="#fff" strokeWidth="4" opacity={isLeaf ? 1 : 0.55} />
                    <ellipse cx={-10} cy={-14} rx={9} ry={5} fill="#fff" opacity="0.5" transform="rotate(-30 -10 -14)" />
                    <text y={fontSize(item.value) * 0.35} textAnchor="middle" fontSize={fontSize(item.value)} fontWeight="800" fill={item.prime ? "#451a03" : "#052e16"} fontFamily="var(--font-display), sans-serif">
                      {item.value}
                    </text>
                    {item.prime ? <text x={RADIUS - 6} y={-RADIUS + 12} fontSize="20">⭐</text> : null}
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {solved ? (
          <p className="pop-in mx-auto rounded-full bg-yellow-300 px-6 py-2 font-display text-2xl font-extrabold text-amber-950 shadow-lg">
            {challenge.n} = {factorizationText(challenge.n)}
          </p>
        ) : node ? (
          <div className="sheet pop-in mx-auto grid max-w-xl gap-3 p-4 text-center">
            <p className="font-display text-xl font-extrabold">
              ¿Qué hago con el <span className="text-green-700">{node.value}</span>?
            </p>
            {choosing ? (
              <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={`Maneras de partir el ${node.value}`}>
                {factorPairs(node.value).map(([a, b]) => (
                  <button key={a} type="button" className="btn btn-green" onClick={() => pick(a)}>
                    {a} × {b}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" className="btn btn-green" onClick={startSplit}>
                  ✂ Partir en dos
                </button>
                <button type="button" className="btn btn-orange" onClick={markPrime}>
                  ⭐ Es primo
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm font-bold text-white/90">Toca una bola verde para empezar.</p>
        )}

        <FeedbackCard feedback={feedback} />
      </div>

      <ActionBar solved={solved} hintLevel={hints.level} offered={hints.offered} onHint={askHint} onNext={() => onNext(challenge.key)} skipLabel="Otro número">
        <button type="button" className="btn btn-ghost" onClick={undo} disabled={history.length <= 1}>
          ↶ Deshacer
        </button>
        <button type="button" className="btn btn-ghost" onClick={restart} disabled={history.length <= 1}>
          ↺ Empezar de nuevo
        </button>
      </ActionBar>
    </GameShell>
  );
}
