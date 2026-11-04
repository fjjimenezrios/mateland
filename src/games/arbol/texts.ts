import { divisors } from "@/lib/math";
import { factorizationText, primeFactors } from "./engine";

export const splitMessage = (value: number, a: number, b: number) => `${value} = ${a} × ${b}. Sigue con cada bola que no sea prima.`;

export const primeOkMessage = (value: number) => `¡Sí, ${value} es primo! Solo es divisible entre 1 y entre ${value}, así que no se puede partir más.`;

export const compositeAsPrime = (value: number, pair: [number, number]) =>
  `${value} no es primo: ${value} = ${pair[0]} × ${pair[1]}. Hay que partirlo más.`;

export const splitPrime = (value: number) => `${value} es primo: solo se puede escribir como 1 × ${value}, así que no se parte en dos factores.`;

export function finalMessage(n: number): string {
  const factors = primeFactors(n);
  return `¡Árbol completo! Las bolas doradas son ${factors.join(", ")}. Entonces ${n} = ${factors.join(" × ")}${factors.length !== new Set(factors).size ? ` = ${factorizationText(n)}` : ""}. Lo parta como lo parta, siempre salen los mismos primos.`;
}

export function hintText(level: 1 | 2 | 3, openValue: number | null): string {
  if (level === 1) return "Toca una bola: si no es prima, pártela en dos factores; si es prima, márcala.";
  if (level === 2) return "Un número es primo si solo tiene dos divisores: el 1 y él mismo. Prueba a dividir entre 2, 3, 5, 7…";
  if (openValue === null) return "Ya están todas las bolas doradas.";
  const options = divisors(openValue).filter((d) => d > 1 && d < openValue);
  return options.length === 0 ? `${openValue} es primo: márcalo.` : `${openValue} se puede partir con ${options[0]} × ${openValue / options[0]}.`;
}
