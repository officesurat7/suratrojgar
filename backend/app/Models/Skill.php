<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class Skill extends Model
{
    protected $fillable = ['name', 'slug'];

    /** Find-or-create skills by free-text names (trimmed, max 20, max 60 chars each). */
    public static function resolveNames(array $names): Collection
    {
        return collect($names)
            ->map(fn ($n) => Str::of((string) $n)->squish()->limit(60, '')->toString())
            ->filter()->unique(fn ($n) => Str::lower($n))->take(20)
            ->map(fn ($n) => static::firstOrCreate(['slug' => Str::slug($n)], ['name' => $n]))
            ->values();
    }
}
