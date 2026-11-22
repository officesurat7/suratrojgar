<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Public\MetaController;
use App\Http\Controllers\Controller;
use App\Models\BusinessCategory;
use App\Models\EducationLevel;
use App\Models\HomepageSlider;
use App\Models\JobCategory;
use App\Models\JobRole;
use App\Models\Locality;
use App\Models\Skill;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** Taxonomy (categories, roles, skills, localities, education, business categories) and homepage sliders. */
class ContentController extends Controller
{
    private const TAXONOMIES = [
        'categories' => [JobCategory::class, 'job_categories'],
        'roles' => [JobRole::class, 'job_roles'],
        'skills' => [Skill::class, 'skills'],
        'localities' => [Locality::class, 'localities'],
        'education' => [EducationLevel::class, 'education_levels'],
        'business-categories' => [BusinessCategory::class, 'business_categories'],
    ];

    private function model(string $type): array
    {
        abort_unless(isset(self::TAXONOMIES[$type]), 404);

        return self::TAXONOMIES[$type];
    }

    public function taxonomyIndex(Request $request, string $type): JsonResponse
    {
        [$class] = $this->model($type);
        $q = $class::query();
        if ($type === 'roles') {
            $q->with('category:id,name')->when($request->category_id, fn ($x, $v) => $x->where('job_category_id', $v));
        }
        if ($type === 'categories') {
            $q->withCount(['jobs' => fn ($j) => $j->where('status', 'active')]);
        }
        $q->when($request->q, fn ($x, $s) => $x->where('name', 'like', '%'.addcslashes($s, '%_\\').'%'));
        $order = in_array($type, ['categories', 'localities'], true) ? 'sort_order' : ($type === 'education' ? 'rank' : 'name');

        return response()->json(['data' => $q->orderBy($order)->orderBy('name')->limit(1000)->get()]);
    }

    public function taxonomySave(Request $request, string $type, ?int $id = null): JsonResponse
    {
        [$class, $table] = $this->model($type);
        $rules = ['name' => ['required', 'string', 'min:2', 'max:100'], 'is_active' => ['boolean']];
        $rules += match ($type) {
            'categories' => ['icon' => ['nullable', 'string', 'max:50'], 'description' => ['nullable', 'string', 'max:500'], 'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999']],
            'roles' => ['job_category_id' => ['required', 'integer', 'exists:job_categories,id']],
            'localities' => ['zone' => ['nullable', 'string', 'max:50'], 'pincode' => ['nullable', 'regex:/^[1-9]\d{5}$/'], 'latitude' => ['nullable', 'numeric', 'between:20,22.5'], 'longitude' => ['nullable', 'numeric', 'between:72,74'], 'sort_order' => ['nullable', 'integer']],
            'education' => ['rank' => ['required', 'integer', 'min:0', 'max:100']],
            'business-categories' => ['requires_job_approval' => ['boolean']],
            default => [],
        };
        if ($type === 'skills') {
            unset($rules['is_active']);
        }
        $data = $request->validate($rules);
        $item = $id ? $class::findOrFail($id) : new $class;
        $old = $item->toArray();
        $item->fill($data);
        if (! $item->exists || $item->isDirty('name')) {
            $base = Str::slug($data['name']) ?: Str::random(6);
            $slug = $base;
            $i = 2;
            while (DB::table($table)->where('slug', $slug)->when($item->exists, fn ($q) => $q->where('id', '!=', $item->id))->exists()) {
                $slug = $base.'-'.$i++;
            }
            $item->slug = $slug;
        }
        $item->save();
        Audit::log("taxonomy.{$type}.".($id ? 'updated' : 'created'), $item, $id ? $old : [], $item->toArray());
        Cache::forget(MetaController::CACHE_KEY);

