"use client";

import { ChevronsUpDown, Loader2, LogOut } from "lucide-react";
import { useTransition } from "react";

import { platformLogout } from "@/app/plataforma/actions";
import type { PlatformAdmin } from "@/app/plataforma/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

/** Administrador conectado, con su menú para cerrar sesión. */
export function NavUser({ admin }: { admin: PlatformAdmin }) {
  const { isMobile } = useSidebar();
  const [pending, startTransition] = useTransition();
  const initial = admin.nombre.charAt(0).toUpperCase();

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-12 rounded-xl transition-all group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-full ring-2 ring-sidebar-border/60 transition-transform hover:scale-105 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:ring-primary/40">
                <AvatarFallback className="rounded-full bg-primary/20 text-primary font-bold text-xs">{initial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{admin.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">{admin.correo}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl" side={isMobile ? "bottom" : "right"} align="end" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{admin.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{admin.correo}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Sin <form>: el menú se desmonta al elegir y cancelaría el envío antes de que salga. */}
            <DropdownMenuItem
              disabled={pending}
              onSelect={() => startTransition(() => platformLogout())}
              className="cursor-pointer"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              {pending ? "Cerrando sesión…" : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
