<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobRole extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array { return ['is_active' => 'boolean']; }

    public function category(): BelongsTo { return $this->belongsTo(JobCategory::class, 'job_category_id'); }
}