        return response()->json(['message' => 'Saved.', 'data' => $item->fresh()], $id ? 200 : 201);
    }

    public function taxonomyDelete(string $type, int $id): JsonResponse
    {
        [$class] = $this->model($type);
        $item = $class::findOrFail($id);
        if ($type === 'categories' && DB::table('jobs')->where('job_category_id', $id)->whereNull('deleted_at')->exists()) {
            return response()->json(['message' => 'This category is used by jobs. Deactivate it instead of deleting.'], 422);
        }
        $item->delete();
        Audit::log("taxonomy.{$type}.deleted", $item, $item->toArray());
        Cache::forget(MetaController::CACHE_KEY);

        return response()->json(['message' => 'Deleted.']);
    }

    // ---------------- Homepage sliders ----------------
    public function sliders(): JsonResponse
    {
        return response()->json(['data' => HomepageSlider::orderBy('sort_order')->get()->map(fn ($s) => $s->toArray() + [
            'image_url' => $s->image_path ? Storage::disk('public')->url($s->image_path) : null,
            'mobile_image_url' => $s->mobile_image_path ? Storage::disk('public')->url($s->mobile_image_path) : null,
        ])]);
    }

    public function sliderSave(Request $request, ?int $id = null): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'subtitle' => ['nullable', 'string', 'max:300'],
            'cta_label' => ['nullable', 'string', 'max:50'],
            // Internal paths or https links only (no javascript: URLs)
            'cta_url' => ['nullable', 'string', 'max:255', 'regex:#^(/[^\s]*|https://[^\s]+)$#'],
            'theme' => ['nullable', Rule::in(['blue', 'navy', 'emerald', 'sunrise'])],
            'is_active' => ['boolean'],
            'starts_at' => ['nullable', 'date'], 'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=800,max_width=4000'],
            'mobile_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1024', 'dimensions:max_width=2000'],
            'remove_image' => ['boolean'],
        ], ['cta_url.regex' => 'Use an internal path like /jobs or a full https:// link.']);
        $s = $id ? HomepageSlider::findOrFail($id) : new HomepageSlider(['sort_order' => (int) HomepageSlider::max('sort_order') + 1, 'created_by' => $request->user()->id]);
        $s->fill(collect($data)->except(['image', 'mobile_image', 'remove_image'])->all());
        foreach (['image' => 'image_path', 'mobile_image' => 'mobile_image_path'] as $field => $col) {
            if ($request->hasFile($field)) {
                if ($s->{$col}) {
                    Storage::disk('public')->delete($s->{$col});
                }
                $s->{$col} = $request->file($field)->store('sliders', 'public');
            }
        }
        if ($request->boolean('remove_image') && $s->image_path) {
            Storage::disk('public')->delete($s->image_path);
            $s->image_path = null;
        }
        $s->save();
        Audit::log('slider.'.($id ? 'updated' : 'created'), $s);
        Cache::forget('sliders:public');

        return response()->json(['message' => 'Slider saved.', 'data' => $s], $id ? 200 : 201);
    }

    public function sliderDelete(int $id): JsonResponse
    {
        $s = HomepageSlider::findOrFail($id);
        foreach (['image_path', 'mobile_image_path'] as $c) {
            if ($s->{$c}) {
                Storage::disk('public')->delete($s->{$c});
            }
        }
        $s->delete();
        Audit::log('slider.deleted', $s, $s->toArray());
        Cache::forget('sliders:public');

        return response()->json(['message' => 'Slider deleted.']);
    }

    public function sliderReorder(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'max:50'], 'ids.*' => ['integer', 'exists:homepage_sliders,id']]);
        DB::transaction(function () use ($data) {
            foreach ($data['ids'] as $i => $id) {
                HomepageSlider::whereKey($id)->update(['sort_order' => $i + 1]);
            }
        });
        Audit::log('slider.reordered', null, [], ['order' => $data['ids']]);
        Cache::forget('sliders:public');

        return response()->json(['message' => 'Order saved.']);
    }
}
