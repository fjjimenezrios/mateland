"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { games } from "@/games/registry";
import { api } from "@/lib/api-client";
import {
  type Band, buildRows, histogram, lastSeenText, METRICS, type Metric, type Row, summarize, toCsv, totalsOf, type StudentRecord,
} from "@/lib/stats";
import { AdminShell } from "./AdminShell";
import { BellChart } from "./BellChart";

type Data = { classes: { id: string; name: string }[]; students: StudentRecord[]; generatedAt: number };
type SortKey = "username" | "completed" | "autonomy" | "hints" | "streak" | "seen" | "z";

const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const BAND: Record<Band, { label: string; icon: string; className: string }> = {
  support: { label: "Necesita apoyo", icon: "⚠", className: "bg-amber-100 text-amber-950" },
  high: { label: "Destaca", icon: "★", className: "bg-emerald-100 text-emerald-950" },
  typical: { label: "En la media", icon: "●", className: "bg-stone-100 text-stone-800" },
  none: { label: "Sin actividad", icon: "○", className: "bg-stone-100 text-stone-500" },
};

function sortValue(row: Row, key: SortKey): number | string {
  if (key === "username") return row.student.username;
  if (key === "completed") return row.stats.completed;
  if (key === "autonomy") return row.stats.completed ? row.stats.solved / row.stats.completed : -1;
  if (key === "hints") return row.stats.hints;
  if (key === "streak") return row.stats.streak;
  if (key === "seen") return row.student.updatedAt;
  return row.z ?? -99;
}

