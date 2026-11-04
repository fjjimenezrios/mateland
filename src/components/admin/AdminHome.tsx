"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { games, type GameState } from "@/games/registry";
import { gameUI } from "@/games/ui";
import { api } from "@/lib/api-client";
import { AdminShell } from "./AdminShell";

export function AdminHome() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all(games.map((game) => api<GameState>(`/api/admin/games/${game.slug}`))).then((results) =>
      setEnabled(Object.fromEntries(games.map((game, index) => [game.slug, (results[index].data as GameState).enabled !== false]))),
    );
  }, []);

  return (
    <AdminShell crumbs={[{ label: "Panel" }]}>
      <h1 className="text-2xl font-extrabold">Juegos</h1>
      <p className="mt-1 text-sm text-stone-600">Así los ven los alumnos. Entra en uno para ajustarlo.</p>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2">
        {games.map((game) => {
          const Cover = gameUI[game.slug].Cover;
          const visible = enabled[game.slug];
          return (
            <li key={game.slug}>
              <Link
                href={`/admin/juegos/${game.slug}`}
                className="group block overflow-hidden rounded-3xl bg-[#fffaf2] text-[#2b1a05] shadow-md transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-[17/10] w-full overflow-hidden">
                  <Cover />
                  {visible !== undefined ? (
                    <span
                      className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold ${visible ? "bg-emerald-500 text-white" : "bg-stone-800 text-white"}`}
                    >
                      {visible ? "Visible" : "Oculto"}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-2 p-5">
                  <span className="w-fit rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: game.theme.accent, color: game.theme.ink }}>
                    {game.topic}
                  </span>
                  <h2 className="font-display text-2xl font-extrabold">{game.title}</h2>
                  <p className="font-semibold text-[#5b4630]">{game.tagline}</p>
                  <span className="btn mt-2 w-fit">⚙ Configurar</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-8 text-xl font-extrabold">Más</h2>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2">
        {[
          { href: "/admin/estadisticas", title: "Estadísticas", text: "Cómo va cada alumno y la clase, con la campana de Gauss.", icon: "📈" },
          { href: "/admin/alumnos", title: "Alumnos y clases", text: "Activa las cuentas, crea clases y reparte contraseñas.", icon: "🎓" },
          { href: "/admin/cuenta", title: "Mi cuenta", text: "Cambia tu contraseña del panel.", icon: "🔑" },
        ].map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-start gap-3 rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span aria-hidden className="text-3xl">{item.icon}</span>
              <span>
                <span className="block text-lg font-extrabold">{item.title}</span>
                <span className="text-sm text-stone-600">{item.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
