import { lcm, multiples } from "./engine";

const list = (period: number, upTo: number) => multiples(period, upTo).join(", ");

export function successMessage(a: number, b: number): string {
  const l = lcm(a, b);
  return `¡Correcto! Las dos luces coinciden por primera vez a los ${l} segundos. ${l} es el menor número que es múltiplo de ${a} (${a} × ${l / a}) y de ${b} (${b} × ${l / b}): mcm(${a}, ${b}) = ${l}.`;
}

export const laterMessage = (time: number, first: number) =>
  `Sí coinciden a los ${time} segundos, pero ya habían coincidido antes. Busca la primera vez.`;

export function missingMessage(a: number, b: number, time: number, which: "a" | "b" | "both"): string {
  if (time === 0) return "En el segundo 0 todavía no ha parpadeado ninguna luz. Busca cuándo parpadean las dos a la vez.";
  if (which === "both") return `A los ${time} s no parpadea ninguna de las dos: ${time} no es múltiplo de ${a} ni de ${b}.`;
  const [name, period] = which === "a" ? ["A", a] : ["B", b];
  return `A los ${time} s no parpadea la luz ${name}: ${time} no es múltiplo de ${period}.`;
}

export function hintText(level: 1 | 2 | 3, a: number, b: number): string {
  const l = lcm(a, b);
  if (level === 1) return `La luz A parpadea en ${a}, ${2 * a}, ${3 * a}… (los múltiplos de ${a}) y la B en ${b}, ${2 * b}, ${3 * b}…`;
  if (level === 2) return `Múltiplos de ${a}: ${list(a, l)}. Múltiplos de ${b}: ${list(b, l)}. Busca el primero que aparece en las dos listas.`;
  return `Mira el segundo ${l}: ¿parpadean las dos luces a la vez?`;
}
