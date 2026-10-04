"use server";

import { redirect } from "next/navigation";

import { SLUG_PATTERN, tenantUrl } from "@/lib/tenant";

export type FindTenantState = { mensaje?: string; slug?: string };

/** Portal central: lleva al usuario al subdominio de su empresa. */
export async function goToTenant(
  _prev: FindTenantState,
  formData: FormData,
): Promise<FindTenantState> {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    return {
      slug,
      mensaje: "Usa solo letras minúsculas, números y guiones.",
    };
  }

  redirect(tenantUrl(slug, "/login"));
}
