<?php

namespace App\Core\Billing\Infrastructure\Greenter;

use App\Core\Billing\Infrastructure\Persistence\Receipt;
use App\Core\Tenancy\Application\BranchIgvPolicy;
use App\Shared\Domain\AmountInWords;
use Greenter\Model\Client\Client;
use Greenter\Model\Company\Address;
use Greenter\Model\Company\Company;
use Greenter\Model\Sale\FormaPagos\FormaPagoContado;
use Greenter\Model\Sale\Invoice;
use Greenter\Model\Sale\Legend;
use Greenter\Model\Sale\SaleDetail;
use Illuminate\Support\Facades\DB;

/** Traduce un comprobante nuestro al documento UBL que firma Greenter (Doc. 04 §5). */
final class ReceiptGreenterMapper
{
    private const CLIENT_DOCUMENT = ['-' => '0', '1' => '1', '6' => '6'];

    public function __construct(private readonly BranchIgvPolicy $igvPolicy) {}

    public function invoice(Receipt $receipt): Invoice
    {
        $type = (string) DB::table('tipos_comprobante')->where('id', $receipt->tipo_comprobante_id)->value('codigo');
        $lines = DB::table('detalle_comprobantes')
            ->join('tipos_afectacion_igv', 'tipos_afectacion_igv.id', '=', 'detalle_comprobantes.tipo_afectacion_igv_id')
            ->where('comprobante_id', $receipt->id)
            ->orderBy('detalle_comprobantes.id')
            ->get(['detalle_comprobantes.*', 'tipos_afectacion_igv.codigo as afectacion']);

        $igvPercent = $this->igvPolicy->percent($receipt->sucursal_id);

        return (new Invoice)
            ->setUblVersion('2.1')
            ->setTipoOperacion('0101')
            ->setTipoDoc($type)
            ->setSerie($receipt->serie)
            ->setCorrelativo((string) $receipt->correlativo)
            ->setFechaEmision($receipt->emitido_en->copy()->setTimezone(Receipt::TIMEZONE)->toDateTime())
            ->setFormaPago(new FormaPagoContado)
            ->setTipoMoneda('PEN')
            ->setCompany($this->company($receipt))
            ->setClient($this->client($receipt))
            ->setMtoOperGravadas((float) $receipt->op_gravada)
            ->setMtoOperExoneradas((float) $receipt->op_exonerada)
            ->setMtoOperInafectas((float) $receipt->op_inafecta)
            ->setMtoIGV((float) $receipt->igv)
            ->setTotalImpuestos((float) $receipt->igv)
            ->setValorVenta((float) $receipt->op_gravada + (float) $receipt->op_exonerada + (float) $receipt->op_inafecta)
            ->setSubTotal((float) $receipt->total)
            ->setMtoImpVenta((float) $receipt->total)
            ->setDetails($lines->map(fn ($line) => $this->detail($line, $igvPercent))->all())
            ->setLegends($this->legends($receipt));
    }

    /** @return list<Legend> */
    private function legends(Receipt $receipt): array
    {
        $legends = [(new Legend)->setCode('1000')->setValue(AmountInWords::soles((string) $receipt->total))];
        if (isset(Receipt::AMAZONIA_LEGENDS[$receipt->leyenda_codigo])) {
            $legends[] = (new Legend)->setCode($receipt->leyenda_codigo)->setValue(Receipt::AMAZONIA_LEGENDS[$receipt->leyenda_codigo]);
        }

        return $legends;
    }

    private function detail(object $line, float $igvPercent): SaleDetail
    {
        $taxed = $line->afectacion === '10';

        return (new SaleDetail)
            ->setCodProducto($line->producto_id !== null ? (string) $line->producto_id : null)
            ->setUnidad($line->unidad_medida)
            ->setCantidad((float) $line->cantidad)
            ->setDescripcion($line->descripcion)
            ->setMtoValorUnitario((float) $line->valor_unitario)
            ->setMtoPrecioUnitario((float) $line->precio_unitario)
            ->setMtoValorVenta((float) $line->valor_venta)
            ->setMtoBaseIgv((float) $line->valor_venta)
            ->setPorcentajeIgv($taxed ? $igvPercent : 0.0)
            ->setIgv((float) $line->igv)
            ->setTipAfeIgv($line->afectacion)
            ->setTotalImpuestos((float) $line->igv);
    }

    private function company(Receipt $receipt): Company
    {
        $company = DB::table('empresas')->where('id', $receipt->empresa_id)->first();
        $branch = DB::table('sucursales')->where('id', $receipt->sucursal_id)->first();
        $ubigeo = DB::table('ubigeos')->where('id', $branch->ubigeo_id ?? $company->ubigeo_id)->first();

        return (new Company)
            ->setRuc($company->ruc)
            ->setRazonSocial($company->razon_social ?? $company->nombre_comercial)
            ->setNombreComercial($company->nombre_comercial)
            ->setAddress((new Address)
                ->setUbigueo($ubigeo?->codigo ?? '150101')
                ->setDepartamento($ubigeo?->departamento ?? 'LIMA')
                ->setProvincia($ubigeo?->provincia ?? 'LIMA')
                ->setDistrito($ubigeo?->distrito ?? 'LIMA')
                ->setUrbanizacion('-')
                ->setDireccion($branch->direccion ?: ($company->direccion_fiscal ?: '-'))
                ->setCodLocal($branch->codigo_establecimiento ?: '0000'));
    }

    private function client(Receipt $receipt): Client
    {
        return (new Client)
            ->setTipoDoc(self::CLIENT_DOCUMENT[$receipt->cliente_tipo_documento])
            ->setNumDoc($receipt->cliente_numero_documento ?? '0')
            ->setRznSocial($receipt->cliente_nombre);
    }
}
