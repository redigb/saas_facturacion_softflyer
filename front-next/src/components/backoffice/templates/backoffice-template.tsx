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
      <AppSidebar admin={admin} alertCount={alertCount} />
      <SidebarInset>
        <AppHeader alertCount={alertCount} clients={clients} />
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
