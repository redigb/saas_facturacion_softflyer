# Spec 014 — Inventario integral

Estado: **Cerrada**

## Objetivo

Controlar alimentos, bebidas, limpieza, empaques, utensilios, equipos y otros objetos por almacén de sucursal, con acceso operativo limitado a las estaciones KDS asignadas.

## Criterios de aceptación

- El administrador ve y administra todos los almacenes, artículos, conteos y movimientos.
- Cocina y Barra solo ven y operan el almacén asociado a sus estaciones KDS.
- Cajero, mozo y salón no reciben acceso por defecto.
- Un artículo puede ser consumible o reutilizable; los reutilizables registran disponibles, dañados y perdidos.
- Entradas, salidas, mermas y conteos generan kardex inmutable con usuario, fecha del servidor, motivo, saldo anterior y saldo resultante.
- El saldo nunca se sobrescribe sin generar un movimiento compensatorio.
- La pantalla funciona en celular y escritorio y señala stock bajo.
- Las tablas nuevas están aisladas por RLS.

## Referencias

- Doc. 02 §5.2: existencias derivadas del kardex.
- Doc. 07 §4: kardex paginado por cursor.
- Doc. 08 §6: almacenes, existencias y movimientos inmutables.
- Doc. 09 §2 H4: stock, mínimos y mermas.

## Estado por lado

- Backend: ✅ listo
- Frontend: ✅ listo

## Fuera de alcance

- Compras a proveedores y costo promedio.
- Descuento automático por venta/receta; se abordará al enlazar recetas técnicas con insumos reales.
- Traslados entre almacenes.
