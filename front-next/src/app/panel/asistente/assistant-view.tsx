import { AssistantChat } from "@/app/panel/asistente/assistant-chat";

/** Vista completa del asistente (accesible por URL; el acceso principal es el globo flotante). */
export function AssistantView() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <p className="text-xs font-bold tracking-widest text-azul uppercase">Asistente</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Pregúntale a tus datos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ventas, comparaciones, platos más vendidos y stock bajo. También puedes abrirlo desde el globo flotante en cualquier pantalla del panel.
        </p>
      </div>

      <AssistantChat />
    </div>
  );
}
