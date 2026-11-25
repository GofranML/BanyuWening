<?php

namespace App\Jobs;

use App\Enums\UploadStatus;
use App\Models\SecureUpload;
use App\Services\Upload\SecureFileUploadService;
use App\Services\Upload\SecureUploadAuditService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;

class ScanAndPromoteUploadJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [5, 15, 30];

    public int $timeout = 60;

    public function __construct(
        public readonly int $secureUploadId,
    ) {}

    public function handle(SecureFileUploadService $uploadService): void
    {
        $upload = SecureUpload::find($this->secureUploadId);
        if (! $upload) {
            return;
        }

        $isAsyncRetryable = $this->attempts() < $this->tries
            && config('queue.default') !== 'sync'
            && (bool) config('uploads.async_scan', false);

        $uploadService->processScanAndPromote($upload, $isAsyncRetryable);
    }

    public function failed(?\Throwable $exception): void
    {
        $upload = SecureUpload::find($this->secureUploadId);
        if (! $upload || $upload->status->isTerminal()) {
            return;
        }

        $qDisk = $upload->quarantine_disk ?: 'quarantine';
        if ($upload->quarantine_path && Storage::disk($qDisk)->exists($upload->quarantine_path)) {
            Storage::disk($qDisk)->delete($upload->quarantine_path);
        }

        $reason = $exception?->getMessage() ?: 'Pemindaian gagal setelah batas percobaan ulang habis.';

        $upload->forceFill([
            'status' => UploadStatus::SCAN_FAILED,
            'quarantine_path' => null,
            'rejection_reason' => $reason,
        ])->save();

        app(SecureUploadAuditService::class)->record('SCAN_FAILED_FINAL', $upload, [
            'status_to' => UploadStatus::SCAN_FAILED->value,
            'rejection_reason' => $reason,
            'promotion_result' => 'BLOCKED_FAIL_CLOSED',
        ]);
    }
}
