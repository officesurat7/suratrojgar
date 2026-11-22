<?php

namespace App\Http\Middleware;

use App\Services\Settings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Super-Admin-controlled maintenance mode. Admin panels, login and public settings keep working. */
class CheckMaintenanceMode
{
    public function __construct(private Settings $settings) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->settings->get('maintenance_mode')) {
            return $next($request);
        }
        if ($request->is('api/v1/meta', 'api/v1/auth/login', 'api/v1/auth/2fa/*', 'api/v1/auth/me', 'api/v1/auth/logout', 'api/v1/admin/*', 'api/v1/super/*')) {
            return $next($request);
        }

        return response()->json([
            'message' => $this->settings->get('maintenance_message'),
            'code' => 'maintenance',
        ], 503, ['Retry-After' => 600]);
    }
}
