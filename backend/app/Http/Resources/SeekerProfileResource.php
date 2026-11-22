<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Candidate profile. Contact fields are included only when 'with_contact' is set by an authorised caller. */
class SeekerProfileResource extends JsonResource
{
    public bool $withContact = false;

    public function withContact(bool $on = true): static
    {
        $this->withContact = $on;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $p = $this->resource;
        $u = $p->user;

        return [
            'user_id' => $p->user_id,
            'name' => $u?->name,
            'email' => $this->withContact ? $u?->email : null,
            'mobile' => $this->withContact ? $u?->mobile : null,
            'headline' => $p->headline,
            'state' => $p->state, 'city' => $p->city,
            'locality_id' => $p->locality_id, 'locality' => $p->locality?->name,
            'area' => $p->area, 'pincode' => $p->pincode,
            'gender' => $p->gender,
            'date_of_birth' => $this->withContact ? $p->date_of_birth?->toDateString() : null,
            'education_level_id' => $p->education_level_id, 'education' => $p->educationLevel?->name,
            'employment_status' => $p->employment_status,
            'experience_years' => (float) $p->experience_years,
            'preferred_category_id' => $p->preferred_category_id, 'preferred_category' => $p->preferredCategory?->name,
            'preferred_role_id' => $p->preferred_role_id, 'preferred_role' => $p->preferredRole?->name,
            'expected_salary' => $p->expected_salary !== null ? (float) $p->expected_salary : null,
            'preferred_job_type' => $p->preferred_job_type,
            'preferred_locality_id' => $p->preferred_locality_id, 'preferred_locality' => $p->preferredLocality?->name,
            'preferred_work_mode' => $p->preferred_work_mode,
            'availability' => $p->availability,
            'about' => $p->about,
            'skills' => $p->skills->pluck('name')->values(),
            'profile_completion' => $p->profile_completion,
            'member_since' => $u?->created_at?->toDateString(),
        ];
    }
}
