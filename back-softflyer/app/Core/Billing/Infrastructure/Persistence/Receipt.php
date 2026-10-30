<?php

namespace App\Core\Billing\Infrastructure\Persistence;

use App\Core\Tenancy\Infrastructure\Persistence\BelongsToTenant;
use App\Shared\Infrastructure\Persistence\BaseModel;

/** Comprobante de una venta: boleta o factura (spec 010). Simulado hasta integrar Greenter. */
class Receipt extends BaseModel
{
    use BelongsToTenant;

    public const ISSUED = 'EMITIDO';

    public const PENDING = 'PENDIENTE_ENVIO';

    public const SENT = 'ENVIADO';

    public const ACCEPTED = 'ACEPTADO';

    public const OBSERVED = 'OBSERVADO';

    public const REJECTED = 'RECHAZADO';

    /** SUNAT lo registró pero no entregó el CDR en el plazo de consulta (final). */
    public const NO_CDR = 'SIN_CDR';

    /** No se pudo informar a SUNAT dentro del plazo (final). */
    public const EXPIRED = 'VENCIDO';

    // Por qué espera un PENDIENTE_ENVIO.
    public const WAIT_SUNAT_DOWN = 'SUNAT_CAIDO';

    public const WAIT_VERIFY = 'VERIFICAR';        // el envío pudo llegar: se consulta antes de reenviar

    public const WAIT_CDR = 'CDR_PENDIENTE';       // SUNAT lo tiene: se consulta el CDR, no se reenvía

    public const WAIT_CREDENTIALS = 'CREDENCIALES'; // pausado hasta que Softflyer corrija las credenciales

    /** Hora oficial de la fecha de emisión: la que va en el XML, el ticket y el QR. */
    public const TIMEZONE = 'America/Lima';

    /** Catálogo 15: leyendas de las operaciones exoneradas por la Amazonía. Van en el XML y en el ticket. */
    public const AMAZONIA_LEGENDS = [
        '2001' => 'BIENES TRANSFERIDOS EN LA AMAZONÍA REGIÓN SELVA PARA SER CONSUMIDOS EN LA MISMA',
        '2002' => 'SERVICIOS PRESTADOS EN LA AMAZONÍA REGIÓN SELVA PARA SER CONSUMIDOS EN LA MISMA',
    ];

    protected $table = 'comprobantes';

    protected function casts(): array
    {
        return [
            'correlativo' => 'integer',
            'op_gravada' => 'decimal:2',
            'op_exonerada' => 'decimal:2',
            'op_inafecta' => 'decimal:2',
            'intentos_envio' => 'integer',
            'enviado_en' => 'datetime',
            'registrado_en' => 'datetime',
            'proximo_intento_en' => 'datetime',
            'igv' => 'decimal:2',
            'total' => 'decimal:2',
            'es_simulado' => 'boolean',
            'emitido_en' => 'datetime',
        ];
    }
}
