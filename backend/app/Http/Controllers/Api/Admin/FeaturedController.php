<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FeaturedJob;
use App\Models\Job;
use App\Services\FeaturedJobs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** FEATURED / PRIORITY JOB MANAGEMENT (max 30, priority 1..30). */
class FeaturedController extends Controller
{
    public function __construct(private FeaturedJobs $featured) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'max' => FeaturedJob::MAX,
            'data' => $this->featured->list()->map(fn ($f) => [
                'job_id' => $f->job_id, 'priority' => $f->priority,
                'starts_at' => $f->starts_at?->toIso8601String(), 'ends_at' => $f->ends_at?->toIso8601String(),
                'job' => $f->job ? ['id' => $f->job->id, 'title' => $f->job->title, 'company' => $f->job->company_display_name,
                    'status' => $f->job->trashed() ? 'deleted' : $f->job->status, 'expires_at' => $f->job->expires_at?->toIso8601String(),
                    'is_live' => $f->job->isPubliclyVisible() && ! $f->job->trashed(), 'url' => $f->job->publicUrlPath()] : null,
            ]),
        ]);
    }

    /** Search active jobs to add to the priority list. */
    public function candidates(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $jobs = Job::publiclyVisible()->whereDoesntHave('featured')
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => ctype_digit($s) ? $w->whereKey((int) $s) : $w->where('title', 'like', '%'.addcslashes($s, '%_\\').'%')->orWhere('company_display_name', 'like', '%'.addcslashes($s, '%_\\').'%')))
            ->latest('published_at')->limit(20)->get(['id', 'title', 'company_display_name', 'published_at', 'expires_at']);

        return response()->json(['data' => $jobs->map(fn ($j) => ['id' => $j->id, 'title' => $j->title, 'company' => $j->company_display_name, 'published_at' => $j->published_at?->toIso8601String(), 'expires_at' => $j->expires_at?->toIso8601String()])]);
    }

    /** Replace the full ordered list in one atomic save (used by drag-and-drop and the numbered fields). */
    public function replace(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['present', 'array', 'max:'.FeaturedJob::MAX],
            'items.*.job_id' => ['required', 'integer', 'distinct'],
            'items.*.priority' => ['required', 'integer', 'min:1', 'max:'.FeaturedJob::MAX, 'distinct'],
            'items.*.starts_at' => ['nullable', 'date'],
            'items.*.ends_at' => ['nullable', 'date', 'after:now'],
        ]);
        $this->featured->replace($data['items'], $request->user()->id);

        return response()->json(['message' => 'Priority jobs saved.']);
    }

    public function destroy(Request $request, int $jobId): JsonResponse
    {
        $this->featured->remove($jobId, $request->user()->id);

        return response()->json(['message' => 'Removed from priority list. The job returns to its normal position.']);
    }

    public function history(): JsonResponse
    {
        return response()->json(['data' => AuditLog::with('user:id,name,user_type')->where('action', 'like', 'featured_jobs.%')
            ->latest('id')->limit(100)->get(['id', 'user_id', 'action', 'old_values', 'new_values', 'created_at'])]);
    }
}
