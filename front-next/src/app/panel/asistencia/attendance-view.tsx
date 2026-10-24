"use client";

import { useState } from "react";

import { errorMessage } from "@/app/panel/carta/queries";
import { Skeleton } from "@/app/panel/carta/ui";
import { useMembers } from "@/app/panel/equipo/queries";
import {
  useAttendanceSummary,
  useMarkAttendance,
  useMyAttendance,
  useSaveWorkSchedule,
  useWorkSchedule,
} from "@/app/panel/asistencia/queries";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Badge, Button, Input } from "@/components/ui";

type Branch = { id: number; nombre: string };
type Tab = "mio" | "equipo" | "horarios";

const DAYS = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "M", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 7, short: "D", label: "Domingo" },
] as const;

export function AttendanceView({ branches, canMark, canAdmin }: { branches: Branch[]; canMark: boolean; canAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>(canAdmin ? "equipo" : "mio");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Asistencia</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">Entradas y salidas verificadas con GPS y hora oficial del servidor.</p>
      </div>

      {canAdmin ? (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Secciones de asistencia">
          {([
            ...(canMark ? [{ id: "mio" as const, label: "Mi asistencia" }] : []),
            { id: "equipo" as const, label: "Equipo" },
            { id: "horarios" as const, label: "Horarios" },
          ]).map((option) => (
            <Button key={option.id} variant={tab === option.id ? "primary" : "secondary"} onClick={() => setTab(option.id)} role="tab" aria-selected={tab === option.id}>
              {option.label}
            </Button>
          ))}
        </div>
      ) : null}

      {tab === "mio" && canMark ? <MyAttendancePanel branches={branches} /> : null}
      {tab === "equipo" && canAdmin ? <TeamSummary branches={branches} /> : null}
      {tab === "horarios" && canAdmin ? <SchedulesPanel branches={branches} /> : null}
    </div>
  );
}

