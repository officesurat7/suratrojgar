<?php

namespace App\Services;

use App\Models\EducationLevel;
use App\Models\Job;
use App\Models\Locality;
use App\Support\Options;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * Public job search with the Admin-priority ordering rule:
 *   1. active priority jobs (featured_jobs within their window) ordered by priority 1..30
 *   2. all other jobs, latest published first
 *   3. only publicly visible jobs (active, published, not expired); no duplicates (1:1 join)
 */
class JobSearch
{
    public const PER_PAGE_MAX = 50;

    public function search(array $f): LengthAwarePaginator
    {
        $perPage = min(max((int) ($f['per_page'] ?? 20), 1), self::PER_PAGE_MAX);

        return $this->query($f)->paginate($perPage)->withQueryString();
    }

    public function query(array $f): Builder
    {
        $q = Job::query()->publiclyVisible()
            ->select('jobs.*')
            ->with(['category:id,name,slug', 'role:id,name,slug', 'locality:id,name,slug,pincode', 'educationLevel:id,name']);

        $this->applyFilters($q, $f);

        $sort = $f['sort'] ?? 'latest';
        $keyword = $this->booleanKeyword($f['q'] ?? null);

        // Admin priority applies to the default "latest" ordering (homepage + listing pages)
        if ($sort === 'latest' || $sort === 'priority') {
            $q->leftJoin('featured_jobs as fj', function ($j) {
                $j->on('fj.job_id', '=', 'jobs.id')
                    ->where(fn ($w) => $w->whereNull('fj.starts_at')->orWhere('fj.starts_at', '<=', now()))
                    ->where(fn ($w) => $w->whereNull('fj.ends_at')->orWhere('fj.ends_at', '>', now()));
            })->addSelect(DB::raw('fj.priority as priority_rank'))
                ->orderByRaw('fj.priority IS NULL')->orderBy('fj.priority')
                ->orderByDesc('jobs.published_at')->orderByDesc('jobs.id');
        } elseif ($sort === 'salary') {
            $q->orderByRaw('jobs.salary_monthly_max IS NULL')->orderByDesc('jobs.salary_monthly_max')
                ->orderByDesc('jobs.salary_monthly_min')->orderByDesc('jobs.published_at');
        } elseif ($sort === 'relevance' && $keyword && $this->fulltextAvailable()) {
            $q->addSelect(DB::raw('MATCH(jobs.title, jobs.company_display_name, jobs.skills_text, jobs.description) AGAINST ('.DB::getPdo()->quote($keyword).' IN BOOLEAN MODE) as relevance'))
                ->orderByDesc('relevance')->orderByDesc('jobs.published_at');
        } elseif ($sort === 'location' && ($near = $this->resolveLocality($f['near'] ?? null)) && $near->latitude) {
            // Nearest first, using approximate locality centroids (Surat-only platform)
            $q->leftJoin('localities as loc', 'loc.id', '=', 'jobs.locality_id')
                ->orderByRaw('loc.latitude IS NULL')
                ->orderByRaw('POW(loc.latitude - ?, 2) + POW((loc.longitude - ?) * 0.93, 2)', [$near->latitude, $near->longitude])
                ->orderByDesc('jobs.published_at');
        } else {
            $q->orderByDesc('jobs.published_at')->orderByDesc('jobs.id');
        }

        return $q;
    }

