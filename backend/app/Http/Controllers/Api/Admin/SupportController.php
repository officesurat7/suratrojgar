<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\DataRequest;
use App\Models\User;
use App\Notifications\MessageNotification;
use App\Services\Audit;
use App\Services\ResumeStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SupportController extends Controller
{
    // ---------------- Complaints / support / grievances ----------------
    public function complaints(Request $request): JsonResponse
    {
        $page = Complaint::with(['reporter:id,name,user_type', 'job:id,title,company_display_name', 'reportedUser:id,name,user_type', 'assignee:id,name'])
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->type, fn ($q, $v) => $q->where('type', $v))
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('ticket_no', $s)->orWhere('subject', 'like', '%'.addcslashes($s, '%_\\').'%')->orWhere('reporter_email', $s)))
            ->latest()->paginate(25);

        return response()->json(['data' => $page->items(), 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()]]);
    }

    public function updateComplaint(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['open', 'in_review', 'resolved', 'dismissed'])],
            'resolution' => ['nullable', 'required_if:status,resolved,dismissed', 'string', 'max:3000'],
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')->whereIn('user_type', ['admin_staff', 'admin', 'super_admin'])],
            'notify_reporter' => ['boolean'],
        ]);
        $c = Complaint::findOrFail($id);
        $old = $c->only(['status', 'assigned_to']);
        $c->fill(collect($data)->except('notify_reporter')->all());
        if (in_array($data['status'], ['resolved', 'dismissed'], true)) {
            $c->resolved_at = now();
        }
        $c->save();
        Audit::log('complaint.updated', $c, $old, $c->only(['status', 'assigned_to']));

        if (($data['notify_reporter'] ?? false) && $c->reporter_email && in_array($data['status'], ['resolved', 'dismissed'], true)) {
            $msg = new MessageNotification("Update on your ticket {$c->ticket_no}", "Status: ".ucfirst($data['status'])."\n".$data['resolution'], null, 'support');
            $c->reporter ? $c->reporter->notify($msg) : Notification::route('mail', $c->reporter_email)->notify($msg);
        }

        return response()->json(['message' => 'Ticket updated.']);
    }

    // ---------------- DPDP data requests ----------------
    public function dataRequests(Request $request): JsonResponse
    {
        $page = DataRequest::with('user:id,name,email,user_type,status')
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))->latest()->paginate(25);

        return response()->json(['data' => $page->items(), 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()]]);
    }

    public function processDataRequest(Request $request, int $id, ResumeStorage $resumes): JsonResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['complete', 'reject'])], 'response' => ['required', 'string', 'max:2000']]);
        $dr = DataRequest::with('user')->where('status', 'pending')->findOrFail($id);
        $user = $dr->user;
        $email = $user->email;
        $name = $user->name;

        DB::transaction(function () use ($dr, $data, $request, $user, $resumes) {
            if ($data['decision'] === 'complete' && $dr->type === 'deletion') {
                self::anonymise($user, $resumes);
            } elseif ($data['decision'] === 'reject' && $dr->type === 'deletion') {
                $user->update(['deletion_requested_at' => null]);
            }
            $dr->update(['status' => $data['decision'] === 'complete' ? 'completed' : 'rejected', 'response' => $data['response'], 'processed_by' => $request->user()->id, 'processed_at' => now()]);
        });
        Audit::log('data_request.'.$data['decision'], $dr, [], ['type' => $dr->type, 'user_id' => $user->id]);

        // Notify by email (the account may no longer exist)
        Notification::route('mail', $email)->notify(new MessageNotification(
            'Your '.$dr->type.' request: '.($data['decision'] === 'complete' ? 'completed' : 'not completed'),
            "Hello {$name},\n".$data['response'], null, 'account'
        ));

        return response()->json(['message' => 'Request processed.']);
    }

    /**
     * Erase personal data while keeping non-personal records (e.g. application counts on jobs) intact.
     * Audit/legal logs keep only the user id.
     */
    public static function anonymise(User $user, ResumeStorage $resumes): void
    {
        foreach ($user->resumes()->withTrashed()->get() as $r) {
            $resumes->delete($r);
        }
        $user->seekerProfile()?->delete();
        if ($user->isEmployer()) {
            $user->employerProfile?->forceFill(['contact_person' => 'Removed', 'address' => 'Removed on request', 'logo_path' => null])->save();
            \App\Models\Job::where('employer_id', $user->id)->update(['status' => 'closed', 'contact_name' => null, 'contact_mobile' => null, 'contact_email' => null, 'office_address' => null]);
            \App\Services\JobSearch::bumpCacheVersion();
        }
        DB::table('applications')->where('user_id', $user->id)->update(['cover_letter' => null, 'answers' => null, 'employer_notes' => null]);
        DB::table('saved_jobs')->where('user_id', $user->id)->delete();
        $user->notifications()->delete();
        $user->tokens()->delete();
        $user->forceFill([
            'name' => 'Deleted user', 'email' => 'deleted+'.$user->id.'.'.Str::random(8).'@deleted.invalid', 'mobile' => null,
            'password' => Str::random(40), 'status' => 'deactivated', 'two_factor_secret' => null, 'two_factor_enabled' => false,
        ])->save();
        $user->delete();   // soft delete
    }
}
