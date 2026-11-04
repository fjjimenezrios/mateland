"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import type { Credential } from "@/lib/students";

type PublicStudent = { id: string; classId: string; username: string; active: boolean };
type Directory = { classes: { id: string; name: string }[]; students: PublicStudent[] };

function Cards({ credentials, onClose }: { credentials: Credential[]; onClose: () => void }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <section className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-extrabold">Contraseñas nuevas</h3>
          <p className="text-sm font-semibold text-amber-900">Solo se muestran ahora. Imprímelas o apúntalas antes de cerrar.</p>
        </div>
        <button type="button" className="btn" onClick={() => window.print()}>
          Imprimir tarjetas
        </button>
        <button type="button" className="rounded-full border border-stone-400 px-4 py-2 font-bold" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className="print-area mt-4 grid gap-3 sm:grid-cols-2">
        {credentials.map((credential) => (
          <div key={credential.username} className="break-inside-avoid rounded-xl border-2 border-dashed border-stone-500 bg-white p-4">
            <p className="text-sm font-extrabold">Mates 1.º ESO · {origin}</p>
            <p className="mt-2">
              Usuario: <b className="font-mono text-lg">{credential.username}</b>
            </p>
            <p>
              Contraseña: <b className="font-mono text-lg">{credential.password}</b>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StudentsTab() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [cards, setCards] = useState<Credential[] | null>(null);
  const [className, setClassName] = useState("");
  const [names, setNames] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(async () => {
    const result = await api<Directory>("/api/admin/students");
    if (result.ok) setDirectory(result.data as Directory);
  }, []);

  useEffect(() => {
    api<{ accountsEnabled: boolean }>("/api/admin/settings").then((result) => setEnabled(result.data.accountsEnabled === true));
    void reload();
  }, [reload]);

  async function toggleAccounts(value: boolean) {
    const result = await api("/api/admin/settings", "PUT", { accountsEnabled: value });
    if (result.ok) setEnabled(value);
    else setMessage({ ok: false, text: result.data.error ?? "No se pudo cambiar" });
  }

  async function createClass(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const result = await api<{ credentials: Credential[]; rejected: string[] }>("/api/admin/classes", "POST", { name: className, usernames: names });
    if (!result.ok) return setMessage({ ok: false, text: result.data.error ?? "No se pudo crear la clase" });
    setCards(result.data.credentials);
    const rejected = result.data.rejected ?? [];
    setMessage({
      ok: true,
      text: `Clase creada con ${result.data.credentials.length} alumnos.${rejected.length ? ` No se han podido usar: ${rejected.join(", ")}.` : ""}`,
    });
    setClassName("");
    setNames("");
    await reload();
  }

  async function resetPassword(student: PublicStudent) {
    const result = await api<{ credential: Credential }>(`/api/admin/students/${student.id}`, "PATCH", { action: "reset" });
    if (result.ok) {
      setCards([result.data.credential]);
      await reload();
    } else setMessage({ ok: false, text: result.data.error ?? "No se pudo cambiar la contraseña" });
  }

  async function setActive(student: PublicStudent, active: boolean) {
    await api(`/api/admin/students/${student.id}`, "PATCH", { action: active ? "activate" : "deactivate" });
    await reload();
  }

  async function removeClass(id: string, name: string) {
    if (!window.confirm(`¿Borrar la clase «${name}» con todos sus alumnos y su progreso? No se puede deshacer.`)) return;
    await api(`/api/admin/classes/${id}`, "DELETE");
    await reload();
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h2 className="text-xl font-extrabold">Acceso con cuenta</h2>
            <p className="text-sm text-stone-600">
              Permite que los alumnos entren con su nombre y contraseña para conservar su progreso en cualquier dispositivo.
            </p>
          </div>
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" className="h-5 w-5" disabled={enabled === null} checked={enabled === true} onChange={(event) => toggleAccounts(event.target.checked)} />
            Activado
          </label>
        </div>
        <p className="mt-3 rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-950">
          Antes de activarlo con alumnos reales, el centro debe aprobarlo por escrito: son menores de 14 años y el nombre de usuario ligado a su progreso es un
          dato personal. Usa apodos o iniciales (por ejemplo «lucia-m»), nunca nombre y apellidos completos.
        </p>
      </section>

      {cards ? <Cards credentials={cards} onClose={() => setCards(null)} /> : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-extrabold">Crear una clase</h2>
        <form onSubmit={createClass} className="mt-3 grid gap-3">
          <label className="grid gap-1 text-sm font-bold">
            Nombre de la clase
            <input value={className} onChange={(e) => setClassName(e.target.value)} required maxLength={60} className="min-h-11 rounded-lg border-2 border-stone-300 px-3 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Nombres de usuario, uno por línea
            <textarea
              value={names}
              onChange={(e) => setNames(e.target.value)}
              required
              rows={6}
              placeholder={"lucia-m\npablo-r\nana-g"}
              className="rounded-lg border-2 border-stone-300 p-3 font-mono font-normal"
            />
          </label>
          <p className="text-xs text-stone-500">De 2 a 24 letras, números, punto o guion. Si un nombre se repite, se le añade un número. Cada alumno recibe una contraseña generada.</p>
          <button type="submit" className="btn w-fit">
            Crear clase y contraseñas
          </button>
        </form>
        {message ? (
          <p role="status" className={`mt-3 text-sm font-bold ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
            {message.text}
          </p>
        ) : null}
      </section>

      {directory?.classes.map((schoolClass) => {
        const students = directory.students.filter((student) => student.classId === schoolClass.id);
        return (
          <section key={schoolClass.id} className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <h2 className="flex-1 text-xl font-extrabold">
                {schoolClass.name} <span className="text-sm font-semibold text-stone-500">({students.length} alumnos)</span>
              </h2>
              <button type="button" onClick={() => removeClass(schoolClass.id, schoolClass.name)} className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                Borrar clase
              </button>
            </div>
            <ul className="mt-3 divide-y divide-stone-200">
              {students.map((student) => (
                <li key={student.id} className="flex flex-wrap items-center gap-3 py-2">
                  <span className={`flex-1 font-mono font-bold ${student.active ? "" : "text-stone-400 line-through"}`}>{student.username}</span>
                  <button type="button" onClick={() => resetPassword(student)} className="rounded-full border border-stone-300 px-3 py-1 text-sm font-bold hover:bg-stone-100">
                    Nueva contraseña
                  </button>
                  <button type="button" onClick={() => setActive(student, !student.active)} className="rounded-full border border-stone-300 px-3 py-1 text-sm font-bold hover:bg-stone-100">
                    {student.active ? "Desactivar" : "Activar"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
