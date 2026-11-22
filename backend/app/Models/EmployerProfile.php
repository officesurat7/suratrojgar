<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployerProfile extends Model
{
    protected $guarded = ['id', 'verified_at', 'verified_by', 'slug'];

    protected function casts(): array
    {
        return ['verified_at' => 'datetime'];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function locality(): BelongsTo { return $this->belongsTo(Locality::class); }
    public function businessCategory(): BelongsTo { return $this->belongsTo(BusinessCategory::class); }
    public function verifications(): HasMany { return $this->hasMany(EmployerVerification::class); }

    public function publicName(): string
    {
        return $this->display_name ?: $this->company_name;
    }
}
