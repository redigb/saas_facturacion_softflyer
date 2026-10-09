import { redirect } from "next/navigation";

import { logout } from "@/app/panel/actions";
import { PanelShell } from "@/app/panel/panel-shell";
import { PanelProviders } from "@/app/panel/providers";
import { AuthShell } from "@/components/auth-shell";
import { SalesButton } from "@/components/sales-button";
import { apiFetch, type Me } from "@/lib/api";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const result = await apiFetch<Me>("auth/yo");

  if (!result.ok) {
    console.warn(`[panel] sesión no válida (${result.status} ${result.error.codigo}); se redirige a /login`);
    redirect("/login");
  }

  const me = result.data;

  if (me.inquilino.prueba?.vencida) {
    return (
      <AuthShell>
        <span className="inline-block rounded-full bg-amarillo px-3 py-1 text-xs font-bold tracking-wide text-tinta uppercase">
          Prueba finalizada
        </span>
        <h1 className="mt-3 text-3xl font-bold text-tinta">Tu prueba gratis terminó</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Gracias por probar Softflyer en <strong className="text-tinta">{me.inquilino.nombre}</strong>. Tus datos
          siguen guardados: comunícate con nuestro equipo de ventas para activar tu plan y seguir donde lo dejaste.
        </p>
        <SalesButton tenant={me.inquilino.nombre} email={me.inquilino.ventas_correo} className="mt-8 w-full" />
        <LogoutButton />
      </AuthShell>
    );
  }

  // Por ahora el panel es solo del administrador; mozos y cocina tendrán su propia vista.
  if (!me.permisos.includes("panel.ver")) {
    return (
      <AuthShell>
        <h1 className="text-3xl font-bold text-tinta">Tu vista llega pronto</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Hola, {me.usuario.nombre}. Tu rol ({me.roles.join(", ") || "sin rol"}) todavía no tiene una pantalla
          propia. Pídele al administrador del restaurante que te avise cuando esté lista.
        </p>
        <LogoutButton />
      </AuthShell>
    );
  }

  return (
    <PanelProviders>
      <PanelShell me={me}>{children}</PanelShell>
    </PanelProviders>
  );
}

function LogoutButton() {
  return (
    <form action={logout} className="mt-4">
      <button
        type="submit"
        className="w-full rounded-xl border-2 border-slate-200 px-5 py-3 font-bold text-slate-600 transition hover:border-azul hover:text-azul"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
