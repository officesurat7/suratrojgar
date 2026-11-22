<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeaturedJob extends Model
{
    public const MAX = 30;

    protected $fillable = ['job_id', 'priority', 'starts_at', 'ends_at', 'created_by'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime'];
    }

    public function job(): BelongsTo { return $this->belongsTo(Job::class); }
}
