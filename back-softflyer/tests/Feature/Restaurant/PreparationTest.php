<?php

namespace Tests\Feature\Restaurant;

use App\Core\Iam\Infrastructure\Persistence\User;
use Illuminate\Support\Facades\DB;
use Tests\DatabaseTestCase;
use Tests\Feature\Restaurant\Concerns\BuildsRestaurant;

/** Spec 031: fichas de preparación por estación. */
class PreparationTest extends DatabaseTestCase
{
    use BuildsRestaurant;

    private string $cook;

    protected function setUp(): void
    {
        parent::setUp();
        $this->buildRestaurant();
        $this->cook = $this->user('Cocinero', 'cocina@donjose.pe');
        $cookId = $this->asTenant(fn () => (int) User::where('correo', 'cocina@donjose.pe')->value('id'));
        $this->as($this->admin, 'PUT', "cocina/accesos/{$cookId}", [
            'estacion_ids' => [$this->ids['cocina']],
            'general' => false,
        ])->assertOk();
    }

    public function test_cook_only_lists_and_reads_dishes_from_assigned_station(): void
    {
        $this->as($this->cook, 'GET', "preparaciones?estacion_id={$this->ids['cocina']}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.producto.nombre', 'Lomo saltado')
            ->assertJsonPath('data.0.completa', false);

        $this->as($this->cook, 'GET', "preparaciones?estacion_id={$this->ids['bar']}")->assertForbidden();
        $this->as($this->cook, 'GET', 'preparaciones?estacion_id=general')->assertForbidden();
        $this->as($this->cook, 'GET', "preparaciones/{$this->ids['chicha']}")->assertForbidden();

        $this->as($this->admin, 'GET', "preparaciones?estacion_id={$this->ids['bar']}")
            ->assertOk()
            ->assertJsonPath('data.0.producto.nombre', 'Chicha morada');
    }

    public function test_kitchen_saves_ingredients_procedure_and_team_notes(): void
    {
        $body = [
            'ingredientes' => [
                ['nombre' => 'Lomo', 'cantidad' => '250 g'],
                ['nombre' => 'Cebolla roja', 'cantidad' => '1/2 unidad'],
            ],
            'procedimiento' => 'Sellar el lomo y saltear a fuego alto.',
            'notas' => 'Usar el wok bien caliente.',
        ];

        $this->as($this->cook, 'PUT', "preparaciones/{$this->ids['lomo']}", $body)
            ->assertOk()
            ->assertJsonCount(2, 'data.ingredientes')
            ->assertJsonPath('data.ingredientes.0.cantidad', '250 g')
            ->assertJsonPath('data.procedimiento', $body['procedimiento'])
            ->assertJsonPath('data.notas', $body['notas'])
            ->assertJsonPath('data.actualizado_por', 'Cocinero');

        $this->as($this->admin, 'GET', "preparaciones/{$this->ids['lomo']}")
            ->assertOk()
            ->assertJsonPath('data.ingredientes.1.nombre', 'Cebolla roja');

        $this->as($this->cook, 'GET', "preparaciones?estacion_id={$this->ids['cocina']}")
            ->assertJsonPath('data.0.completa', true);

        $this->assertSame(2, $this->asTenant(fn () => DB::table('ingredientes_preparacion')->count()));
    }

    public function test_ingredient_units_are_limited_to_the_catalog(): void
    {
        $this->as($this->cook, 'PUT', "preparaciones/{$this->ids['lomo']}", [
            'ingredientes' => [
                ['nombre' => 'Lomo', 'cantidad' => '8', 'unidad' => 'ONZ'],
                ['nombre' => 'Cebolla roja', 'cantidad' => '2', 'unidad' => 'KG'],
            ],
            'procedimiento' => 'Sellar el lomo.',
        ])
            ->assertOk()
            ->assertJsonPath('data.ingredientes.0.unidad', 'ONZ')
            ->assertJsonPath('data.ingredientes.1.unidad', 'KG');

        $this->as($this->cook, 'PUT', "preparaciones/{$this->ids['lomo']}", [
            'ingredientes' => [['nombre' => 'Lomo', 'cantidad' => '1', 'unidad' => 'LIBRA']],
        ])->assertStatus(422)->assertJsonStructure(['error' => ['detalles' => ['ingredientes.0.unidad']]]);
    }

    public function test_admin_edits_any_station_but_waiter_and_other_station_cannot(): void
    {
        $recipe = ['ingredientes' => [['nombre' => 'Maíz morado', 'cantidad' => '1 kg']], 'procedimiento' => 'Hervir.', 'notas' => null];

        $this->as($this->admin, 'PUT', "preparaciones/{$this->ids['chicha']}", $recipe)
            ->assertOk()
            ->assertJsonPath('data.estacion.nombre', 'Bar');

        $this->as($this->cook, 'PUT', "preparaciones/{$this->ids['chicha']}", $recipe)->assertForbidden();
        $this->as($this->waiter, 'GET', "preparaciones/{$this->ids['lomo']}")->assertForbidden();

        $this->as($this->cook, 'PUT', "preparaciones/{$this->ids['lomo']}", [
            'ingredientes' => [['nombre' => '']],
        ])->assertStatus(422)->assertJsonStructure(['error' => ['detalles' => ['ingredientes.0.nombre']]]);
    }

    public function test_preparations_never_cross_tenants(): void
    {
        $this->as($this->cook, 'PUT', "preparaciones/{$this->ids['lomo']}", [
            'ingredientes' => [['nombre' => 'Lomo']],
            'procedimiento' => 'Preparar.',
        ])->assertOk();

        $other = $this->provision('otro');
        $this->forget();
        $this->withToken($this->tokenFor($other, 'admin@otro.pe'))
            ->getJson($this->tenantUrl('otro', "preparaciones/{$this->ids['lomo']}"))
            ->assertNotFound();
    }
}
