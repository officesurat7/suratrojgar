<?php

namespace App\Support;

/**
 * Central list of allowed enum values. Used for validation (Rule::in) and
 * exposed to the frontend through /api/v1/meta so labels stay consistent.
 */
final class Options
{
    public const USER_TYPES = ['job_seeker', 'employer', 'admin_staff', 'admin', 'super_admin'];
    public const ADMIN_TYPES = ['admin_staff', 'admin', 'super_admin'];
    public const USER_STATUSES = ['pending', 'active', 'suspended', 'blocked', 'deactivated'];

    public const EMPLOYMENT_TYPES = [
        'full_time' => 'Full-time', 'part_time' => 'Part-time', 'freelance' => 'Freelance',
        'contract' => 'Contract', 'temporary' => 'Temporary', 'internship' => 'Internship',
        'permanent' => 'Permanent', 'daily_wage' => 'Daily wage', 'shift_based' => 'Shift-based',
    ];

    public const WORK_MODES = [
        'onsite' => 'On-site', 'remote' => 'Remote', 'hybrid' => 'Hybrid', 'work_from_home' => 'Work from home',
    ];

    public const SHIFTS = ['day' => 'Day shift', 'night' => 'Night shift', 'rotational' => 'Rotational shift', 'flexible' => 'Flexible'];

    public const SALARY_PERIODS = ['monthly' => 'per month', 'annual' => 'per year', 'daily' => 'per day', 'hourly' => 'per hour'];

    public const JOINING = [
        'immediate' => 'Immediate joining', 'within_15_days' => 'Within 15 days',
        'within_30_days' => 'Within 30 days', 'flexible' => 'Flexible',
    ];

    public const EXPERIENCE_BANDS = [
        'fresher' => ['label' => 'Fresher', 'min' => 0, 'max' => 0],
        '0-1' => ['label' => '0–1 year', 'min' => 0, 'max' => 1],
        '1-3' => ['label' => '1–3 years', 'min' => 1, 'max' => 3],
        '3-5' => ['label' => '3–5 years', 'min' => 3, 'max' => 5],
        '5-10' => ['label' => '5–10 years', 'min' => 5, 'max' => 10],
        '10+' => ['label' => '10+ years', 'min' => 10, 'max' => 60],
    ];

    public const GENDER_PREFERENCES = ['any' => 'Open to all', 'male' => 'Male', 'female' => 'Female'];
    public const GENDERS = ['male' => 'Male', 'female' => 'Female', 'other' => 'Other', 'prefer_not' => 'Prefer not to say'];

    public const CONTACT_VISIBILITY = [
        'verified_users' => 'All verified job seekers',
        'applicants_only' => 'Only candidates who applied',
        'hidden' => 'Hidden (applications only through portal)',
    ];

    public const JOB_STATUSES = ['draft', 'pending', 'active', 'paused', 'closed', 'rejected', 'expired'];

    public const APPLICATION_STATUSES = [
        'applied' => 'Applied', 'received' => 'Application Received', 'under_review' => 'Under Review',
        'shortlisted' => 'Shortlisted', 'interview_scheduled' => 'Interview Scheduled',
        'interview_completed' => 'Interview Completed', 'selected' => 'Selected', 'rejected' => 'Rejected',
        'on_hold' => 'On Hold', 'withdrawn' => 'Withdrawn',
    ];

    /** Status changes that trigger an email to the candidate */
    public const NOTIFY_STATUSES = ['shortlisted', 'interview_scheduled', 'selected', 'rejected', 'on_hold'];

    public const EMPLOYMENT_STATUSES = [
        'employed' => 'Employed', 'unemployed' => 'Looking for work', 'student' => 'Student', 'self_employed' => 'Self-employed',
    ];

    public const AVAILABILITY = [
        'immediate' => 'Immediately', '15_days' => 'Within 15 days', '30_days' => 'Within 30 days', '60_days' => 'Within 60 days',
    ];

    public const COMPANY_TYPES = [
        'proprietorship' => 'Proprietorship', 'partnership' => 'Partnership', 'llp' => 'LLP',
        'pvt_ltd' => 'Private Limited', 'public_ltd' => 'Public Limited', 'individual' => 'Individual / Household',
        'ngo' => 'NGO / Trust', 'government' => 'Government / PSU', 'other' => 'Other',
    ];

    public const COMPLAINT_TYPES = ['job', 'employer', 'candidate', 'support', 'grievance'];
    public const COMPLAINT_REASONS = [
        'spam' => 'Spam or fake job', 'fraud' => 'Asking for money / fraud', 'discrimination' => 'Discriminatory content',
        'misleading' => 'Misleading information', 'abuse' => 'Abusive behaviour', 'other' => 'Other',
    ];

    public static function keys(array $options): array
    {
        return array_is_list($options) ? $options : array_keys($options);
    }

    /** Convert a salary to its monthly equivalent for cross-period comparison. */
    public static function toMonthly(?float $amount, string $period): ?float
    {
        if ($amount === null) {
            return null;
        }

        return round(match ($period) {
            'annual' => $amount / 12,
            'daily' => $amount * 26,
            'hourly' => $amount * 8 * 26,
            default => $amount,
        }, 2);
    }
}
