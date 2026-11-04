import { divisors } from "@/lib/math";
import { gcd } from "./engine";

export function successMessage(width: number, height: number): string {
  const g = gcd(width, height);
  const common = divisors(g);
  return `¡Correcto! La baldosa más grande tiene lado ${g}: es el mayor número que divide a ${width} y a ${height}. Los divisores comunes son ${common.join(", ")} y el mayor es ${g}, así que mcd(${width}, ${height}) = ${g}. Caben ${(width / g) * (height / g)} baldosas.`;
}

export const smallerMessage = (side: number) =>
  `Con baldosas de lado ${side} se cubre todo sin cortar, pero existen baldosas más grandes que también caben. Sigue probando.`;

export function cutsMessage(side: number, width: number, height: number, cuts: number[]): string {
  const which = cuts.length === 2 ? `${width} ni ${height}` : `${cuts[0]}`;
  return `${side} no divide a ${which}: sobra una tira que habría que cortar. La baldosa tiene que caber un número exacto de veces en los dos lados.`;
}

export function hintText(level: 1 | 2 | 3, width: number, height: number): string {
  if (level === 1) return "Una baldosa cabe sin cortar cuando su lado divide al largo y al ancho del suelo.";
  if (level === 2) {
    const smaller = Math.min(width, height);
    return `La baldosa no puede ser mayor que ${smaller}. Los divisores de ${smaller} son ${divisors(smaller).join(", ")}: el lado tiene que ser uno de ellos.`;
  }
  return `Prueba con lado ${gcd(width, height)}.`;
}
