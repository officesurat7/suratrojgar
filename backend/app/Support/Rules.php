<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

final class Rules
{
    /** Indian 10-digit mobile (optionally +91 / 0 prefixed; normalised before validation). */
    public const MOBILE = 'regex:/^[6-9]\d{9}$/';
    public const PINCODE = 'regex:/^[1-9]\d{5}$/';
    public const GSTIN = 'regex:/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/';

    public static function password(): Password
    {
        return Password::min(8)->max(72)->letters()->numbers();
    }

    public static function normaliseMobile(?string $m): ?string
    {
        if ($m === null || $m === '') {
            return null;
        }
        $d = preg_replace('/\D+/', '', $m);
        if (strlen($d) === 12 && str_starts_with($d, '91')) {
            $d = substr($d, 2);
        } elseif (strlen($d) === 11 && str_starts_with($d, '0')) {
            $d = substr($d, 1);
        }

        return $d;
    }

    /** Strip tags and normalise whitespace for plain-text user input. */
    public static function clean(?string $v, int $max = 5000): ?string
    {
        if ($v === null) {
            return null;
        }
        $v = trim(strip_tags($v));

        return $v === '' ? null : mb_substr($v, 0, $max);
    }
}
