import { redirect } from "next/navigation";

import { ResetForm } from "@/app/restablecer/reset-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";

/** Bienvenida del alta directa (spec 036): el dueño crea su propia contraseña. */
export default async function ActivarPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, host] = await Promise.all([searchParams, getRequestHost()]);
  const slug = slugFromHost(host);

  if (!slug || slug === PLATFORM_SLUG) {
    redirect("/");
  }

  return (
    <AuthShell>
      {token ? (
        <ResetForm token={token} mode="activar" />
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-tinta">Enlace incompleto</h1>
          <p className="mt-3 text-base text-slate-600">
            Abre el enlace completo del correo de bienvenida, o pide a Softflyer que te envíe uno nuevo.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
