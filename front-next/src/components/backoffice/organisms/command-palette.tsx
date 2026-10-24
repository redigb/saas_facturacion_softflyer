"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BACKOFFICE_NAV } from "@/components/backoffice/organisms/app-sidebar";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type ClientShortcut = { slug: string; nombre: string; ruc: string | null };

/** Búsqueda rápida (⌘K / Ctrl+K): salta a una sección o a la ficha de un cliente por nombre, subdominio o RUC. */
export function CommandPalette({
  clients,
  trigger = true,
}: {
  clients: ClientShortcut[];
  trigger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {trigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-full max-w-72 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition hover:bg-muted"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-semibold sm:inline">⌘ K</kbd>
        </button>
      ) : null}

      <CommandDialog open={open} onOpenChange={setOpen} title="Buscar" description="Salta a una sección o a un cliente.">
        <Command>
          <CommandInput placeholder="Buscar sección o cliente…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup heading="Ir a">
              {BACKOFFICE_NAV.map((item) => (
                <CommandItem key={item.href} value={`ir ${item.label}`} onSelect={() => go(item.href)}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {clients.length > 0 ? (
              <CommandGroup heading="Clientes">
                {clients.map((client) => (
                  <CommandItem key={client.slug} value={`${client.nombre} ${client.slug} ${client.ruc ?? ""}`} onSelect={() => go(`/plataforma/clientes/${client.slug}`)}>
                    <span className="truncate font-medium">{client.nombre}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">{client.ruc ?? client.slug}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
