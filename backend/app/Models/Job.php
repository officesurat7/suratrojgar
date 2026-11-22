<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Job extends Model
{
    use SoftDeletes;

    protected $table = 'jobs';

    /** Columns that must NEVER be exposed publicly. */
    public const PRIVATE_FIELDS = ['office_address', 'contact_name', 'contact_mobile', 'contact_email'];

    protected $guarded = [
        'id', 'employer_id', 'status', 'approved_at', 'approved_by', 'published_at', 'submitted_at',
        'views_count', 'applications_count', 'fingerprint', 'slug', 'company_display_name', 'skills_text',
        'salary_monthly_min', 'salary_monthly_max', 'created_by', 'expiry_reminder_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'salary_min' => 'decimal:2', 'salary_max' => 'decimal:2',
            'salary_monthly_min' => 'decimal:2', 'salary_monthly_max' => 'decimal:2',
            'salary_negotiable' => 'boolean', 'allow_reapply' => 'boolean',
            'submitted_at' => 'datetime', 'approved_at' => 'datetime', 'published_at' => 'datetime',
            'expires_at' => 'datetime', 'expiry_reminder_sent_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Job $job) {
            if (! $job->slug || $job->isDirty(['title', 'locality_id'])) {
                $area = $job->locality_id ? Locality::whereKey($job->locality_id)->value('name') : null;
                $job->slug = Str::limit(Str::slug($job->title.' '.($area ?? 'surat')), 170, '');
            }
            $job->salary_monthly_min = \App\Support\Options::toMonthly($job->salary_min !== null ? (float) $job->salary_min : null, $job->salary_period);
            $job->salary_monthly_max = \App\Support\Options::toMonthly($job->salary_max !== null ? (float) ($job->salary_max) : null, $job->salary_period);
            $job->fingerprint = sha1(Str::lower(trim($job->title)).'|'.$job->job_category_id.'|'.$job->locality_id.'|'.$job->employment_type);
        });
    }

    // ---------------- Relations ----------------
    public function employer(): BelongsTo { return $this->belongsTo(User::class, 'employer_id'); }
    public function employerProfile(): BelongsTo { return $this->belongsTo(EmployerProfile::class, 'employer_id', 'user_id'); }
    public function category(): BelongsTo { return $this->belongsTo(JobCategory::class, 'job_category_id'); }
    public function role(): BelongsTo { return $this->belongsTo(JobRole::class, 'job_role_id'); }
    public function locality(): BelongsTo { return $this->belongsTo(Locality::class); }
    public function educationLevel(): BelongsTo { return $this->belongsTo(EducationLevel::class); }
    public function skills(): BelongsToMany { return $this->belongsToMany(Skill::class, 'job_skills')->withPivot('type'); }
    public function questions(): HasMany { return $this->hasMany(JobQuestion::class)->orderBy('sort_order'); }
    public function applications(): HasMany { return $this->hasMany(Application::class); }
    public function featured(): HasOne { return $this->hasOne(FeaturedJob::class); }

    // ---------------- Scopes ----------------
    /** Publicly visible: active and not expired. Excludes draft/pending/paused/closed/rejected/expired. */
    public function scopePubliclyVisible(Builder $q): Builder
    {
        return $q->where('jobs.status', 'active')
            ->whereNotNull('jobs.published_at')
            ->where(fn ($w) => $w->whereNull('jobs.expires_at')->orWhere('jobs.expires_at', '>', now()));
    }

    public function isPubliclyVisible(): bool
    {
        return $this->status === 'active' && $this->published_at !== null
            && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function publicUrlPath(): string
    {
        return '/jobs/'.$this->slug.'-'.$this->id;
    }

    public function syncSkills(array $required, array $preferred = []): void
    {
        $sync = [];
        foreach (Skill::resolveNames($required) as $s) {
            $sync[$s->id] = ['type' => 'required'];
        }
        foreach (Skill::resolveNames($preferred) as $s) {
            $sync[$s->id] ??= ['type' => 'preferred'];
        }
        $this->skills()->sync($sync);
        $this->skills_text = Skill::whereIn('id', array_keys($sync))->pluck('name')->implode(', ');
        $this->saveQuietly();
    }
}
