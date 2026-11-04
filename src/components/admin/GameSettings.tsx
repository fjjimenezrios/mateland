"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import type { GameState } from "@/games/registry";
import type { AdminField, GameDefinition } from "@/games/types";
import { api } from "@/lib/api-client";

export type Definition = GameDefinition<unknown>;
type Values = Record<string, unknown>;

function describeIssue(field: AdminField | undefined, issue: z.core.$ZodIssue): string {
  if (issue.code === "custom" || field?.type === "multi" || field?.type === "toggle") return issue.message;
  return field?.type === "number" ? `Debe ser un número entre ${field.min} y ${field.max}` : issue.message;
}

export function GameSettings({ game }: { game: Definition }) {
  const [enabled, setEnabled] = useState(true);
  const [values, setValues] = useState<Values | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sampleSeed, setSampleSeed] = useState(0);

  useEffect(() => {
    api<GameState>(`/api/admin/games/${game.slug}`).then((result) => {
      const state = result.data as GameState;
      setEnabled(state.enabled);
      setValues(state.config as Values);
      if (!result.ok) setStatus({ kind: "error", text: result.data.error ?? "No se pudo cargar la configuración" });
    });
  }, [game.slug]);

  const parsed = useMemo(() => (values ? (game.configSchema as z.ZodType<unknown>).safeParse(values) : null), [game, values]);
  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (parsed && !parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_");
        map[key] ??= describeIssue(game.adminFields.find((field) => field.key === key), issue);
      }
    }
    return { ...serverErrors, ...map };
  }, [parsed, serverErrors, game.adminFields]);

  const samples = useMemo(() => {
    void sampleSeed;
    return parsed?.success ? game.previewExamples(parsed.data, 5) : [];
  }, [parsed, game, sampleSeed]);

  const update = useCallback((key: string, value: unknown) => {
    setValues((current) => ({ ...current, [key]: value }));
    setServerErrors({});
    setStatus(null);
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    const result = await api(`/api/admin/games/${game.slug}`, "PUT", { enabled, config: values });
    setSaving(false);
    if (result.ok) {
      setStatus({ kind: "ok", text: "Guardado. Los alumnos que empiecen un desafío nuevo recibirán estos valores (puede tardar hasta 10 segundos)." });
    } else {
      setServerErrors(result.data.errors ?? {});
      setStatus({ kind: "error", text: result.data.error ?? "No se pudo guardar" });
    }
  }

  if (!values) return <section className="rounded-2xl bg-white p-6 shadow-sm">Cargando {game.title}…</section>;

  const valid = parsed?.success === true;
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-extrabold">{game.title}</h2>
          <p className="text-sm text-stone-600">{game.topic}</p>
        </div>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); setStatus(null); }} className="h-5 w-5" />
          Visible para los alumnos
        </label>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {game.adminFields.map((field) => {
          const error = errors[field.key];
          const id = `${game.slug}-${field.key}`;
          return (
            <div key={field.key} className={field.type === "multi" || field.type === "toggle" ? "sm:col-span-2" : ""}>
              {field.type === "number" ? (
                <>
                  <label htmlFor={id} className="block text-sm font-bold">
                    {field.label}
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="range"
                      aria-label={`${field.label} (deslizador)`}
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      value={Number(values[field.key] ?? field.min)}
                      onChange={(event) => update(field.key, Number(event.target.value))}
                      className="min-w-0 flex-1 accent-violet-600"
                    />
                    <input
                      id={id}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      value={typeof values[field.key] === "number" && !Number.isNaN(values[field.key]) ? (values[field.key] as number) : ""}
                      onChange={(event) => update(field.key, event.target.value === "" ? undefined : Number(event.target.value))}
                      aria-invalid={Boolean(error)}
                      className={`h-11 w-24 rounded-lg border-2 px-2 text-center font-bold ${error ? "border-red-500" : "border-stone-300"}`}
                    />
                    {field.unit ? <span className="w-4 text-sm font-bold text-stone-500">{field.unit}</span> : null}
                  </div>
                  {field.help ? <p className="mt-1 text-xs text-stone-500">{field.help}</p> : null}
                </>
              ) : field.type === "toggle" ? (
                <label className="flex items-center gap-2 font-bold">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={values[field.key] === true}
                    onChange={(event) => update(field.key, event.target.checked)}
                  />
                  {field.label}
                  {field.help ? <span className="text-xs font-normal text-stone-500">{field.help}</span> : null}
                </label>
              ) : (
                <fieldset>
                  <legend className="text-sm font-bold">{field.label}</legend>
                  <div className="mt-1 flex flex-wrap gap-4">
                    {field.options.map((option) => {
                      const current = (values[field.key] as string[] | undefined) ?? [];
                      return (
                        <label key={option.value} className="flex items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            className="h-5 w-5"
                            checked={current.includes(option.value)}
                            onChange={(event) =>
                              update(field.key, event.target.checked ? [...current, option.value] : current.filter((value) => value !== option.value))
                            }
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              {error ? (
                <p role="alert" className="mt-1 text-sm font-bold text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {errors._ ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 text-sm font-bold text-red-900">
          {errors._}
        </p>
      ) : null}

      {valid ? (
        <div className="mt-5 rounded-xl bg-violet-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-violet-900">Ejemplos de lo que verían los alumnos</h3>
            <button type="button" onClick={() => setSampleSeed((value) => value + 1)} className="text-sm font-bold text-violet-700 underline">
              Otros ejemplos
            </button>
          </div>
          <ul className="mt-2 grid gap-1 text-sm">
            {samples.map((sample, index) => (
              <li key={`${index}-${sample}`}>• {sample}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!valid || saving} className="btn">
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {!valid ? <span className="text-sm font-bold text-red-700">Corrige los campos marcados para poder guardar.</span> : null}
        {status ? (
          <span role="status" className={`text-sm font-bold ${status.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}>
            {status.text}
          </span>
        ) : null}
      </div>
    </section>
  );
}
