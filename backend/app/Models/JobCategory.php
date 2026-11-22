<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobCategory extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array { return ['is_active' => 'boolean']; }

    public function roles(): HasMany { return $this->hasMany(JobRole::class); }
    public function jobs(): HasMany { return $this->hasMany(Job::class); }
}
