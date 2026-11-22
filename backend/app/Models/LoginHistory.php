<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginHistory extends Model
{
    protected $table = 'login_history';
    protected $guarded = ['id'];
    public const UPDATED_AT = null;
    protected function casts(): array { return ['filters' => 'array', 'success' => 'boolean']; }
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo { return $this->belongsTo(User::class); }
}
