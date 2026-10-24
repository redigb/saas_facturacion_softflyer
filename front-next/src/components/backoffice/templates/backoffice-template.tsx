import type { PlatformAdmin } from "@/app/plataforma/types";
import { backofficeFont } from "@/components/backoffice/font";
import { AppHeader } from "@/components/backoffice/organisms/app-header";
import { AppSidebar } from "@/components/backoffice/organisms/app-sidebar";
import type { ClientShortcut } from "@/components/backoffice/organisms/command-palette";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ThemeScope } from "@/components/theme-scope";

/** Esqueleto del backoffice: tema Discord, menú lateral shadcn y cabecera con búsqueda. */
export function BackofficeTemplate({
  admin,
  alertCount,
  clients,
  children,
}: {
  admin: PlatformAdmin;
  alertCount: number;
  clients: ClientShortcut[];
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ThemeScope theme="backoffice" fontClass={backofficeFont.variable} />
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <AppSidebar admin={admin} alertCount={alertCount} />
      <SidebarInset>
        <AppHeader alertCount={alertCount} clients={clients} />
        <main id="contenido" tabIndex={-1} className="w-full flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
