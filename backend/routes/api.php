<?php

use App\Http\Controllers\Api\Admin\CandidateController;
use App\Http\Controllers\Api\Admin\ContentController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\EmployerAdminController;
use App\Http\Controllers\Api\Admin\FeaturedController;
use App\Http\Controllers\Api\Admin\JobAdminController;
use App\Http\Controllers\Api\Admin\StaffController;
use App\Http\Controllers\Api\Admin\SupportController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Employer\EmployerController;
use App\Http\Controllers\Api\Public\JobController;
use App\Http\Controllers\Api\Public\MetaController;
use App\Http\Controllers\Api\Public\SiteController;
use App\Http\Controllers\Api\Seeker\SeekerController;
use App\Http\Controllers\Api\Shared\FileController;
use App\Http\Controllers\Api\Shared\NotificationController;
use App\Http\Controllers\Api\Super\SystemController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SuratRojgar REST API v1  (documented in docs/API.md)
|--------------------------------------------------------------------------
| Public routes never return private employer/candidate data.
| Every role area is protected by auth:sanctum + type:<role> (+ perm:<permission> for admin areas).
*/

Route::prefix('v1')->middleware('maintenance')->group(function () {

    // ---------------- Public ----------------
    Route::middleware('throttle:public')->group(function () {
        Route::get('meta', MetaController::class);
        Route::get('sliders', [SiteController::class, 'sliders']);
        Route::get('jobs', [JobController::class, 'index']);
        Route::get('jobs/{id}', [JobController::class, 'show'])->whereNumber('id');
        Route::get('jobs/{id}/similar', [JobController::class, 'similar'])->whereNumber('id');
        Route::get('companies/{slug}', [SiteController::class, 'company']);
        Route::get('seo/sitemap', [SiteController::class, 'sitemap']);
    });
    Route::post('jobs/{id}/view', [JobController::class, 'recordView'])->whereNumber('id')->middleware('throttle:beacon');
    Route::post('analytics/track', [SiteController::class, 'track'])->middleware('throttle:beacon');
    Route::post('complaints', [SiteController::class, 'submitComplaint'])->middleware('throttle:forms');

    // Signed, short-lived resume download (authorised when the link is issued)
    Route::get('files/resumes/{resume}', [FileController::class, 'resume'])->name('resumes.download')->middleware('throttle:public');

    // ---------------- Auth ----------------
    Route::prefix('auth')->group(function () {
        Route::middleware('throttle:register')->group(function () {
            Route::post('register/job-seeker', [AuthController::class, 'registerJobSeeker']);
            Route::post('register/employer', [AuthController::class, 'registerEmployer']);
        });
        Route::middleware('throttle:otp')->group(function () {
            Route::post('verify-email', [AuthController::class, 'verifyEmail']);
            Route::post('resend-otp', [AuthController::class, 'resendOtp']);
            Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
            Route::post('reset-password', [AuthController::class, 'resetPassword']);
            Route::post('2fa/verify', [AuthController::class, 'twoFactorVerify']);
        });
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
            Route::post('logout-all', [AuthController::class, 'logoutAll']);
            Route::post('change-password', [AuthController::class, 'changePassword'])->middleware('throttle:otp');
            Route::put('notification-preferences', [AuthController::class, 'updateNotificationPreferences']);
            Route::middleware('type:admin_staff,admin,super_admin')->group(function () {
                Route::post('2fa/setup', [AuthController::class, 'twoFactorSetup']);
                Route::post('2fa/enable', [AuthController::class, 'twoFactorEnable'])->middleware('throttle:otp');
                Route::post('2fa/disable', [AuthController::class, 'twoFactorDisable'])->middleware('throttle:otp');
            });
        });
    });

    // ---------------- Any signed-in user ----------------
    Route::middleware(['auth:sanctum', 'throttle:user'])->group(function () {
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);

        // Employer contact details (protected, rate-limited, logged)
        Route::get('jobs/{id}/contact', [JobController::class, 'contact'])->whereNumber('id')->middleware('throttle:contact');

        // Account rights for seekers & employers (DPDP)
        Route::middleware('type:job_seeker,employer')->prefix('account')->group(function () {
            Route::post('deactivate', [SeekerController::class, 'deactivate']);
            Route::post('data-requests', [SeekerController::class, 'dataRequest'])->middleware('throttle:forms');
            Route::get('data-requests', [SeekerController::class, 'myDataRequests']);
        });
    });

    // ---------------- Job seeker ----------------
    Route::middleware(['auth:sanctum', 'type:job_seeker', 'throttle:user'])->prefix('seeker')->group(function () {
        Route::get('dashboard', [SeekerController::class, 'dashboard']);
        Route::get('profile', [SeekerController::class, 'profile']);
        Route::put('profile', [SeekerController::class, 'updateProfile']);
        Route::get('resumes', [SeekerController::class, 'resumes']);
        Route::post('resumes', [SeekerController::class, 'uploadResume'])->middleware('throttle:uploads');
        Route::post('resumes/{id}/default', [SeekerController::class, 'defaultResume']);
        Route::get('resumes/{id}/download', [SeekerController::class, 'resumeUrl']);
        Route::delete('resumes/{id}', [SeekerController::class, 'deleteResume']);
        Route::get('applications', [SeekerController::class, 'applications']);
        Route::get('applications/{id}', [SeekerController::class, 'application']);
        Route::post('applications/{id}/withdraw', [SeekerController::class, 'withdraw']);
        Route::post('jobs/{jobId}/apply', [SeekerController::class, 'apply'])->middleware('throttle:apply');
        Route::post('job-states', [SeekerController::class, 'jobStates']);
        Route::get('saved-jobs', [SeekerController::class, 'saved']);
        Route::post('saved-jobs/{jobId}', [SeekerController::class, 'save']);
        Route::delete('saved-jobs/{jobId}', [SeekerController::class, 'unsave']);
        Route::get('recently-viewed', [SeekerController::class, 'recentlyViewed']);
    });

    // ---------------- Employer ----------------
    Route::middleware(['auth:sanctum', 'type:employer', 'throttle:user'])->prefix('employer')->group(function () {
        Route::get('dashboard', [EmployerController::class, 'dashboard']);
        Route::get('profile', [EmployerController::class, 'profile']);
        Route::post('profile', [EmployerController::class, 'updateProfile'])->middleware('throttle:uploads');  // POST: multipart logo upload
        Route::get('jobs', [EmployerController::class, 'jobs']);
        Route::post('jobs', [EmployerController::class, 'storeJob']);
        Route::get('jobs/{id}', [EmployerController::class, 'job']);
        Route::put('jobs/{id}', [EmployerController::class, 'updateJob']);
        Route::delete('jobs/{id}', [EmployerController::class, 'deleteJob']);
        Route::post('jobs/{id}/extend', [EmployerController::class, 'extendJob']);
        Route::get('jobs/{id}/performance', [EmployerController::class, 'jobPerformance']);
        Route::post('jobs/{id}/{action}', [EmployerController::class, 'jobAction'])->whereIn('action', ['pause', 'activate', 'close', 'reopen', 'submit']);
        Route::get('applications', [EmployerController::class, 'applications']);
        Route::get('applications/export', [EmployerController::class, 'exportApplications']);
        Route::post('applications/bulk', [EmployerController::class, 'bulkUpdateApplications']);
        Route::get('applications/{id}', [EmployerController::class, 'application']);
        Route::put('applications/{id}/status', [EmployerController::class, 'updateApplication']);
        Route::put('applications/{id}/notes', [EmployerController::class, 'saveNotes']);
        Route::get('applications/{id}/resume', [EmployerController::class, 'applicationResume']);
    });

    // ---------------- Admin Staff / Admin / Super Admin (permission based) ----------------
    Route::middleware(['auth:sanctum', 'type:admin_staff,admin,super_admin', 'throttle:admin'])->prefix('admin')->group(function () {
        Route::get('dashboard/stats', [DashboardController::class, 'stats'])->middleware('perm:stats.view');
        Route::get('dashboard/charts', [DashboardController::class, 'charts'])->middleware('perm:stats.view,reports.view');
        Route::get('reports/applications', [DashboardController::class, 'applicationReport'])->middleware('perm:reports.view');
        Route::get('reports/visitors', [DashboardController::class, 'visitorReport'])->middleware('perm:reports.view');
        Route::get('reports/export', [DashboardController::class, 'export'])->middleware('perm:reports.export');

        Route::middleware('perm:job_seekers.view')->group(function () {
            Route::get('candidates', [CandidateController::class, 'index']);
            Route::get('candidates/export', [CandidateController::class, 'export'])->middleware('perm:reports.export');
            Route::get('candidates/{id}', [CandidateController::class, 'show']);
            Route::get('candidates/{id}/resumes/{resumeId}', [CandidateController::class, 'resumeUrl'])->middleware('perm:resumes.view');
            Route::put('candidates/{id}/status', [CandidateController::class, 'updateStatus'])->middleware('perm:job_seekers.manage');
        });

        Route::middleware('perm:employers.view')->group(function () {
            Route::get('employers', [EmployerAdminController::class, 'index']);
            Route::get('employers/{id}', [EmployerAdminController::class, 'show']);
            Route::post('employers/{id}/verify', [EmployerAdminController::class, 'verify'])->middleware('perm:employers.verify');
            Route::put('employers/{id}/status', [EmployerAdminController::class, 'updateStatus'])->middleware('perm:employers.manage');
        });

        Route::middleware('perm:jobs.view,jobs.approve,jobs.manage')->group(function () {
            Route::get('jobs', [JobAdminController::class, 'index']);
            Route::get('jobs/{id}', [JobAdminController::class, 'show']);
        });
        Route::post('jobs/{id}/approve', [JobAdminController::class, 'approve'])->middleware('perm:jobs.approve');
        Route::post('jobs/{id}/reject', [JobAdminController::class, 'reject'])->middleware('perm:jobs.approve');
        Route::middleware('perm:jobs.manage')->group(function () {
            Route::post('jobs', [JobAdminController::class, 'store']);
            Route::put('jobs/{id}', [JobAdminController::class, 'update']);
            Route::delete('jobs/{id}', [JobAdminController::class, 'destroy']);
            Route::post('jobs/{id}/restore', [JobAdminController::class, 'restore']);
            Route::post('jobs/{id}/expiry', [JobAdminController::class, 'setExpiry']);
            Route::post('jobs/{id}/employer', [JobAdminController::class, 'changeEmployer']);
            Route::post('jobs/{id}/allow-reapply', [JobAdminController::class, 'allowReapply']);
            Route::post('jobs/{id}/{action}', [JobAdminController::class, 'action'])->whereIn('action', ['pause', 'activate', 'close', 'reopen', 'expire']);
        });

        Route::middleware('perm:jobs.feature')->prefix('featured')->group(function () {
            Route::get('/', [FeaturedController::class, 'index']);
            Route::get('candidates', [FeaturedController::class, 'candidates']);
            Route::get('history', [FeaturedController::class, 'history']);
            Route::put('/', [FeaturedController::class, 'replace']);
            Route::delete('{jobId}', [FeaturedController::class, 'destroy']);
        });

        Route::get('applications', [JobAdminController::class, 'applications'])->middleware('perm:applications.view');
        Route::get('applications/{id}', [JobAdminController::class, 'application'])->middleware('perm:applications.view');
        Route::put('applications/{id}/status', [JobAdminController::class, 'updateApplication'])->middleware('perm:applications.manage');

        Route::middleware('perm:categories.manage')->group(function () {
            Route::get('taxonomy/{type}', [ContentController::class, 'taxonomyIndex']);
            Route::post('taxonomy/{type}', [ContentController::class, 'taxonomySave']);
            Route::put('taxonomy/{type}/{id}', [ContentController::class, 'taxonomySave']);
            Route::delete('taxonomy/{type}/{id}', [ContentController::class, 'taxonomyDelete']);
        });

        Route::middleware('perm:sliders.manage')->group(function () {
            Route::get('sliders', [ContentController::class, 'sliders']);
            Route::post('sliders', [ContentController::class, 'sliderSave']);
            Route::post('sliders/reorder', [ContentController::class, 'sliderReorder']);
            Route::post('sliders/{id}', [ContentController::class, 'sliderSave']);   // POST for multipart updates
            Route::delete('sliders/{id}', [ContentController::class, 'sliderDelete']);
        });

        Route::get('complaints', [SupportController::class, 'complaints'])->middleware('perm:complaints.manage');
        Route::put('complaints/{id}', [SupportController::class, 'updateComplaint'])->middleware('perm:complaints.manage');
        Route::get('data-requests', [SupportController::class, 'dataRequests'])->middleware('perm:data_requests.manage');
        Route::post('data-requests/{id}', [SupportController::class, 'processDataRequest'])->middleware('perm:data_requests.manage');

        Route::middleware('perm:staff.manage,admins.manage')->group(function () {
            Route::get('staff/permissions', [StaffController::class, 'permissions']);
            Route::get('staff', [StaffController::class, 'index']);
            Route::post('staff', [StaffController::class, 'store']);
            Route::put('staff/{id}', [StaffController::class, 'update']);
            Route::put('staff/{id}/status', [StaffController::class, 'updateStatus']);
            Route::post('staff/{id}/reset', [StaffController::class, 'reset']);
        });

        Route::get('audit-logs', [SystemController::class, 'auditLogs'])->middleware('perm:audit.view');
    });

    // ---------------- Super Admin ----------------
    Route::middleware(['auth:sanctum', 'type:super_admin', 'throttle:admin'])->prefix('super')->group(function () {
        Route::get('settings', [SystemController::class, 'settings']);
        Route::put('settings', [SystemController::class, 'updateSettings']);
        Route::post('maintenance', [SystemController::class, 'maintenance']);
        Route::post('test-email', [SystemController::class, 'testEmail'])->middleware('throttle:otp');
        Route::get('logs/security', [SystemController::class, 'securityLogs']);
        Route::get('logs/system', [SystemController::class, 'systemLogs']);
        Route::get('backups', [SystemController::class, 'backups']);
        Route::post('backups', [SystemController::class, 'runBackup'])->middleware('throttle:otp');
    });
});
