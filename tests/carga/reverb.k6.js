// Prueba de carga de Reverb (Doc. 09 §5.2, spec 005). Se corre contra STAGING, no en local.
//
//   k6 run -e WS=wss://ws.staging.softflyer.pe -e KEY=... -e CONEXIONES=5000 tests/carga/reverb.k6.js
//
// Mide lo que el Doc. 09 exige antes de abrir a clientes:
//   - conexiones sostenidas sin rechazos (umbral: 0 errores de conexión);
//   - que cada conexión complete el saludo del protocolo Pusher en menos de 1 s (p95).
// Usa un canal público de prueba ("carga") para no depender del login; la latencia de punta
// a punta con canales privados y la tormenta de reconexión se miden con el script de
// latencia (ver specs/005-tiempo-real/frontend.md) contra el mismo servidor.

import { check } from "k6";
import { Counter, Trend } from "k6/metrics";
import ws from "k6/ws";

const WS = __ENV.WS || "ws://127.0.0.1:8080";
const KEY = __ENV.KEY;
const CONNECTIONS = Number(__ENV.CONEXIONES || 500);
const HOLD_SECONDS = Number(__ENV.SEGUNDOS || 1800); // 30 min sostenidas

const handshake = new Trend("reverb_saludo_ms", true);
const failures = new Counter("reverb_conexiones_fallidas");

export const options = {
  scenarios: {
    conexiones: {
      executor: "ramping-vus",
      startVUs: 0,
      // Subida gradual: 10 % por minuto, como una apertura de locales a la hora del almuerzo.
      stages: [
        { duration: "10m", target: CONNECTIONS },
        { duration: `${HOLD_SECONDS}s`, target: CONNECTIONS },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    reverb_conexiones_fallidas: ["count==0"],
    reverb_saludo_ms: ["p(95)<1000"],
  },
};

export default function () {
  if (!KEY) throw new Error("Falta -e KEY=<REVERB_APP_KEY>");

  const started = Date.now();
  const response = ws.connect(`${WS}/app/${KEY}?protocol=7&client=k6&version=8.0`, null, (socket) => {
    socket.on("message", (raw) => {
      const message = JSON.parse(raw);
      if (message.event === "pusher:connection_established") {
        handshake.add(Date.now() - started);
        socket.send(JSON.stringify({ event: "pusher:subscribe", data: { channel: "carga" } }));
      }
      if (message.event === "pusher:ping") {
        socket.send(JSON.stringify({ event: "pusher:pong", data: {} }));
      }
    });
    socket.on("error", () => failures.add(1));
    // Cada usuario virtual mantiene su conexión abierta como un dispositivo del salón.
    socket.setTimeout(() => socket.close(), (HOLD_SECONDS + 600) * 1000);
  });

  check(response, { "conexión aceptada (101)": (r) => r && r.status === 101 }) || failures.add(1);
}