function MyAttendancePanel({ branches }: { branches: Branch[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? 0);
  const attendance = useMyAttendance(branchId);
  const mark = useMarkAttendance(branchId);
  const toast = useToast();
  const [gpsState, setGpsState] = useState<string | null>(null);

  function requestPosition() {
    if (!("geolocation" in navigator)) {
      setGpsState("Este dispositivo no dispone de ubicación GPS.");
      return;
    }
    setGpsState("Buscando una ubicación precisa…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGpsState(`Ubicación encontrada con ${Math.round(coords.accuracy)} m de precisión. Validando…`);
        mark.mutate(
          { latitud: coords.latitude, longitud: coords.longitude, precision_metros: coords.accuracy },
          {
            onSuccess: ({ data }) => {
              setGpsState(null);
              toast({ tone: "ok", message: `${data.marcacion.tipo === "ENTRADA" ? "Entrada" : "Salida"} registrada con la hora del servidor.` });
            },
            onError: (error) => setGpsState(errorMessage(error)),
          },
        );
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Activa el permiso de ubicación para poder marcar tu asistencia."
          : error.code === error.TIMEOUT
            ? "El GPS tardó demasiado. Sal al ingreso o acércate a una ventana e inténtalo otra vez."
            : "No pudimos determinar tu ubicación. Verifica que el GPS esté activado.";
        setGpsState(message);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  if (branches.length === 0) {
    return <Message tone="warning" title="Sin sucursal asignada">Pídele al administrador que te asigne un local.</Message>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Tu jornada de hoy</p>
            <h2 className="mt-1 text-xl font-bold text-tinta">{branches.find((branch) => branch.id === branchId)?.nombre}</h2>
          </div>
          {branches.length > 1 ? <BranchSelect branches={branches} value={branchId} onChange={setBranchId} /> : null}
        </div>

        {attendance.isPending ? <Skeleton className="mt-6 h-64" /> : attendance.isError ? (
          <Message tone="danger" title="No pudimos cargar tu jornada">{attendance.error.message}</Message>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Entrada" value={attendance.data.horario?.hora_entrada ?? "—"} />
              <Metric label="Salida" value={attendance.data.horario?.hora_salida ?? "—"} />
            </div>
            <p className="mt-3 text-center text-sm text-slate-500">
              Hora oficial: <strong className="text-tinta tabular-nums">{formatDateTime(attendance.data.servidor_ahora)}</strong>
            </p>

            {!attendance.data.horario ? (
              <Message tone="warning" title="No tienes horario hoy">El administrador debe asignarte un horario antes de que puedas marcar.</Message>
            ) : !attendance.data.sucursal.geocerca ? (
              <Message tone="warning" title="Zona aún no configurada">El administrador debe ubicar este local en el mapa.</Message>
            ) : (
              <Button
                size="lg"
                className="mt-6 min-h-14 w-full text-lg"
                onClick={requestPosition}
                isLoading={mark.isPending}
              >
                <Icon name="ubicacion" className="h-6 w-6" />
                {mark.isPending ? "Validando ubicación…" : `Marcar ${attendance.data.proxima_marcacion === "ENTRADA" ? "entrada" : "salida"}`}
              </Button>
            )}
            {gpsState ? <p className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${mark.isError ? "bg-red-50 text-red-700" : "bg-celeste/10 text-azul"}`} aria-live="polite">{gpsState}</p> : null}
            <p className="mt-4 text-center text-xs text-slate-400">La ubicación se solicita únicamente al pulsar el botón. No existe seguimiento en segundo plano.</p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-bold text-tinta">Marcaciones de hoy</h2>
        {attendance.data?.marcaciones.length ? (
          <ol className="mt-4 space-y-3">
            {attendance.data.marcaciones.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-niebla p-4">
                <div>
                  <p className="font-bold text-tinta">{item.tipo === "ENTRADA" ? "Entrada" : "Salida"}</p>
                  <p className="text-xs text-slate-500">A {Math.round(item.distancia_metros)} m del punto del local</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-tinta tabular-nums">{formatTime(item.marcado_en)}</p>
                  <StatusBadge status={item.estado} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-2xl bg-niebla p-5 text-sm text-slate-500">Aún no registraste una marcación hoy.</p>
        )}
      </section>
    </div>
  );
}

function TeamSummary({ branches }: { branches: Branch[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? 0);
  const [date, setDate] = useState(todayInLima());
  const summary = useAttendanceSummary(branchId, date);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <BranchSelect branches={branches} value={branchId} onChange={setBranchId} />
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="max-w-52 tabular-nums" aria-label="Fecha del resumen" />
      </div>
      {summary.isPending ? <Skeleton className="h-64" /> : summary.isError ? (
        <Message tone="danger" title="No pudimos cargar la asistencia">{summary.error.message}</Message>
      ) : summary.data.personas.length === 0 ? (
        <Message tone="warning" title="No hay personal programado">Asigna horarios para esta fecha desde la pestaña Horarios.</Message>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {summary.data.personas.map((person) => (
            <li key={person.usuario.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-azul text-sm font-bold text-white">{initials(person.usuario.nombre)}</span>
              <div className="min-w-40 flex-1">
                <p className="font-bold text-tinta">{person.usuario.nombre}</p>
                <p className="text-xs text-slate-500">{person.usuario.roles.join(", ")} · {person.horario.hora_entrada}–{person.horario.hora_salida}</p>
              </div>
              <StatusBadge status={person.estado} />
              <p className="min-w-36 text-right text-sm font-semibold text-slate-600 tabular-nums">
                {person.marcaciones.length ? person.marcaciones.map((mark) => `${mark.tipo === "ENTRADA" ? "E" : "S"} ${formatTime(mark.marcado_en)}`).join(" · ") : "Sin marcaciones"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SchedulesPanel({ branches }: { branches: Branch[] }) {
  const members = useMembers();
  const [userId, setUserId] = useState<number | null>(null);

  if (members.isPending) return <Skeleton className="h-72" />;
  if (members.isError) return <Message tone="danger" title="No pudimos cargar el equipo">{members.error.message}</Message>;

  const active = members.data.filter((member) => member.es_activo);
  const selected = userId ?? active[0]?.id ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="px-2 pb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">Trabajador</p>
        <div className="space-y-1">
          {active.map((member) => (
            <button key={member.id} type="button" onClick={() => setUserId(member.id)} className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-sm font-bold transition-all active:scale-[0.99] ${selected === member.id ? "bg-azul text-white" : "text-tinta hover:bg-slate-100"}`}>
              {member.nombre}
            </button>
          ))}
        </div>
      </aside>
      {selected ? <ScheduleForm key={selected} userId={selected} branches={branches} /> : <Message tone="warning" title="Tu equipo está vacío">Agrega trabajadores desde Equipo.</Message>}
    </div>
  );
}

function ScheduleForm({ userId, branches }: { userId: number; branches: Branch[] }) {
  const schedule = useWorkSchedule(userId);

  if (schedule.isPending) return <Skeleton className="h-72" />;
  if (schedule.isError) return <Message tone="danger" title="No pudimos cargar el horario">{schedule.error.message}</Message>;

  return <ScheduleEditor key={schedule.data?.id ?? "nuevo"} userId={userId} branches={branches} initial={schedule.data} />;
}

function ScheduleEditor({ userId, branches, initial }: { userId: number; branches: Branch[]; initial: ReturnType<typeof useWorkSchedule>["data"] }) {
  const save = useSaveWorkSchedule();
  const toast = useToast();
  const [branchId, setBranchId] = useState(initial?.sucursal.id ?? branches[0]?.id ?? 0);
  const [days, setDays] = useState<number[]>(initial?.dias_semana ?? [1, 2, 3, 4, 5, 6]);
  const [start, setStart] = useState(initial?.hora_entrada ?? "09:00");
  const [end, setEnd] = useState(initial?.hora_salida ?? "18:00");
  const [tolerance, setTolerance] = useState(initial?.tolerancia_minutos ?? 5);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (days.length === 0) {
      toast({ tone: "error", message: "Elige al menos un día de trabajo." });
      return;
    }
    try {
      await save.mutateAsync({ userId, body: { sucursal_id: branchId, dias_semana: days, hora_entrada: start, hora_salida: end, tolerancia_minutos: tolerance } });
      toast({ tone: "ok", message: "Horario guardado." });
    } catch (error) {
      toast({ tone: "error", message: errorMessage(error) });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-tinta">Horario semanal</h2>
        <p className="text-sm text-slate-500">La tolerancia se aplica sobre la hora oficial del servidor.</p>
      </div>
      <label className="block text-sm font-bold text-tinta">Sucursal<BranchSelect branches={branches} value={branchId} onChange={setBranchId} className="mt-1.5 w-full" /></label>
      <fieldset>
        <legend className="text-sm font-bold text-tinta">Días de trabajo</legend>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAYS.map((day) => {
            const checked = days.includes(day.value);
            return (
              <label key={day.value} title={day.label} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border font-bold transition-all active:scale-[0.98] ${checked ? "border-azul bg-azul text-white" : "border-slate-200 text-slate-500"}`}>
                <input type="checkbox" checked={checked} onChange={() => setDays((current) => checked ? current.filter((value) => value !== day.value) : [...current, day.value].sort())} className="sr-only" />
                {day.short}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-bold text-tinta">Entrada<Input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1.5 tabular-nums" required /></label>
        <label className="text-sm font-bold text-tinta">Salida<Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1.5 tabular-nums" required /></label>
        <label className="text-sm font-bold text-tinta">Tolerancia (min)<Input type="number" min={0} max={120} value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} className="mt-1.5 tabular-nums" required /></label>
      </div>
      <Button type="submit" size="lg" isLoading={save.isPending}>Guardar horario</Button>
    </form>
  );
}

function BranchSelect({ branches, value, onChange, className = "" }: { branches: Branch[]; value: number; onChange: (id: number) => void; className?: string }) {
  return (
    <select value={value} onChange={(event) => onChange(Number(event.target.value))} className={`min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-base font-semibold text-tinta focus:border-azul focus:outline-none focus:ring-4 focus:ring-azul/10 ${className}`} aria-label="Sucursal">
      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}
    </select>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-niebla p-4 text-center"><p className="text-xs font-bold tracking-wide text-slate-400 uppercase">{label}</p><p className="mt-1 text-2xl font-bold text-tinta tabular-nums">{value}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const config = status === "PUNTUAL" ? ["success", "Puntual"] : status === "TARDANZA" ? ["warning", "Tardanza"] : status === "SIN_MARCAR" ? ["danger", "Sin marcar"] : status === "EN_JORNADA" ? ["info", "En jornada"] : ["neutral", "Registrada"];
  return <Badge variant={config[0] as "success" | "warning" | "danger" | "info" | "neutral"}>{config[1]}</Badge>;
}

function Message({ tone, title, children }: { tone: "warning" | "danger"; title: string; children: React.ReactNode }) {
  return <div className={`mt-5 rounded-2xl border p-5 ${tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}><p className="font-bold">{title}</p><p className="mt-1 text-sm">{children}</p></div>;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", timeZone: "America/Lima" });
}

function todayInLima(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Lima" }).format(new Date());
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

