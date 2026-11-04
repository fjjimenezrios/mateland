"use client";

import Link from "next/link";
import { leaveAccount } from "@/lib/progress-client";
import { useMe } from "@/lib/use-me";

export function AccountMenu() {
  const me = useMe();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    leaveAccount();
    window.location.href = "/";
  }

  return (
    <nav className="flex items-center gap-2" aria-label="Cuenta">
      <Link href="/progreso" className="btn btn-ghost" style={{ minHeight: 44 }}>
        Mi progreso
      </Link>
      {me?.student ? (
        <>
          <span className="hidden font-bold text-white sm:inline">Hola, {me.student.username}</span>
          <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={logout}>
            Salir
          </button>
        </>
      ) : me?.accountsEnabled ? (
        <Link href="/entrar" className="btn btn-orange" style={{ minHeight: 44 }}>
          Entrar
        </Link>
      ) : null}
    </nav>
  );
}