    private function applyFilters(Builder $q, array $f): void
    {
        $kw = $this->booleanKeyword($f['q'] ?? null);
        if (! $kw && ! empty($f['q']) && mb_strlen(trim($f['q'])) >= 2) {
            // Very short keywords (e.g. "IT", "HR") are not indexed by FULLTEXT: fall back to title match
            $q->where('jobs.title', 'like', '%'.addcslashes(trim($f['q']), '%_\\').'%');
        }
        if ($kw) {
            if ($this->fulltextAvailable()) {
                $q->whereRaw('MATCH(jobs.title, jobs.company_display_name, jobs.skills_text, jobs.description) AGAINST (? IN BOOLEAN MODE)', [$kw]);
            } else {
                $term = '%'.addcslashes($f['q'], '%_\\').'%';
                $q->where(fn ($w) => $w->where('jobs.title', 'like', $term)->orWhere('jobs.description', 'like', $term)->orWhere('jobs.skills_text', 'like', $term));
            }
        }
        if (! empty($f['title'])) {
            $q->where('jobs.title', 'like', '%'.addcslashes($f['title'], '%_\\').'%');
        }
        if (! empty($f['company'])) {
            $q->where('jobs.company_display_name', 'like', '%'.addcslashes($f['company'], '%_\\').'%');
        }
        if (! empty($f['category'])) {
            $ids = $this->idsFor('job_categories', $f['category']);
            $q->whereIn('jobs.job_category_id', $ids ?: [0]);
        }
        if (! empty($f['role'])) {
            $ids = $this->idsFor('job_roles', $f['role']);
            $q->whereIn('jobs.job_role_id', $ids ?: [0]);
        }
        if (! empty($f['locality'])) {
            $ids = $this->idsFor('localities', $f['locality']);
            $q->whereIn('jobs.locality_id', $ids ?: [0]);
        }
        if (! empty($f['area'])) {
            $q->where('jobs.area', 'like', '%'.addcslashes($f['area'], '%_\\').'%');
        }
        if (! empty($f['pincode']) && preg_match('/^\d{6}$/', $f['pincode'])) {
            $q->where('jobs.pincode', $f['pincode']);
        }
        if (! empty($f['state'])) {
            $q->where('jobs.state', $f['state']);
        }

        // Salary: user enters an amount in a period (default monthly); compare on monthly-normalised columns
        $period = in_array($f['salary_period'] ?? null, array_keys(Options::SALARY_PERIODS), true) ? $f['salary_period'] : 'monthly';
        if (isset($f['salary_min']) && is_numeric($f['salary_min'])) {
            $min = Options::toMonthly((float) $f['salary_min'], $period);
            $q->where(fn ($w) => $w->where('jobs.salary_monthly_max', '>=', $min)
                ->orWhere(fn ($x) => $x->whereNull('jobs.salary_monthly_max')->where('jobs.salary_monthly_min', '>=', $min)));
        }
        if (isset($f['salary_max']) && is_numeric($f['salary_max'])) {
            $max = Options::toMonthly((float) $f['salary_max'], $period);
            $q->where('jobs.salary_monthly_min', '<=', $max);
        }
        if (! empty($f['salary_type'])) {   // filter by how the job states pay
            $q->whereIn('jobs.salary_period', array_intersect((array) $f['salary_type'], array_keys(Options::SALARY_PERIODS)));
        }
        if (isset($f['negotiable']) && $f['negotiable'] !== '') {
            $q->where('jobs.salary_negotiable', filter_var($f['negotiable'], FILTER_VALIDATE_BOOLEAN));
        }

        // Employment type: remote / hybrid / work_from_home are work modes; the rest are employment types
        if (! empty($f['type'])) {
            $types = (array) $f['type'];
            $modes = array_values(array_intersect($types, array_keys(Options::WORK_MODES)));
            $emp = array_values(array_intersect($types, array_keys(Options::EMPLOYMENT_TYPES)));
            $q->where(function ($w) use ($modes, $emp) {
                if ($emp) {
                    $w->orWhereIn('jobs.employment_type', $emp);
                }
                if ($modes) {
                    $w->orWhereIn('jobs.work_mode', $modes);
                }
                if (! $emp && ! $modes) {
                    $w->whereRaw('1 = 0');
                }
            });
        }
        if (! empty($f['work_mode'])) {
            $q->whereIn('jobs.work_mode', (array) $f['work_mode']);
        }

        if (! empty($f['experience'])) {
            $bands = array_intersect_key(Options::EXPERIENCE_BANDS, array_flip((array) $f['experience']));
            if ($bands) {
                $q->where(function ($w) use ($bands) {
                    foreach ($bands as $key => $b) {
                        if ($key === 'fresher') {
                            $w->orWhere('jobs.experience_min', 0);
                        } else {
                            // job's required range overlaps the band
                            $w->orWhere(fn ($x) => $x->where('jobs.experience_min', '<=', $b['max'])
                                ->where(fn ($y) => $y->whereNull('jobs.experience_max')->orWhere('jobs.experience_max', '>=', $b['min'])));
                        }
                    }
                });
            }
        }

        if (! empty($f['education'])) {
            // Show jobs whose requirement is at or below the selected qualification (or no requirement)
            $rank = EducationLevel::whereIn('id', $this->idsFor('education_levels', $f['education']))->max('rank');
            if ($rank !== null) {
                $allowed = EducationLevel::where('rank', '<=', $rank)->pluck('id');
                $q->where(fn ($w) => $w->whereNull('jobs.education_level_id')->orWhereIn('jobs.education_level_id', $allowed));
            }
        }
        if (! empty($f['gender']) && in_array($f['gender'], ['male', 'female'], true)) {
            $q->whereIn('jobs.gender_preference', ['any', $f['gender']]);
        }
        if (! empty($f['immediate'])) {
            $q->where('jobs.joining', 'immediate');
        }
        if (! empty($f['min_vacancies']) && is_numeric($f['min_vacancies'])) {
            $q->where('jobs.vacancies', '>=', (int) $f['min_vacancies']);
        }
        if (! empty($f['shift'])) {
            $q->whereIn('jobs.shift', (array) $f['shift']);
        }
        if (! empty($f['weekly_off'])) {
            $q->where('jobs.weekly_off', 'like', '%'.addcslashes($f['weekly_off'], '%_\\').'%');
        }
        if (! empty($f['posted'])) {
            $since = match ($f['posted']) { '24h' => now()->subDay(), '7d' => now()->subDays(7), '30d' => now()->subDays(30), default => null };
            if ($since) {
                $q->where('jobs.published_at', '>=', $since);
            }
        }
        if (! empty($f['employer_id'])) {
            $q->where('jobs.employer_id', (int) $f['employer_id']);
        }
        if (! empty($f['exclude'])) {
            $q->where('jobs.id', '!=', (int) $f['exclude']);
        }
    }

