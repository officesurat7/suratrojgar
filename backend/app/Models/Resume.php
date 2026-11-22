<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Resume extends Model
{
    use SoftDeletes;

    protected $fillable = ['user_id', 'original_name', 'path', 'mime', 'size', 'sha256', 'is_default', 'scan_status'];
    protected $hidden = ['path', 'sha256'];

    protected function casts(): array
    {
        return ['is_default' => 'boolean'];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
