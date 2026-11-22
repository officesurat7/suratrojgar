<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EducationLevel extends Model
{
    protected $table = 'education_levels';
    protected $guarded = ['id'];
    protected function casts(): array { return ['is_active' => 'boolean']; }
}
