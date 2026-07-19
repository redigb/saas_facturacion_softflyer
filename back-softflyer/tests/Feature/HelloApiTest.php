<?php

namespace Tests\Feature;

use Tests\TestCase;

class HelloApiTest extends TestCase
{
    public function test_the_api_returns_its_hello_message(): void
    {
        $response = $this->getJson('/api/v1/hello');

        $response
            ->assertOk()
            ->assertJsonPath('data.message', 'Hello World desde Laravel 12')
            ->assertJsonPath('data.service', 'Softflyer API');
    }
}
