<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Permission::ALL as $name => [$label, $group]) {
            Permission::updateOrCreate(['name' => $name], ['label' => $label, 'group' => $group]);
        }
        $roles = [
            'super_admin' => 'Super Admin', 'admin' => 'Admin', 'admin_staff' => 'Admin Staff',
            'employer' => 'Employer', 'job_seeker' => 'Job Seeker',
        ];
        foreach ($roles as $name => $label) {
            Role::updateOrCreate(['name' => $name], ['label' => $label]);
        }
        // Admin: everything except Super-Admin-only permissions. Super Admin bypasses checks.
        // Admin Staff: no default permissions; each staff member is granted permissions individually by an Admin.
        Role::where('name', 'admin')->first()->permissions()->sync(
            Permission::whereNotIn('name', Permission::SUPER_ONLY)->pluck('id')
        );
        Role::where('name', 'super_admin')->first()->permissions()->sync(Permission::pluck('id'));
    }
}
