"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { errorMessage } from "@/app/panel/carta/queries";
import { applyApiErrors, Drawer, Field } from "@/app/panel/carta/ui";
import { useSaveMember, useSetPin } from "@/app/panel/equipo/queries";
import type { TeamPermissions } from "@/app/panel/equipo/team-view";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Button, Input } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import { generatePassword, memberFormSchema, type Member, type MemberFormValues, type Role } from "@/lib/schemas/equipo";

type Props = {
  open: boolean;
  member?: Member;
  roles: Role[];
  can: TeamPermissions;
  onClose: () => void;
};

type Access = { correo: string; contrasena?: string; pin?: string };

const FIELDS = ["nombre", "correo", "contrasena", "rol_id", "pin"] as const;

export function MemberDrawer({ open, member, roles, can, onClose }: Props) {
  const toast = useToast();
  const save = useSaveMember();
  const isNew = member === undefined;
  const [showPassword, setShowPassword] = useState(isNew);
  const [access, setAccess] = useState<Access | null>(null);

  // La contraseña es obligatoria al crear; al editar, vacía significa "no cambiarla".
  const schema = useMemo(
    () =>
      memberFormSchema.superRefine((values, context) => {
        if ((isNew || values.contrasena) && values.contrasena.length < 10) {
          context.addIssue({ code: "custom", path: ["contrasena"], message: "La contraseña debe tener al menos 10 caracteres." });
        }
      }),
    [isNew],
  );

  const { register, control, handleSubmit, formState, setError, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: member?.nombre ?? "",
      correo: member?.correo ?? "",
      contrasena: isNew ? generatePassword() : "",
      rol_id: String(member?.roles[0]?.id ?? roles.find((role) => role.nombre === "Mozo")?.id ?? ""),
      pin: "",
    } satisfies MemberFormValues,
  });
  const selectedRole = useWatch({ control, name: "rol_id" });
  const errors = formState.errors;

  async function submit(values: MemberFormValues) {
    const roleChanged = !isNew && String(member.roles[0]?.id ?? "") !== values.rol_id;
    const body: Record<string, unknown> = { nombre: values.nombre.trim(), correo: values.correo.trim() };
    if (isNew || values.contrasena) body.contrasena = values.contrasena;
    if (isNew || (roleChanged && can.assignRole)) body.rol_ids = [Number(values.rol_id)];
    if (isNew && values.pin) body.pin = values.pin;

    try {
      await save.mutateAsync({ id: member?.id, body });
      if (isNew || values.contrasena) {
        // Única vez que se muestran los datos de acceso: para pasárselos a la persona.
        setAccess({ correo: values.correo.trim(), contrasena: values.contrasena, pin: values.pin || undefined });
      } else {
        toast({ tone: "ok", message: "Cambios guardados." });
        onClose();
      }
    } catch (error) {
      if (!applyApiErrors(error, setError, [...FIELDS, "rol_ids"])) {
        toast({ tone: "error", message: errorMessage(error) });
      } else if (error instanceof ApiRequestError && error.detalles?.rol_ids) {
        setError("rol_id", { message: error.detalles.rol_ids[0] });
      }
    }
  }

  if (access) {
    return (
      <Drawer title="Datos de acceso" open={open} onClose={onClose} footer={<Button onClick={onClose}>Listo</Button>}>
        <AccessSummary name={member?.nombre ?? ""} access={access} />
      </Drawer>
    );
  }

  return (
    <Drawer
      title={isNew ? "Agregar persona" : `Editar a ${member.nombre.split(" ")[0]}`}
      open={open}
      onClose={onClose}
      footer={
        <Button type="submit" form="miembro-form" isLoading={formState.isSubmitting}>
          {formState.isSubmitting ? "Guardando…" : isNew ? "Agregar" : "Guardar"}
        </Button>
      }
    >
      <form id="miembro-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <Field label="Nombre" error={errors.nombre?.message}>
          {(id, describedBy) => <Input id={id} {...register("nombre")} placeholder="Ej. Rosa Quispe" autoComplete="off" hasError={!!errors.nombre} aria-describedby={describedBy} />}
        </Field>

        <Field label="Correo" error={errors.correo?.message} hint="Con este correo entra desde cualquier dispositivo.">
          {(id, describedBy) => (
            <Input id={id} type="email" inputMode="email" {...register("correo")} autoComplete="off" hasError={!!errors.correo} aria-describedby={describedBy} />
          )}
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-tinta">Rol</legend>
          {!isNew && !can.assignRole ? (
            <p className="text-sm text-slate-600">{member.roles.map((role) => role.nombre).join(", ")} (no tienes permiso para cambiar roles)</p>
          ) : (
            <div className="grid gap-2">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
                    selectedRole === String(role.id) ? "border-azul bg-azul/5 ring-2 ring-azul/15" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input type="radio" value={role.id} {...register("rol_id")} className="mt-1 h-4 w-4 accent-azul" />
                  <span>
                    <span className="block text-sm font-bold text-tinta">{role.nombre}</span>
                    {role.descripcion && <span className="block text-xs text-slate-500">{role.descripcion}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors.rol_id && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.rol_id.message}</p>}
        </fieldset>

        <Field
          label={isNew ? "Contraseña" : "Nueva contraseña"}
          error={errors.contrasena?.message}
          hint={isNew ? "Mínimo 10 caracteres. Se la pasarás a la persona." : "Déjala vacía para no cambiarla. Si la cambias, se cierran sus sesiones."}
        >
          {(id, describedBy) => (
            <div className="flex gap-2">
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                {...register("contrasena")}
                autoComplete="new-password"
                hasError={!!errors.contrasena}
                aria-describedby={describedBy}
                className="font-mono"
              />
              <Button variant="icon" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                <Icon name={showPassword ? "cerrar" : "buscar"} className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setValue("contrasena", generatePassword(), { shouldValidate: true });
                  setShowPassword(true);
                }}
              >
                Generar
              </Button>
            </div>
          )}
        </Field>

        {isNew ? (
          <Field label="PIN (opcional)" error={errors.pin?.message} hint="4 a 6 dígitos para cambiar de usuario rápido en la tablet compartida.">
            {(id, describedBy) => (
              <Input id={id} {...register("pin")} inputMode="numeric" maxLength={6} autoComplete="off" hasError={!!errors.pin} aria-describedby={describedBy} className="tabular-nums tracking-[0.4em]" />
            )}
          </Field>
        ) : (
          <PinSection member={member} />
        )}
      </form>
    </Drawer>
  );
}

