"use client";

import Link from "next/link";
import { getGame } from "@/games/registry";
import { gameUI } from "@/games/ui";
import { AdminShell } from "./AdminShell";
import { GameSettings, type Definition } from "./GameSettings";

export function GameAdminPage({ slug }: { slug: string }) {
  const game = getGame(slug) as unknown as Definition | undefined;
  if (!game) return null;
  const Cover = gameUI[slug].Cover;
  return (
    <AdminShell crumbs={[{ label: "Panel", href: "/admin" }, { label: game.title }]}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,280px)_1fr] md:items-start">
        <div className="overflow-hidden rounded-3xl bg-[#fffaf2] shadow-md">
          <div className="aspect-[17/10] w-full overflow-hidden">
            <Cover />
          </div>
          <div className="grid gap-2 p-4">
            <span className="w-fit rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: game.theme.accent, color: game.theme.ink }}>
              {game.topic}
            </span>
            <p className="font-semibold text-[#5b4630]">{game.tagline}</p>
            <Link href={`/juegos/${slug}`} className="btn btn-green w-fit" style={{ minHeight: 44 }}>
              ▶ Ver como alumno
            </Link>
          </div>
        </div>
        <GameSettings game={game} />
      </div>
    </AdminShell>
  );
}
