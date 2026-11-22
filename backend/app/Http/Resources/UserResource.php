<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** The signed-in user's own account. */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $u = $this->resource;

        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'mobile' => $u->mobile,
            'user_type' => $u->user_type,
            'status' => $u->status,
            'email_verified' => (bool) $u->email_verified_at,
            'two_factor_enabled' => (bool) $u->two_factor_enabled,
            'permissions' => $u->isAdminType() ? $u->permissionNames() : [],
            'notification_preferences' => $u->notification_preferences ?? (object) [],
            'deletion_requested_at' => $u->deletion_requested_at?->toIso8601String(),
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
            'employer' => $u->isEmployer() && $u->relationLoaded('employerProfile') && $u->employerProfile ? [
                'company_name' => $u->employerProfile->company_name,
                'slug' => $u->employerProfile->slug,
                'verified' => (bool) $u->employerProfile->verified_at,
            ] : null,
            'profile_completion' => $u->isJobSeeker() && $u->relationLoaded('seekerProfile') ? $u->seekerProfile?->profile_completion : null,
        ];
    }
}
