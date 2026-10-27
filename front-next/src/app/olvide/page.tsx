import { redirect } from "next/navigation";

import { ForgotForm } from "@/app/olvide/forgot-form";
import { AuthShell } from "@/components/auth-shell";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";

export default async function OlvidePage() {
  const slug = slugFromHost(await getRequestHost());

  // La cuenta vive en el subdominio del restaurante; sin él no sabemos dónde buscarla.
  if (!slug || slug === PLATFORM_SLUG) {
    redirect("/");
  }

  return (
    <AuthShell>
      <ForgotForm />
    </AuthShell>
  );
}
