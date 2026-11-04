"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adoptAccount } from "@/lib/progress-client";
import { useMe } from "@/lib/use-me";

export default function EnterPage() {
  const router = useRouter();
  const me = useMe();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      setError(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? "No se ha podido entrar");
      setBusy(false);
      return;
    }
    await adoptAccount(((await response.json()) as { username: string }).username);
    router.push("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4" style={{ background: "radial-gradient(120% 90% at 20% 0%, #5b2a9d, #150a30)" }}>
      <div className="sheet w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold">Entrar</h1>
        {me && !me.accountsEnabled ? (
          <>
            <p className="mt-3 font-semibold">De momento no hace falta entrar: puedes jugar directamente.</p>
            <Link href="/" className="btn btn-orange mt-5">
              Ir a los juegos
            </Link>
          </>
        ) : me?.student ? (
          <>
            <p className="mt-3 font-semibold">Ya has entrado como <b>{me.student.username}</b>.</p>
            <Link href="/" className="btn btn-orange mt-5">
              Ir a los juegos
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="mt-4 grid gap-4">
            <p className="font-semibold text-[#5b4630]">Usa el nombre y la contraseña que te ha dado tu profesor.</p>
            <label className="grid gap-1 font-bold">
              Nombre de usuario
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className="min-h-12 rounded-xl border-2 border-[#d9c7a6] bg-white px-4 text-lg"
              />
            </label>
            <label className="grid gap-1 font-bold">
              Contraseña
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                required
                className="min-h-12 rounded-xl border-2 border-[#d9c7a6] bg-white px-4 text-lg"
              />
            </label>
            {error ? (
              <p role="alert" className="rounded-xl bg-red-100 p-3 font-bold text-red-900">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn btn-green" disabled={busy || !me}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
            <Link href="/" className="text-center font-bold underline">
              Prefiero jugar sin entrar
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
