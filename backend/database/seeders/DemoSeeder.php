<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\BusinessCategory;
use App\Models\EducationLevel;
use App\Models\EmployerProfile;
use App\Models\Job;
use App\Models\JobCategory;
use App\Models\JobSeekerProfile;
use App\Models\Locality;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * DEMO DATA for local development & staging ONLY (refuses to run in production).
 * Creates sample employers, jobs and job seekers so every screen can be exercised.
 * All demo accounts use @demo.suratrojgar.test emails and the password in DEMO_PASSWORD (default: Demo@12345).
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            throw new RuntimeException('DemoSeeder must not run in production.');
        }
        $password = env('DEMO_PASSWORD', 'Demo@12345');
        $loc = Locality::pluck('id', 'slug');
        $edu = EducationLevel::pluck('id', 'slug');
        $biz = BusinessCategory::pluck('id', 'slug');
        $cats = JobCategory::with('roles')->get()->keyBy('slug');

        $companies = [
            ['Shree Krishna Textiles', 'textile-garments', 'sachin', 'Plot 45, Sachin GIDC, Surat'],
            ['Venus Diamonds Pvt Ltd', 'diamond-jewellery', 'varachha', '3rd Floor, Mini Bazar, Varachha Road, Surat'],
            ['TapiSoft Technologies', 'it-software', 'vesu', '701, Swastik Plaza, VIP Road, Vesu, Surat'],
            ['Surat Fresh Mart', 'retail-shop', 'adajan', 'Shop 12, Star Bazaar Lane, Adajan, Surat'],
            ['Hazira Petrochem Services', 'chemicals-petrochemicals', 'hazira', 'Near AM/NS Gate 2, Hazira, Surat'],
        ];
        $employers = [];
        foreach ($companies as $i => [$name, $bizSlug, $locSlug, $address]) {
            $u = User::updateOrCreate(['email' => 'employer'.($i + 1).'@demo.suratrojgar.test'], [
                'name' => 'HR Manager '.($i + 1), 'mobile' => '98250000'.str_pad((string) ($i + 10), 2, '0', STR_PAD_LEFT),
                'user_type' => 'employer', 'status' => 'active', 'password' => $password, 'email_verified_at' => now(),
            ]);
            $u->roles()->sync(Role::where('name', 'employer')->pluck('id'));
            EmployerProfile::firstOrNew(['user_id' => $u->id])->forceFill([
                'company_name' => $name, 'contact_person' => $u->name, 'company_type' => 'pvt_ltd', 'business_category_id' => $biz[$bizSlug] ?? null,
                'locality_id' => $loc[$locSlug] ?? null, 'address' => $address, 'pincode' => Locality::find($loc[$locSlug])->pincode ?? '395001',
                'about' => "{$name} is a growing Surat business hiring local talent.",
                'slug' => Str::slug($name), 'verified_at' => now(),
            ])->save();
            $employers[] = $u->load('employerProfile');
        }

        $jobs = [
            [0, 'textile-weaving', 'Loom Operator', 'Loom Operator (Rapier & Water-jet)', 12000, 18000, 'full_time', 'night', 'sachin', 1, 'below-10th', 15],
            [0, 'textile-weaving', 'Textile Supervisor', 'Weaving Supervisor', 22000, 30000, 'full_time', 'day', 'sachin', 3, '12th-pass-hsc', 2],
            [1, 'diamond-jewellery', 'Diamond Polisher', 'Experienced Diamond Polisher', 18000, 35000, 'full_time', 'day', 'varachha', 2, '10th-pass-ssc', 10],
            [1, 'diamond-jewellery', 'Diamond Assorter', 'Diamond Assorter – Fresher Training Provided', 10000, 15000, 'full_time', 'day', 'katargam', 0, '12th-pass-hsc', 5],
            [2, 'it-software', 'React Developer', 'React / Next.js Developer', 25000, 50000, 'full_time', 'day', 'vesu', 1, 'graduate', 2],
            [2, 'it-software', 'PHP Developer', 'Laravel PHP Developer (Hybrid)', 30000, 60000, 'full_time', 'day', 'vesu', 2, 'graduate', 2],
            [2, 'it-software', 'UI/UX Designer', 'UI/UX Design Intern', 8000, 12000, 'internship', 'day', 'vesu', 0, 'graduate', 1],
            [3, 'retail-store', 'Cashier', 'Supermarket Cashier', 11000, 14000, 'full_time', 'rotational', 'adajan', 0, '12th-pass-hsc', 3],
            [3, 'logistics-delivery', 'Delivery Boy', 'Grocery Delivery Partner (Own Bike)', 15000, 22000, 'part_time', 'flexible', 'adajan', 0, '10th-pass-ssc', 8],
            [4, 'chemical-petrochemical', 'Plant Operator', 'Plant Operator – Petrochemical Unit', 25000, 38000, 'full_time', 'rotational', 'hazira', 2, 'diploma', 4],
            [4, 'engineering-technical', 'Welder', 'Certified Welder (TIG/MIG)', 18000, 26000, 'contract', 'day', 'hazira', 2, 'iti', 6],
            [3, 'sales-marketing', 'Telecaller', 'Telecaller – Work From Home (Gujarati)', 9000, 13000, 'part_time', 'day', 'adajan', 0, '12th-pass-hsc', 5],
        ];
        foreach ($jobs as $k => [$e, $catSlug, $roleName, $title, $min, $max, $type, $shift, $locSlug, $exp, $eduSlug, $vac]) {
            $cat = $cats[$catSlug] ?? $cats->first();
            $employer = $employers[$e];
            $job = Job::firstOrNew(['employer_id' => $employer->id, 'title' => $title]);
            $job->fill([
                'job_category_id' => $cat->id, 'job_role_id' => $cat->roles->firstWhere('name', $roleName)?->id,
                'description' => "We are hiring a {$roleName} at our {$employer->employerProfile->company_name} unit.\n\nResponsibilities:\n- Perform daily {$roleName} duties as per company standards\n- Maintain quality and safety\n- Coordinate with the team\n\nGood working environment, timely salary and growth opportunities.",
                'vacancies' => $vac, 'salary_min' => $min, 'salary_max' => $max, 'salary_period' => 'monthly', 'salary_negotiable' => $k % 3 === 0,
                'employment_type' => $type, 'work_mode' => str_contains($title, 'Work From Home') ? 'work_from_home' : (str_contains($title, 'Hybrid') ? 'hybrid' : 'onsite'),
                'shift' => $shift, 'locality_id' => $loc[$locSlug] ?? null, 'area' => Locality::find($loc[$locSlug])?->name,
                'pincode' => Locality::find($loc[$locSlug])?->pincode, 'office_address' => $employer->employerProfile->address,
                'experience_min' => $exp, 'experience_max' => $exp + 3, 'education_level_id' => $edu[$eduSlug] ?? null,
                'joining' => $k % 2 ? 'immediate' : 'within_15_days', 'working_days' => 'Monday to Saturday', 'working_hours' => '9:30 AM – 6:30 PM',
                'weekly_off' => 'Sunday', 'benefits' => 'PF, ESIC, Bonus', 'contact_name' => $employer->name, 'contact_mobile' => $employer->mobile,
                'contact_email' => $employer->email, 'contact_visibility' => $k % 4 === 0 ? 'applicants_only' : 'verified_users',
                'expires_at' => now()->addDays(30),
            ]);
            $job->status = 'active';
            $job->published_at = now()->subHours($k * 7);
            $job->approved_at = now();
            $job->company_display_name = $employer->employerProfile->company_name;
            $job->created_by = $employer->id;
            $job->save();
            $job->syncSkills(['Communication', $k % 2 ? 'Gujarati' : 'Hindi'], ['MS Office']);
        }

        foreach (range(1, 6) as $i) {
            $u = User::updateOrCreate(['email' => "seeker{$i}@demo.suratrojgar.test"], [
                'name' => ['Rahul Patel', 'Priya Desai', 'Amit Chauhan', 'Neha Shah', 'Kiran Rathod', 'Sagar Vaghela'][$i - 1],
                'mobile' => '99090000'.str_pad((string) ($i + 10), 2, '0', STR_PAD_LEFT), 'user_type' => 'job_seeker', 'status' => 'active',
                'password' => $password, 'email_verified_at' => now(),
            ]);
            $u->roles()->sync(Role::where('name', 'job_seeker')->pluck('id'));
            $locSlug = ['adajan', 'varachha', 'udhna', 'vesu', 'katargam', 'sachin'][$i - 1];
            $p = JobSeekerProfile::updateOrCreate(['user_id' => $u->id], [
                'headline' => 'Looking for a full-time job in Surat', 'locality_id' => $loc[$locSlug], 'pincode' => Locality::find($loc[$locSlug])->pincode,
                'education_level_id' => $edu[['graduate', '12th-pass-hsc', 'iti', 'graduate', '10th-pass-ssc', 'diploma'][$i - 1]],
                'employment_status' => 'unemployed', 'experience_years' => [1, 0, 3, 2, 5, 1][$i - 1],
                'preferred_category_id' => $cats->values()[$i % $cats->count()]->id, 'expected_salary' => 12000 + $i * 3000,
                'preferred_job_type' => 'full_time', 'preferred_work_mode' => 'onsite', 'availability' => 'immediate',
            ]);
            $p->refreshCompletion();
        }
        // A couple of applications so employer/admin screens have data
        $seeker = User::where('email', 'seeker1@demo.suratrojgar.test')->first();
        foreach (Job::where('status', 'active')->limit(2)->get() as $job) {
            if (! Application::where('job_id', $job->id)->where('user_id', $seeker->id)->exists()) {
                $a = Application::create(['application_no' => 'SRDEMO'.strtoupper(Str::random(6)), 'job_id' => $job->id, 'user_id' => $seeker->id, 'status' => 'applied', 'status_changed_at' => now()]);
                $a->history()->create(['to_status' => 'applied', 'changed_by' => $seeker->id]);
                $job->increment('applications_count');
            }
        }
        $this->command?->info('Demo data ready. Password for all demo accounts: '.$password);
    }
}
