"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AlertsBell } from "@/components/backoffice/molecules/alerts-bell";
import { ThemeToggle } from "@/components/backoffice/molecules/theme-toggle";
import { currentSection } from "@/components/backoffice/organisms/app-sidebar";
import { CommandPalette, type ClientShortcut } from "@/components/backoffice/organisms/command-palette";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader({ alertCount, clients }: { alertCount: number; clients: ClientShortcut[] }) {
  const pathname = usePathname();
  const section = currentSection(pathname);
  const detail = section ? detailLabel(pathname, section.href, clients) : undefined;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-background px-4 sm:px-6 transition-colors">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" />
        <Separator orientation="vertical" className="h-4 bg-border/60" />
        <Breadcrumb>
          <BreadcrumbList className="text-xs sm:text-sm font-medium text-muted-foreground">
            {/* El grupo solo se muestra si aporta: "Clientes / Clientes" no dice nada. */}
            {section && section.group !== section.label ? (
              <>
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <span className="text-muted-foreground/70">{section.group}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:inline-flex text-muted-foreground/40 text-xs font-normal">/</BreadcrumbSeparator>
              </>
            ) : null}
            {!section ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground">Plataforma</BreadcrumbPage>
              </BreadcrumbItem>
            ) : detail ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={section.href}>{section.label}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-muted-foreground/40 text-xs font-normal">/</BreadcrumbSeparator>
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-semibold text-foreground">{detail}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground">{section.label}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <AlertsBell count={alertCount} />
      </div>

      {/* Atajo ⌘K / Ctrl+K sin barra invasiva en el header */}
      <CommandPalette clients={clients} trigger={false} />
    </header>
  );
}

/** Nombre de la página que cuelga de una sección (p. ej. la ficha de un cliente); la sección pasa a ser enlace. */
function detailLabel(pathname: string, sectionHref: string, clients: ClientShortcut[]): string | undefined {
  if (pathname === sectionHref || !pathname.startsWith(`${sectionHref}/`)) {
    return undefined;
  }
  const slug = decodeURIComponent(pathname.slice(sectionHref.length + 1).split("/")[0]);

  return clients.find((client) => client.slug === slug)?.nombre ?? slug;
}
