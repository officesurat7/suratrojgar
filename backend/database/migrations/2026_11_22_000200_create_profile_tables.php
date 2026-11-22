<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('company_name', 150);
            $table->string('display_name', 150)->nullable();   // approved public name
            $table->string('slug', 180)->unique();
            $table->string('contact_person', 120);
            $table->string('company_type', 50);                // proprietorship, pvt_ltd, ...
            $table->foreignId('business_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('website', 255)->nullable();
            $table->string('gstin', 15)->nullable();
            $table->string('state', 60)->default('Gujarat');
            $table->string('city', 60)->default('Surat');
            $table->foreignId('locality_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area', 120)->nullable();
            $table->string('address', 500);                    // PRIVATE
            $table->string('pincode', 6);
            $table->text('about')->nullable();
            $table->string('logo_path', 255)->nullable();
            $table->string('company_size', 30)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('locality_id');
        });

        Schema::create('job_seeker_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('headline', 150)->nullable();
            $table->string('state', 60)->default('Gujarat');
            $table->string('city', 60)->default('Surat');
            $table->foreignId('locality_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area', 120)->nullable();
            $table->string('pincode', 6)->nullable();
            $table->string('gender', 20)->nullable();           // optional: male, female, other, prefer_not
            $table->date('date_of_birth')->nullable();          // optional
            $table->foreignId('education_level_id')->nullable()->constrained()->nullOnDelete();
            $table->string('employment_status', 30)->nullable(); // employed, unemployed, student, self_employed
            $table->decimal('experience_years', 4, 1)->default(0);
            $table->foreignId('preferred_category_id')->nullable()->constrained('job_categories')->nullOnDelete();
            $table->foreignId('preferred_role_id')->nullable()->constrained('job_roles')->nullOnDelete();
            $table->decimal('expected_salary', 12, 2)->nullable(); // monthly INR
            $table->string('preferred_job_type', 30)->nullable();
            $table->foreignId('preferred_locality_id')->nullable()->constrained('localities')->nullOnDelete();
            $table->string('preferred_work_mode', 20)->nullable();
            $table->string('availability', 30)->nullable();      // immediate, 15_days, 30_days, 60_days
            $table->text('about')->nullable();
            $table->unsignedTinyInteger('profile_completion')->default(0);
            $table->timestamps();
            // Locality-wise candidate database filters
            $table->index(['locality_id', 'preferred_job_type'], 'jsp_locality_type_idx');
            $table->index(['preferred_category_id', 'preferred_role_id'], 'jsp_pref_cat_role_idx');
            $table->index('expected_salary');
        });

        Schema::create('job_seeker_skills', function (Blueprint $table) {
            $table->foreignId('job_seeker_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('skill_id')->constrained()->cascadeOnDelete();
            $table->primary(['job_seeker_profile_id', 'skill_id']);
            $table->index('skill_id');
        });

        Schema::create('admin_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('designation', 100)->nullable();
            $table->string('department', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('resumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('original_name', 200);
            $table->string('path', 255);                         // private disk, outside web root
            $table->string('mime', 100);
            $table->unsignedInteger('size');
            $table->char('sha256', 64);
            $table->boolean('is_default')->default(false);
            $table->string('scan_status', 20)->default('pending'); // pending, clean, infected, skipped
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'is_default']);
        });

        Schema::create('employer_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('pending');   // pending, approved, rejected
            $table->string('method', 30)->default('manual');    // manual, gstin, document
            $table->string('notes', 1000)->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['employer_verifications', 'resumes', 'admin_profiles', 'job_seeker_skills',
            'job_seeker_profiles', 'employer_profiles'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
