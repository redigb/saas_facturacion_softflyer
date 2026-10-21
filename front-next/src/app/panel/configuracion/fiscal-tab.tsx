"use client";

import { Skeleton } from "@/app/panel/carta/ui";
import { AfectacionSection } from "@/app/panel/configuracion/afectacion-section";
import { useFiscalStatus } from "@/app/panel/configuracion/fiscal-queries";
import { Badge, Button } from "@/components/ui";
import { type FiscalStatus } from "@/lib/schemas/facturacion";

/** Facturación de la empresa: solo lectura (la administra Softflyer, spec 017a) y la afectación de la carta. */
export function FiscalTab() {
  const status = useFiscalStatus();

  if (status.isPending) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (status.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar tu configuración de facturación.</p>
        <p className="mt-1 text-sm">{status.error.message}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void status.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      <Summary status={status.data} />
      <ReadOnlyView status={status.data} />
      <AfectacionSection />
    </div>
  );
}

function Summary({ status }: { status: FiscalStatus }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-tinta">Facturación electrónica</h2>
        <Badge variant={status.listo_para_emitir ? "success" : "warning"}>{status.listo_para_emitir ? "Lista para emitir" : "Falta configurar"}</Badge>
        <Badge variant={status.entorno === "PRODUCCION" ? "info" : "neutral"}>{status.entorno === "PRODUCCION" ? "Producción" : "Pruebas (beta)"}</Badge>
      </div>
      {!status.homologado ? (
        <p className="text-sm text-slate-500">
          Mientras no completes la homologación en SUNAT, tus comprobantes se emiten en el entorno de pruebas y no tienen validez tributaria.
        </p>
      ) : null}
    </section>
  );
}

/** El dueño ve cómo está su facturación; los datos fiscales los carga Softflyer. */
function ReadOnlyView({ status }: { status: FiscalStatus }) {
  const certificate = status.certificado;

  return (
    <section className="space-y-5">
      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Tu certificado, tu clave SOL y la tasa de IGV de cada local los administra Softflyer para que tu facturación siga funcionando sin interrupciones. Si necesitas un cambio, escríbenos y lo hacemos por ti.
      </p>
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Row label="Certificado" value={certificate ? `${certificate.titular ?? "Cargado"} · ${certificate.vigente ? `vence el ${certificate.vence_en}` : "vencido"}` : null} />
        <Row label="Usuario SOL" value={status.usuario_sol} />
        <Row label="Tasa de IGV" value={status.tasa_igv ? `${status.tasa_igv.nombre} · ${status.tasa_igv.tasa}%` : null} />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-tinta">{value || "—"}</dd>
    </div>
  );
}
