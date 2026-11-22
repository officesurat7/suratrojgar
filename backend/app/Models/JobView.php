<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobView extends Model
{
    protected $table = 'job_views';
    protected $guarded = ['id'];
    public const UPDATED_AT = null;
    protected function casts(): array { return ['filters' => 'array', 'success' => 'boolean']; }
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo { return $this->belongsTo(User::class); }
}
