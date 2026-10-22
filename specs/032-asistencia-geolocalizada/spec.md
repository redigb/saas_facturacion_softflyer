# Spec 032 — Asistencia geolocalizada

**Estado:** Cerrada  
**Backend:** ✅  
**Frontend:** ✅

## Objetivo

Permitir que Cocina, Barra, Mozos y demás personal registren entrada y salida desde su celular únicamente cuando el GPS los ubica dentro de la geocerca configurada para la sucursal. Toda marcación usa la hora del servidor y queda aislada por inquilino mediante RLS.

## Criterios de aceptación

- [x] El administrador configura centro y radio de la geocerca por sucursal sobre OpenStreetMap.
- [x] El administrador asigna por trabajador una sucursal, días, hora de entrada/salida y tolerancia.
- [x] El trabajador ve su jornada y marca entrada/salida desde una pantalla táctil móvil.
- [x] La API rechaza ubicaciones fuera del radio, con precisión mayor de 100 m o sucursales no autorizadas.
- [x] La puntualidad se decide en el servidor con zona horaria `America/Lima`; el teléfono no envía la hora.
- [x] Administradores consultan las marcaciones del día y las tardanzas.
- [x] Backend, frontend y PostgreSQL quedan verificados.

## Decisiones

- La geocerca inicial es circular: centro + radio configurable de 20 a 500 metros. Es más comprensible y estable que un polígono dibujado en un teléfono.
- GPS se solicita solo al pulsar «Marcar»; no existe rastreo continuo.
- OpenStreetMap es la base visual. La autorización se calcula en Laravel con distancia geodésica.
- Esta spec detecta asistencia y tardanza. Horas extra, sueldo, descansos compensatorios y correcciones administrativas quedan fuera de alcance.

## Fuente técnica

Doc. 06 §§5–6 (permisos y sucursales), Doc. 07 §3 (contrato HTTP) y Doc. 08 §8.5 (asistencia).

