<?php

namespace App\Services;

use App\Models\Job;
use App\Models\User;
use App\Notifications\AdminAlertNotification;
use App\Support\Options;
use App\Support\Rules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Validates and persists job posts for employers and admins. */
class JobEditor
{
    public function __construct(private Settings $settings) {}

    public function rules(bool $draft): array
    {
        $req = $draft ? 'nullable' : 'required';

        return [
            'title' => ['required', 'string', 'min:3', 'max:150'],
            'job_category_id' => ['required', 'integer', Rule::exists('job_categories', 'id')->where('is_active', true)],
            'job_role_id' => ['nullable', 'integer', 'exists:job_roles,id'],
            'description' => [$req, 'nullable', 'string', 'min:30', 'max:10000'],
            'skills_required' => ['nullable', 'array', 'max:20'], 'skills_required.*' => ['string', 'max:60'],
            'skills_preferred' => ['nullable', 'array', 'max:20'], 'skills_preferred.*' => ['string', 'max:60'],
            'vacancies' => [$req, 'nullable', 'integer', 'min:1', 'max:5000'],
            'salary_min' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'salary_max' => ['nullable', 'numeric', 'min:0', 'max:100000000', 'gte:salary_min'],
            'salary_period' => ['required', Rule::in(array_keys(Options::SALARY_PERIODS))],
            'salary_negotiable' => ['boolean'],
            'employment_type' => ['required', Rule::in(array_keys(Options::EMPLOYMENT_TYPES))],
            'work_mode' => ['required', Rule::in(array_keys(Options::WORK_MODES))],
            'shift' => ['nullable', Rule::in(array_keys(Options::SHIFTS))],
            'locality_id' => [$req, 'nullable', 'integer', 'exists:localities,id'],
            'area' => ['nullable', 'string', 'max:120'],
            'pincode' => [$req, 'nullable', Rules::PINCODE],
            'office_address' => ['nullable', 'string', 'max:500'],
            'experience_min' => ['nullable', 'integer', 'min:0', 'max:50'],
            'experience_max' => ['nullable', 'integer', 'min:0', 'max:60', 'gte:experience_min'],
            'education_level_id' => ['nullable', 'integer', 'exists:education_levels,id'],
            'joining' => ['nullable', Rule::in(array_keys(Options::JOINING))],
            'working_days' => ['nullable', 'string', 'max:60'],
            'working_hours' => ['nullable', 'string', 'max:60'],
            'weekly_off' => ['nullable', 'string', 'max:60'],
            'benefits' => ['nullable', 'string', 'max:2000'],
            'gender_preference' => ['nullable', Rule::in(array_keys(Options::GENDER_PREFERENCES))],
            // A gender restriction must be justified (e.g. statutory/occupational requirement)
            'gender_justification' => ['nullable', 'required_if:gender_preference,male,female', 'string', 'min:10', 'max:255'],
            'expires_at' => ['nullable', 'date', 'after:today'],
            'contact_name' => [$req, 'nullable', 'string', 'max:120'],
            'contact_mobile' => [$req, 'nullable', Rules::MOBILE],
            'contact_email' => [$req, 'nullable', 'email', 'max:191'],
            'contact_visibility' => ['nullable', Rule::in(array_keys(Options::CONTACT_VISIBILITY))],
            'allow_reapply' => ['boolean'],
            'questions' => ['nullable', 'array', 'max:5'],
            'questions.*.question' => ['required', 'string', 'min:5', 'max:300'],
            'questions.*.is_required' => ['boolean'],
            'confirm_duplicate' => ['boolean'],
        ];
    }

    public function validate(Request $request, bool $draft): array
    {
        $request->merge(['contact_mobile' => Rules::normaliseMobile($request->input('contact_mobile'))]);

        return $request->validate($this->rules($draft), [
            'gender_justification.required_if' => 'Please explain the legal/occupational reason for a gender-specific job, or choose "Open to all".',
        ]);
    }

