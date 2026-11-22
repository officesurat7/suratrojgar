<?php

namespace App\Services;

use App\Models\FeaturedJob;
use App\Models\Job;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Admin-controlled priority listing: up to 30 jobs, unique priority 1..30, audited. */
class FeaturedJobs
{
    public function list()
    {
        return FeaturedJob::with(['job' => fn ($q) => $q->withTrashed()->select('id', 'title', 'slug', 'status', 'expires_at', 'company_display_name', 'published_at', 'deleted_at')])
            ->orderBy('priority')->get();
    }

    /**
     * Replace the whole priority list atomically.
     * @param array<int, array{job_id:int, priority:int, starts_at?:?string, ends_at?:?string}> $items
     */
    public function replace(array $items, int $userId): void
    {
        if (count($items) > FeaturedJob::MAX) {
            throw ValidationException::withMessages(['items' => 'You can select at most '.FeaturedJob::MAX.' priority jobs.']);
        }
        $jobIds = array_column($items, 'job_id');
        $priorities = array_column($items, 'priority');
        if (count($jobIds) !== count(array_unique($jobIds))) {
            throw ValidationException::withMessages(['items' => 'The same job cannot be listed twice.']);
        }
        if (count($priorities) !== count(array_unique($priorities))) {
            throw ValidationException::withMessages(['items' => 'Each priority number (1–30) can be used only once.']);
        }
        foreach ($priorities as $p) {
            if ($p < 1 || $p > FeaturedJob::MAX) {
                throw ValidationException::withMessages(['items' => 'Priority must be between 1 and 30.']);
            }
        }
        $jobs = Job::whereIn('id', $jobIds)->get()->keyBy('id');
        foreach ($jobIds as $id) {
            $job = $jobs->get($id);
            if (! $job || ! $job->isPubliclyVisible()) {
                throw ValidationException::withMessages(['items' => "Job #{$id} is not active, so it cannot be prioritised."]);
            }
        }

        DB::transaction(function () use ($items, $userId) {
            $before = FeaturedJob::orderBy('priority')->get(['job_id', 'priority'])->toArray();
            FeaturedJob::query()->lockForUpdate()->delete();
            foreach ($items as $it) {
                FeaturedJob::create([
                    'job_id' => $it['job_id'], 'priority' => $it['priority'],
                    'starts_at' => $it['starts_at'] ?? null, 'ends_at' => $it['ends_at'] ?? null, 'created_by' => $userId,
                ]);
            }
            $after = FeaturedJob::orderBy('priority')->get(['job_id', 'priority'])->toArray();
            Audit::log('featured_jobs.updated', null, ['list' => $before], ['list' => $after], $userId);
        });
        JobSearch::bumpCacheVersion();
    }

    public function remove(int $jobId, ?int $userId, string $reason = 'removed'): void
    {
        $row = FeaturedJob::where('job_id', $jobId)->first();
        if ($row) {
            $row->delete();
            Audit::log('featured_jobs.'.$reason, $row, ['job_id' => $jobId, 'priority' => $row->priority], [], $userId);
            JobSearch::bumpCacheVersion();
        }
    }

    /** Called by the scheduler: drop entries whose job is no longer publicly visible or whose window ended. */
    public function prune(): int
    {
        $count = 0;
        foreach (FeaturedJob::with(['job' => fn ($q) => $q->withTrashed()])->get() as $row) {
            if (! $row->job || $row->job->trashed() || ! $row->job->isPubliclyVisible() || ($row->ends_at && $row->ends_at->isPast())) {
                $this->remove($row->job_id, null, 'auto_removed');
                $count++;
            }
        }

        return $count;
    }
}
