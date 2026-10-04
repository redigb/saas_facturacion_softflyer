import Image from "next/image";

import { Logo } from "@/components/logo";
import restaurante from "../../public/login-restaurante.jpg";

const FEATURES = [
  "Mesas, pedidos y comandas en tiempo real",
  "Boletas y facturas electrónicas SUNAT",
  "Caja e inventario siempre cuadrados",
];

/** Diseño compartido de las pantallas de acceso: marca a la izquierda, formulario a la derecha. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative isolate hidden overflow-hidden bg-linear-to-br from-azul-oscuro via-azul to-celeste p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* La foto toma solo su luminosidad: el color lo pone el degradado de la marca. */}
        <Image
          src={restaurante}
          alt=""
          fill
          priority
          sizes="55vw"
          placeholder="blur"
          className="-z-10 object-cover opacity-35 mix-blend-luminosity"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-t from-azul-oscuro/80 via-azul-oscuro/20 to-transparent"
        />

        <div className="relative">
          <span className="inline-flex rounded-2xl bg-white/95 px-6 py-4 shadow-lg shadow-azul-oscuro/30">
            <Logo className="h-16 w-auto" priority />
          </span>
        </div>

        <div className="relative max-w-md">
          <span className="mb-6 block h-1.5 w-16 rounded-full bg-amarillo" />
          <h2 className="text-4xl leading-tight font-bold drop-shadow-sm">
            Vende, controla y factura sin detener tu restaurante.
          </h2>
          <ul className="mt-10 space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-base font-medium text-white/95">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amarillo text-xs font-bold text-tinta">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/75">
          © {new Date().getFullYear()} Softflyer · Hecho para negocios peruanos
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo className="h-14 w-auto" priority />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
