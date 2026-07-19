type HelloResponse = {
  data: {
    message: string;
    service: string;
  };
};

async function getBackendStatus() {
  const apiUrl = process.env.API_URL ?? "http://127.0.0.1:8000";

  try {
    const response = await fetch(`${apiUrl}/api/v1/hello`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as HelloResponse;

    return { connected: true, message: payload.data.message };
  } catch {
    return {
      connected: false,
      message: "No se pudo conectar con Laravel en el puerto 8000.",
    };
  }
}

export default async function Home() {
  const backend = await getBackendStatus();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl sm:p-12">
        <p className="mb-3 font-mono text-sm uppercase tracking-[0.25em] text-sky-400">
          Softflyer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Base del proyecto lista
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-400">
          Next.js está leyendo la primera ruta de la API REST en Laravel 12.
        </p>

        <div className="mt-10 flex items-start gap-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
          <span
            className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
              backend.connected ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
          <div>
            <p className="font-medium">
              {backend.connected ? "Backend conectado" : "Backend desconectado"}
            </p>
            <p className="mt-1 text-slate-400">{backend.message}</p>
            <code className="mt-3 block text-sm text-sky-300">
              GET /api/v1/hello
            </code>
          </div>
        </div>
      </section>
    </main>
  );
}
