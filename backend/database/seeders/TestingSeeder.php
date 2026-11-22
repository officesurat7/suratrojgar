<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/** Reference data plus demo employers, jobs and seekers. Used by the automated test suite. */
class TestingSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([DatabaseSeeder::class, DemoSeeder::class]);
    }
}
