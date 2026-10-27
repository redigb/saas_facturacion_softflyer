import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetForm } from "@/app/restablecer/reset-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, host] = await Promise.all([searchParams, getRequestHost()]);
  const slug = slugFromHost(host);

  if (!slug || slug === PLATFORM_SLUG) {
    redirect("/");
  }

  return (
    <AuthShell>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-tinta">Enlace incompleto</h1>
          <p className="mt-3 text-base text-slate-600">Abre el enlace completo que te enviamos por correo, o pide uno nuevo.</p>
          <Link href="/olvide" className="mt-8 inline-block rounded-xl bg-azul px-5 py-3 font-bold text-white hover:bg-azul-oscuro">
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
