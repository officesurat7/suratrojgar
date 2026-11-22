<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class JobSeekerProfile extends Model
{
    protected $guarded = ['id', 'profile_completion'];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date', 'expected_salary' => 'decimal:2', 'experience_years' => 'decimal:1'];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function locality(): BelongsTo { return $this->belongsTo(Locality::class); }
    public function preferredLocality(): BelongsTo { return $this->belongsTo(Locality::class, 'preferred_locality_id'); }
    public function educationLevel(): BelongsTo { return $this->belongsTo(EducationLevel::class); }
    public function preferredCategory(): BelongsTo { return $this->belongsTo(JobCategory::class, 'preferred_category_id'); }
    public function preferredRole(): BelongsTo { return $this->belongsTo(JobRole::class, 'preferred_role_id'); }
    public function skills(): BelongsToMany { return $this->belongsToMany(Skill::class, 'job_seeker_skills'); }

    /** Profile completion percentage (shown on the seeker dashboard). */
    public function computeCompletion(): int
    {
        $checks = [
            filled($this->headline), filled($this->locality_id), filled($this->pincode),
            filled($this->education_level_id), filled($this->employment_status),
            filled($this->preferred_category_id), filled($this->preferred_role_id),
            filled($this->expected_salary), filled($this->preferred_job_type), filled($this->preferred_work_mode),
            filled($this->availability), filled($this->about),
            $this->skills()->exists(),
            $this->user?->resumes()->exists() ?? false,
            $this->user?->mobile !== null,
        ];

        return (int) round(count(array_filter($checks)) / count($checks) * 100);
    }

    public function refreshCompletion(): void
    {
        $this->profile_completion = $this->computeCompletion();
        $this->saveQuietly();
    }
}
