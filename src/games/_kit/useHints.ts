import { useCallback, useEffect, useState } from "react";

export function useHints(options: { seconds: number; attempts: number; active: boolean }) {
  const [level, setLevel] = useState(0);
  const [idle, setIdle] = useState(0);
  const [fails, setFails] = useState(0);

  useEffect(() => {
    if (!options.active) return;
    const timer = setInterval(() => setIdle((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [options.active]);

  const touch = useCallback(() => setIdle(0), []);
  const fail = useCallback(() => {
    setFails((value) => value + 1);
    setIdle(0);
  }, []);
  const next = useCallback((): 1 | 2 | 3 => {
    const value = Math.min(3, level + 1) as 1 | 2 | 3;
    setLevel(value);
    return value;
  }, [level]);

  const offered = level === 0 && options.active && (idle >= options.seconds || fails >= options.attempts);
  return { level, offered, fails, touch, fail, next };
}
