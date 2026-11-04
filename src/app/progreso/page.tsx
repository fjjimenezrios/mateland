"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { games } from "@/games/registry";
import { totalsFor, useTotals } from "@/lib/progress-client";
import { useMe } from "@/lib/use-me";

export default function ProgressPage() {
  const progress = useTotals();
  const me = useMe();
  return (
    <div className="min-h-dvh" style={{ background: "radial-gradient(120% 90% at 20% 0%, #5b2a9d, #150a30)" }}>
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/?todos=1" className="btn btn-ghost" style={{ minHeight: 44 }}>
          ← Juegos
        </Link>
        <AccountMenu />
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-12">
        <h1 className="font-display text-4xl font-extrabold text-white">Mi progreso</h1>
        <p className="mt-1 font-semibold text-violet-100">
          {me?.student
            ? "Tu progreso se guarda en tu cuenta y lo verás en cualquier dispositivo."
            : "Este progreso solo se guarda en este dispositivo."}
        </p>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {games.map((game) => {
            const totals = totalsFor(progress, game.slug);
            const stats: [string, number][] = [
              ["Desafíos completados", totals.completed],
              ["Sin usar pistas", totals.solved],
              ["Pistas usadas", totals.hintsUsed],
              ["Mejor racha sin pistas", totals.bestStreak],
            ];
            return (
              <li key={game.slug} className="sheet overflow-hidden">
                <div className="px-5 py-3" style={{ background: `linear-gradient(90deg, ${game.theme.from}, ${game.theme.via})` }}>
                  <h2 className="font-display text-xl font-extrabold text-white drop-shadow">{game.title}</h2>
                </div>
                <dl className="grid grid-cols-2 gap-3 p-5">
                  {stats.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-orange-50 p-3">
                      <dd className="font-display text-3xl font-extrabold">{value}</dd>
                      <dt className="text-sm font-bold text-[#5b4630]">{label}</dt>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
