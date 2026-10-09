"use client";

import { useState } from "react";

import { Skeleton } from "@/app/panel/carta/ui";
import { MemberDrawer } from "@/app/panel/equipo/member-drawer";
import { useMembers, useRoles, useToggleActive } from "@/app/panel/equipo/queries";
import { Icon } from "@/components/icons";
import { Badge, Button, EmptyState, Switch } from "@/components/ui";
import type { Member } from "@/lib/schemas/equipo";

export type TeamPermissions = { create: boolean; assignRole: boolean };

type DrawerState = { open: false } | { open: true; member?: Member };

export function TeamView({ can }: { can: TeamPermissions }) {
  const members = useMembers();
  const roles = useRoles();
  const toggle = useToggleActive();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [confirming, setConfirming] = useState<number | null>(null);

  if (members.isPending || roles.isPending) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
    );
  }

  if (members.isError || roles.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar el equipo.</p>
        <p className="mt-1 text-sm">{(members.error ?? roles.error)?.message}</p>
      </div>
    );
  }

  const onlyMe = members.data.length === 1;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          {members.data.filter((member) => member.es_activo).length} activos de {members.data.length}
        </p>
        {can.create && (
          <Button onClick={() => setDrawer({ open: true })}>
            <Icon name="mas" className="h-4 w-4" />
            Agregar persona
          </Button>
        )}
      </div>

      <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {members.data.map((member) => (
          <li key={member.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5 ${member.es_activo ? "" : "bg-slate-50"}`}>
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                member.es_activo ? "bg-azul text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {initials(member.nombre)}
            </span>

            <button type="button" onClick={() => setDrawer({ open: true, member })} className="min-w-0 flex-1 text-left">
              <span className={`block truncate font-bold ${member.es_activo ? "text-tinta" : "text-slate-400"}`}>
                {member.nombre}
                {member.es_yo && <span className="ml-2 text-xs font-semibold text-slate-400">(tú)</span>}
              </span>
              <span className="block truncate text-sm text-slate-500">{member.correo}</span>
            </button>

            <div className="flex flex-wrap items-center gap-1.5">
              {member.roles.map((role) => (
                <Badge key={role.id} variant={role.nombre === "Administrador" ? "info" : "neutral"}>
                  {role.nombre}
                </Badge>
              ))}
              {member.tiene_pin && <Badge variant="success">PIN</Badge>}
              {!member.es_activo && <Badge variant="danger">Inactivo</Badge>}
            </div>

            <span className="hidden w-32 text-right text-xs text-slate-400 md:block">{lastAccess(member.ultimo_acceso)}</span>

            {confirming === member.id ? (
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">¿Desactivar? Sus sesiones se cierran.</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    toggle.mutate({ id: member.id, es_activo: false });
                    setConfirming(null);
                  }}
                >
                  Sí
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                  No
                </Button>
              </span>
            ) : (
              <Switch
                checked={member.es_activo}
                disabled={member.es_yo}
                onCheckedChange={(checked) => (checked ? toggle.mutate({ id: member.id, es_activo: true }) : setConfirming(member.id))}
                aria-label={member.es_activo ? `Desactivar a ${member.nombre}` : `Reactivar a ${member.nombre}`}
                title={member.es_yo ? "No puedes desactivarte a ti mismo" : undefined}
              />
            )}
          </li>
        ))}
      </ul>

      {onlyMe && can.create && (
        <EmptyState
          className="mt-4"
          icon="equipo"
          title="Todavía estás solo"
          description="Agrega a tus mozos, cajeros y cocina. Con un PIN cambian de usuario en la tablet en dos segundos."
          actionLabel="Agregar a tu primer mozo"
          onAction={() => setDrawer({ open: true })}
        />
      )}

      <MemberDrawer
        key={drawer.open ? (drawer.member?.id ?? "nuevo") : "cerrado"}
        open={drawer.open}
        member={drawer.open ? drawer.member : undefined}
        roles={roles.data}
        can={can}
        onClose={() => setDrawer({ open: false })}
      />
    </>
  );
}

function lastAccess(value: string | null): string {
  if (!value) return "Nunca entró";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 2) return "Activo ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 60 * 24) return `Hace ${Math.round(minutes / 60)} h`;
  return new Date(value).toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" });
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
