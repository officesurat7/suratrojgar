<?php

namespace Database\Seeders;

use App\Models\HomepageSlider;
use Illuminate\Database\Seeder;

/** Starter banners (text + brand gradient). Admins replace/extend them in Admin → Sliders. */
class SliderSeeder extends Seeder
{
    public function run(): void
    {
        if (HomepageSlider::exists()) {
            return;
        }
        $rows = [
            ['Find your next job in Surat', 'Thousands of openings across Adajan, Varachha, Vesu, Udhna, Sachin GIDC and every corner of the city.', 'Search jobs', '/jobs', 'blue'],
            ['Hiring? Post a job in minutes', 'Reach verified local candidates. Your contact details stay private until you choose to share them.', 'Post a job', '/employer/jobs/new', 'navy'],
            ['Textile & diamond industry jobs', "Loom operators, polishers, supervisors and designers: jobs from Surat's biggest industries.", 'View textile jobs', '/jobs/category/textile-weaving', 'emerald'],
        ];
        foreach ($rows as $i => [$title, $subtitle, $label, $url, $theme]) {
            HomepageSlider::create(['title' => $title, 'subtitle' => $subtitle, 'cta_label' => $label, 'cta_url' => $url, 'theme' => $theme, 'sort_order' => $i + 1, 'is_active' => true]);
        }
    }
}
