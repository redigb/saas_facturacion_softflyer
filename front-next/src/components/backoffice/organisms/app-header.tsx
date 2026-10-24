"use client";

import { usePathname } from "next/navigation";

import { AlertsBell } from "@/components/backoffice/molecules/alerts-bell";
import { ThemeToggle } from "@/components/backoffice/molecules/theme-toggle";
import { currentSection } from "@/components/backoffice/organisms/app-sidebar";
import { CommandPalette, type ClientShortcut } from "@/components/backoffice/organisms/command-palette";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader({ alertCount, clients }: { alertCount: number; clients: ClientShortcut[] }) {
  const section = currentSection(usePathname());

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-background px-4 sm:px-6 transition-colors">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" />
        <Separator orientation="vertical" className="h-4 bg-border/60" />
        <Breadcrumb>
          <BreadcrumbList className="text-xs sm:text-sm font-medium text-muted-foreground">
            <BreadcrumbItem className="hidden sm:inline-flex">
              <span className="text-muted-foreground/70">{section?.group ?? "Plataforma"}</span>
            </BreadcrumbItem>
            {section ? (
              <>
                <BreadcrumbSeparator className="hidden sm:inline-flex text-muted-foreground/40 text-xs font-normal">
                  /
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">{section.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem className="sm:hidden">
                <BreadcrumbPage className="font-semibold text-foreground">Plataforma</BreadcrumbPage>
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