    /** Accept ids or slugs (single value, comma list, or array). */
    private function idsFor(string $table, mixed $value): array
    {
        $values = is_array($value) ? $value : explode(',', (string) $value);
        $values = array_slice(array_filter(array_map('trim', $values)), 0, 30);
        $ids = array_map('intval', array_filter($values, 'ctype_digit'));
        $slugs = array_values(array_filter($values, fn ($v) => ! ctype_digit($v)));
        if ($slugs) {
            $ids = array_merge($ids, DB::table($table)->whereIn('slug', $slugs)->pluck('id')->all());
        }

        return array_values(array_unique($ids));
    }

    private function resolveLocality(mixed $v): ?Locality
    {
        if (! $v) {
            return null;
        }

        return ctype_digit((string) $v) ? Locality::find($v) : Locality::where('slug', $v)->first();
    }

    /** Sanitise free text into a safe MySQL boolean-mode query: +word* for each term. */
    public function booleanKeyword(?string $q): ?string
    {
        if (! $q) {
            return null;
        }
        $words = preg_split('/\s+/', preg_replace('/[^\p{L}\p{N}\s]+/u', ' ', mb_substr($q, 0, 100)));
        $stop = ['about', 'are', 'com', 'for', 'from', 'how', 'that', 'the', 'this', 'was', 'what', 'when', 'where', 'who', 'will', 'with', 'und', 'www', 'job', 'jobs'];
        // InnoDB ignores tokens shorter than innodb_ft_min_token_size (3) and stopwords
        $words = array_filter($words, fn ($w) => mb_strlen($w) >= 3 && ! in_array(mb_strtolower($w), $stop, true));
        if (! $words) {
            return null;
        }

        return implode(' ', array_map(fn ($w) => '+'.$w.'*', array_slice($words, 0, 8)));
    }

    private function fulltextAvailable(): bool
    {
        return DB::getDriverName() === 'mysql';
    }

    public static function cacheKey(array $f): string
    {
        $f = Arr::except($f, ['_']);
        ksort($f);

        return 'jobs:list:v'.cache()->get('jobs:version', 1).':'.md5(json_encode($f));
    }

    public static function bumpCacheVersion(): void
    {
        cache()->forever('jobs:version', ((int) cache()->get('jobs:version', 1)) + 1);
    }
}
