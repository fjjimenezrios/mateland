import { describe, expect, it } from "vitest";
import { divisors, isPrime } from "@/lib/math";

describe("divisors", () => {
  it("lists divisors in ascending order", () => {
    expect(divisors(1)).toEqual([1]);
    expect(divisors(16)).toEqual([1, 2, 4, 8, 16]);
    expect(divisors(24)).toEqual([1, 2, 3, 4, 6, 8, 12, 24]);
    expect(divisors(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
  });
});

describe("isPrime", () => {
  it("identifies primes from their divisors", () => {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
    for (let n = 0; n <= 37; n++) expect(isPrime(n)).toBe(primes.includes(n));
  });
  it("does not treat 1 as prime", () => {
    expect(isPrime(1)).toBe(false);
  });
});
