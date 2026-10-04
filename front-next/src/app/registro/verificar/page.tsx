import Link from "next/link";

import { VerifyForm } from "@/app/registro/verificar/verify-form";
import { AuthShell } from "@/components/auth-shell";

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell>
      {token ? (
        <VerifyForm token={token} />
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-tinta">Enlace incompleto</h1>
          <p className="mt-3 text-base text-slate-600">
            Abre el enlace completo que te enviamos por correo, o regístrate de nuevo.
          </p>
          <Link href="/registro" className="mt-8 inline-block rounded-xl bg-azul px-5 py-3 font-bold text-white hover:bg-azul-oscuro">
            Ir al registro
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
