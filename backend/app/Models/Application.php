<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Application extends Model
{
    protected $fillable = [
        'application_no', 'job_id', 'user_id', 'attempt', 'resume_id', 'cover_letter', 'answers',
        'status', 'employer_notes', 'interview_at', 'interview_details', 'status_changed_at',
    ];

    protected function casts(): array
    {
        return ['answers' => 'array', 'interview_at' => 'datetime', 'status_changed_at' => 'datetime'];
    }

    public function job(): BelongsTo { return $this->belongsTo(Job::class)->withTrashed(); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function resume(): BelongsTo { return $this->belongsTo(Resume::class)->withTrashed(); }
    public function history(): HasMany { return $this->hasMany(ApplicationStatusHistory::class)->orderBy('created_at'); }
}
