<?php

namespace Tests\Unit;

use App\Shared\Domain\AmountInWords;
use PHPUnit\Framework\TestCase;

class AmountInWordsTest extends TestCase
{
    public function test_spells_the_amount_for_the_sunat_legend(): void
    {
        $this->assertSame('SON CIENTO DIECIOCHO CON 00/100 SOLES', AmountInWords::soles('118.00'));
        $this->assertSame('SON CERO CON 50/100 SOLES', AmountInWords::soles('0.50'));
        $this->assertSame('SON CIEN CON 00/100 SOLES', AmountInWords::soles('100.00'));
        $this->assertSame('SON VEINTIUNO CON 05/100 SOLES', AmountInWords::soles('21.05'));
        $this->assertSame('SON MIL DOSCIENTOS TREINTA Y CUATRO CON 50/100 SOLES', AmountInWords::soles('1234.50'));
        $this->assertSame('SON DOS MIL CON 00/100 SOLES', AmountInWords::soles('2000.00'));
        $this->assertSame('SON UN MILLON CON 00/100 SOLES', AmountInWords::soles('1000000.00'));
    }
}
