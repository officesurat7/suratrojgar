<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Locality extends Model
{
    protected $table = 'localities';
    protected $guarded = ['id'];
    protected function casts(): array { return ['is_active' => 'boolean', 'latitude' => 'float', 'longitude' => 'float']; }
    public function jobs(): \Illuminate\Database\Eloquent\Relations\HasMany { return $this->hasMany(Job::class); }
}
