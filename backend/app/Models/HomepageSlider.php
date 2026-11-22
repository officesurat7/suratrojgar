<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomepageSlider extends Model
{
    protected $table = 'homepage_sliders';
    protected $guarded = ['id'];
    protected function casts(): array { return ['is_active' => 'boolean', 'starts_at' => 'datetime', 'ends_at' => 'datetime']; }
}
