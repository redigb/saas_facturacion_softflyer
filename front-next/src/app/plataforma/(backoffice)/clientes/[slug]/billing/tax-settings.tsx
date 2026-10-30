"use client";

import { useState } from "react";

import { setBranchTax, setCompanyRate } from "@/app/plataforma/actions";
import type { ClientDetail } from "@/app/plataforma/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { FormError, useToastAction } from "@/components/backoffice/molecules/use-toast-action";

/** IGV de la empresa y excepciones por local (tasa propia o exoneración de la Amazonía). */
export function TaxSettings({ client }: { client: ClientDetail }) {
  const { fiscal } = client;
  const rates = client.tasas_igv;
  const companyRate = fiscal.tasa_igv ?? rates[0];

  return (
    <Card className="border-border bg-card shadow-xs">
      <section className="space-y-3 px-5 pb-5 pt-6">
        <h2 className="text-base font-bold text-foreground">IGV</h2>
        {/* Con una sola tasa en el catálogo no hay nada que elegir: se muestra, sin botón de guardar. */}
        {rates.length <= 1 ? (
          <div className="space-y-1">
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{companyRate ? `${companyRate.tasa} %` : "18 %"}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {companyRate?.nombre ?? "IGV general"} para todos sus locales. La tasa reducida para restaurantes (Ley 31556, 10 %) se habilitará cuando
              el contador la valide.
            </p>
          </div>
        ) : (
          <CompanyRateForm slug={client.slug} rates={rates} current={fiscal.tasa_igv?.id ?? rates[0]?.id} />
        )}
      </section>

      {client.sucursales_detalle.length > 0 ? (
        <section className="border-t border-border/70 px-5 pb-5 pt-5">
          <h2 className="text-base font-bold text-foreground">Locales</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Cada local cobra el IGV de la empresa, salvo las excepciones marcadas.</p>
          <ul className="mt-4 space-y-3">
            {client.sucursales_detalle.map((branch) => (
              <BranchTaxRow
                key={`${branch.id}-${branch.tasa_igv_id}-${branch.exonerado_amazonia}-${branch.leyenda_amazonia}`}
                slug={client.slug}
                branch={branch}
                rates={rates}
                companyRate={companyRate}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </Card>
  );
}

function CompanyRateForm({ slug, rates, current }: { slug: string; rates: ClientDetail["tasas_igv"]; current?: number }) {
  const [state, formAction, pending] = useToastAction((prev, formData) => setCompanyRate(slug, prev, formData));

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor="tasa-general" className="text-sm font-semibold">
        Tasa de la empresa
      </Label>
      <div className="flex items-center gap-2">
        <Select name="tasa_igv_id" defaultValue={String(current ?? "")}>
          <SelectTrigger id="tasa-general" className="flex-1">
            <SelectValue placeholder="Elige la tasa" />
          </SelectTrigger>
          <SelectContent>
            {rates.map((rate) => (
              <SelectItem key={rate.id} value={String(rate.id)}>
                {rate.nombre} · {rate.tasa} %
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" isLoading={pending} className="shrink-0">
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <p className="text-[13px] text-muted-foreground">Rige en los locales que no tengan una tasa propia.</p>
      <FormError state={state} />
    </form>
  );
}

const LEGENDS: Record<ClientDetail["sucursales_detalle"][number]["leyenda_amazonia"], string> = {
  "2001": "2001 · Bienes transferidos en la Amazonía",
  "2002": "2002 · Servicios prestados en la Amazonía",
};

/** Un local: qué cobra hoy, a simple vista, y el formulario plegado para cambiarlo. */
function BranchTaxRow({
  slug,
  branch,
  rates,
  companyRate,
}: {
  slug: string;
  branch: ClientDetail["sucursales_detalle"][number];
  rates: ClientDetail["tasas_igv"];
  companyRate?: ClientDetail["tasas_igv"][number];
}) {
  const [editing, setEditing] = useState(false);
  const [amazonia, setAmazonia] = useState(branch.exonerado_amazonia);
  const [state, formAction, pending] = useToastAction((prev, formData) => setBranchTax(slug, branch.id, prev, formData));
  const ownRate = rates.find((rate) => rate.id === branch.tasa_igv_id);
  const companyLabel = companyRate ? `${companyRate.tasa} %` : "18 %";

  return (
    <li className={cn("rounded-xl border px-4 py-3.5", branch.exonerado_amazonia ? "border-warning/60 bg-warning/10" : "border-border/70")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">{branch.nombre}</p>
        {branch.exonerado_amazonia ? (
          <span className="rounded-full bg-warning px-2.5 py-0.5 text-xs font-bold text-neutral-900">Exonerado de IGV</span>
        ) : ownRate ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">Tasa propia</span>
        ) : null}
      </div>

      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {branch.exonerado_amazonia
          ? `No cobra IGV. Sus comprobantes llevan la leyenda ${LEGENDS[branch.leyenda_amazonia]}.`
          : ownRate
            ? `Cobra ${ownRate.nombre}, ${ownRate.tasa} %.`
            : `Cobra el IGV de la empresa, ${companyLabel}.`}
      </p>

      {editing ? (
        <form action={formAction} className="mt-3 space-y-3 border-t border-border/70 pt-3">
          {/* Elegir tasa por local solo tiene sentido si hay más de una; si no, el local usa la de la empresa. */}
          {rates.length > 1 ? (
            <Select name="tasa_igv_id" defaultValue={branch.tasa_igv_id ? String(branch.tasa_igv_id) : "empresa"}>
              <SelectTrigger aria-label={`Tasa de ${branch.nombre}`}>
                <SelectValue placeholder="Tasa de IGV" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empresa">La de la empresa ({companyLabel})</SelectItem>
                {rates.map((rate) => (
                  <SelectItem key={rate.id} value={String(rate.id)}>
                    {rate.nombre} · {rate.tasa} %
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <div className="flex items-start gap-2.5">
            <Checkbox
              id={`exonerado-${branch.id}`}
              name="exonerado_amazonia"
              checked={amazonia}
              onCheckedChange={(checked) => setAmazonia(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor={`exonerado-${branch.id}`} className="cursor-pointer text-sm font-normal leading-snug">
              Está en la Amazonía y no cobra IGV
            </Label>
          </div>

          {/* La leyenda solo aplica a un local exonerado; si no, viaja oculta para no perder la elegida. */}
          {!amazonia ? (
            <input type="hidden" name="leyenda_amazonia" value={branch.leyenda_amazonia} />
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-muted-foreground">Leyenda en sus comprobantes</Label>
              <Select name="leyenda_amazonia" defaultValue={branch.leyenda_amazonia}>
                <SelectTrigger aria-label={`Leyenda de ${branch.nombre}`}>
                  <SelectValue placeholder="Leyenda" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEGENDS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <FormError state={state} />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" isLoading={pending}>
              {pending ? "Guardando…" : "Guardar local"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setAmazonia(branch.exonerado_amazonia);
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-3 font-semibold" onClick={() => setEditing(true)}>
          Cambiar
        </Button>
      )}
    </li>
  );
}
