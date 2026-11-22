<?php

namespace App\Http\Controllers\Api\Shared;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Services\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Signed, short-lived resume downloads. Authorisation happened when the URL was issued. */
class FileController extends Controller
{
    public function resume(Request $request, Resume $resume): StreamedResponse
    {
        abort_unless($request->hasValidSignature(), 403, 'This download link has expired. Please try again.');
        abort_if($resume->scan_status === 'infected', 410, 'This file was blocked by the malware scanner.');
        abort_unless(Storage::disk('local')->exists($resume->path), 404);

        $viewer = (int) $request->query('v');
        if ($viewer && $viewer !== $resume->user_id) {
            Audit::log('resume.downloaded', $resume, [], ['owner' => $resume->user_id], $viewer);
        }
        $name = preg_replace('/[^\w.\- ()]+/u', '_', $resume->original_name);

        return Storage::disk('local')->download($resume->path, $name, [
            'Content-Type' => $resume->mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ]);
    }
}
