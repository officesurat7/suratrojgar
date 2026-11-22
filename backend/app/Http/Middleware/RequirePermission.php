<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Usage: ->middleware('perm:jobs.approve') ; multiple = any of them. */
class RequirePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();
        foreach ($permissions as $p) {
            if ($user?->hasPermission($p)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'You do not have permission for this action.'], 403);
    }
}
