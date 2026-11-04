import { divisors, isPrime } from "@/lib/math";
import { solution, type Verdict } from "./engine";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const verdictMessage: Record<Exclude<Verdict["status"], "correct">, string> = {
  pending: "Aún te quedan naranjas por colocar. Ponlas en un cesto o en «Sobran».",
  unequal: "Los cestos no tienen la misma cantidad. Revisa el reparto.",
  more: "Todavía puedes repartir más: con las que sobran se puede dar otra naranja a cada cesto.",
};

export function primeNote(oranges: number): string {
  if (isPrime(oranges)) {
    return `Además, ${oranges} es un número primo: solo tiene dos divisores, el 1 y él mismo, así que nunca se puede repartir en grupos iguales (salvo en 1 grupo o en ${oranges} grupos).`;
  }
  const others = divisors(oranges).filter((d) => d !== 1 && d !== oranges);
  return `Fíjate: ${oranges} no es primo porque, además del 1 y de él mismo, también es divisible entre ${others.join(", ")}.`;
}

export function successMessage(oranges: number, baskets: number): string {
  const { each, surplus, exact } = solution(oranges, baskets);
  if (exact) {
    return `¡Correcto! ${baskets} es divisor de ${oranges} porque podemos repartir las ${oranges} naranjas en ${baskets} grupos iguales (${each} en cada uno) sin que sobre ninguna. ${oranges} = ${baskets} × ${each}.`;
  }
  return `¡Correcto! ${baskets} no es divisor de ${oranges} porque, al repartir las naranjas en ${baskets} grupos iguales, ${surplus === 1 ? "sobra una" : `sobran ${surplus}`}. ${oranges} = ${baskets} × ${each} + ${surplus}.`;
}

export function hintText(level: 1 | 2 | 3, oranges: number, baskets: number): string {
  if (level === 1) return "Intenta que todos los cestos tengan la misma cantidad.";
  if (level === 2) return "¿Qué ocurre con las naranjas que no puedes repartir?";
  const { each, surplus, exact } = solution(oranges, baskets);
  if (exact) {
    return `Al dividir ${oranges} entre ${baskets} salen ${each} para cada cesto y no sobra ninguna. Pon ${plural(each, "naranja", "naranjas")} en cada cesto.`;
  }
  return `Al dividir ${oranges} entre ${baskets} salen ${each} para cada cesto y sobran ${surplus}. Pon ${plural(each, "naranja", "naranjas")} en cada cesto y deja ${surplus === 1 ? "la que sobra" : `las ${surplus} que sobran`} en «Sobran»: no se puede repartir sin partirla.`;
}
