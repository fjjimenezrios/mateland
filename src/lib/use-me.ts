import { useEffect, useState } from "react";

export type Me = { accountsEnabled: boolean; student: { username: string } | null; admin: boolean };

export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Me>) : null))
      .then((value) => active && setMe(value))
      .catch(() => active && setMe(null));
    return () => {
      active = false;
    };
  }, []);
  return me;
}
