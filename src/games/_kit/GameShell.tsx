"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { GameTheme } from "../types";
import { setSoundOn, useSoundOn } from "./sound";
import { FactoryScene, ForestScene, NightScene, OceanScene, OrchardScene, SpaceScene, WorkshopScene } from "./scenes";

export type SceneName = "orchard" | "ocean" | "space" | "factory" | "forest" | "workshop" | "night";

const SCENES: Record<SceneName, () => ReactNode> = {
  orchard: OrchardScene,
  ocean: OceanScene,
  space: SpaceScene,
  factory: FactoryScene,
  forest: ForestScene,
  workshop: WorkshopScene,
  night: NightScene,
};

function SoundToggle() {
  const on = useSoundOn();
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ minHeight: 44 }}
      aria-pressed={on}
      aria-label={on ? "Desactivar sonido" : "Activar sonido"}
      onClick={() => setSoundOn(!on)}
    >
      <span aria-hidden>{on ? "🔊" : "🔈"}</span>
      <span className="hidden sm:inline">{on ? "Sonido" : "Silencio"}</span>
    </button>
  );
}

export function GameShell(props: { title: string; theme: GameTheme; scene: SceneName; controls?: ReactNode; children: ReactNode }) {
  const { theme } = props;
  return (
    <div
      className="relative flex min-h-dvh flex-col"
      style={{ background: `linear-gradient(180deg, ${theme.from} 0%, ${theme.via} 55%, ${theme.to} 100%)` }}
    >
      {SCENES[props.scene]()}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-3 py-3 sm:px-6">
        <Link href="/?todos=1" className="btn btn-ghost" style={{ minHeight: 44 }}>
          <span aria-hidden>←</span> Juegos
        </Link>
        <span className="flex-1 sm:hidden" />
        <h1 className="order-last basis-full text-center text-xl font-extrabold text-white drop-shadow sm:order-none sm:basis-auto sm:flex-1 sm:text-left sm:text-2xl">
          {props.title}
        </h1>
        {props.controls}
        <SoundToggle />
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-3 pb-8 sm:px-6">{props.children}</main>
    </div>
  );
}
