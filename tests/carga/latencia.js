// Mide la latencia "guardar plano -> aviso recibido" con N clientes reales (spec 005).
// Uso (servidores locales levantados, Reverb incluido):
//   REVERB_KEY=<NEXT_PUBLIC_REVERB_KEY> node tests/carga/latencia.js front-next <token> <sucursal> <salon> <clientes>
// Guarda 5 veces el plano del salon y mide cuanto tarda el aviso en llegar a cada cliente.
// Usa un salon de prueba: el plano se guarda vacio.
const [, , front, token, branch, room, count] = process.argv;
const Pusher = require(require.resolve("pusher-js", { paths: [front] }));

const W = "http://donjose.localhost:3000";
const API = "http://127.0.0.1:8000/api/v1";
const KEY = process.env.REVERB_KEY;
const N = Number(count);

function client() {
  return new Promise((resolve, reject) => {
    const pusher = new Pusher(KEY, {
      wsHost: "127.0.0.1",
      wsPort: 8080,
      forceTLS: false,
      enabledTransports: ["ws"],
      cluster: "",
      channelAuthorization: {
        customHandler: ({ socketId, channelName }, callback) => {
          // Igual que el navegador: por el proxy de Next, con la cookie httpOnly.
          fetch(`${W}/api/broadcasting/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: `sf_sesion=${token}`, Origin: W },
            body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
          })
            .then(async (r) => (r.ok ? callback(null, await r.json()) : callback(new Error(`auth ${r.status}`), null)))
            .catch((e) => callback(e, null));
        },
      },
    });
    const channel = pusher.subscribe(`private-sucursal.${branch}.salon`);
    channel.bind("pusher:subscription_succeeded", () => resolve({ pusher, channel }));
    channel.bind("pusher:subscription_error", (e) => reject(new Error(`suscripción: ${JSON.stringify(e)}`)));
  });
}

(async () => {
  const t0 = Date.now();
  const clients = await Promise.all(Array.from({ length: N }, client));
  console.log(`${N} clientes conectados y autorizados en ${Date.now() - t0} ms`);

  const results = [];
  for (let round = 0; round < 5; round++) {
    const plan = await (await fetch(`${API}/salones/${room}/plano`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "X-Forwarded-Host": "donjose.localhost:3000" } })).json();
    const received = Promise.all(clients.map(({ channel }) => new Promise((resolve) => {
      const handler = () => { channel.unbind("PlanoActualizado", handler); resolve(Date.now()); };
      channel.bind("PlanoActualizado", handler);
    })));
    const sent = Date.now();
    const response = await fetch(`${API}/salones/${room}/plano`, {
      method: "PUT",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Forwarded-Host": "donjose.localhost:3000" },
      body: JSON.stringify({ version: plan.data.salon.version, mesas: [], elementos: [] }),
    });
    const answered = Date.now();
    const times = (await received).map((t) => t - sent).sort((a, b) => a - b);
    results.push(...times);
    console.log(`ronda ${round + 1}: HTTP ${response.status} en ${answered - sent} ms · aviso a ${N} clientes: mín ${times[0]} ms, p95 ${times[Math.floor(N * 0.95) - 1] ?? times.at(-1)} ms, máx ${times.at(-1)} ms`);
  }
  results.sort((a, b) => a - b);
  console.log(`TOTAL ${results.length} avisos: p50 ${results[Math.floor(results.length / 2)]} ms · p95 ${results[Math.floor(results.length * 0.95)]} ms · máx ${results.at(-1)} ms`);
  clients.forEach(({ pusher }) => pusher.disconnect());
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
