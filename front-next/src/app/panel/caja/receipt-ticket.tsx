"use client";

import { QRCodeSVG } from "qrcode.react";

import { Drawer } from "@/app/panel/carta/ui";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import type { Receipt } from "@/lib/schemas/caja";

const DOCUMENT_LABEL: Record<string, string> = { DNI: "DNI", RUC: "RUC", SIN_DOCUMENTO: "Sin documento" };

/**
 * Comprobante con formato de ticket (80 mm) y su impresión por el navegador (spec 010).
 * Los reales son la representación impresa de SUNAT: leyenda, importe en letras, hash y QR (spec 037).
 * Los simulados dicen "SIMULADO" en pantalla y en el papel.
 */
export function ReceiptTicket({
  receipt,
  onClose,
  downloads = false,
  children,
}: {
  receipt: Receipt;
  onClose: () => void;
  downloads?: boolean;
  /** Va encima del ticket y no se imprime (p. ej. el estado ante SUNAT). */
  children?: React.ReactNode;
}) {
  const date = new Date(receipt.emitido_en).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  const title = receipt.tipo === "FACTURA" ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA";

  return (
    <Drawer
      title={`Comprobante ${receipt.numero}`}
      open
      onClose={onClose}
      footer={
        <>
          <Button size="lg" className="flex-1" onClick={() => window.print()}>
            <Icon name="lista" className="h-5 w-5" />
            Imprimir
          </Button>
          {downloads && !receipt.es_simulado ? (
            <>
              <DownloadLink href={`/api/comprobantes/${receipt.id}/xml`} available={receipt.tiene_xml} label="XML" />
              <DownloadLink href={`/api/comprobantes/${receipt.id}/cdr`} available={receipt.tiene_cdr} label="CDR" />
            </>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      {/* Al imprimir solo se ve el ticket: el resto de la pantalla se oculta. */}
      <style>{`@media print { body * { visibility: hidden !important; } #ticket-comprobante, #ticket-comprobante * { visibility: visible !important; } #ticket-comprobante { position: fixed; left: 0; top: 0; width: 80mm; border: 0; box-shadow: none; } }`}</style>

      {children}

      <div id="ticket-comprobante" className="mx-auto w-full max-w-[80mm] rounded-xl border border-slate-200 bg-white p-4 font-mono text-[12px] leading-5 text-tinta shadow-2xs">
        {receipt.es_simulado ? (
          <p className="mb-3 rounded-md border border-dashed border-amber-400 bg-amber-50 px-2 py-1 text-center text-[11px] font-bold tracking-wide text-amber-800 uppercase">
            Simulado · sin validez tributaria
          </p>
        ) : null}

        <div className="text-center">
          <p className="text-sm font-bold">{receipt.empresa.razon_social ?? receipt.empresa.nombre_comercial ?? "Restaurante"}</p>
          {receipt.empresa.ruc ? <p>RUC {receipt.empresa.ruc}</p> : null}
          {receipt.empresa.direccion ? <p>{receipt.empresa.direccion}</p> : null}
          <p className="mt-2 font-bold">{title}</p>
          <p className="text-sm font-bold">{receipt.numero}</p>
        </div>

        <div className="mt-3 border-t border-dashed border-slate-300 pt-2">
          <p>Fecha: {date}</p>
          <p>
            Cliente: {receipt.cliente.nombre}
            {receipt.cliente.numero ? ` · ${DOCUMENT_LABEL[receipt.cliente.tipo_documento] ?? ""} ${receipt.cliente.numero}` : ""}
          </p>
        </div>

        <table className="mt-3 w-full border-t border-dashed border-slate-300">
          <thead>
            <tr className="text-left">
              <th className="py-1 font-bold">Cant.</th>
              <th className="py-1 font-bold">Descripción</th>
              <th className="py-1 text-right font-bold">Importe</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lineas.map((line, index) => (
              <tr key={index} className="align-top">
                <td className="py-0.5 pr-2 tabular-nums">{Number(line.cantidad)}</td>
                <td className="py-0.5 pr-2">{line.descripcion}</td>
                <td className="py-0.5 text-right tabular-nums">{line.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-3 space-y-0.5 border-t border-dashed border-slate-300 pt-2 tabular-nums">
          <Total label="Op. gravada" value={receipt.op_gravada} />
          {Number(receipt.op_exonerada) > 0 ? <Total label="Op. exonerada" value={receipt.op_exonerada} /> : null}
          {Number(receipt.op_inafecta) > 0 ? <Total label="Op. inafecta" value={receipt.op_inafecta} /> : null}
          <Total label="IGV" value={receipt.igv} />
          <Total label="TOTAL S/" value={receipt.total} bold />
        </dl>

        <p className="mt-2 text-[11px] font-bold">{receipt.importe_en_letras}</p>
        {receipt.leyenda ? <p className="mt-1 text-[10px] leading-4">{receipt.leyenda}</p> : null}

        <p className="mt-3 border-t border-dashed border-slate-300 pt-2">
          Pago: {receipt.pagos.map((payment) => `${payment.metodo} ${payment.monto}`).join(" · ")}
        </p>

        {receipt.representacion_impresa ? (
          <div className="mt-3 flex flex-col items-center gap-2 border-t border-dashed border-slate-300 pt-3 text-center">
            {receipt.qr ? <QRCodeSVG value={receipt.qr} size={113} level="M" marginSize={0} aria-label="Código QR de SUNAT" /> : null}
            {receipt.hash ? <p className="break-all text-[10px]">Resumen: {receipt.hash}</p> : null}
            <p className="text-[11px]">{receipt.representacion_impresa}</p>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

/** Solo descarga si el archivo existe; si no, explica por qué (spec 037). */
function DownloadLink({ href, available, label }: { href: string; available: boolean; label: string }) {
  if (!available) {
    return (
      <Button variant="secondary" disabled title="SUNAT aún no responde por este comprobante">
        {label}
      </Button>
    );
  }

  return (
    <Button asChild variant="secondary">
      <a href={href} download>
        {label}
      </a>
    </Button>
  );
}

function Total({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-sm font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
