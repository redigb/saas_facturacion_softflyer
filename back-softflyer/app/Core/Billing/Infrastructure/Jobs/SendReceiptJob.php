<?php

namespace App\Core\Billing\Infrastructure\Jobs;

use App\Core\Billing\Application\SubmitReceipt;
use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Tenancy\Infrastructure\Persistence\Tenant;
use App\Core\Tenancy\Infrastructure\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Envío de un comprobante a SUNAT por la cola (spec 017b): el cajero no espera a SUNAT. */
final class SendReceiptJob implements ShouldQueue
{
    use Queueable;

    /** Un solo intento: los reintentos los agenda SubmitReceipt y los lanza `softflyer:enviar-pendientes`. */
    public int $tries = 1;

    public function __construct(public readonly int $tenantId, public readonly int $receiptId) {}

    public function handle(TenantContext $context, SubmitReceipt $submit): void
    {
        // Con la cola síncrona el Job corre dentro del request del cobro, que ya tiene su inquilino: no se lo quitamos.
        $inherited = $context->id() === $this->tenantId;
        if (! $inherited) {
            $context->set(Tenant::findOrFail($this->tenantId));
        }

        try {
            $receipt = Receipt::find($this->receiptId);
            if ($receipt !== null) {
                $submit->handle($receipt);
            }
        } finally {
            if (! $inherited) {
                $context->clear();
            }
        }
    }
}
