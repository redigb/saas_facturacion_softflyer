"use client";

import { updateClientData } from "@/app/plataforma/actions";
import type { ClientDetail } from "@/app/plataforma/types";
import { ActionCard } from "@/components/backoffice/molecules/action-card";
import { Input } from "@/components/ui/input";

/** Corrección de los datos de la empresa (RUC, razón social, nombre comercial, dirección fiscal). */
export function ProfileActions({ client }: { client: ClientDetail }) {
  return (
    <ActionCard
      title="Corregir datos de la empresa"
      description="El RUC solo se puede cambiar mientras no haya emitido comprobantes reales; al cambiarlo se retira la homologación."
      action={updateClientData.bind(null, client.slug)}
      submit="Guardar datos"
      secondary
    >
      <Input name="ruc" required inputMode="numeric" maxLength={11} defaultValue={client.ruc ?? ""} aria-label="RUC" placeholder="RUC" />
      <Input name="razon_social" required maxLength={255} defaultValue={client.razon_social ?? ""} aria-label="Razón social" placeholder="Razón social" />
      <Input name="nombre_comercial" required maxLength={120} defaultValue={client.nombre} aria-label="Nombre comercial" placeholder="Nombre comercial" />
      <Input name="direccion_fiscal" maxLength={255} defaultValue={client.direccion_fiscal ?? ""} aria-label="Dirección fiscal" placeholder="Dirección fiscal (opcional)" />
    </ActionCard>
  );
}
