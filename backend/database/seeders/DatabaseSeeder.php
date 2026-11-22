<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Production-safe reference data only. No fake users or jobs.
 * Demo content for local/staging: php artisan db:seed --class=DemoSeeder
 * First Super Admin:               php artisan sr:create-super-admin
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            SuratLocalitySeeder::class,
            TaxonomySeeder::class,
            SliderSeeder::class,
        ]);
    }
}
