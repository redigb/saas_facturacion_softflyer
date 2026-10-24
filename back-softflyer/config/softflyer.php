<?php

return [

    // Dominio bajo el cual cada inquilino tiene su subdominio: {slug}.{dominio_central}
    'dominio_central' => env('SOFTFLYER_DOMINIO_CENTRAL', 'localhost'),

    // Frontend Next.js: base de los enlaces que viajan por correo.
    'frontend_url' => env('SOFTFLYER_FRONTEND_URL', 'http://localhost:3000'),

    // Prueba gratis: duracion y enlace de verificacion del correo.
    'prueba' => [
        'dias' => (int) env('SOFTFLYER_PRUEBA_DIAS', 7),
        'verificacion_horas' => 24,
    ],

    'ventas' => [
        'correo' => env('SOFTFLYER_VENTAS_CORREO'),
    ],

    // Subdominios que nunca puede tomar un cliente.
    'subdominios_reservados' => [
        'www', 'api', 'app', 'admin', 'demo', 'login', 'registro', 'panel', 'mail', 'correo', 'nuevo', 'plataforma',
        'soporte', 'ventas', 'ayuda', 'blog', 'status', 'static', 'cdn', 'softflyer', 'softlyer',
    ],

    // Bloqueo por intentos fallidos de inicio de sesion (Doc. 06 §2).
    'login' => [
        'max_intentos' => 5,
        'bloqueo_segundos' => 15 * 60,
    ],

    // Catalogo global de permisos (Doc. 06 §5). El seeder lo sincroniza con la tabla `permisos`.
    'permisos' => [
        'panel.ver' => ['panel', 'Ver el panel de control del restaurante'],
        'ventas.crear' => ['ventas', 'Registrar ventas'],
        'ventas.anular' => ['ventas', 'Anular ventas'],
        'ventas.ver_todas' => ['ventas', 'Ver ventas de otros usuarios'],
        'caja.abrir' => ['caja', 'Abrir caja'],
        'caja.cerrar' => ['caja', 'Cerrar caja'],
        'caja.ver_movimientos' => ['caja', 'Ver movimientos de caja'],
        'caja.registrar_movimiento_manual' => ['caja', 'Registrar ingresos y egresos manuales'],
        'comprobantes.emitir' => ['comprobantes', 'Emitir boletas y facturas'],
        'comprobantes.anular' => ['comprobantes', 'Anular comprobantes'],
        'comprobantes.reenviar_sunat' => ['comprobantes', 'Reenviar comprobantes a SUNAT'],
        'inventario.ver' => ['inventario', 'Ver inventario'],
        'inventario.ajustar' => ['inventario', 'Ajustar stock'],
        'inventario.administrar' => ['inventario', 'Administrar artículos y almacenes'],
        'productos.crear' => ['productos', 'Crear productos de la carta'],
        'productos.editar' => ['productos', 'Editar productos de la carta'],
        'productos.eliminar' => ['productos', 'Eliminar productos de la carta'],
        'clientes.crear' => ['clientes', 'Crear clientes'],
        'clientes.editar' => ['clientes', 'Editar clientes'],
        'clientes.ver' => ['clientes', 'Ver clientes'],
        'reportes.ventas' => ['reportes', 'Ver reportes de ventas'],
        'reportes.inventario' => ['reportes', 'Ver reportes de inventario'],
        'reportes.financieros' => ['reportes', 'Ver reportes financieros y márgenes'],
        'usuarios.crear' => ['usuarios', 'Crear usuarios'],
        'usuarios.editar' => ['usuarios', 'Editar usuarios'],
        'usuarios.asignar_rol' => ['usuarios', 'Asignar roles'],
        'configuracion.empresa' => ['configuracion', 'Datos fiscales y certificado digital'],
        'configuracion.sucursales' => ['configuracion', 'Gestionar sucursales'],
        'restaurante.plano.editar' => ['restaurante', 'Editar el plano del salón'],
        'restaurante.mesas.gestionar' => ['restaurante', 'Unir, mover y bloquear mesas'],
        'restaurante.pedidos.crear' => ['restaurante', 'Tomar pedidos'],
        'restaurante.pedidos.cerrar' => ['restaurante', 'Cerrar pedidos'],
        'restaurante.pedidos.anular_item' => ['restaurante', 'Anular platos ya enviados a cocina'],
        'restaurante.cocina.actualizar_estado' => ['restaurante', 'Cambiar el estado de los platos en cocina'],
        'asistencia.marcar' => ['asistencia', 'Registrar la asistencia propia'],
        'asistencia.administrar' => ['asistencia', 'Configurar horarios y revisar la asistencia'],
    ],

    // Roles que recibe cada restaurante al darse de alta (Doc. 08 §4). '*' = todos los permisos.
    'roles_plantilla' => [
        'Administrador' => [
            'descripcion' => 'Dueño o gerente: acceso completo',
            'permisos' => '*',
        ],
        'Cajero' => [
            'descripcion' => 'Cobra, maneja la caja y emite comprobantes',
            'permisos' => [
                'ventas.crear', 'ventas.anular', 'caja.abrir', 'caja.cerrar', 'caja.ver_movimientos',
                'caja.registrar_movimiento_manual', 'comprobantes.emitir', 'comprobantes.anular',
                'clientes.crear', 'clientes.ver', 'restaurante.pedidos.cerrar', 'asistencia.marcar',
            ],
        ],
        'Encargado de salón' => [
            'descripcion' => 'Organiza el salón y supervisa a los mozos',
            'permisos' => [
                'restaurante.plano.editar', 'restaurante.mesas.gestionar', 'restaurante.pedidos.crear',
                'restaurante.pedidos.anular_item', 'clientes.ver', 'asistencia.marcar',
            ],
        ],
        'Mozo' => [
            'descripcion' => 'Atiende mesas y toma pedidos',
            'permisos' => ['restaurante.pedidos.crear', 'clientes.ver', 'asistencia.marcar'],
        ],
        'Cocinero' => [
            'descripcion' => 'Prepara los platos de su estación',
            'permisos' => [
                'restaurante.cocina.actualizar_estado', 'inventario.ver', 'inventario.ajustar', 'asistencia.marcar',
            ],
        ],
    ],

];
