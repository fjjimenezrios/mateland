"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await api("/api/admin/login", "POST", { password });
    if (!result.ok) {
      setError(result.data.error ?? "No se ha podido entrar");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f3ee] p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold">Panel del profesor</h1>
        <p className="mt-1 text-sm text-stone-600">Introduce tu contraseña para configurar los juegos.</p>
        <label className="mt-5 grid gap-1 text-sm font-bold">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="min-h-12 rounded-xl border-2 border-stone-300 px-4 text-lg font-normal"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="btn mt-5 w-full">
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
