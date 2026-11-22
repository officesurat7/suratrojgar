<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('job_category_id')->constrained()->restrictOnDelete();
            $table->foreignId('job_role_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 150);
            $table->string('slug', 180);
            $table->text('description');
            $table->string('company_display_name', 150);          // denormalised public name for search/listing
            $table->unsignedSmallInteger('vacancies')->default(1);

            // Salary (INR). Monthly-normalised value kept for cross-period filtering/sorting.
            $table->decimal('salary_min', 12, 2)->nullable();
            $table->decimal('salary_max', 12, 2)->nullable();
            $table->char('salary_currency', 3)->default('INR');
            $table->string('salary_period', 10)->default('monthly'); // monthly, annual, daily, hourly
            $table->boolean('salary_negotiable')->default(false);
            $table->decimal('salary_monthly_min', 12, 2)->nullable();
            $table->decimal('salary_monthly_max', 12, 2)->nullable();

            $table->string('employment_type', 20);   // full_time, part_time, freelance, contract, temporary, internship, permanent, daily_wage, shift_based
            $table->string('work_mode', 20);         // onsite, remote, hybrid, work_from_home
            $table->string('shift', 20)->nullable(); // day, night, rotational, flexible

            // Location: public (general) vs private (full address)
            $table->string('state', 60)->default('Gujarat');
            $table->string('city', 60)->default('Surat');
            $table->foreignId('locality_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area', 120)->nullable();
            $table->string('pincode', 6)->nullable();
            $table->string('office_address', 500)->nullable();     // PRIVATE

            $table->unsignedTinyInteger('experience_min')->default(0);
            $table->unsignedTinyInteger('experience_max')->nullable();
            $table->foreignId('education_level_id')->nullable()->constrained()->nullOnDelete();
            $table->string('joining', 20)->default('flexible');     // immediate, within_15_days, within_30_days, flexible
            $table->string('working_days', 60)->nullable();
            $table->string('working_hours', 60)->nullable();
            $table->string('weekly_off', 60)->nullable();
            $table->text('benefits')->nullable();
            // Gender preference only where legally justified (e.g. statutory requirement); default open to all
            $table->string('gender_preference', 10)->default('any');
            $table->string('gender_justification', 255)->nullable();

            // PRIVATE contact details
            $table->string('contact_name', 120)->nullable();
            $table->string('contact_mobile', 15)->nullable();
            $table->string('contact_email', 191)->nullable();
            // verified_users | applicants_only | hidden
            $table->string('contact_visibility', 20)->default('verified_users');

            $table->boolean('allow_reapply')->default(false);
            $table->text('skills_text')->nullable();               // denormalised for full-text search

            // draft, pending, active, paused, closed, rejected, expired
            $table->string('status', 20)->default('draft');
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('expiry_reminder_sent_at')->nullable();
            $table->char('fingerprint', 40)->nullable();          // duplicate-job detection
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedInteger('applications_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Listing / filter indexes (the hot path)
            $table->index(['status', 'published_at']);
            $table->index(['status', 'expires_at']);
            $table->index(['status', 'job_category_id', 'published_at']);
            $table->index(['status', 'locality_id', 'published_at']);
            $table->index(['status', 'employment_type']);
            $table->index(['status', 'salary_monthly_max']);
            $table->index(['employer_id', 'status']);
            $table->index(['employer_id', 'fingerprint']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE jobs ADD FULLTEXT jobs_fulltext (title, company_display_name, skills_text, description)');
        }

        Schema::create('job_skills', function (Blueprint $table) {
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10)->default('required'); // required | preferred
            $table->primary(['job_id', 'skill_id']);
            $table->index('skill_id');
        });

        Schema::create('job_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->string('question', 300);
            $table->boolean('is_required')->default(false);
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Admin-controlled priority listing (max 30, priority 1..30, one row per job)
        Schema::create('featured_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('priority')->unique();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('saved_jobs', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->primary(['user_id', 'job_id']);
            $table->index('job_id');
        });

        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no', 30)->unique();
            $table->foreignId('job_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt')->default(1);
            $table->foreignId('resume_id')->nullable()->constrained()->nullOnDelete();
            $table->text('cover_letter')->nullable();
            $table->json('answers')->nullable();
            // applied, received, under_review, shortlisted, interview_scheduled, interview_completed,
            // selected, rejected, on_hold, withdrawn
            $table->string('status', 30)->default('applied');
            $table->text('employer_notes')->nullable();            // private to employer/admin
            $table->timestamp('interview_at')->nullable();
            $table->string('interview_details', 500)->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->timestamps();
            $table->unique(['job_id', 'user_id', 'attempt']);
            $table->index(['user_id', 'created_at']);
            $table->index(['job_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('created_at');
        });

        Schema::create('application_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->string('note', 500)->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->index(['application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['application_status_history', 'applications', 'saved_jobs', 'featured_jobs',
            'job_questions', 'job_skills', 'jobs'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
