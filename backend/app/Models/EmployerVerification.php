<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployerVerification extends Model
{
    protected $table = 'employer_verifications';
    protected $guarded = ['id'];
    protected function casts(): array { return ['reviewed_at' => 'datetime']; }
}
