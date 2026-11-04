"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { gameUI } from "@/games/ui";
import type { GameTheme } from "@/games/types";
import { AccountMenu } from "./AccountMenu";

type Card = { slug: string; title: string; topic: string; tagline: string; theme: GameTheme };

export function Gallery({ games }: { games: Card[] }) {
  const reduced = useReducedMotion();
  return (
    <div
      className="relative min-h-dvh overflow-hidden"
      style={{ background: "radial-gradient(120% 90% at 20% 0%, #5b2a9d 0%, #2a1458 45%, #150a30 100%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[8, 22, 41, 63, 78, 92].map((left, index) => (
          <span key={left} className="drift" style={{ left: `${left}%`, width: 14 + index * 6, height: 14 + index * 6, ["--dur" as string]: `${16 + index * 3}s`, ["--delay" as string]: `${-index * 4}s` }} />
        ))}
      </div>
      <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/?todos=1" className="flex items-center gap-3" aria-label="Mates 1.º ESO, inicio">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl font-display text-2xl font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, #fbbf24, #f97316 55%, #ec4899)", boxShadow: "0 4px 0 #9a3412, 0 8px 16px rgba(0,0,0,.35)" }}
          >
            ÷×
          </span>
          <span className="font-display text-2xl font-extrabold text-white">Mates 1.º ESO</span>
        </Link>
        <AccountMenu />
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="py-8 text-center sm:py-12">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white sm:text-6xl">
            ¡A jugar con las{" "}
            <span style={{ background: "linear-gradient(90deg, #fde68a, #fb923c, #f472b6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Mates
            </span>
            !
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base font-semibold text-violet-100 sm:text-xl">
            Mueve, reparte y descubre. Elige un juego y empieza.
          </p>
        </section>

        {games.length === 0 ? (
          <p className="sheet mx-auto max-w-md p-6 text-center font-bold">Ahora mismo no hay juegos disponibles. Vuelve en un rato.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, index) => {
              const Cover = gameUI[game.slug].Cover;
              return (
                <motion.li
                  key={game.slug}
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 260, damping: 24 }}
                  whileHover={reduced ? undefined : { y: -8, rotate: index % 2 ? 0.6 : -0.6 }}
                >
                  <Link
                    href={`/juegos/${game.slug}`}
                    className="group block overflow-hidden rounded-3xl bg-[#fffaf2] text-[#2b1a05] shadow-[0_14px_40px_rgba(0,0,0,0.4)]"
                  >
                    <div className="aspect-[17/10] w-full overflow-hidden">
                      <Cover />
                    </div>
                    <div className="grid gap-2 p-5">
                      <span className="w-fit rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: game.theme.accent, color: game.theme.ink }}>
                        {game.topic}
                      </span>
                      <h2 className="font-display text-2xl font-extrabold">{game.title}</h2>
                      <p className="font-semibold text-[#5b4630]">{game.tagline}</p>
                      <span className="btn btn-green mt-2 w-fit">▶ Jugar</span>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
