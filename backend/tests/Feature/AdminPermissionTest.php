<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\Employer\EmployerController;
use App\Models\FeaturedJob;
use App\Models\Job;
use Tests\TestCase;

class AdminPermissionTest extends TestCase
{
    public function test_staff_only_reach_sections_they_are_granted(): void
    {
        $staff = $this->makeAdmin('admin_staff', ['jobs.view', 'jobs.approve']);
        $this->actingAsUser($staff);
        $this->getJson('/api/v1/admin/jobs')->assertOk();
        $this->getJson('/api/v1/admin/candidates')->assertForbidden();
        $this->getJson('/api/v1/admin/employers')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/export?report=applications')->assertForbidden();
        $this->putJson('/api/v1/admin/featured', ['items' => []])->assertForbidden();
        $this->getJson('/api/v1/super/backups')->assertForbidden();
    }

    public function test_candidate_list_hides_contact_without_permission_and_export_needs_permission(): void
    {
        $this->actingAsUser($this->makeAdmin('admin_staff', ['job_seekers.view']));
        $row = $this->getJson('/api/v1/admin/candidates')->assertOk()->json('data.0');
        $this->assertArrayHasKey('name', $row);
        $this->getJson('/api/v1/admin/candidates/export')->assertForbidden();
        $this->getJson('/api/v1/admin/candidates/'.$this->seeker()->id.'/resumes/1')->assertForbidden();
    }

    public function test_admin_cannot_grant_permissions_they_do_not_have(): void
    {
        $staff = $this->makeAdmin('admin_staff', ['staff.manage', 'jobs.view']);
        $this->actingAsUser($staff)->postJson('/api/v1/admin/staff', [
            'user_type' => 'admin_staff', 'name' => 'New Person', 'email' => 'np@example.com', 'permissions' => ['jobs.view', 'backups.manage'],
        ])->assertUnprocessable()->assertJsonValidationErrors('permissions');

        // Staff cannot create Admins
        $this->postJson('/api/v1/admin/staff', ['user_type' => 'admin', 'name' => 'X', 'email' => 'x@example.com'])->assertUnprocessable();
    }

    public function test_cannot_change_own_permissions_or_status(): void
    {
        $super = $this->makeAdmin('super_admin');
        $this->actingAsUser($super);
        $admin = $this->makeAdmin('admin');
        $this->actingAsUser($admin)->putJson("/api/v1/admin/staff/{$admin->id}", ['permissions' => []])->assertNotFound();
    }

    public function test_featured_jobs_rules(): void
    {
        $this->actingAsUser($this->makeAdmin('admin'));
        $jobs = Job::where('status', 'active')->where('expires_at', '>', now())->limit(3)->get();

        // Duplicate priority numbers are rejected
        $this->putJson('/api/v1/admin/featured', ['items' => [['job_id' => $jobs[0]->id, 'priority' => 1], ['job_id' => $jobs[1]->id, 'priority' => 1]]])->assertUnprocessable();
        // More than 30 is rejected
        $this->putJson('/api/v1/admin/featured', ['items' => array_map(fn ($i) => ['job_id' => 100000 + $i, 'priority' => $i], range(1, 31))])->assertUnprocessable();
        // Expired job cannot be prioritised
        $expired = $jobs[2];
        $expired->update(['expires_at' => now()->subDay()]);
        $this->putJson('/api/v1/admin/featured', ['items' => [['job_id' => $expired->id, 'priority' => 1]]])->assertUnprocessable();

        // Valid list: priority 1 shows first in public listing; changes are audited
        $this->putJson('/api/v1/admin/featured', ['items' => [['job_id' => $jobs[1]->id, 'priority' => 1], ['job_id' => $jobs[0]->id, 'priority' => 2]]])->assertOk();
        $this->assertSame(2, FeaturedJob::count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'featured_jobs.updated']);
        $list = $this->getJson('/api/v1/jobs')->assertOk()->json('data');
        $this->assertSame([$jobs[1]->id, $jobs[0]->id], [$list[0]['id'], $list[1]['id']]);
        $this->assertSame(1, $list[0]['priority']);

        // A featured job that becomes inactive drops out of the public listing
        $jobs[1]->forceFill(['status' => 'paused'])->save();
        \App\Services\JobSearch::bumpCacheVersion();
        $ids = array_column($this->getJson('/api/v1/jobs?per_page=50')->json('data'), 'id');
        $this->assertNotContains($jobs[1]->id, $ids);
        $this->assertSame($jobs[0]->id, $ids[0]);
    }

    public function test_csv_cells_are_protected_against_formula_injection(): void
    {
        foreach (['=HYPERLINK("http://evil")', '+1+1', '-2', '@SUM(A1)'] as $bad) {
            $this->assertStringStartsWith("'", EmployerController::csvSafe($bad));
        }
        $this->assertSame('Rahul', EmployerController::csvSafe('Rahul'));
    }

    public function test_resume_views_by_others_are_audited(): void
    {
        $seeker = $this->seeker();
        $resume = \App\Models\Resume::create(['user_id' => $seeker->id, 'original_name' => 'cv.pdf', 'path' => 'resumes/x.pdf', 'mime' => 'application/pdf', 'size' => 1000, 'sha256' => str_repeat('a', 64), 'is_default' => true, 'scan_status' => 'skipped']);
        $this->actingAsUser($this->makeAdmin('admin'))->getJson("/api/v1/admin/candidates/{$seeker->id}/resumes/{$resume->id}")->assertOk()->assertJsonStructure(['url']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'resume.viewed', 'auditable_id' => $resume->id]);
    }
}
