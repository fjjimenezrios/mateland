import type { GameUI } from "./types";
import { ArbolCover } from "./arbol/Cover";
import { ArbolGame } from "./arbol/Game";
import { CazaCover } from "./caza-divisores/Cover";
import { CazaGame } from "./caza-divisores/Game";
import { CribaCover } from "./criba/Cover";
import { CribaGame } from "./criba/Game";
import { CriteriosCover } from "./criterios/Cover";
import { CriteriosGame } from "./criterios/Game";
import { McdCover } from "./mcd/Cover";
import { McdGame } from "./mcd/Game";
import { McmCover } from "./mcm/Cover";
import { McmGame } from "./mcm/Game";
import { NaranjasCover } from "./naranjas/Cover";
import { NaranjasGame } from "./naranjas/Game";

const ui = <C,>(value: GameUI<C>) => value as unknown as GameUI<never>;

export const gameUI: Record<string, GameUI<never>> = {
  naranjas: ui({ Cover: NaranjasCover, Game: NaranjasGame }),
  "caza-divisores": ui({ Cover: CazaCover, Game: CazaGame }),
  criba: ui({ Cover: CribaCover, Game: CribaGame }),
  criterios: ui({ Cover: CriteriosCover, Game: CriteriosGame }),
  arbol: ui({ Cover: ArbolCover, Game: ArbolGame }),
  mcd: ui({ Cover: McdCover, Game: McdGame }),
  mcm: ui({ Cover: McmCover, Game: McmGame }),
};
