<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Usage: ->middleware('type:employer') or 'type:admin_staff,admin,super_admin'. Also requires an active, verified account. */
class EnsureUserType
{
    public function handle(Request $request, Closure $next, string ...$types): Response
    {
        $user = $request->user();
        if (! $user || ! in_array($user->user_type, $types, true)) {
            return response()->json(['message' => 'You do not have access to this area.'], 403);
        }
        if (! $user->email_verified_at) {
            return response()->json(['message' => 'Please verify your email address first.', 'code' => 'email_unverified'], 403);
        }
        // Pending employers may use their dashboard (profile, drafts) while awaiting verification
        $allowed = $user->isEmployer() ? ['active', 'pending'] : ['active'];
        if (! in_array($user->status, $allowed, true)) {
            return response()->json(['message' => 'Your account is '.$user->status.'. Please contact support.', 'code' => 'account_'.$user->status], 403);
        }

        return $next($request);
    }
}
