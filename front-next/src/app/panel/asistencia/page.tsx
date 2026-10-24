import type { Metadata } from "next";

import { AttendanceView } from "@/app/panel/asistencia/attendance-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Asistencia · Softflyer" };

export default async function AttendancePage() {
  const me = await apiFetch<Me>("auth/yo");
  if (!me.ok) return null;

  return (
    <AttendanceView
      branches={me.data.sucursales}
      canMark={me.data.permisos.includes("asistencia.marcar")}
      canAdmin={me.data.permisos.includes("asistencia.administrar")}
    />
  );
}