export function StatsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState("all");
  const [game, setGame] = useState("all");
  const [metric, setMetric] = useState<Metric>("completed");
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "username", dir: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    const result = await api<Data>("/api/admin/stats");
    if (result.ok) {
      setData(result.data as Data);
      setError(null);
    } else setError(result.data.error ?? "No se pudieron cargar las estadísticas");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slugs = useMemo(() => (game === "all" ? games.map((item) => item.slug) : [game]), [game]);
  const students = useMemo(() => (data ? data.students.filter((s) => classId === "all" || s.classId === classId) : []), [data, classId]);
  const { rows, summary } = useMemo(() => buildRows(students, slugs, metric), [students, slugs, metric]);
  const bins = useMemo(
    () => histogram(rows.flatMap((row) => (row.value === null ? [] : [{ name: row.student.username, value: row.value }])), metric),
    [rows, metric],
  );
  const className = useCallback((id: string) => data?.classes.find((c) => c.id === id)?.name ?? "", [data]);
  const metricInfo = METRICS.find((item) => item.id === metric)!;
  const now = data?.generatedAt ?? 0;

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const va = sortValue(a, sort.key);
        const vb = sortValue(b, sort.key);
        return (typeof va === "string" ? va.localeCompare(String(vb), "es") : (va as number) - (vb as number)) * sort.dir;
      }),
    [rows, sort],
  );

  const totals = useMemo(() => {
    const all = rows.map((row) => row.stats);
    const completed = all.reduce((sum, s) => sum + s.completed, 0);
    const solved = all.reduce((sum, s) => sum + s.solved, 0);
    return { completed, autonomy: completed ? Math.round((solved / completed) * 100) : null, active: all.filter((s) => s.completed > 0).length };
  }, [rows]);

  const marked = rows.find((row) => row.student.id === selected);
  const marker = marked && marked.value !== null ? { name: marked.student.username, value: marked.value } : null;
  const groups = (band: Band) => rows.filter((row) => row.band === band).map((row) => row.student.username);

  function download() {
    const blob = new Blob([toCsv(sorted, className, now)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "estadisticas-clase.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const header = (key: SortKey, label: string) => (
    <th scope="col" className="px-3 py-2 text-left font-extrabold" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 font-extrabold hover:text-violet-700" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "username" ? 1 : -1 }))}>
        {label}
        <span aria-hidden className="text-xs text-stone-400">{sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  const select = "min-h-11 rounded-lg border-2 border-stone-300 bg-white px-3 font-bold";

  return (
    <AdminShell crumbs={[{ label: "Panel", href: "/admin" }, { label: "Estadísticas" }]}>
      <h1 className="text-2xl font-extrabold">Estadísticas</h1>
      <p className="mt-1 text-sm text-stone-600">
        Cómo va cada alumno y la clase en general. Solo hay datos de los alumnos que han entrado con su cuenta; cada uno envía su progreso cada 15 minutos o al salir.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 p-3 font-bold text-red-900">{error}</p>
      ) : null}

      {data && data.students.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-lg font-extrabold">Todavía no hay alumnos</p>
          <p className="mt-1 text-stone-600">Crea una clase en «Alumnos y clases» y activa las cuentas. Cuando jueguen, aquí verás su evolución.</p>
        </div>
      ) : null}

      {data && data.students.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-bold">
              Clase
              <select className={select} value={classId} onChange={(e) => { setClassId(e.target.value); setSelected(null); }}>
                <option value="all">Todas</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Juego
              <select className={select} value={game} onChange={(e) => setGame(e.target.value)}>
                <option value="all">Todos los juegos</option>
                {games.map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold">
              Qué medir
              <select className={select} value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
                {METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={load} disabled={loading} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-bold hover:bg-stone-100">
                {loading ? "Actualizando…" : "↻ Actualizar"}
              </button>
              <button type="button" onClick={download} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-bold hover:bg-stone-100">
                ⬇ Descargar CSV
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Cada vez que se abre o se actualiza esta página se leen los archivos de progreso de {data.students.length} alumnos (el plan gratuito de Blob incluye 10.000 lecturas al mes).
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Alumnos con actividad", `${totals.active} de ${rows.length}`],
              ["Retos completados", String(totals.completed)],
              ["Autonomía de la clase", totals.autonomy === null ? "—" : `${totals.autonomy} %`],
              [`Media de «${metricInfo.short}»`, summary ? `${number.format(summary.mean)}${metric === "autonomy" ? " %" : ""}` : "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                <dd className="font-display text-3xl font-extrabold">{value}</dd>
                <dt className="text-sm font-bold text-stone-600">{label}</dt>
              </div>
            ))}
          </dl>

          <section className="mt-5">
            <h2 className="text-xl font-extrabold">Distribución: {metricInfo.label.toLowerCase()}</h2>
            <p className="mb-2 text-sm text-stone-600">
              {metricInfo.help}.{" "}
              {summary && summary.n >= 3 && summary.sd > 0
                ? `Media ${number.format(summary.mean)}, desviación típica ${number.format(summary.sd)}, mediana ${number.format(summary.median)}. La curva es la campana de Gauss que mejor se ajusta a la clase: la mayoría de alumnos debería quedar dentro de la franja sombreada (±1 desviación).`
                : "Hacen falta al menos 3 alumnos con actividad y algo de variedad para dibujar la campana de Gauss."}
            </p>
            <BellChart histogram={bins} summary={summary} xLabel={metricInfo.label} marker={marker} />
            <p className="mt-1 text-xs text-stone-500">Con pocos alumnos la forma real puede alejarse de una campana; la curva es solo una referencia.</p>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Grupos">
            {(["support", "high", "none"] as const).map((band) => {
              const names = groups(band);
              return (
                <div key={band} className="rounded-2xl bg-white p-4 shadow-sm">
                  <h3 className="flex items-center gap-2 font-extrabold">
                    <span aria-hidden>{BAND[band].icon}</span> {BAND[band].label} ({names.length})
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {band === "support" ? "Más de una desviación por debajo de la media" : band === "high" ? "Más de una desviación por encima de la media" : "Aún no han completado ningún reto"}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{names.length ? names.join(", ") : "Nadie"}</p>
                </div>
              );
            })}
          </section>

          <section className="mt-5">
            <h2 className="text-xl font-extrabold">Cada alumno</h2>
            <p className="mb-2 text-sm text-stone-600">Toca un alumno para ver su detalle por juego y su posición en la campana.</p>
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Estadísticas por alumno</caption>
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    {header("username", "Alumno")}
                    {header("completed", "Retos")}
                    {header("autonomy", "Sin pistas")}
                    {header("hints", "Pistas")}
                    {header("streak", "Racha")}
                    {header("seen", "Última conexión")}
                    {header("z", "Posición")}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const open = selected === row.student.id;
                    const band = BAND[row.band];
                    return [
                      <tr key={row.student.id} className={`cursor-pointer border-b border-stone-100 hover:bg-violet-50 ${open ? "bg-violet-50" : ""}`} onClick={() => setSelected(open ? null : row.student.id)}>
                        <th scope="row" className="px-3 py-2 text-left font-mono font-bold">
                          <button type="button" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setSelected(open ? null : row.student.id); }} className="text-left">
                            {row.student.username}
                          </button>
                          {classId === "all" && data.classes.length > 1 ? <span className="ml-2 font-sans text-xs font-normal text-stone-500">{className(row.student.classId)}</span> : null}
                          {!row.student.active ? <span className="ml-2 rounded bg-stone-200 px-1.5 font-sans text-xs font-bold">desactivado</span> : null}
                        </th>
                        <td className="px-3 py-2 tabular-nums">{row.stats.completed}</td>
                        <td className="px-3 py-2 tabular-nums">{row.stats.completed ? `${Math.round((row.stats.solved / row.stats.completed) * 100)} %` : "—"}</td>
                        <td className="px-3 py-2 tabular-nums">{row.stats.hints}</td>
                        <td className="px-3 py-2 tabular-nums">{row.stats.streak}</td>
                        <td className="px-3 py-2 text-stone-600">{lastSeenText(row.student.updatedAt, now)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${band.className}`}>
                            <span aria-hidden>{band.icon}</span> {band.label}
                          </span>
                        </td>
                      </tr>,
                      open ? (
                        <tr key={`${row.student.id}-detail`} className="border-b border-stone-100 bg-violet-50/60">
                          <td colSpan={7} className="px-3 py-3">
                            <table className="w-full max-w-xl text-sm">
                              <thead>
                                <tr className="text-left text-xs text-stone-500">
                                  <th scope="col" className="py-1 pr-3 font-bold">Juego</th>
                                  <th scope="col" className="py-1 pr-3 font-bold">Retos</th>
                                  <th scope="col" className="py-1 pr-3 font-bold">Sin pistas</th>
                                  <th scope="col" className="py-1 pr-3 font-bold">Pistas</th>
                                  <th scope="col" className="py-1 font-bold">Racha</th>
                                </tr>
                              </thead>
                              <tbody>
                                {games.map((g) => {
                                  const stats = totalsOf(row.student.totals, [g.slug]);
                                  return (
                                    <tr key={g.slug} className={stats.completed ? "" : "text-stone-400"}>
                                      <th scope="row" className="py-1 pr-3 text-left font-semibold">{g.title}</th>
                                      <td className="py-1 pr-3 tabular-nums">{stats.completed}</td>
                                      <td className="py-1 pr-3 tabular-nums">{stats.completed ? `${Math.round((stats.solved / stats.completed) * 100)} %` : "—"}</td>
                                      <td className="py-1 pr-3 tabular-nums">{stats.hints}</td>
                                      <td className="py-1 tabular-nums">{stats.streak}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {row.z !== null && summary ? (
                              <p className="mt-2 text-xs text-stone-600">
                                En «{metricInfo.short}» tiene {row.value}{metric === "autonomy" ? " %" : ""}: {number.format(Math.abs(row.z))} desviaciones {row.z >= 0 ? "por encima" : "por debajo"} de la media ({number.format(summary.mean)}).
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ) : null,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {!data && !error ? <p className="mt-6 font-bold text-stone-600">Cargando…</p> : null}
    </AdminShell>
  );
}
