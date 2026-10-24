"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, LayoutDashboard, UserPlus, Users, type LucideIcon } from "lucide-react";

import type { PlatformAdmin } from "@/app/plataforma/types";
import { Logo } from "@/components/logo";
import { NavUser } from "@/components/backoffice/molecules/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavSection = { title: string; items: NavItem[] };

export const BACKOFFICE_SECTIONS: NavSection[] = [
  {
    title: "Plataforma",
    items: [
      { label: "Resumen", href: "/plataforma", icon: LayoutDashboard },
      { label: "Alertas", href: "/plataforma/alertas", icon: Bell },
    ],
  },
  {
    title: "Clientes",
    items: [
      { label: "Clientes", href: "/plataforma/clientes", icon: Users },
      { label: "Solicitudes", href: "/plataforma/solicitudes", icon: CalendarDays },
      { label: "Nuevo cliente", href: "/plataforma/clientes/nuevo", icon: UserPlus },
    ],
  },
];

export const BACKOFFICE_NAV = BACKOFFICE_SECTIONS.flatMap((section) => section.items);

export function activeHref(pathname: string): string | undefined {
  return BACKOFFICE_NAV.map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function currentSection(pathname: string): { group: string; label: string } | undefined {
  const href = activeHref(pathname);

  for (const group of BACKOFFICE_SECTIONS) {
    const item = group.items.find((candidate) => candidate.href === href);

    if (item) {
      return { group: group.title, label: item.label };
    }
  }

  return undefined;
}

export function AppSidebar({ admin, alertCount }: { admin: PlatformAdmin; alertCount: number }) {
  const active = activeHref(usePathname());
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/plataforma" onClick={() => setOpenMobile(false)}>
                <span className="flex h-9 w-full items-center overflow-hidden rounded-lg bg-white px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-1">
                  <Logo className="h-7 w-auto max-w-none object-contain object-left" />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {BACKOFFICE_SECTIONS.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={item.href === active} tooltip={item.label}>
                    <Link href={item.href} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.href === "/plataforma/alertas" && alertCount > 0 ? (
                    <SidebarMenuBadge>{alertCount}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <span className="mx-2 w-fit rounded-full bg-warning px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase group-data-[collapsible=icon]:hidden">
          Backoffice
        </span>
        <NavUser admin={admin} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
