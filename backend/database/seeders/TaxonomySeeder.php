<?php

namespace Database\Seeders;

use App\Models\BusinessCategory;
use App\Models\EducationLevel;
use App\Models\JobCategory;
use App\Models\JobRole;
use App\Models\Skill;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Job categories & roles tuned for Surat's economy (textiles, diamonds, trading, services, industry). */
class TaxonomySeeder extends Seeder
{
    public function run(): void
    {
        $education = ['No formal education', 'Below 10th', '10th pass (SSC)', '12th pass (HSC)', 'ITI', 'Diploma', 'Graduate', 'Post graduate', 'Doctorate'];
        foreach ($education as $i => $name) {
            EducationLevel::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'rank' => $i * 10]);
        }

        $business = ['Textile & Garments', 'Diamond & Jewellery', 'Trading & Wholesale', 'Retail Shop', 'Manufacturing / Factory', 'IT & Software',
            'Hospitality & Restaurant', 'Healthcare & Clinic', 'Education & Coaching', 'Logistics & Transport', 'Construction & Real Estate',
            'Chemicals & Petrochemicals', 'Banking & Finance', 'Consultancy & Services', 'Household / Individual', 'Placement Agency', 'Other'];
        foreach ($business as $name) {
            BusinessCategory::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'requires_job_approval' => $name === 'Placement Agency']);
        }

        $categories = [
            ['Textile & Weaving', 'shirt', ['Loom Operator', 'Weaver', 'Textile Supervisor', 'Fabric Checker', 'Dyeing & Printing Operator', 'Embroidery Machine Operator', 'Textile Designer', 'Saree Packing Staff']],
            ['Diamond & Jewellery', 'gem', ['Diamond Polisher', 'Diamond Cutter', 'Diamond Assorter', 'Jewellery Designer', 'CAD Designer', 'Jewellery Sales Executive', 'Quality Checker']],
            ['Sales & Marketing', 'megaphone', ['Sales Executive', 'Field Sales Executive', 'Telecaller', 'Marketing Executive', 'Digital Marketing Executive', 'Business Development Executive', 'Showroom Sales Staff']],
            ['Office & Admin', 'briefcase', ['Office Assistant', 'Receptionist', 'Data Entry Operator', 'Back Office Executive', 'Office Boy / Peon', 'Admin Executive', 'Personal Assistant']],
            ['Accounts & Finance', 'calculator', ['Accountant', 'Accounts Assistant', 'Tally Operator', 'GST Executive', 'Billing Executive', 'Cashier', 'Chartered Accountant']],
            ['IT & Software', 'laptop', ['Web Developer', 'PHP Developer', 'React Developer', 'Mobile App Developer', 'Software Tester', 'UI/UX Designer', 'IT Support / Hardware Engineer', 'Graphic Designer']],
            ['Manufacturing & Factory', 'factory', ['Machine Operator', 'Helper', 'Production Supervisor', 'Quality Inspector', 'Store Keeper', 'Packing Staff', 'Maintenance Technician']],
            ['Logistics & Delivery', 'truck', ['Delivery Boy', 'Driver', 'Warehouse Assistant', 'Loader / Unloader', 'Dispatch Executive', 'Courier Executive']],
            ['Engineering & Technical', 'wrench', ['Electrician', 'Fitter', 'Welder', 'Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer', 'AC Technician', 'CNC Operator']],
            ['Chemical & Petrochemical', 'flask', ['Chemist', 'Plant Operator', 'Lab Assistant', 'Safety Officer', 'Process Engineer']],
            ['Hospitality & Food', 'utensils', ['Cook / Chef', 'Waiter', 'Hotel Front Office', 'Housekeeping Staff', 'Kitchen Helper', 'Restaurant Manager']],
            ['Healthcare', 'stethoscope', ['Nurse', 'Pharmacist', 'Lab Technician', 'Ward Boy', 'Clinic Receptionist', 'Medical Representative']],
            ['Education & Training', 'graduation-cap', ['Teacher', 'Tutor', 'Counsellor', 'Computer Trainer', 'Preschool Teacher']],
            ['Customer Support & BPO', 'headset', ['Customer Care Executive', 'Voice Process Executive', 'Non-Voice Process Executive', 'Team Leader']],
            ['Retail & Store', 'store', ['Store Manager', 'Cashier', 'Sales Girl / Sales Boy', 'Inventory Assistant', 'Visual Merchandiser']],
            ['Construction & Real Estate', 'building', ['Site Supervisor', 'Mason', 'Plumber', 'Carpenter', 'Real Estate Agent', 'Painter']],
            ['Security & Facility', 'shield', ['Security Guard', 'Security Supervisor', 'Housekeeping', 'Facility Executive']],
            ['Beauty & Wellness', 'sparkles', ['Beautician', 'Hair Stylist', 'Spa Therapist', 'Makeup Artist']],
            ['HR & Recruitment', 'users', ['HR Executive', 'HR Recruiter', 'HR Manager', 'Payroll Executive']],
            ['Domestic Help', 'home', ['Housemaid', 'Cook (Household)', 'Baby Sitter / Nanny', 'Caretaker', 'Personal Driver']],
        ];
        foreach ($categories as $i => [$name, $icon, $roles]) {
            $cat = JobCategory::updateOrCreate(['slug' => Str::slug($name)], ['name' => $name, 'icon' => $icon, 'sort_order' => $i]);
            foreach ($roles as $role) {
                $slug = Str::slug($role);
                if (JobRole::where('slug', $slug)->where('job_category_id', '!=', $cat->id)->exists()) {
                    $slug = Str::slug($role.' '.$name);   // e.g. "Cashier" exists in two categories
                }
                JobRole::updateOrCreate(['slug' => $slug], ['name' => $role, 'job_category_id' => $cat->id]);
            }
        }

        foreach (['MS Office', 'Excel', 'Tally', 'GST', 'Communication', 'English', 'Gujarati', 'Hindi', 'Computer Basics', 'Typing',
            'Customer Handling', 'Negotiation', 'Driving Licence', 'Two-wheeler', 'PHP', 'Laravel', 'JavaScript', 'React', 'Next.js',
            'Photoshop', 'CorelDRAW', 'AutoCAD', 'Machine Operation', 'Diamond Polishing', 'Embroidery', 'Quality Control', 'Team Management'] as $s) {
            Skill::updateOrCreate(['slug' => Str::slug($s)], ['name' => $s]);
        }
    }
}
