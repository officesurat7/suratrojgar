<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_otps', function (Blueprint $table) {
            $table->id();
            $table->string('email', 191);
            $table->string('purpose', 30);                 // register, login_2fa, password_reset
            $table->string('code_hash', 255);              // never store the plain OTP
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
            $table->index(['email', 'purpose', 'created_at']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['notifiable_type', 'notifiable_id', 'read_at']);
        });

        Schema::create('homepage_sliders', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150);
            $table->string('subtitle', 300)->nullable();
            $table->string('image_path', 255)->nullable();
            $table->string('mobile_image_path', 255)->nullable();
            $table->string('cta_label', 50)->nullable();
            $table->string('cta_url', 255)->nullable();
            $table->string('theme', 20)->default('blue');   // gradient fallback when no image
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('job_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->char('session_hash', 64);
            $table->timestamp('created_at')->nullable();
            $table->index(['job_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('search_logs', function (Blueprint $table) {
            $table->id();
            $table->string('keyword', 150)->nullable();
            $table->json('filters')->nullable();
            $table->unsignedInteger('results_count')->default(0);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->char('session_hash', 64)->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index('created_at');
            $table->index(['keyword', 'created_at']);
        });

        // Privacy-conscious: no raw IP is stored, only a daily-rotating salted hash.
        Schema::create('visitor_analytics', function (Blueprint $table) {
            $table->id();
            $table->char('session_hash', 64);
            $table->string('path', 255);
            $table->string('page_type', 30)->nullable();     // home, job_list, job_detail, ...
            $table->string('referrer_host', 150)->nullable();
            $table->string('traffic_source', 30)->nullable(); // direct, search, social, referral, campaign
            $table->string('utm_source', 100)->nullable();
            $table->string('device_type', 20)->nullable();    // mobile, tablet, desktop, bot
            $table->string('browser', 30)->nullable();
            $table->string('city', 60)->nullable();           // only when a lawful GeoIP source is configured
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->index('created_at');
            $table->index(['session_hash', 'created_at']);
            $table->index(['path', 'created_at']);
        });

        // Pre-aggregated daily rollups so dashboards never scan raw events on page load.
        Schema::create('analytics_daily', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('metric', 50);        // page_views, unique_visitors, device:mobile, ...
            $table->string('dimension', 191)->default('');
            $table->unsignedBigInteger('value')->default(0);
            $table->timestamps();
            $table->unique(['date', 'metric', 'dimension']);
        });

        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_no', 30)->unique();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reporter_name', 120)->nullable();
            $table->string('reporter_email', 191)->nullable();
            $table->string('reporter_mobile', 15)->nullable();
            // job, employer, candidate, support, grievance, data_request
            $table->string('type', 20);
            $table->foreignId('job_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 50)->nullable();
            $table->string('subject', 200);
            $table->text('description');
            $table->string('status', 20)->default('open');  // open, in_review, resolved, dismissed
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
            $table->index(['type', 'status']);
        });

        // DPDP Act: correction and erasure requests
        Schema::create('data_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);           // deletion, correction, export
            $table->text('details')->nullable();
            $table->string('status', 20)->default('pending'); // pending, completed, rejected
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('response')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 80);
            $table->string('auditable_type', 80)->nullable();
            $table->unsignedBigInteger('auditable_id')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });

        // Every reveal of private employer contact details is recorded here.
        Schema::create('contact_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['user_id', 'created_at']);
            $table->index(['job_id', 'created_at']);
        });

        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->json('value')->nullable();
            $table->string('group', 50)->default('general');
            $table->boolean('is_public')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('login_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('email', 191)->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->boolean('success');
            $table->string('reason', 50)->nullable(); // bad_password, locked, blocked, 2fa_failed, ok
            $table->timestamp('created_at')->nullable();
            $table->index(['user_id', 'created_at']);
            $table->index(['success', 'created_at']);
            $table->index(['ip', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['login_history', 'system_settings', 'contact_access_logs', 'audit_logs', 'data_requests',
            'complaints', 'analytics_daily', 'visitor_analytics', 'search_logs', 'job_views',
            'homepage_sliders', 'notifications', 'email_otps'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
