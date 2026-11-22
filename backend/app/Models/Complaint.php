<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    protected $table = 'complaints';
    protected $guarded = ['id'];
    protected function casts(): array { return ['resolved_at' => 'datetime']; }
    public function reporter(): \Illuminate\Database\Eloquent\Relations\BelongsTo { return $this->belongsTo(User::class, 'reporter_id'); }
    public function job(): \Illuminate\Database\Eloquent\Relations\BelongsTo { return $this->belongsTo(Job::class)->withTrashed(); }
    public function reportedUser(): \Illuminate\Database\Eloquent\Relations\BelongsTo { return $this->belongsTo(User::class, 'reported_user_id'); }
    public function assignee(): \Illuminate\Database\Eloquent\Relations\BelongsTo { return $this->belongsTo(User::class, 'assigned_to'); }
}
