<?php

namespace Tests\Feature;

use Tests\TestCase;

class RateLimitTest extends TestCase
{
    public function test_public_api_is_rate_limited_per_ip(): void
    {
        for ($i = 0; $i < 120; $i++) {
            $this->getJson('/api/v1/meta')->assertOk();
        }
        $this->getJson('/api/v1/meta')->assertStatus(429);
    }

    public function test_server_renders_with_the_internal_key_are_not_limited(): void
    {
        config(['app.internal_key' => 'test-internal-key']);
        for ($i = 0; $i < 130; $i++) {
            $this->getJson('/api/v1/meta', ['X-Internal-Key' => 'test-internal-key'])->assertOk();
        }
        // A wrong key gets the normal per-IP limit
        $this->getJson('/api/v1/meta', ['X-Internal-Key' => 'wrong'])->assertOk();
    }

    public function test_internal_key_is_ignored_from_non_local_addresses(): void
    {
        config(['app.internal_key' => 'test-internal-key']);
        for ($i = 0; $i < 120; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])->getJson('/api/v1/meta', ['X-Internal-Key' => 'test-internal-key']);
        }
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])->getJson('/api/v1/meta', ['X-Internal-Key' => 'test-internal-key'])->assertStatus(429);
    }
}
