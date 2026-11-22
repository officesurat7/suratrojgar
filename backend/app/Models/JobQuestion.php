<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobQuestion extends Model
{
    protected $table = 'job_questions';
    protected $guarded = ['id'];
    protected function casts(): array { return ['is_required' => 'boolean']; }
}
