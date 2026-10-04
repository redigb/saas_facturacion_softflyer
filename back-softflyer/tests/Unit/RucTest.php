<?php

namespace Tests\Unit;

use App\Core\Tenancy\Domain\Ruc;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RucTest extends TestCase
{
    #[DataProvider('rucs')]
    public function test_validates_prefix_length_and_check_digit(string $ruc, bool $valid): void
    {
        $this->assertSame($valid, Ruc::isValid($ruc));
    }

    public static function rucs(): array
    {
        return [
            'valido' => ['20000000001', true],
            'digito verificador incorrecto' => ['20000000002', false],
            'prefijo inexistente' => ['30000000001', false],
            'corto' => ['2000000000', false],
            'con letras' => ['2000000000A', false],
        ];
    }
}
