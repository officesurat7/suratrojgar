<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataRequest extends Model
{
    protected $table = 'data_requests';
    protected $guarded = ['id'];
    protected function casts(): array { return ['processed_at' => 'datetime']; }
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo { return $this->belongsTo(User::class); }
}
