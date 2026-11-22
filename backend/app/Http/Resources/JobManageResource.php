<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/** Full job for its owner (employer) and authorised admins: includes private contact fields. */
class JobManageResource extends JobCardResource
{
    public bool $detail = true;

    public function toArray(Request $request): array
    {
        $j = $this->resource;

        return parent::toArray($request) + [
            'job_category_id' => $j->job_category_id,
            'job_role_id' => $j->job_role_id,
            'locality_id' => $j->locality_id,
            'education_level_id' => $j->education_level_id,
            'employer_id' => $j->employer_id,
            'salary_min' => $j->salary_min, 'salary_max' => $j->salary_max,
            'salary_period' => $j->salary_period, 'salary_negotiable' => $j->salary_negotiable,
            'experience_min' => $j->experience_min, 'experience_max' => $j->experience_max,
            'office_address' => $j->office_address,
            'contact_name' => $j->contact_name,
            'contact_mobile' => $j->contact_mobile,
            'contact_email' => $j->contact_email,
            'gender_justification' => $j->gender_justification,
            'allow_reapply' => $j->allow_reapply,
            'deleted_at' => $j->deleted_at?->toIso8601String(),
            'rejection_reason' => $j->rejection_reason,
            'submitted_at' => $j->submitted_at?->toIso8601String(),
            'approved_at' => $j->approved_at?->toIso8601String(),
            'created_at' => $j->created_at?->toIso8601String(),
            'updated_at' => $j->updated_at?->toIso8601String(),
            'views_count' => $j->views_count,
            'applications_count' => $j->applications_count,
            'is_featured' => $j->relationLoaded('featured') ? (bool) $j->featured : null,
            'featured_priority' => $j->relationLoaded('featured') ? $j->featured?->priority : null,
            'employer' => $j->relationLoaded('employer') && $j->employer ? ['id' => $j->employer->id, 'name' => $j->employer->name, 'email' => $j->employer->email, 'status' => $j->employer->status] : null,
        ];
    }
}
