<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Job;
use Tests\TestCase;

class ApplicationFlowTest extends TestCase
{
    private function freshJobFor(int $employerNo): Job
    {
        $seeker = $this->seeker(5);
        return Job::where('status', 'active')->where('expires_at', '>', now())->where('employer_id', $this->employer($employerNo)->id)
            ->whereDoesntHave('applications', fn ($q) => $q->where('user_id', $seeker->id))->whereDoesntHave('questions')->firstOrFail();
    }

    public function test_full_application_lifecycle(): void
    {
        $job = $this->freshJobFor(1);
        $seeker = $this->seeker(5);

        $r = $this->actingAsUser($seeker)->postJson("/api/v1/seeker/jobs/{$job->id}/apply", ['cover_letter' => 'I have 5 years of experience.'])
            ->assertCreated()->assertJsonStructure(['data' => ['id', 'application_no']]);
        $id = $r->json('data.id');

        // Duplicate application is blocked
        $this->postJson("/api/v1/seeker/jobs/{$job->id}/apply", [])->assertStatus(422);

        // Owning employer sees it with the candidate's contact; another employer cannot
        $this->actingAsUser($this->employer(2))->getJson("/api/v1/employer/applications/{$id}")->assertNotFound();
        $this->actingAsUser($this->employer(1))->getJson("/api/v1/employer/applications/{$id}")
            ->assertOk()->assertJsonPath('data.candidate.email', $seeker->email);

        // Status change is recorded in history
        $this->putJson("/api/v1/employer/applications/{$id}/status", ['status' => 'shortlisted', 'note' => 'Good profile'])->assertOk();
        $this->assertDatabaseHas('application_status_history', ['application_id' => $id, 'to_status' => 'shortlisted']);

        // Interview needs a date
        $this->putJson("/api/v1/employer/applications/{$id}/status", ['status' => 'interview_scheduled'])->assertUnprocessable();

        // Candidate sees the new status and can withdraw
        $this->actingAsUser($seeker)->getJson("/api/v1/seeker/applications/{$id}")->assertOk()->assertJsonPath('data.status', 'shortlisted')
            ->assertJsonMissingPath('data.employer_notes');
        $this->postJson("/api/v1/seeker/applications/{$id}/withdraw")->assertOk();
        $this->assertSame('withdrawn', Application::find($id)->status);
    }

    public function test_cannot_apply_to_expired_or_inactive_jobs(): void
    {
        $seeker = $this->seeker(5);
        $job = $this->freshJobFor(2);
        $job->update(['expires_at' => now()->subDay()]);
        $this->actingAsUser($seeker)->postJson("/api/v1/seeker/jobs/{$job->id}/apply", [])->assertStatus(422);

        $job->forceFill(['expires_at' => now()->addDays(5), 'status' => 'paused'])->save();
        $this->postJson("/api/v1/seeker/jobs/{$job->id}/apply", [])->assertStatus(422);
    }

    public function test_employer_cannot_edit_another_employers_job(): void
    {
        $job = $this->activeJob($this->employer(1));
        $this->actingAsUser($this->employer(2))->getJson("/api/v1/employer/jobs/{$job->id}")->assertNotFound();
        $this->putJson("/api/v1/employer/jobs/{$job->id}", ['title' => 'Hacked'])->assertNotFound();
        $this->deleteJson("/api/v1/employer/jobs/{$job->id}")->assertNotFound();
        $this->assertNotSame('Hacked', $job->fresh()->title);
    }

    public function test_seeker_cannot_use_employer_or_admin_api(): void
    {
        $this->actingAsUser($this->seeker());
        $this->getJson('/api/v1/employer/dashboard')->assertForbidden();
        $this->getJson('/api/v1/admin/candidates')->assertForbidden();
        $this->getJson('/api/v1/super/settings')->assertForbidden();
    }
}
