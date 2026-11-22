<?php

namespace App\Http\Resources;

use App\Support\Options;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * PUBLIC job representation (listings, cards, public detail).
 * Whitelist only: private fields (office_address, contact_*) can never leak through here.
 */
class JobCardResource extends JsonResource
{
    public bool $detail = false;

    public function withDetail(): static
    {
        $this->detail = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $j = $this->resource;
        $data = [
            'id' => $j->id,
            'slug' => $j->slug,
            'url' => $j->publicUrlPath(),
            'title' => $j->title,
            'company' => $j->company_display_name,
            'company_slug' => $this->whenLoaded('employerProfile', fn () => $j->employerProfile?->slug),
            'company_verified' => $this->whenLoaded('employerProfile', fn () => (bool) $j->employerProfile?->verified_at),
            'category' => $j->category ? ['id' => $j->category->id, 'name' => $j->category->name, 'slug' => $j->category->slug] : null,
            'role' => $j->role ? ['id' => $j->role->id, 'name' => $j->role->name, 'slug' => $j->role->slug] : null,
            'salary' => [
                'min' => $j->salary_min !== null ? (float) $j->salary_min : null,
                'max' => $j->salary_max !== null ? (float) $j->salary_max : null,
                'currency' => $j->salary_currency,
                'period' => $j->salary_period,
                'negotiable' => $j->salary_negotiable,
            ],
            'location' => [
                'city' => $j->city,
                'state' => $j->state,
                'locality' => $j->locality ? ['id' => $j->locality->id, 'name' => $j->locality->name, 'slug' => $j->locality->slug] : null,
                'area' => $j->area,          // general area only, never the street address
                'pincode' => $j->pincode,
            ],
            'employment_type' => $j->employment_type,
            'employment_type_label' => Options::EMPLOYMENT_TYPES[$j->employment_type] ?? $j->employment_type,
            'work_mode' => $j->work_mode,
            'work_mode_label' => Options::WORK_MODES[$j->work_mode] ?? $j->work_mode,
            'shift' => $j->shift,
            'experience' => ['min' => $j->experience_min, 'max' => $j->experience_max],
            'education' => $j->educationLevel?->name,
            'vacancies' => $j->vacancies,
            'joining' => $j->joining,
            'posted_at' => $j->published_at?->toIso8601String(),
            'expires_at' => $j->expires_at?->toIso8601String(),
            'excerpt' => Str::limit(trim(preg_replace('/\s+/', ' ', strip_tags($j->description))), 180),
            'is_priority' => isset($j->priority_rank) && $j->priority_rank !== null,
            'priority' => $j->priority_rank ?? null,
        ];

        if ($this->detail) {
            $data += [
                'description' => $j->description,
                'skills_required' => $j->skills->where('pivot.type', 'required')->pluck('name')->values(),
                'skills_preferred' => $j->skills->where('pivot.type', 'preferred')->pluck('name')->values(),
                'working_days' => $j->working_days,
                'working_hours' => $j->working_hours,
                'weekly_off' => $j->weekly_off,
                'benefits' => $j->benefits,
                'gender_preference' => $j->gender_preference,
                'contact_visibility' => $j->contact_visibility,   // tells the UI whether a "View contact" button makes sense
                'questions' => $j->questions->map(fn ($q) => ['id' => $q->id, 'question' => $q->question, 'is_required' => $q->is_required])->values(),
                'status' => $j->status,
                'is_active' => $j->isPubliclyVisible(),
                'company_about' => $j->employerProfile?->about ? Str::limit($j->employerProfile->about, 600) : null,
            ];
        }

        return $data;
    }
}
