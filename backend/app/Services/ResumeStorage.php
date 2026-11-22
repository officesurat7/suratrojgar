<?php

namespace App\Services;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Resumes live on the private "local" disk (storage/app/private), outside the web root.
 * They are downloaded only through short-lived signed URLs issued after authorisation.
 */
class ResumeStorage
{
    public const MAX_PER_USER = 5;
    private const MIMES = [
        'application/pdf' => 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
    ];

    public function store(User $user, UploadedFile $file, bool $makeDefault = true): Resume
    {
        if ($user->resumes()->count() >= self::MAX_PER_USER) {
            throw ValidationException::withMessages(['resume' => 'You can keep up to '.self::MAX_PER_USER.' resumes. Please delete one first.']);
        }
        $mime = $this->detectMime($file);
        $ext = self::MIMES[$mime] ?? null;
        $clientExt = Str::lower($file->getClientOriginalExtension());
        if (! $ext || $clientExt !== $ext) {
            throw ValidationException::withMessages(['resume' => 'Only PDF or DOCX files are allowed.']);
        }
        if ($ext === 'pdf' && ! str_starts_with((string) file_get_contents($file->getRealPath(), false, null, 0, 5), '%PDF-')) {
            throw ValidationException::withMessages(['resume' => 'The PDF file appears to be damaged.']);
        }
        if ($ext === 'docx' && ! $this->isValidDocx($file->getRealPath())) {
            throw ValidationException::withMessages(['resume' => 'The DOCX file appears to be damaged.']);
        }

        // Random server-side name; the original name is kept only as metadata (sanitised)
        $path = $file->storeAs('resumes/'.$user->id, Str::random(40).'.'.$ext, 'local');
        $original = Str::limit(preg_replace('/[^\w.\- ()]+/u', '_', $file->getClientOriginalName()), 190, '');

        if ($makeDefault) {
            $user->resumes()->update(['is_default' => false]);
        }
        $resume = $user->resumes()->create([
            'original_name' => $original, 'path' => $path, 'mime' => $mime, 'size' => $file->getSize(),
            'sha256' => hash_file('sha256', $file->getRealPath()), 'is_default' => $makeDefault || ! $user->resumes()->exists(),
            'scan_status' => config('services.clamav.socket') ? 'pending' : 'skipped',
        ]);
        if (config('services.clamav.socket')) {
            \App\Jobs\ScanResume::dispatch($resume->id);
        }

        return $resume;
    }

    public function delete(Resume $resume): void
    {
        Storage::disk('local')->delete($resume->path);
        $wasDefault = $resume->is_default;
        $userId = $resume->user_id;
        $resume->forceDelete();
        if ($wasDefault) {
            Resume::where('user_id', $userId)->latest()->first()?->update(['is_default' => true]);
        }
    }

    /** 5-minute signed download URL. Caller MUST authorise before calling. */
    public function temporaryUrl(Resume $resume, ?int $viewerId = null): string
    {
        return URL::temporarySignedRoute('resumes.download', now()->addMinutes(5), ['resume' => $resume->id, 'v' => $viewerId]);
    }

    private function detectMime(UploadedFile $file): string
    {
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string) $finfo->file($file->getRealPath());
        // Some libmagic builds report DOCX as generic zip
        if (in_array($mime, ['application/zip', 'application/octet-stream'], true) && Str::lower($file->getClientOriginalExtension()) === 'docx') {
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        return $mime;
    }

    private function isValidDocx(string $path): bool
    {
        $zip = new \ZipArchive;
        if ($zip->open($path) !== true) {
            return false;
        }
        $ok = $zip->locateName('word/document.xml') !== false && $zip->locateName('[Content_Types].xml') !== false;
        // Reject macro-enabled payloads disguised as .docx
        $ok = $ok && $zip->locateName('word/vbaProject.bin') === false;
        $zip->close();

        return $ok;
    }
}
