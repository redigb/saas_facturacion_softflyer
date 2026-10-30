"use client";

import { useRef, useState } from "react";
import { FileCheck, UploadCloud, X } from "lucide-react";

import { uploadCertificate } from "@/app/plataforma/actions";
import type { ClientDetail } from "@/app/plataforma/types";
import { formatDate } from "@/app/plataforma/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { RouteStepState } from "./fiscal-stage";
import { RouteStep } from "./route-step";
import { SecretInput } from "./secret-input";
import { FormError, useToastAction } from "@/components/backoffice/molecules/use-toast-action";

/** Días antes del vencimiento en que conviene avisar para renovar el certificado. */
const RENEWAL_WARNING_DAYS = 30;

export function CertificateStep({ slug, fiscal, state }: { slug: string; fiscal: ClientDetail["fiscal"]; state: RouteStepState }) {
  const [open, setOpen] = useState(state !== "done");
  const certificate = fiscal.certificado;

  return (
    <RouteStep
      number={1}
      state={state}
      title="Certificado digital"
      form={<CertificateForm slug={slug} onSaved={() => setOpen(false)} />}
      formOpen={open}
      onFormOpenChange={setOpen}
      toggleLabel={certificate ? "Reemplazar certificado" : "Cargar certificado"}
    >
      {certificate ? (
        <>
          <p className="break-words font-medium text-foreground">{certificate.titular ?? "Certificado sin titular legible"}</p>
          <p className={cn(!certificate.vigente && "font-semibold text-destructive")}>
            {certificate.vigente
              ? `Vence el ${formatDate(certificate.vence_en)}, en ${certificate.dias_restantes} días.`
              : `Venció el ${formatDate(certificate.vence_en)}.`}
            {certificate.vigente && certificate.dias_restantes <= RENEWAL_WARNING_DAYS ? (
              <span className="font-semibold text-foreground"> Pide al cliente que lo renueve.</span>
            ) : null}
          </p>
        </>
      ) : (
        <p>Firma los comprobantes del cliente. Lo emite una entidad certificadora o SUNAT en formato .pfx, .p12 o .pem.</p>
      )}
    </RouteStep>
  );
}

function CertificateForm({ slug, onSaved }: { slug: string; onSaved: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useToastAction(
    (prev, formData) => uploadCertificate(slug, prev, formData),
    () => {
      setSelectedFile(null);
      onSaved();
    },
  );

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Al soltar un archivo se pasa al input real para que viaje en el FormData como si se hubiera elegido.
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInputRef.current.files = transfer.files;
      setSelectedFile(file);
    }
  };

  return (
    <form action={formAction} className="space-y-4">
      <input
        ref={fileInputRef}
        id="cert-file"
        name="certificado"
        type="file"
        accept=".pem,.pfx,.p12"
        required
        className="peer sr-only"
        onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
      />
      {selectedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileCheck className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{selectedFile.name}</p>
              <p className="text-[13px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <Button type="button" variant="ghost" className="h-9 min-h-0 w-9 shrink-0 p-0" onClick={clearFile} aria-label="Quitar archivo">
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor="cert-file"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors peer-focus-visible:border-ring",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
          )}
        >
          <UploadCloud className="size-6 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">Elige el archivo o suéltalo aquí</span>
          <span className="text-[13px] text-muted-foreground">.pfx, .p12 o .pem · se guarda cifrado</span>
        </label>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cert-pass" className="text-sm font-semibold">
          Contraseña del certificado
        </Label>
        <SecretInput id="cert-pass" name="contrasena" autoComplete="off" revealLabel="contraseña" />
        <p className="text-[13px] text-muted-foreground">Solo para .pfx y .p12. Un .pem no la necesita.</p>
      </div>

      <FormError state={state} />

      <Button type="submit" isLoading={pending} className="w-full sm:w-auto">
        {pending ? "Guardando certificado…" : "Guardar certificado"}
      </Button>
    </form>
  );
}
