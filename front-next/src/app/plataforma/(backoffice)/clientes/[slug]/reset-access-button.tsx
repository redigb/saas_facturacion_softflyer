"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, MailCheck } from "lucide-react";

import { sendPasswordReset, type FormState } from "@/app/plataforma/actions";
import { formatDateTime } from "@/app/plataforma/ui";
import { ErrorNotice } from "@/components/backoffice/molecules/notice";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type User = { id: number; nombre: string; correo: string };

/**
 * Soporte de acceso (spec 035): el usuario recibe un enlace de un solo uso y crea su
 * propia contraseña. El equipo nunca la conoce; el enlace se puede copiar para WhatsApp.
 */
export function ResetAccessButton({ slug, user }: { slug: string; user: User }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(async () => {
    const res = await sendPasswordReset(slug, user.id);
    if (res.ok) {
      toast.success(res.mensaje || "Enlace de restablecimiento generado con éxito.");
    } else if (res.mensaje) {
      toast.error(res.mensaje);
    }
    return res;
  }, {} as FormState);
  const sent = state.ok ? (state.resultado as { correo: string; enlace: string; expira_en: string }) : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Enlace de acceso copiado al portapapeles.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); setCopied(false); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 font-semibold">
          <KeyRound className="size-3.5" />
          <span>Restablecer acceso</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailCheck className="size-5 text-success" />
                Enlace enviado
              </DialogTitle>
              <DialogDescription>
                Enviamos el enlace a <strong className="text-foreground">{sent.correo}</strong>. Sirve una sola vez y vence el{" "}
                {formatDateTime(sent.expira_en)}. Si no le llega el correo, cópialo y envíaselo por WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <p className="rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs break-all text-foreground">{sent.enlace}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => copy(sent.enlace)} className="gap-2">
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                {copied ? "Copiado" : "Copiar enlace"}
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={action} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Restablecer el acceso de {user.nombre}</DialogTitle>
              <DialogDescription>
                Le enviaremos a <strong className="text-foreground">{user.correo}</strong> un enlace para que cree una contraseña nueva.
                Su contraseña actual sigue funcionando hasta que use el enlace; al usarlo se cierran sus sesiones abiertas.
              </DialogDescription>
            </DialogHeader>
            {state.mensaje && <ErrorNotice title="No se pudo enviar el enlace" message={state.mensaje} />}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" isLoading={pending}>Enviar enlace</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
