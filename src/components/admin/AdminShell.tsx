"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api-client";

export type Crumb = { label: string; href?: string };

export function AdminShell({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-[#f6f3ee] text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/admin" className="flex-1 text-xl font-extrabold">
            Panel del profesor
          </Link>
          <Link href="/?todos=1" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold hover:bg-stone-100">
            Web de los alumnos
          </Link>
          <button type="button" onClick={logout} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold hover:bg-stone-100">
            Salir
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-5">
        <nav aria-label="Migas de pan">
          <ol className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return (
                <li key={crumb.label} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden className="text-stone-400">›</span> : null}
                  {crumb.href && !last ? (
                    <Link href={crumb.href} className="text-violet-700 underline-offset-2 hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined} className="text-stone-600">
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}
