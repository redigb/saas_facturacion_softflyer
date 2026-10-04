import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { AuthShell } from "@/components/auth-shell";
import { apiFetch, type Tenant } from "@/lib/api";
import { getRequestHost, PLATFORM_SLUG, rootUrl, slugFromHost } from "@/lib/tenant";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verificado?: string }>;
}) {
  const { verificado } = await searchParams;
  const slug = slugFromHost(await getRequestHost());

  // Sin subdominio no sabemos a qué empresa entrar: vuelve al portal.
  if (!slug) {
    redirect("/");
  }

  if (slug === PLATFORM_SLUG) {
    redirect("/plataforma/login");
  }

  const result = await apiFetch<Tenant>("inquilino");

  return (
    <AuthShell>
      {result.ok ? (
        <>
          {verificado === "1" && (
            <div role="status" className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              ¡Listo! Tu correo fue confirmado y tu restaurante ya está creado. Ingresa con tu contraseña.
            </div>
          )}
          <LoginForm tenant={result.data} />
        </>
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-tinta">
            {result.status === 404 ? "Empresa no encontrada" : "Servicio no disponible"}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{result.error.mensaje}</p>
          <a
            href={rootUrl("/")}
            className="mt-8 inline-block rounded-xl bg-azul px-5 py-3 font-bold text-white hover:bg-azul-oscuro"
          >
            Volver al inicio
          </a>
        </div>
      )}
    </AuthShell>
  );
}
