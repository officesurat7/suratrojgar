<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationStatusHistory extends Model
{
    protected $table = 'application_status_history';
    public const UPDATED_AT = null;
    protected $fillable = ['application_id', 'from_status', 'to_status', 'note', 'changed_by'];

    public function changer(): BelongsTo { return $this->belongsTo(User::class, 'changed_by'); }
}
