<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['name', 'label', 'group'];

    /** Master list. Super-admin-only permissions are flagged so Admins can never grant them. */
    public const ALL = [
        'job_seekers.view' => ['View job seekers', 'Candidates'],
        'job_seekers.manage' => ['Suspend / reactivate job seekers', 'Candidates'],
        'resumes.view' => ['View & download resumes', 'Candidates'],
        'employers.view' => ['View employers', 'Employers'],
        'employers.verify' => ['Verify employers', 'Employers'],
        'employers.manage' => ['Suspend / block employers', 'Employers'],
        'jobs.view' => ['View all jobs', 'Jobs'],
        'jobs.manage' => ['Create / edit / delete jobs', 'Jobs'],
        'jobs.approve' => ['Approve / reject job posts', 'Jobs'],
        'jobs.feature' => ['Manage featured / priority jobs', 'Jobs'],
        'categories.manage' => ['Manage categories, roles, skills & localities', 'Jobs'],
        'applications.view' => ['View job applications', 'Applications'],
        'applications.manage' => ['Update application status', 'Applications'],
        'stats.view' => ['View website statistics', 'Reports'],
        'reports.view' => ['View reports & analytics', 'Reports'],
        'reports.export' => ['Export authorised reports (CSV)', 'Reports'],
        'sliders.manage' => ['Manage homepage sliders', 'Content'],
        'complaints.manage' => ['Handle complaints & support', 'Support'],
        'data_requests.manage' => ['Handle deletion / correction requests', 'Support'],
        'audit.view' => ['View audit logs', 'System'],
        'staff.manage' => ['Create & manage Admin Staff', 'System'],
        'admins.manage' => ['Create & manage Admins', 'System'],
        'settings.manage' => ['Manage global settings', 'System'],
        'logs.view' => ['View system & security logs', 'System'],
        'backups.manage' => ['Manage database backups', 'System'],
    ];

    public const SUPER_ONLY = ['admins.manage', 'settings.manage', 'logs.view', 'backups.manage'];
}