    public function save(?Job $job, array $data, User $employer, User $actor): Job
    {
        $isNew = ! $job;
        if ($isNew && ! $actor->isAdminType()) {
            $today = Job::where('employer_id', $employer->id)->where('created_at', '>=', now()->startOfDay())->count();
            if ($today >= (int) $this->settings->get('max_jobs_per_employer_per_day')) {
                Notification::send(AdminAlertNotification::recipients('employers.manage'), new AdminAlertNotification(
                    'suspicious_employer', 'Unusual posting activity', "{$employer->employerProfile?->company_name} hit the daily job posting limit.", '/admin/employers/'.$employer->id
                ));
                throw ValidationException::withMessages(['title' => 'You have reached today\'s job posting limit. Please try again tomorrow or contact support.']);
            }
        }

        return DB::transaction(function () use ($job, $data, $employer, $actor, $isNew) {
            $job ??= new Job;
            $fields = collect($data)->except(['skills_required', 'skills_preferred', 'questions', 'confirm_duplicate'])->all();
            foreach (['title' => 150, 'area' => 120, 'office_address' => 500, 'working_days' => 60, 'working_hours' => 60, 'weekly_off' => 60, 'benefits' => 2000, 'contact_name' => 120, 'gender_justification' => 255] as $k => $max) {
                if (array_key_exists($k, $fields)) {
                    $fields[$k] = Rules::clean($fields[$k], $max);
                }
            }
            if (array_key_exists('description', $fields)) {
                // Plain text only (rendered with line breaks); HTML is stripped to prevent XSS
                $fields['description'] = Rules::clean($fields['description'], 10000) ?? '';
            }
            $fields['gender_preference'] = $fields['gender_preference'] ?? 'any';
            if ($fields['gender_preference'] === 'any') {
                $fields['gender_justification'] = null;
            }
            $fields['experience_min'] = $fields['experience_min'] ?? 0;
            $fields['contact_visibility'] = $fields['contact_visibility'] ?? 'verified_users';
            $fields['joining'] = $fields['joining'] ?? 'flexible';
            $fields['vacancies'] = $fields['vacancies'] ?? 1;
            $fields['description'] = $fields['description'] ?? ($job->description ?? '');

            $job->fill($fields);
            $job->state = 'Gujarat';
            $job->city = 'Surat';
            if ($isNew) {
                $job->employer_id = $employer->id;
                $job->created_by = $actor->id;
                $job->status = 'draft';
            }
            $job->company_display_name = $employer->employerProfile?->publicName() ?? $employer->name;

            // Duplicate detection: same title/category/locality/type already open for this employer
            $job->setRelation('locality', $job->locality_id ? \App\Models\Locality::find($job->locality_id) : null);
            $fingerprint = sha1(\Illuminate\Support\Str::lower(trim($job->title)).'|'.$job->job_category_id.'|'.$job->locality_id.'|'.$job->employment_type);
            $dup = Job::where('employer_id', $employer->id)->where('fingerprint', $fingerprint)
                ->whereIn('status', ['pending', 'active', 'paused'])
                ->where('created_at', '>', now()->subDays((int) $this->settings->get('duplicate_job_window_days')))
                ->when($job->exists, fn ($q) => $q->where('id', '!=', $job->id))->first();
            if ($dup && empty($data['confirm_duplicate'])) {
                throw ValidationException::withMessages(['confirm_duplicate' => "A similar job (\"{$dup->title}\", #{$dup->id}) is already posted. Edit that job instead, or confirm that this is a different opening."]);
            }

            $job->save();
            if (array_key_exists('skills_required', $data) || array_key_exists('skills_preferred', $data)) {
                $job->syncSkills($data['skills_required'] ?? [], $data['skills_preferred'] ?? []);
            }
            if (array_key_exists('questions', $data)) {
                $job->questions()->delete();
                foreach (array_values($data['questions'] ?? []) as $i => $q) {
                    $job->questions()->create(['question' => Rules::clean($q['question'], 300), 'is_required' => (bool) ($q['is_required'] ?? false), 'sort_order' => $i]);
                }
            }
            Audit::log($isNew ? 'job.created' : 'job.updated', $job, [], ['title' => $job->title, 'by' => $actor->user_type]);

            return $job;
        });
    }
}
