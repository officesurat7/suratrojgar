<?php

namespace App\Services;

use App\Models\Application;
use App\Models\Job;
use App\Models\User;
use App\Notifications\ApplicationStatusNotification;
use App\Notifications\ApplicationSubmittedNotification;
use App\Notifications\NewApplicationNotification;
use App\Support\Options;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ApplicationService
{
    /** @param array{resume_id?:?int, cover_letter?:?string, answers?:array} $data */
    public function apply(Job $job, User $seeker, array $data): Application
    {
        if (! $seeker->isJobSeeker() || ! $seeker->isActive() || ! $seeker->email_verified_at) {
            throw ValidationException::withMessages(['job' => 'Only active, verified job seekers can apply.']);
        }
        if (! $job->isPubliclyVisible()) {
            throw ValidationException::withMessages(['job' => 'This job is no longer accepting applications.']);
        }

        $resumeId = $data['resume_id'] ?? null;
        if ($resumeId && ! $seeker->resumes()->whereKey($resumeId)->exists()) {
            throw ValidationException::withMessages(['resume_id' => 'Please choose one of your own resumes.']);
        }
        $resumeId ??= $seeker->resumes()->where('is_default', true)->value('id');

        // Validate custom questions
        $answers = [];
        foreach ($job->questions as $q) {
            $a = trim((string) ($data['answers'][$q->id] ?? ''));
            if ($q->is_required && $a === '') {
                throw ValidationException::withMessages(["answers.{$q->id}" => "Please answer: {$q->question}"]);
            }
            if ($a !== '') {
                $answers[] = ['question_id' => $q->id, 'question' => $q->question, 'answer' => Str::limit($a, 1000, '')];
            }
        }

        try {
            $application = DB::transaction(function () use ($job, $seeker, $data, $resumeId, $answers) {
                $previous = Application::where('job_id', $job->id)->where('user_id', $seeker->id)
                    ->lockForUpdate()->orderByDesc('attempt')->first();
                if ($previous) {
                    $canReapply = $job->allow_reapply && in_array($previous->status, ['rejected', 'withdrawn'], true);
                    if (! $canReapply) {
                        throw ValidationException::withMessages(['job' => 'You have already applied for this job. Track it under "My Applications".']);
                    }
                }
                $app = Application::create([
                    'application_no' => $this->newNumber(),
                    'job_id' => $job->id, 'user_id' => $seeker->id,
                    'attempt' => ($previous?->attempt ?? 0) + 1,
                    'resume_id' => $resumeId,
                    'cover_letter' => isset($data['cover_letter']) ? Str::limit(strip_tags($data['cover_letter']), 3000, '') : null,
                    'answers' => $answers ?: null,
                    'status' => 'applied', 'status_changed_at' => now(),
                ]);
                $app->history()->create(['from_status' => null, 'to_status' => 'applied', 'changed_by' => $seeker->id]);
                Job::whereKey($job->id)->increment('applications_count');

                return $app;
            });
        } catch (QueryException $e) {
            // Unique (job_id, user_id, attempt) protects against double-click races
            if (str_contains($e->getMessage(), 'Duplicate')) {
                throw ValidationException::withMessages(['job' => 'You have already applied for this job.']);
            }
            throw $e;
        }

        $seeker->notify(new ApplicationSubmittedNotification($application));
        $job->employer?->notify(new NewApplicationNotification($application));

        return $application;
    }

    public function changeStatus(Application $app, string $status, User $actor, ?string $note = null, array $extra = []): Application
    {
        if (! array_key_exists($status, Options::APPLICATION_STATUSES)) {
            throw ValidationException::withMessages(['status' => 'Invalid status.']);
        }
        if ($status === 'withdrawn' && $actor->id !== $app->user_id) {
            throw ValidationException::withMessages(['status' => 'Only the candidate can withdraw an application.']);
        }
        if ($app->status === 'withdrawn') {
            throw ValidationException::withMessages(['status' => 'This application was withdrawn by the candidate.']);
        }
        if ($status === 'interview_scheduled' && empty($extra['interview_at'])) {
            throw ValidationException::withMessages(['interview_at' => 'Please choose the interview date and time.']);
        }
        $from = $app->status;
        if ($from === $status && empty($extra)) {
            return $app;
        }

        DB::transaction(function () use ($app, $status, $actor, $note, $extra, $from) {
            $app->status = $status;
            $app->status_changed_at = now();
            if (isset($extra['interview_at'])) {
                $app->interview_at = $extra['interview_at'];
                $app->interview_details = $extra['interview_details'] ?? null;
            }
            $app->save();
            $app->history()->create(['from_status' => $from, 'to_status' => $status, 'note' => $note ? Str::limit($note, 500, '') : null, 'changed_by' => $actor->id]);
        });

        if ($from !== $status && $actor->id !== $app->user_id) {
            $app->user->notify(new ApplicationStatusNotification($app, $note));
        }
        if ($status === 'withdrawn') {
            Job::whereKey($app->job_id)->where('applications_count', '>', 0)->decrement('applications_count');
        }

        return $app;
    }

    private function newNumber(): string
    {
        do {
            $no = 'SR'.now()->format('ymd').strtoupper(Str::random(6));
            $no = strtr($no, ['O' => '0', 'I' => '1', 'L' => '7']);
        } while (Application::where('application_no', $no)->exists());

        return $no;
    }
}
