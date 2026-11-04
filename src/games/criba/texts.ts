const preview = (numbers: number[]) => (numbers.length > 6 ? `${numbers.slice(0, 6).join(", ")} y más` : numbers.join(", "));

export const primeFoundMessage = (prime: number, crossed: number[]) =>
  crossed.length > 0
    ? `¡${prime} es primo! Tachamos sus múltiplos: ${preview(crossed)}. Como son múltiplos de ${prime}, ninguno puede ser primo.`
    : `¡${prime} es primo! No quedan múltiplos suyos por tachar.`;

export const crossedMessage = (n: number, by: number) =>
  `${n} ya está tachado: es múltiplo de ${by} (${n} = ${by} × ${n / by}), así que no es primo.`;

export const earlyMessage = (pending: number) =>
  `Todavía no. Antes toca el menor número que siga sin tachar, que es el ${pending}.`;

export const oneMessage = "El 1 no es primo ni compuesto: solo tiene un divisor. Lo dejamos fuera de la criba.";

export function hintText(level: 1 | 2 | 3, pending: number | null): string {
  if (level === 1) return "Toca siempre el menor número que siga sin tachar: será primo y se tacharán sus múltiplos.";
  if (level === 2) return "Un número tachado es múltiplo de otro más pequeño, así que no puede ser primo.";
  return pending === null ? "Ya no hace falta tocar más números." : `Toca el ${pending}: es el siguiente número sin tachar.`;
}

export function finalMessage(limit: number, primes: number[]): string {
  const root = Math.floor(Math.sqrt(limit));
  return `¡Criba completa! No hacía falta seguir más allá del ${root}: un número compuesto menor o igual que ${limit} siempre tiene algún divisor primo menor o igual que ${root}, y ya los has tachado todos. Los ${primes.length} números que quedan son los primos hasta ${limit}.`;
}
