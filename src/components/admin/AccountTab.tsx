"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";

export function AccountTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next !== again) return setStatus({ ok: false, text: "Las contraseñas nuevas no coinciden" });
    const result = await api("/api/admin/password", "POST", { current, next });
    setStatus(result.ok ? { ok: true, text: "Contraseña cambiada" } : { ok: false, text: result.data.error ?? "No se pudo cambiar" });
    if (result.ok) {
      setCurrent("");
      setNext("");
      setAgain("");
    }
  }

  const input = "min-h-11 rounded-lg border-2 border-stone-300 px-3 font-normal";
  return (
    <form onSubmit={submit} className="grid max-w-md gap-4 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-extrabold">Cambiar contraseña</h2>
      <label className="grid gap-1 text-sm font-bold">
        Contraseña actual
        <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={input} />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        Contraseña nueva (mínimo 12 caracteres)
        <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={12} className={input} />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        Repite la contraseña nueva
        <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required className={input} />
      </label>
      {status ? (
        <p role="status" className={`text-sm font-bold ${status.ok ? "text-emerald-700" : "text-red-700"}`}>
          {status.text}
        </p>
      ) : null}
      <button type="submit" className="btn w-fit">
        Cambiar contraseña
      </button>
    </form>
  );
}
