<?php

namespace App\Http\Resources;

use App\Support\Options;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Application view. $viewer: 'seeker' (own application) | 'employer' | 'admin'.
 * Employer notes are never shown to the candidate.
 */
class ApplicationResource extends JsonResource
{
    public string $viewer = 'seeker';

    public function as(string $viewer): static
    {
        $this->viewer = $viewer;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $a = $this->resource;
        $data = [
            'id' => $a->id,
            'application_no' => $a->application_no,
            'status' => $a->status,
            'status_label' => Options::APPLICATION_STATUSES[$a->status] ?? $a->status,
            'applied_at' => $a->created_at?->toIso8601String(),
            'status_changed_at' => $a->status_changed_at?->toIso8601String(),
            'interview_at' => $a->interview_at?->toIso8601String(),
            'interview_details' => $a->interview_details,
            'cover_letter' => $a->cover_letter,
            'answers' => $a->answers ?? [],
            'job' => $a->relationLoaded('job') && $a->job ? [
                'id' => $a->job->id, 'title' => $a->job->title, 'company' => $a->job->company_display_name,
                'url' => $a->job->publicUrlPath(), 'status' => $a->job->status,
                'locality' => $a->job->locality?->name,
            ] : null,
            'resume' => $a->relationLoaded('resume') && $a->resume ? ['id' => $a->resume->id, 'name' => $a->resume->original_name] : null,
            'history' => $a->relationLoaded('history') ? $a->history->map(fn ($h) => [
                'from' => $h->from_status, 'to' => $h->to_status,
                'label' => Options::APPLICATION_STATUSES[$h->to_status] ?? $h->to_status,
                'note' => $h->note,
                'at' => $h->created_at?->toIso8601String(),
            ])->values() : [],
        ];

        if ($this->viewer !== 'seeker') {
            $u = $a->user;
            $p = $u?->seekerProfile;
            $data['employer_notes'] = $a->employer_notes;
            $data['candidate'] = $u ? [
                'id' => $u->id, 'name' => $u->name,
                // Employers see applicant contact details only for applications to their own jobs (enforced by controller)
                'email' => $u->email, 'mobile' => $u->mobile,
                'locality' => $p?->locality?->name, 'experience_years' => $p ? (float) $p->experience_years : null,
                'education' => $p?->educationLevel?->name, 'expected_salary' => $p?->expected_salary !== null ? (float) $p->expected_salary : null,
                'headline' => $p?->headline,
            ] : null;
        }

        return $data;
    }
}
