<?php

namespace Tests;

use App\Models\AdminProfile;
use App\Models\Job;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\TestingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected string $seeder = TestingSeeder::class;

    protected function seeker(int $n = 1): User
    {
        return User::where('email', "seeker{$n}@demo.suratrojgar.test")->firstOrFail();
    }

    protected function employer(int $n = 1): User
    {
        return User::where('email', "employer{$n}@demo.suratrojgar.test")->firstOrFail();
    }

    protected function activeJob(?User $employer = null): Job
    {
        return Job::where('status', 'active')->where('expires_at', '>', now())
            ->when($employer, fn ($q) => $q->where('employer_id', $employer->id))->firstOrFail();
    }

    /** Create an admin-type account. Staff get only the permissions listed. */
    protected function makeAdmin(string $type = 'admin', array $permissions = []): User
    {
        $u = User::create([
            'name' => Str::title(str_replace('_', ' ', $type)).' '.Str::random(4), 'email' => Str::lower(Str::random(8)).'@test.suratrojgar.test',
            'user_type' => $type, 'status' => 'active', 'password' => 'Secret#Pass123', 'email_verified_at' => now(),
        ]);
        AdminProfile::create(['user_id' => $u->id]);
        $u->roles()->sync(Role::where('name', $type)->pluck('id'));
        if ($permissions) {
            $u->directPermissions()->sync(Permission::whereIn('name', $permissions)->pluck('id'));
        }
        $u->flushPermissionCache();

        return $u;
    }

    protected function actingAsUser(User $u): static
    {
        Sanctum::actingAs($u, ['*']);

        return $this;
    }
}
