"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export async function logout(): Promise<void> {
  // Revoca el token en Laravel aunque la cookie se borre igual si la API falla.
  await apiFetch("auth/logout", { method: "POST" });
  (await cookies()).delete(SESSION_COOKIE);

  redirect("/login");
}
