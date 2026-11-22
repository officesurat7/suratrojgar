<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\BusinessCategory;
use App\Models\EducationLevel;
use App\Models\JobCategory;
use App\Models\Locality;
use App\Services\Settings;
use App\Support\Options;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** Lookup data for forms & filters. Cached; busted whenever admins edit taxonomy. */
class MetaController extends Controller
{
    public const CACHE_KEY = 'meta:v1';

    public function __invoke(Settings $settings): JsonResponse
    {
        $data = Cache::remember(self::CACHE_KEY, 3600, function () {
            $counts = DB::table('jobs')->where('status', 'active')->whereNull('deleted_at')
                ->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()));

            $catCounts = (clone $counts)->select('job_category_id', DB::raw('COUNT(*) c'))->groupBy('job_category_id')->pluck('c', 'job_category_id');
            $locCounts = (clone $counts)->select('locality_id', DB::raw('COUNT(*) c'))->groupBy('locality_id')->pluck('c', 'locality_id');

            return [
                'categories' => JobCategory::where('is_active', true)->orderBy('sort_order')->orderBy('name')
                    ->with(['roles' => fn ($q) => $q->where('is_active', true)->orderBy('name')->select('id', 'job_category_id', 'name', 'slug')])
                    ->get(['id', 'name', 'slug', 'icon', 'description'])
                    ->map(fn ($c) => $c->toArray() + ['job_count' => (int) ($catCounts[$c->id] ?? 0)])->values()->all(),
                'localities' => Locality::where('is_active', true)->orderBy('sort_order')->orderBy('name')
                    ->get(['id', 'name', 'slug', 'zone', 'pincode'])
                    ->map(fn ($l) => $l->toArray() + ['job_count' => (int) ($locCounts[$l->id] ?? 0)])->values()->all(),
                'education_levels' => EducationLevel::where('is_active', true)->orderBy('rank')->get(['id', 'name', 'slug', 'rank'])->toArray(),
                'business_categories' => BusinessCategory::where('is_active', true)->orderBy('name')->get(['id', 'name', 'slug'])->toArray(),
                'options' => [
                    'employment_types' => Options::EMPLOYMENT_TYPES,
                    'work_modes' => Options::WORK_MODES,
                    'shifts' => Options::SHIFTS,
                    'salary_periods' => Options::SALARY_PERIODS,
                    'joining' => Options::JOINING,
                    'experience_bands' => array_map(fn ($b) => $b['label'], Options::EXPERIENCE_BANDS),
                    'gender_preferences' => Options::GENDER_PREFERENCES,
                    'genders' => Options::GENDERS,
                    'contact_visibility' => Options::CONTACT_VISIBILITY,
                    'application_statuses' => Options::APPLICATION_STATUSES,
                    'employment_statuses' => Options::EMPLOYMENT_STATUSES,
                    'availability' => Options::AVAILABILITY,
                    'company_types' => Options::COMPANY_TYPES,
                    'complaint_reasons' => Options::COMPLAINT_REASONS,
                ],
                'stats' => [
                    'active_jobs' => (clone $counts)->count(),
                    'employers' => DB::table('employer_profiles')->whereNotNull('verified_at')->count(),
                ],
            ];
        });

        return response()->json($data + ['settings' => $settings->public()])
            ->header('Cache-Control', 'public, max-age=300, s-maxage=300');
    }
}