function PinSection({ member }: { member: Member }) {
  const toast = useToast();
  const setPin = useSetPin();
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function apply(value: string | null) {
    if (value !== null && !/^\d{4,6}$/.test(value)) {
      setError("El PIN tiene de 4 a 6 dígitos.");
      return;
    }
    try {
      await setPin.mutateAsync({ id: member.id, pin: value });
      setPinValue("");
      setError(null);
      toast({ tone: "ok", message: value === null ? "PIN quitado." : `PIN guardado. Pásaselo a ${member.nombre.split(" ")[0]}.` });
    } catch (caught) {
      setError(caught instanceof ApiRequestError && caught.detalles?.pin ? caught.detalles.pin[0] : errorMessage(caught));
    }
  }

  return (
    <div className="rounded-2xl bg-niebla p-4">
      <p className="text-sm font-bold text-tinta">PIN {member.tiene_pin ? "· asignado" : "· sin asignar"}</p>
      <p className="mt-0.5 text-xs text-slate-500">Para cambiar de usuario rápido en la tablet compartida.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={pin}
          onChange={(event) => {
            setPinValue(event.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          inputMode="numeric"
          maxLength={6}
          placeholder={member.tiene_pin ? "Nuevo PIN" : "4 a 6 dígitos"}
          aria-label="Nuevo PIN"
          hasError={!!error}
          className="max-w-40 tabular-nums tracking-[0.4em]"
        />
        <Button variant="secondary" onClick={() => void apply(pin)} isLoading={setPin.isPending}>
          {member.tiene_pin ? "Cambiar" : "Asignar"}
        </Button>
        {member.tiene_pin && (
          <Button variant="ghost" onClick={() => void apply(null)} className="text-red-600">
            Quitar PIN
          </Button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function AccessSummary({ name, access }: { name: string; access: Access }) {
  const toast = useToast();
  const text = [`Correo: ${access.correo}`, access.contrasena && `Contraseña: ${access.contrasena}`, access.pin && `PIN: ${access.pin}`]
    .filter(Boolean)
    .join("\n");

  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Icon name="check" className="h-6 w-6" />
      </span>
      <p className="mt-4 text-base font-bold text-tinta">{name ? `Listo, ${name.split(" ")[0]} ya tiene acceso.` : "Listo, ya tiene acceso."}</p>
      <p className="mt-1 text-sm text-slate-600">Pásale estos datos. Es la única vez que se muestran.</p>
      <dl className="mt-4 space-y-2 rounded-2xl bg-niebla p-4 font-mono text-sm">
        <div className="flex justify-between gap-4"><dt className="text-slate-500">Correo</dt><dd className="truncate font-bold text-tinta">{access.correo}</dd></div>
        {access.contrasena && <div className="flex justify-between gap-4"><dt className="text-slate-500">Contraseña</dt><dd className="font-bold text-tinta">{access.contrasena}</dd></div>}
        {access.pin && <div className="flex justify-between gap-4"><dt className="text-slate-500">PIN</dt><dd className="font-bold text-tinta tabular-nums">{access.pin}</dd></div>}
      </dl>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        onClick={() =>
          void navigator.clipboard
            .writeText(text)
            .then(() => toast({ tone: "ok", message: "Copiado." }))
            .catch(() => toast({ tone: "error", message: "No se pudo copiar. Anótalos a mano." }))
        }
      >
        Copiar datos
      </Button>
    </div>
  );
}
