<?php

namespace Tests\Feature;

use App\Models\ContactAccessLog;
use App\Models\User;
use Tests\TestCase;

/** Employer contact details must never appear in public responses, and every reveal is gated and logged. */
class PrivateContactTest extends TestCase
{
    public function test_public_listing_and_detail_never_contain_private_fields(): void
    {
        $job = $this->activeJob();
        $job->update(['contact_mobile' => '9123456789', 'contact_email' => 'secret-hr@example.com', 'office_address' => 'Plot 99, Secret Estate']);

        foreach (["/api/v1/jobs?per_page=50", "/api/v1/jobs/{$job->id}", "/api/v1/jobs/{$job->id}/similar", '/api/v1/seo/sitemap'] as $url) {
            $body = $this->getJson($url)->assertOk()->getContent();
            $this->assertStringNotContainsString('9123456789', $body, $url);
            $this->assertStringNotContainsString('secret-hr@example.com', $body, $url);
            $this->assertStringNotContainsString('Secret Estate', $body, $url);
            $this->assertStringNotContainsString('contact_mobile', $body, $url);
            $this->assertStringNotContainsString('office_address', $body, $url);
        }
    }

    public function test_guest_cannot_view_contact(): void
    {
        $this->getJson('/api/v1/jobs/'.$this->activeJob()->id.'/contact')->assertUnauthorized();
    }

    public function test_employer_cannot_view_another_jobs_contact(): void
    {
        $job = $this->activeJob($this->employer(1));
        $this->actingAsUser($this->employer(2))->getJson("/api/v1/jobs/{$job->id}/contact")->assertForbidden();
    }

    public function test_verified_seeker_can_view_and_access_is_logged(): void
    {
        $job = $this->activeJob();
        $job->update(['contact_visibility' => 'verified_users', 'contact_mobile' => '9123456789']);
        $seeker = $this->seeker();

        $this->actingAsUser($seeker)->getJson("/api/v1/jobs/{$job->id}/contact")
            ->assertOk()->assertJsonPath('data.contact_mobile', '9123456789')
            ->assertHeader('Cache-Control', 'no-store, private');
        $this->assertDatabaseHas('contact_access_logs', ['user_id' => $seeker->id, 'job_id' => $job->id]);
    }

    public function test_unverified_seeker_is_blocked(): void
    {
        $seeker = $this->seeker();
        $seeker->forceFill(['email_verified_at' => null])->save();
        $this->actingAsUser($seeker)->getJson('/api/v1/jobs/'.$this->activeJob()->id.'/contact')->assertForbidden();
        $this->assertSame(0, ContactAccessLog::count());
    }

    public function test_hidden_and_applicants_only_visibility(): void
    {
        $job = $this->activeJob();
        $seeker = $this->seeker(3);

        $job->update(['contact_visibility' => 'hidden']);
        $this->actingAsUser($seeker)->getJson("/api/v1/jobs/{$job->id}/contact")->assertForbidden()->assertJsonPath('code', 'contact_hidden');

        $job->update(['contact_visibility' => 'applicants_only']);
        $this->getJson("/api/v1/jobs/{$job->id}/contact")->assertForbidden()->assertJsonPath('code', 'apply_first');
    }

    public function test_daily_contact_view_limit(): void
    {
        $seeker = $this->seeker(4);
        app(\App\Services\Settings::class)->set(['contact_views_per_day' => 1]);
        $jobs = \App\Models\Job::where('status', 'active')->where('contact_visibility', 'verified_users')->limit(2)->get();
        $this->assertCount(2, $jobs);

        $this->actingAsUser($seeker)->getJson("/api/v1/jobs/{$jobs[0]->id}/contact")->assertOk();
        $this->getJson("/api/v1/jobs/{$jobs[0]->id}/contact")->assertOk();   // same job again is fine
        $this->getJson("/api/v1/jobs/{$jobs[1]->id}/contact")->assertStatus(429);
    }
}
