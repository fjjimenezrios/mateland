import { type Criterion } from "./config";

export type Explanation = { ok: boolean; text: string };

const digitsOf = (n: number) => String(n).split("").map(Number);

function digitSum(n: number, d: 3 | 9): Explanation {
  const digits = digitsOf(n);
  const sum = digits.reduce((a, b) => a + b, 0);
  const ok = n % d === 0;
  return {
    ok,
    text: `${digits.join(" + ")} = ${sum}. ${sum} ${ok ? "es" : "no es"} múltiplo de ${d}, así que ${n} ${ok ? "es" : "no es"} divisible entre ${d}.`,
  };
}

function alternating(n: number): Explanation {
  const reversed = digitsOf(n).reverse();
  const total = reversed.reduce((sum, digit, index) => sum + (index % 2 === 0 ? digit : -digit), 0);
  const terms = reversed.map((digit, index) => (index === 0 ? `${digit}` : `${index % 2 ? "−" : "+"} ${digit}`)).join(" ");
  const ok = n % 11 === 0;
  return {
    ok,
    text: `Sumamos y restamos las cifras de derecha a izquierda: ${terms} = ${total}. ${total} ${ok ? "es" : "no es"} múltiplo de 11 (el 0 también lo es), así que ${n} ${ok ? "es" : "no es"} divisible entre 11.`,
  };
}

export function explain(n: number, d: Criterion): Explanation {
  const last = n % 10;
  const ok = n % d === 0;
  switch (d) {
    case 2:
      return { ok, text: `${n} acaba en ${last}, una cifra ${ok ? "par" : "impar"}: ${ok ? "es" : "no es"} divisible entre 2.` };
    case 5:
      return { ok, text: ok ? `${n} acaba en ${last}, y para el 5 valen el 0 y el 5: es divisible entre 5.` : `${n} acaba en ${last}, y para el 5 hace falta acabar en 0 o en 5: no es divisible entre 5.` };
    case 10:
      return { ok, text: ok ? `${n} acaba en 0: es divisible entre 10.` : `${n} acaba en ${last}, y para el 10 hace falta acabar en 0: no es divisible entre 10.` };
    case 3:
    case 9:
      return digitSum(n, d);
    case 4: {
      const tail = n % 100;
      return { ok, text: `Las dos últimas cifras forman ${tail}, que ${ok ? "es" : "no es"} múltiplo de 4: ${n} ${ok ? "es" : "no es"} divisible entre 4.` };
    }
    case 6: {
      const two = n % 2 === 0;
      const three = n % 3 === 0;
      if (ok) return { ok, text: `${n} es divisible entre 2 y entre 3 a la vez, así que lo es entre 6.` };
      const missing = !two && !three ? "ni entre 2 ni entre 3" : !two ? "entre 2" : "entre 3";
      return { ok, text: `${n} no es divisible ${missing}, y para el 6 hacen falta las dos cosas: no es divisible entre 6.` };
    }
    case 11:
      return alternating(n);
  }
}

export function noneMessage(n: number, matches: readonly number[]): string {
  return `${n} sí es divisible entre ${matches.map((d) => `${d}`).join(" y entre ")}, así que no va en «Ninguno».`;
}

export function noneOk(n: number, criteria: readonly number[]): string {
  return `¡Exacto! ${n} no es divisible entre ${criteria.join(", ")}: no cumple ninguno de los criterios.`;
}

export function hintText(level: 1 | 2 | 3, n: number, criteria: readonly number[], pending: number[]): string {
  if (level === 1) return "Un número puede ir en varios tubos a la vez. Mira sus cifras: cómo acaban y cuánto suman.";
  if (level === 2) return "Acabar en cifra par → ÷2. Acabar en 0 → ÷10 (y también ÷2 y ÷5). La suma de cifras múltiplo de 3 → ÷3; de 9 → ÷9.";
  return pending.length > 0 ? `${n} tiene que ir en el tubo ÷${pending[0]}.` : `${n} no es divisible entre ${criteria.join(", ")}: va en «Ninguno».`;
}
