<?php

namespace App\Jobs;

use App\Models\Resume;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/** Scans an uploaded resume with ClamAV (clamd INSTREAM protocol) when CLAMAV_SOCKET is configured. */
class ScanResume implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public function __construct(public int $resumeId)
    {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $resume = Resume::find($this->resumeId);
        $socket = config('services.clamav.socket');
        if (! $resume || ! $socket) {
            return;
        }
        $path = Storage::disk('local')->path($resume->path);
        $conn = @stream_socket_client(str_contains($socket, '://') ? $socket : 'unix://'.$socket, $errno, $err, 10);
        if (! $conn) {
            Log::warning('ClamAV unavailable: '.$err);
            $this->release(300);

            return;
        }
        fwrite($conn, "zINSTREAM\0");
        $fh = fopen($path, 'rb');
        while (! feof($fh)) {
            $chunk = fread($fh, 8192);
            fwrite($conn, pack('N', strlen($chunk)).$chunk);
        }
        fclose($fh);
        fwrite($conn, pack('N', 0));
        $reply = trim((string) stream_get_contents($conn));
        fclose($conn);

        if (str_ends_with($reply, 'OK')) {
            $resume->update(['scan_status' => 'clean']);
        } elseif (str_contains($reply, 'FOUND')) {
            $resume->update(['scan_status' => 'infected']);
            Storage::disk('local')->delete($resume->path);
            Log::alert('Infected resume removed', ['resume_id' => $resume->id, 'reply' => $reply]);
        }
    }
}
