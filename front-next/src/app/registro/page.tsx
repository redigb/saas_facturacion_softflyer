import Link from "next/link";
import { redirect } from "next/navigation";

import { RegistroForm } from "@/app/registro/registro-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestHost, rootDomainLabel, rootUrl, slugFromHost } from "@/lib/tenant";

const TRIAL_DAYS = Number(process.env.PRUEBA_DIAS ?? 7);

export default async function RegistroPage() {
  // El registro vive en el dominio central, nunca dentro de un restaurante.
  if (slugFromHost(await getRequestHost())) {
    redirect(rootUrl("/registro"));
  }

  return (
    <AuthShell>
      <span className="inline-block rounded-full bg-amarillo px-3 py-1 text-xs font-bold tracking-wide text-tinta uppercase">
        {TRIAL_DAYS} días gratis
      </span>
      <h1 className="mt-3 text-3xl font-bold text-tinta">Crea tu restaurante</h1>
      <p className="mt-2 mb-8 text-base text-slate-600">
        Empieza con el RUC de tu empresa. En minutos tendrás tu propio sistema.
      </p>

      <RegistroForm rootDomain={rootDomainLabel()} trialDays={TRIAL_DAYS} />

      <p className="mt-8 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/" className="font-semibold text-azul hover:text-celeste">
          Ingresa a tu restaurante
        </Link>
      </p>
    </AuthShell>
  );
}
