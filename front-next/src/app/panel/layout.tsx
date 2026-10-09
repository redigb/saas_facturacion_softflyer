import { redirect } from "next/navigation";

import { logout } from "@/app/panel/actions";
import { firstAllowedHref } from "@/app/panel/navigation";
import { SwitchUserButton } from "@/app/panel/switch-user";
import { PanelShell } from "@/app/panel/panel-shell";
import { PanelProviders } from "@/app/panel/providers";
import { RealtimeProvider } from "@/app/panel/realtime";
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

  // Cada rol entra a lo que puede usar (spec 004). Mozo y Cocinero tienen pantalla desde H1.
  if (firstAllowedHref(me.permisos) === null) {
    return (
      <AuthShell>
        <h1 className="text-3xl font-bold text-tinta">Tu vista llega pronto</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Hola, {me.usuario.nombre}. Tu rol ({me.roles.join(", ") || "sin rol"}) todavía no tiene una pantalla
          propia. Pídele al administrador del restaurante que te avise cuando esté lista.
        </p>
        <div className="mt-6 flex justify-center rounded-xl border-2 border-slate-200">
          <SwitchUserButton className="w-full justify-center" />
        </div>
        <LogoutButton />
      </AuthShell>
    );
  }

  return (
    <PanelProviders>
      <RealtimeProvider branches={me.sucursales ?? []} userId={me.usuario.id} takesOrders={me.permisos.includes("restaurante.pedidos.crear")}>
        <PanelShell me={me}>{children}</PanelShell>
      </RealtimeProvider>
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
