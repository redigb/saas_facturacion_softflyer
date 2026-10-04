/** Enlace al equipo de ventas para pasar de la prueba gratis a un plan de pago. */
export function SalesButton({
  tenant,
  email,
  className = "",
  label = "Hablar con ventas",
  compact = false,
}: {
  tenant: string;
  email: string | null;
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  if (!email) {
    return null;
  }

  const subject = encodeURIComponent(`Quiero activar mi plan - ${tenant}`);

  return (
    <a
      href={`mailto:${email}?subject=${subject}`}
      className={`inline-flex items-center justify-center font-bold shadow-sm transition ${
        compact
          ? "rounded-lg bg-amarillo px-3 py-1 text-xs text-tinta hover:brightness-95"
          : "rounded-xl bg-azul px-5 py-3.5 text-white hover:bg-azul-oscuro"
      } ${className}`}
    >
      {label}
    </a>
  );
}
