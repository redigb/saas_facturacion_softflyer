"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import { Skeleton } from "@/app/panel/carta/ui";
import { useActiveOrders, useOpenOrder, useOrderAction } from "@/app/panel/pedidos/queries";
import { SalonFloor } from "@/app/panel/pedidos/salon-floor";
import { minutesSince, useNow } from "@/app/panel/pedidos/use-now";
import { fetchPlan, keys as floorKeys, useRooms } from "@/app/panel/plano/queries";
import { useToast } from "@/app/panel/providers";
import { useRealtimeEvent } from "@/app/panel/realtime";
import { Icon } from "@/components/icons";
import { Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { OrderSummary } from "@/lib/schemas/pedidos";
import type { PlanTable } from "@/lib/schemas/plano";

type TableState = "LIBRE" | "OCUPADA" | "POR_COBRAR" | "BLOQUEADA";

/**
 * Vista de pedidos del salón (spec 006): diseño POS de alta gama con pestañas de salón,
 * chips de filtrado rápido, métricas situacionales en vivo y tarjetas táctiles enriquecidas.
 * La vista Plano (spec 018) dibuja el salón tal como lo dibujó el dueño, con las mesas
 * pintadas por estado, el #pedido sobre las ocupadas y pulsación larga para anular (spec 019).
 */
export function SalonView({ user }: { user: { id: number; esJefe: boolean } }) {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const rooms = useRooms();
  const orders = useActiveOrders();
  const open = useOpenOrder();
  const queryClient = useQueryClient();
  const isPhone = useMediaQuery("(max-width: 639px)");

  const [opening, setOpening] = useState<number | "llevar" | null>(null);
  // Spec 038: antes de abrir un "para llevar" se elige la mesa a la que pertenece (opcional).
  const [takeawayOpen, setTakeawayOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | "TODOS">("TODOS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | TableState>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  // Plano por defecto en tablet/PC; tarjetas en celular (spec 018). El usuario puede cambiarla.
  const [viewMode, setViewMode] = useState<"plano" | "mesas" | null>(null);
  const view = viewMode ?? (isPhone ? "mesas" : "plano");
  // Mesa cuyo pedido se está confirmando para anular desde el plano (spec 019).
  const [holdTarget, setHoldTarget] = useState<OrderSummary | null>(null);

  // El dueño guardó el plano: solo se refresca el salón que cambió (spec 005).
  useRealtimeEvent("PlanoActualizado", (event) => {
    void queryClient.invalidateQueries({ queryKey: floorKeys.plan(event.salon_id) });
  });

  const activeRooms = useMemo(
    () => (rooms.data ?? []).filter((room) => room.es_activo).sort((a, b) => a.orden - b.orden),
    [rooms.data]
  );

  const plans = useQueries({
    queries: activeRooms.map((room) => ({
      queryKey: floorKeys.plan(room.id),
      queryFn: () => fetchPlan(room.id),
    })),
  });

  const byTable = useMemo(() => {
    const map = new Map<number, OrderSummary>();
    for (const order of orders.data ?? []) {
      if (order.mesa) map.set(order.mesa.id, order);
    }
    return map;
  }, [orders.data]);

  const orderOf = useCallback((mesaId: number) => byTable.get(mesaId), [byTable]);
  const cancelOrder = useOrderAction(holdTarget?.id ?? 0);

  const takeAway = useMemo(
    // Un para llevar sin platos no es un pedido: no debe aparecer (spec 019).
    () => (orders.data ?? []).filter((order) => order.tipo === "PARA_LLEVAR" && order.platos > 0),
    [orders.data]
  );

  /** Mesas ocupadas a las que se puede asociar un para llevar (spec 038). */
  const occupiedTables = useMemo(() => {
    const map = new Map<number, { id: number; codigo: string; numero: number }>();
    for (const order of orders.data ?? []) {
      if (order.tipo === "SALON" && order.mesa) map.set(order.mesa.id, { id: order.mesa.id, codigo: order.mesa.codigo, numero: order.numero });
    }
    return [...map.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [orders.data]);

  // Mapeo seguro de mesas por salón
  const roomTablesMap = useMemo(() => {
    const map = new Map<number, PlanTable[]>();
    activeRooms.forEach((room, idx) => {
      map.set(room.id, plans[idx]?.data?.mesas ?? []);
    });
    return map;
  }, [activeRooms, plans]);

  // Todas las mesas consolidadas para conteos globales
  const allTables = useMemo(() => {
    return activeRooms.flatMap((room) => roomTablesMap.get(room.id) ?? []);
  }, [activeRooms, roomTablesMap]);

  // Métricas situacionales globales
  const { totalFree, totalOccupied, totalToCollect, activeSalesTotal } = useMemo(() => {
    let free = 0;
    let occupied = 0;
    let toCollect = 0;
    let sales = 0;

    for (const order of orders.data ?? []) {
      if (order.tipo === "SALON") {
        if (order.estado === "POR_COBRAR") toCollect++;
        else occupied++;
        sales += Number(order.total) || 0;
      }
    }

    for (const table of allTables) {
      const order = byTable.get(table.id);
      if (!order && table.estado !== "BLOQUEADA") {
        free++;
      }
    }

    return {
      totalFree: free,
      totalOccupied: occupied,
      totalToCollect: toCollect,
      activeSalesTotal: sales,
    };
  }, [orders.data, allTables, byTable]);

  async function start(body: { tipo: "SALON" | "PARA_LLEVAR"; mesa_id?: number; mesa_referencia_id?: number }, marker: number | "llevar") {
    if (opening !== null) return;
    setOpening(marker);
    try {
      const { data } = await open.mutateAsync(body);
      router.push(`/panel/pedidos/${data.id}`);
    } catch (error) {
      // Otro mozo se adelantó: entra a su pedido en vez de error 409
      const existing =
        error instanceof ApiRequestError && error.codigo === "MESA_OCUPADA"
          ? (error.detalles as unknown as { pedido_id?: number })?.pedido_id
          : undefined;
      if (existing) router.push(`/panel/pedidos/${existing}`);
      else
        toast({
          tone: "error",
          message: error instanceof Error ? error.message : "No se pudo abrir el pedido.",
        });
      setOpening(null);
    }
  }

  /** Un pedido ajeno no se abre: solo su mozo, el encargado o el admin (spec 025). */
  function openOrder(order: OrderSummary) {
    if (order.mozo && order.mozo.id !== user.id && !user.esJefe) {
      toast({
        tone: "warning",
        message: `La abrió ${order.mozo.nombre}. Solo esa persona, el encargado o el admin pueden atenderla.`,
      });
      return;
    }
    router.push(`/panel/pedidos/${order.id}`);
  }

  function tap(table: PlanTable) {
    const order = byTable.get(table.id);
    if (order) openOrder(order);
    else if (table.estado !== "BLOQUEADA") void start({ tipo: "SALON", mesa_id: table.id }, table.id);
  }

  /** Pulsación larga sobre una mesa con pedido en el plano: confirmar anulación (spec 019). */
  function hold(table: PlanTable) {
    const order = byTable.get(table.id);
    if (order) setHoldTarget(order);
  }

  async function confirmAnular() {
    if (!holdTarget) return;
    try {
      await cancelOrder.mutateAsync({ action: "anular" });
      toast({ tone: "ok", message: `Pedido #${holdTarget.numero} anulado: la mesa quedó libre.` });
    } catch (error) {
      // Con platos enviados la API lo impide; su mensaje explica cómo proceder.
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo anular el pedido." });
    } finally {
      setHoldTarget(null);
    }
  }

  const isInitialLoading = rooms.isPending || orders.isPending;

  if (isInitialLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const hasAnyRooms = activeRooms.length > 0;
  const filteredRooms = activeRooms.filter((room) => {
    if (selectedRoomId !== "TODOS" && room.id !== selectedRoomId) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. ENCABEZADO PRINCIPAL */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-tinta sm:text-3xl">Pedidos</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              En vivo
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Toca una mesa libre para abrir su pedido o una ocupada para ver su cuenta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Conmutador Plano | Mesas (spec 018) */}
          <div
            role="group"
            aria-label="Vista del salón"
            className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white p-1 shadow-2xs"
          >
            {(
              [
                { id: "plano", label: "Plano", icon: "plano" },
                { id: "mesas", label: "Mesas", icon: "cuadricula" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setViewMode(option.id)}
                aria-pressed={view === option.id}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all ${
                  view === option.id
                    ? "bg-azul text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-azul"
                }`}
              >
                <Icon name={option.icon} className="h-3.5 w-3.5" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          {/* Botón Acción Rápida: Para Llevar */}
          <Button
            size="lg"
            onClick={() => setTakeawayOpen(true)}
            isLoading={opening === "llevar"}
            className="shadow-xs transition-all active:scale-[0.98]"
          >
            <Icon name="mas" className="h-5 w-5" />
            <span>Para llevar</span>
            {takeAway.length > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold tabular-nums text-white">
                {takeAway.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 2. TARJETAS DE SITUACIÓN GLOBAL (KPIs RÁPIDOS) */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {/* Total Mesas */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Icon name="mesa" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Mesas
            </span>
            <span className="text-lg font-black text-tinta tabular-nums">{allTables.length}</span>
          </div>
        </div>

        {/* Mesas Libres */}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100/90 bg-emerald-50/50 p-3 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-emerald-800/80 uppercase">
              Libres
            </span>
            <span className="text-lg font-black text-emerald-900 tabular-nums">{totalFree}</span>
          </div>
        </div>

        {/* Mesas Ocupadas */}
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100/90 bg-sky-50/50 p-3 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-azul">
            <span className="h-2.5 w-2.5 rounded-full bg-azul" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-sky-800/80 uppercase">
              En mesa
            </span>
            <span className="text-lg font-black text-azul tabular-nums">{totalOccupied}</span>
          </div>
        </div>

        {/* Ventas en Curso */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 font-black text-amber-700">
            S/
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              En cuenta
            </span>
            <span className="text-lg font-black text-tinta tabular-nums">
              S/ {activeSalesTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN DESTACADA: PEDIDOS PARA LLEVAR ACTIVOS */}
      {takeAway.length > 0 && (
        <section className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3.5 shadow-2xs sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-azul">
                <Icon name="bebida" className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-xs font-bold tracking-wider text-azul uppercase">
                Pedidos para llevar activos
              </h2>
              <span className="rounded-full bg-sky-200/80 px-2 py-0.5 text-xs font-bold text-azul tabular-nums">
                {takeAway.length}
              </span>
            </div>
          </div>
          <ul className="flex gap-2.5 overflow-x-auto pb-1 touch-pan-x">
            {takeAway.map((order) => (
              <li key={order.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => openOrder(order)}
                  className="group flex min-h-[82px] min-w-[160px] flex-col justify-between rounded-xl border border-sky-200 bg-white p-3 text-left shadow-2xs transition-all hover:border-azul hover:shadow-xs active:scale-[0.97]"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-base font-black text-tinta group-hover:text-azul transition-colors">
                      #{order.numero}
                    </span>
                    <span className="text-xs font-medium text-slate-400 tabular-nums">
                      {minutesSince(order.abierto_en, now)} min
                    </span>
                  </div>
                  <span className={`mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${order.mesa_referencia ? "bg-sky-100 text-azul" : "bg-slate-100 text-slate-500"}`}>
                    {order.mesa_referencia ? `Mesa ${order.mesa_referencia.codigo}` : "Mostrador"}
                  </span>
                  <div className="mt-2 flex w-full items-center justify-between">
                    <span className="text-sm font-extrabold text-azul tabular-nums">
                      S/ {order.total}
                    </span>
                    {order.listos > 0 && (
                      <span className="animate-pulse rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                        {order.listos} listo{order.listos > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. BARRA DE CONTROL: NAVEGACIÓN DE SALONES Y FILTROS RÁPIDOS */}
      {hasAnyRooms && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs sm:p-3.5">
          {/* Pestañas de Salón */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-0.5 touch-pan-x">
            <button
              type="button"
              onClick={() => setSelectedRoomId("TODOS")}
              className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition-all shadow-2xs ${
                selectedRoomId === "TODOS"
                  ? "bg-azul text-white shadow-xs"
                  : "border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 hover:text-azul"
              }`}
            >
              <span>Todos los salones</span>
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                  selectedRoomId === "TODOS"
                    ? "bg-white/20 text-white"
                    : "border border-slate-200/60 bg-slate-100 text-slate-600"
                }`}
              >
                {allTables.length}
              </span>
            </button>

            {activeRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const roomTables = roomTablesMap.get(room.id) ?? [];
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition-all shadow-2xs ${
                    isSelected
                      ? "bg-azul text-white shadow-xs"
                      : "border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 hover:text-azul"
                  }`}
                >
                  <span>{room.nombre}</span>
                  <span
                    className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "border border-slate-200/60 bg-slate-100 text-slate-600"
                    }`}
                  >
                    {roomTables.length}
                  </span>
                </button>
              );
            })}
          </div>

          {view === "plano" ? (
            /* Leyenda de la vista Plano (spec 018, gesto de anulación en la 019) */
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5">
              {(
                [
                  { label: "Libre", dot: "border-2 border-azul bg-white" },
                  { label: "Ocupada", dot: "bg-azul" },
                  { label: "Por cobrar", dot: "bg-amber-500" },
                  { label: "Bloqueada", dot: "bg-slate-300" },
                ] as const
              ).map((legend) => (
                <span key={legend.label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <span className={`h-3 w-3 rounded-full ${legend.dot}`} />
                  {legend.label}
                </span>
              ))}
              <span className="ml-auto text-xs font-medium text-slate-400">
                Toca una mesa para abrir o ver su pedido · mantén presionada una ocupada para anular
              </span>
            </div>
          ) : (
            /* Filtros de estado y buscador rápido de mesa */
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-2.5">
              {/* Chips de estado */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "TODOS", label: "Todas", count: allTables.length },
                    { id: "LIBRE", label: "Libres", count: totalFree, dot: "bg-emerald-500" },
                    { id: "OCUPADA", label: "Ocupadas", count: totalOccupied, dot: "bg-azul" },
                    { id: "POR_COBRAR", label: "Por cobrar", count: totalToCollect, dot: "bg-amber-500" },
                  ] as const
                ).map((f) => {
                  const active = statusFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all ${
                        active
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "border border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {"dot" in f && f.dot && <span className={`h-2 w-2 rounded-full ${f.dot}`} />}
                      <span>{f.label}</span>
                      <span className={`tabular-nums ${active ? "text-white/80" : "text-slate-400"}`}>
                        ({f.count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Buscador rápido de mesa */}
              <div className="relative w-full sm:w-56">
                <Icon
                  name="buscar"
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar mesa..."
                  aria-label="Buscar mesa por código"
                  className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pr-8 pl-9 text-xs font-medium text-tinta placeholder:text-slate-400 focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Limpiar búsqueda"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. LISTA DE SALONES Y CUADRÍCULA DE MESAS */}
      {!hasAnyRooms ? (
        <EmptyState
          className="mt-6"
          icon="plano"
          title="Todavía no hay salones configurados"
          description="El administrador debe crear salones y mesas en la sección 'Plano del salón'. Mientras tanto puedes abrir pedidos para llevar."
        />
      ) : (
        filteredRooms.map((room) => {
          const rawTables = roomTablesMap.get(room.id) ?? [];
          const sortedTables = [...rawTables].sort((a, b) =>
            a.codigo.localeCompare(b.codigo, "es", { numeric: true })
          );
          const planData = plans[activeRooms.findIndex((active) => active.id === room.id)]?.data;
          const planPending = plans[activeRooms.findIndex((active) => active.id === room.id)]?.isPending;

          // Filtrar por estado y por texto de búsqueda
          const visibleTables = sortedTables.filter((table) => {
            const order = byTable.get(table.id);
            const state: TableState = order
              ? order.estado === "POR_COBRAR"
                ? "POR_COBRAR"
                : "OCUPADA"
              : table.estado === "BLOQUEADA"
              ? "BLOQUEADA"
              : "LIBRE";

            if (statusFilter !== "TODOS" && state !== statusFilter) return false;

            if (searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              const matchesCode = table.codigo.toLowerCase().includes(q);
              const matchesOrder = order ? String(order.numero).includes(q) : false;
              if (!matchesCode && !matchesOrder) return false;
            }

            return true;
          });

          const occupiedCount = sortedTables.filter((t) => byTable.has(t.id)).length;
          const shownCount = view === "plano" ? sortedTables.length : visibleTables.length;

          return (
            <section key={room.id} className="space-y-3">
              {/* Título del Salón */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase">
                    {room.nombre}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 tabular-nums">
                    {shownCount} {shownCount === 1 ? "mesa" : "mesas"}
                  </span>
                </div>
                {occupiedCount > 0 && (
                  <span className="text-xs font-semibold text-azul tabular-nums">
                    {occupiedCount} en atención
                  </span>
                )}
              </div>

              {/* Mesas del salón: plano dibujado (spec 018) o cuadrícula de tarjetas */}
              {view === "plano" ? (
                planPending ? (
                  <Skeleton className="h-[320px]" />
                ) : !planData ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    No pudimos cargar el plano de este salón.
                  </p>
                ) : planData.mesas.length === 0 && planData.elementos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Este salón aún no tiene mesas dibujadas. El administrador las dibuja en «Plano del salón».
                    </p>
                  </div>
                ) : (
                  <SalonFloor plan={planData} orderOf={orderOf} onTableTap={tap} onTableHold={hold} />
                )
              ) : visibleTables.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    No hay mesas en {room.nombre} que coincidan con los filtros aplicados.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {visibleTables.map((table) => {
                    const order = byTable.get(table.id);
                    const state: TableState = order
                      ? order.estado === "POR_COBRAR"
                        ? "POR_COBRAR"
                        : "OCUPADA"
                      : table.estado === "BLOQUEADA"
                      ? "BLOQUEADA"
                      : "LIBRE";

                    // ESTADO: LIBRE
                    if (state === "LIBRE") {
                      return (
                        <li key={table.id}>
                          <button
                            type="button"
                            onClick={() => tap(table)}
                            disabled={opening !== null}
                            aria-label={`Mesa ${table.codigo}, Libre`}
                            className="group relative flex h-32 w-full flex-col justify-between rounded-2xl border-2 border-slate-200/90 bg-white p-3 text-left transition-all hover:border-azul/80 hover:bg-azul/[0.02] hover:shadow-xs active:scale-[0.97] disabled:opacity-60"
                          >
                            <div className="flex w-full items-start justify-between">
                              <span className="text-2xl font-black tracking-tight text-tinta group-hover:text-azul transition-colors">
                                {table.codigo}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 tabular-nums group-hover:bg-azul/10 group-hover:text-azul transition-colors">
                                <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="currentColor">
                                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 14a6 6 0 0 1 12 0H2Z" />
                                </svg>
                                {table.capacidad}
                              </span>
                            </div>

                            <div className="flex w-full items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                {opening === table.id ? "Abriendo…" : "Libre"}
                              </span>
                              <span className="text-[11px] font-semibold text-azul opacity-0 group-hover:opacity-100 transition-opacity">
                                Abrir →
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    }

                    // ESTADO: OCUPADA
                    if (state === "OCUPADA" && order) {
                      return (
                        <li key={table.id}>
                          <button
                            type="button"
                            onClick={() => tap(table)}
                            disabled={opening !== null}
                            aria-label={`Mesa ${table.codigo}, Ocupada, pedido ${order.numero}`}
                            className="group relative flex h-32 w-full flex-col justify-between rounded-2xl border-2 border-azul bg-gradient-to-br from-azul to-[#084883] p-3 text-left text-white shadow-xs transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-60"
                          >
                            <div className="flex w-full items-start justify-between">
                              <span className="text-2xl font-black tracking-tight text-white">
                                {table.codigo}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                                #{order.numero} · {minutesSince(order.abierto_en, now)} min
                              </span>
                            </div>

                            {order.listos > 0 ? (
                              <div className="my-auto">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-emerald-950 shadow-xs animate-pulse">
                                  <span>🔔</span> {order.listos} listo{order.listos > 1 ? "s" : ""}
                                </span>
                              </div>
                            ) : (
                              <div className="h-4" />
                            )}

                            <div className="flex w-full items-end justify-between">
                              <div>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/70">
                                  Total
                                </span>
                                <span className="text-lg font-black tracking-tight text-white tabular-nums">
                                  S/ {order.total}
                                </span>
                              </div>
                              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold text-white transition-colors group-hover:bg-white/30">
                                Ver →
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    }

                    // ESTADO: POR COBRAR
                    if (state === "POR_COBRAR" && order) {
                      return (
                        <li key={table.id}>
                          <button
                            type="button"
                            onClick={() => tap(table)}
                            disabled={opening !== null}
                            aria-label={`Mesa ${table.codigo}, Por cobrar, pedido ${order.numero}`}
                            className="group relative flex h-32 w-full flex-col justify-between rounded-2xl border-2 border-amber-500 bg-gradient-to-br from-amber-500 to-amber-600 p-3 text-left text-white shadow-xs transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-60"
                          >
                            <div className="flex w-full items-start justify-between">
                              <span className="text-2xl font-black tracking-tight text-white">
                                {table.codigo}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                                Por cobrar
                              </span>
                            </div>

                            <div className="flex w-full items-end justify-between">
                              <div>
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/80">
                                  Cuenta
                                </span>
                                <span className="text-lg font-black tracking-tight text-white tabular-nums">
                                  S/ {order.total}
                                </span>
                              </div>
                              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold text-white transition-colors group-hover:bg-white/30">
                                Cobrar →
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    }

                    // ESTADO: BLOQUEADA
                    return (
                      <li key={table.id}>
                        <div
                          className="relative flex h-32 w-full flex-col justify-between rounded-2xl border-2 border-slate-200 bg-slate-100/90 p-3 text-left text-slate-400 opacity-70 select-none"
                        >
                          <div className="flex w-full items-start justify-between">
                            <span className="text-2xl font-bold tracking-tight text-slate-400">
                              {table.codigo}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                              Bloqueada
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-400">No disponible</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}

      {/* Elección de mesa para un "para llevar" (spec 038) */}
      {takeawayOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button type="button" aria-label="Cerrar" onClick={() => setTakeawayOpen(false)} className="fixed inset-0 bg-tinta/60 backdrop-blur-xs" />
          <section role="dialog" aria-modal="true" aria-labelledby="takeaway-title" className="relative z-10 w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="takeaway-title" className="text-lg font-bold text-tinta">¿Para qué mesa es este para llevar?</h2>
                <p className="mt-1 text-sm text-slate-500">Se cobrará en la misma boleta de la mesa que elijas. Si es para mostrador, elige “Sin mesa”.</p>
              </div>
              <button type="button" onClick={() => setTakeawayOpen(false)} aria-label="Cerrar" className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
                <Icon name="cerrar" className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {occupiedTables.map((table) => (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => {
                    setTakeawayOpen(false);
                    void start({ tipo: "PARA_LLEVAR", mesa_referencia_id: table.id }, "llevar");
                  }}
                  className="min-h-[52px] rounded-xl border-2 border-slate-200 px-3 text-left text-sm font-bold text-tinta transition-colors hover:border-azul hover:bg-azul/5"
                >
                  Mesa {table.codigo}
                  <span className="block text-xs font-medium text-slate-400">Pedido #{table.numero}</span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => {
                setTakeawayOpen(false);
                void start({ tipo: "PARA_LLEVAR" }, "llevar");
              }}
            >
              Sin mesa (mostrador)
            </Button>
          </section>
        </div>
      ) : null}

      {/* Confirmación de anulación desde el plano (spec 019) */}
      <ConfirmDialog
        open={holdTarget !== null}
        title={
          holdTarget?.mesa
            ? `¿Anular el pedido #${holdTarget.numero} de la mesa ${holdTarget.mesa.codigo}?`
            : `¿Anular el pedido #${holdTarget?.numero}?`
        }
        description="La mesa quedará libre. Si el pedido ya tiene platos enviados a cocina no se puede anular: se cobra la cuenta o se anulan los platos uno por uno."
        confirmLabel="Sí, anular pedido"
        cancelLabel="No"
        variant="warning"
        onConfirm={() => void confirmAnular()}
        onCancel={() => setHoldTarget(null)}
      />
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
