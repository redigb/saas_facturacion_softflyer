"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

import type { PlatformAdmin } from "@/app/plataforma/types";
import { Logo, LogoIcon } from "@/components/logo";
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
    ],
  },
];

export const BACKOFFICE_NAV = BACKOFFICE_SECTIONS.flatMap((section) => section.items);

export function activeHref(pathname: string): string | undefined {
  return BACKOFFICE_NAV.map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function currentSection(pathname: string): { group: string; label: string; href: string } | undefined {
  const href = activeHref(pathname);

  for (const group of BACKOFFICE_SECTIONS) {
    const item = group.items.find((candidate) => candidate.href === href);

    if (item) {
      return { group: group.title, label: item.label, href: item.href };
    }
  }

  return undefined;
}

export function AppSidebar({ admin, alertCount }: { admin: PlatformAdmin; alertCount: number }) {
  const active = activeHref(usePathname());
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="p-3 pt-5 pb-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pt-5 group-data-[collapsible=icon]:pb-6">
        <SidebarMenu>
          <SidebarMenuItem className="flex justify-center group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-12 hover:bg-transparent group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
            >
              <Link href="/plataforma" onClick={() => setOpenMobile(false)} className="flex items-center justify-center">
                {/* Expandido: logo oficial Softflyer centrado y sin fondo blanco invasivo */}
                <span className="flex h-12 w-full items-center justify-center px-2 transition group-data-[collapsible=icon]:hidden">
                  <Logo className="h-10 w-auto object-contain" priority />
                </span>
                {/* Colapsado (Pill): isotipo oficial Softflyer centrado con respiro inferior generoso */}
                <span className="hidden size-11 items-center justify-center transition-transform hover:scale-105 active:scale-95 group-data-[collapsible=icon]:flex">
                  <LogoIcon className="size-9.5" priority />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:pt-2 group-data-[collapsible=icon]:items-center">
        {BACKOFFICE_SECTIONS.map((section, idx) => (
          <SidebarGroup
            key={section.title}
            className="p-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center"
          >
            {idx > 0 ? (
              <div className="hidden group-data-[collapsible=icon]:block my-4 h-px w-6 bg-sidebar-border/80" />
            ) : null}
            <SidebarGroupLabel className="px-2 pt-2.5 pb-1 text-[11px] font-bold tracking-wider text-muted-foreground/80 uppercase group-data-[collapsible=icon]:hidden">
              {section.title}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-4">
              {section.items.map((item) => {
                const isItemActive = item.href === active;
                return (
                  <SidebarMenuItem key={item.href} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <SidebarMenuButton
                      asChild
                      isActive={isItemActive}
                      tooltip={item.label}
                      className="h-11 rounded-xl px-3.5 font-medium transition-all hover:bg-[#0c5ea7]/10 hover:text-[#0c5ea7] dark:hover:bg-[#0c5ea7]/20 dark:hover:text-white group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-[#0c5ea7]! data-[active=true]:text-white! data-[active=true]:font-bold data-[active=true]:shadow-md data-[active=true]:shadow-[#0c5ea7]/30 hover:data-[active=true]:bg-[#083f71]! group-data-[collapsible=icon]:data-[active=true]:rounded-full"
                    >
                      <Link href={item.href} onClick={() => setOpenMobile(false)}>
                        <item.icon className="size-6 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/plataforma/alertas" && alertCount > 0 ? (
                      <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">
                        {alertCount}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-2.5 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
        <span className="mx-2 mb-2 w-fit rounded-full bg-warning px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-black uppercase shadow-2xs group-data-[collapsible=icon]:hidden">
          Backoffice
        </span>
        <NavUser admin={admin} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
