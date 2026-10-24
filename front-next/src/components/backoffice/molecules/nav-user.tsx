"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";

import { platformLogout } from "@/app/plataforma/actions";
import type { PlatformAdmin } from "@/app/plataforma/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

/** Administrador conectado, con su menú para cerrar sesión. */
export function NavUser({ admin }: { admin: PlatformAdmin }) {
  const { isMobile } = useSidebar();
  const initial = admin.nombre.charAt(0).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg font-bold">{initial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{admin.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">{admin.correo}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-semibold">{admin.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{admin.correo}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={platformLogout}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer">
                  <LogOut className="size-4" />
                  Cerrar sesión
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
