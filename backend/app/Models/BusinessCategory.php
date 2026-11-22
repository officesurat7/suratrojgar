<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessCategory extends Model
{
    protected $table = 'business_categories';
    protected $guarded = ['id'];
    protected function casts(): array { return ['is_active' => 'boolean', 'requires_job_approval' => 'boolean']; }
}
