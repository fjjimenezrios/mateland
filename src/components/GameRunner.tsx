"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getGame, type GameState } from "@/games/registry";
import { gameUI } from "@/games/ui";
import type { GameResult } from "@/games/types";
import { recordResult } from "@/lib/progress-client";

type Loaded = GameState | null;

export function GameRunner({ slug }: { slug: string }) {
  const definition = getGame(slug);
  const ui = gameUI[slug];
  const [round, setRound] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>(null);
  const avoidKey = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!definition) return;
    let active = true;
    const fallback: GameState = { enabled: true, config: definition.defaults };
    fetch(`/api/config/${slug}`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<GameState>) : fallback))
      .catch(() => fallback)
      .then((state) => active && setLoaded(state));
    return () => {
      active = false;
    };
  }, [slug, round, definition]);

  const onNext = useCallback((key: string) => {
    avoidKey.current = key;
    setLoaded(null);
    setRound((value) => value + 1);
  }, []);
  const onResult = useCallback((result: GameResult) => recordResult(slug, result), [slug]);

  if (!definition || !ui) return null;
  if (!loaded) {
    return (
      <div className="grid min-h-dvh place-items-center" style={{ background: definition.theme.via }} role="status">
        <p className="font-display text-2xl font-extrabold text-white">Preparando tu desafío…</p>
      </div>
    );
  }
  if (!loaded.enabled) {
    return (
      <div className="grid min-h-dvh place-items-center p-6" style={{ background: definition.theme.via }}>
        <div className="sheet max-w-md p-8 text-center">
          <h1 className="text-2xl font-extrabold">Este juego no está disponible ahora</h1>
          <p className="mt-2">Tu profesor lo ha desactivado por el momento.</p>
          <Link href="/?todos=1" className="btn btn-orange mt-5">
            Ver otros juegos
          </Link>
        </div>
      </div>
    );
  }
  const Game = ui.Game as React.ComponentType<{
    config: unknown;
    avoidKey?: string;
    onResult: (result: GameResult) => void;
    onNext: (key: string) => void;
  }>;
  return <Game key={round} config={loaded.config} avoidKey={avoidKey.current} onResult={onResult} onNext={onNext} />;
}
