"use client";

import { useActionState } from "react";

import { saveSolCredentials, setBranchTax, setCompanyRate, setHomologation, testCredentials, uploadCertificate, type FormState } from "@/app/plataforma/actions";
import type { ClientDetail } from "@/app/plataforma/types";
import { ActionCard } from "@/components/backoffice/molecules/action-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/** Todo lo que el backoffice configura para que el cliente emita: certificado, SOL, IGV y homologación. */
export function BillingActions({ client }: { client: ClientDetail }) {
  const { fiscal } = client;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ActionCard
        title="Certificado digital"
        description={
          fiscal.certificado
            ? `Cargado${fiscal.certificado.titular ? ` a nombre de ${fiscal.certificado.titular}` : ""}. Subir otro lo reemplaza.`
            : "Sube el certificado del cliente en .pem o .pfx/.p12. Se guarda cifrado."
        }
        action={uploadCertificate.bind(null, client.slug)}
        submit="Cargar certificado"
      >
        <Input name="certificado" type="file" accept=".pem,.pfx,.p12" required aria-label="Archivo del certificado" />
        <Input name="contrasena" type="password" autoComplete="off" placeholder="Contraseña (solo .pfx/.p12)" aria-label="Contraseña del certificado" />
      </ActionCard>

      <ActionCard
        title="Usuario y clave SOL"
        description={fiscal.tiene_clave_sol ? `Usuario ${fiscal.usuario_sol}. La clave no se muestra; escribe una nueva para cambiarla.` : "El usuario secundario que el cliente creó en SUNAT."}
        action={saveSolCredentials.bind(null, client.slug)}
        submit="Guardar credenciales"
      >
        <Input name="usuario_sol" required defaultValue={fiscal.usuario_sol ?? ""} autoComplete="off" placeholder="Usuario SOL" aria-label="Usuario SOL" />
        <Input name="clave_sol" type="password" required autoComplete="new-password" placeholder="Clave SOL" aria-label="Clave SOL" />
      </ActionCard>

      <ActionCard
        title="Probar credenciales"
        description="Pregunta a SUNAT si acepta el usuario y la clave SOL guardados, sin emitir nada. Solo se puede verificar en producción: en pruebas SUNAT acepta cualquier clave."
        action={testCredentials.bind(null, client.slug)}
        submit="Probar con SUNAT"
        secondary
      />

      <ActionCard
        title="Homologación en SUNAT"
        description={
          fiscal.homologado
            ? "El cliente ya puede emitir en producción. Retírala si aún no completó el proceso."
            : "Márcala solo cuando el cliente confirme su usuario secundario y su certificado en el portal de SUNAT."
        }
        action={setHomologation.bind(null, client.slug, !fiscal.homologado)}
        submit={fiscal.homologado ? "Retirar homologación" : "Marcar como homologado"}
        secondary
      />

      <ActionCard
        title="Tasa de IGV de la empresa"
        description="La heredan los locales que no tengan una propia. Si no eliges ninguna, rige el 18 %."
        action={setCompanyRate.bind(null, client.slug)}
        submit="Guardar tasa"
      >
        <NativeSelect name="tasa_igv_id" defaultValue={fiscal.tasa_igv?.id} aria-label="Tasa de IGV">
          {client.tasas_igv.map((rate) => (
            <option key={rate.id} value={rate.id}>{rate.nombre} · {rate.tasa}%</option>
          ))}
        </NativeSelect>
      </ActionCard>

      <Card>
        <CardHeader>
          <CardTitle>IGV por local</CardTitle>
          <CardDescription>
            Cada local puede tener su propia tasa. Márcalo como Amazonía solo si está en esa zona exonerada: vende exonerado lo gravado y el comprobante lleva la leyenda 2001 (bienes) o 2002 (servicios).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {client.sucursales_detalle.map((branch) => (
              <BranchTaxRow key={`${branch.id}-${branch.tasa_igv_id}-${branch.exonerado_amazonia}-${branch.leyenda_amazonia}`} slug={client.slug} branch={branch} rates={client.tasas_igv} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function BranchTaxRow({ slug, branch, rates }: { slug: string; branch: ClientDetail["sucursales_detalle"][number]; rates: ClientDetail["tasas_igv"] }) {
  const [state, formAction, pending] = useActionState(setBranchTax.bind(null, slug, branch.id), {} as FormState);

  return (
    <li className="py-4 text-sm first:pt-0 last:pb-0">
      <p className="truncate font-semibold text-foreground">{branch.nombre}</p>
      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <NativeSelect name="tasa_igv_id" defaultValue={branch.tasa_igv_id ?? ""} aria-label={`Tasa de ${branch.nombre}`}>
          <option value="">La de la empresa</option>
          {rates.map((rate) => (
            <option key={rate.id} value={rate.id}>{rate.nombre} · {rate.tasa}%</option>
          ))}
        </NativeSelect>
        <NativeSelect name="leyenda_amazonia" defaultValue={branch.leyenda_amazonia} aria-label={`Leyenda de ${branch.nombre}`}>
          <option value="2001">Leyenda 2001 · bienes</option>
          <option value="2002">Leyenda 2002 · servicios</option>
        </NativeSelect>
        <label className="flex items-center gap-2 font-medium text-foreground">
          <input type="checkbox" name="exonerado_amazonia" defaultChecked={branch.exonerado_amazonia} className="size-4 accent-primary" />
          Local en la Amazonía (exonerado)
        </label>
        <Button type="submit" variant="outline" size="sm" isLoading={pending}>
          {pending ? "Guardando…" : "Guardar local"}
        </Button>
        {state.mensaje ? <p role="status" className={`font-medium sm:col-span-2 ${state.ok ? "text-success" : "text-destructive"}`}>{state.mensaje}</p> : null}
      </form>
    </li>
  );
}
