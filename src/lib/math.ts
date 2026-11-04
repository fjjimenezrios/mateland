export function divisors(n: number): number[] {
  const small: number[] = [];
  const large: number[] = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d !== 0) continue;
    small.push(d);
    if (d * d !== n) large.unshift(n / d);
  }
  return [...small, ...large];
}

export const isPrime = (n: number) => n >= 2 && divisors(n).length === 2;
