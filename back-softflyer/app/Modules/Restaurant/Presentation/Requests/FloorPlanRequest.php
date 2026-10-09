<?php

namespace App\Modules\Restaurant\Presentation\Requests;

use App\Modules\Restaurant\Infrastructure\Persistence\FloorElement;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FloorPlanRequest extends FormRequest
{
    private const MAX_ITEMS = 300;

    protected function prepareForValidation(): void
    {
        $tables = $this->input('mesas');

        if (is_array($tables)) {
            $this->merge(['mesas' => array_map(
                fn ($table) => is_array($table) && isset($table['codigo'])
                    ? ['codigo' => mb_strtoupper(trim((string) $table['codigo']))] + $table
                    : $table,
                $tables,
            )]);
        }
    }

    public function rules(): array
    {
        $room = $this->route('room');
        $width = (float) $this->input('ancho', $room?->ancho);
        $height = (float) $this->input('alto', $room?->alto);
        $insideX = $this->inside($width, 'ancho');
        $insideY = $this->inside($height, 'alto');

        return [
            'version' => ['required', 'integer', 'min:1'],
            'ancho' => ['sometimes', 'integer', 'between:200,5000'],
            'alto' => ['sometimes', 'integer', 'between:200,5000'],

            'mesas' => ['present', 'array', 'max:'.self::MAX_ITEMS],
            'mesas.*.id' => ['sometimes', 'integer', 'distinct', Rule::exists('mesas', 'id')->where('salon_id', $room?->getKey() ?? 0)],
            'mesas.*.codigo' => ['required', 'string', 'max:10', 'regex:/^[A-Z0-9-]+$/', 'distinct'],
            'mesas.*.capacidad' => ['required', 'integer', 'between:1,50'],
            'mesas.*.forma' => ['required', Rule::in(['CUADRADA', 'REDONDA', 'RECTANGULAR'])],
            'mesas.*.pos_x' => ['required', 'numeric', 'min:0', $insideX],
            'mesas.*.pos_y' => ['required', 'numeric', 'min:0', $insideY],
            'mesas.*.ancho' => ['required', 'numeric', 'gt:0', 'max:5000'],
            'mesas.*.alto' => ['required', 'numeric', 'gt:0', 'max:5000'],
            'mesas.*.rotacion' => ['required', 'integer', 'between:0,359'],

            'elementos' => ['present', 'array', 'max:'.self::MAX_ITEMS],
            'elementos.*.tipo' => ['required', Rule::in(FloorElement::TYPES)],
            'elementos.*.etiqueta' => ['nullable', 'string', 'max:40'],
            'elementos.*.pos_x' => ['required', 'numeric', 'min:0', $insideX],
            'elementos.*.pos_y' => ['required', 'numeric', 'min:0', $insideY],
            'elementos.*.ancho' => ['required', 'numeric', 'gt:0', 'max:5000'],
            'elementos.*.alto' => ['required', 'numeric', 'gt:0', 'max:5000'],
            'elementos.*.rotacion' => ['required', 'integer', 'between:0,359'],
            'elementos.*.capa' => ['sometimes', 'integer', 'between:-100,100'],
        ];
    }

    public function messages(): array
    {
        return [
            'mesas.*.codigo.required' => 'Cada mesa necesita un código.',
            'mesas.*.codigo.distinct' => 'Hay dos mesas con el mismo código.',
            'mesas.*.codigo.regex' => 'Usa solo letras, números y guiones en el código.',
            'mesas.*.codigo.max' => 'El código puede tener hasta 10 caracteres.',
            'mesas.*.capacidad.between' => 'La capacidad va de 1 a 50 personas.',
            'mesas.*.id.exists' => 'Una de las mesas no pertenece a este salón.',
            'mesas.max' => 'Un salón puede tener hasta 300 mesas.',
            'elementos.max' => 'Un salón puede tener hasta 300 elementos.',
        ];
    }

    /** La esquina superior izquierda debe quedar dentro del lienzo. */
    private function inside(float $limit, string $dimension): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($limit, $dimension) {
            if (is_numeric($value) && (float) $value > $limit) {
                $fail("Está fuera del salón (el {$dimension} es {$limit}).");
            }
        };
    }
}
