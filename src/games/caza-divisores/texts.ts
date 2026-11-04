import { isPrime } from "@/lib/math";

export const foundMessage = (n: number, d: number) => `¡Sí! ${n} = ${d} × ${n / d}`;

export function wrongMessage(n: number, d: number): string {
  if (d > n) return `${d} es mayor que ${n}: un divisor nunca es mayor que el número.`;
  const quotient = Math.floor(n / d);
  return `${n} ÷ ${d} no es exacta: ${n} = ${d} × ${quotient} + ${n % d}, así que ${d} no es divisor de ${n}.`;
}

export function hintText(level: 1 | 2 | 3, n: number, pending: number | undefined): string {
  if (level === 1) return `Prueba a dividir ${n} entre la burbuja: si no sobra nada, es divisor.`;
  if (level === 2) return `Los divisores van en parejas: si ${n} = a × b, entonces a y b son divisores de ${n}.`;
  return pending === undefined ? "Ya has encontrado todos los divisores." : `Mira la burbuja que brilla: ${n} se puede repartir en grupos de ${pending} sin que sobre nada.`;
}

export function finalMessage(n: number, targets: number[]): string {
  const list = targets.join(", ");
  if (isPrime(n)) {
    return `¡Los has encontrado todos! Los divisores de ${n} son ${list}. Solo tiene dos divisores, el 1 y él mismo: por eso ${n} es un número primo.`;
  }
  return `¡Los has encontrado todos! Los divisores de ${n} son ${list}. Como tiene más de dos divisores, ${n} no es primo.`;
}
