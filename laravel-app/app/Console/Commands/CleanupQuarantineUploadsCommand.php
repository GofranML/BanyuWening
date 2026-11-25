<?php

namespace App\Console\Commands;

use App\Enums\UploadStatus;
use App\Models\SecureUpload;
use App\Services\Upload\SecureUploadAuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupQuarantineUploadsCommand extends Command
{
    protected $signature = 'uploads:cleanup-quarantine {--ttl= : Override TTL in minutes}';

    protected $description = 'Purge expired temporary/quarantined upload files and orphan quarantine artifacts.';

    public function handle(SecureUploadAuditService $audit): int
    {
        $ttlMinutes = max(1, (int) ($this->option('ttl') ?: config('uploads.quarantine.ttl_minutes', 60)));
        $cutoff = now()->subMinutes($ttlMinutes);
        $purgedRecords = 0;
        $purgedOrphans = 0;

        $expired = SecureUpload::whereNotNull('quarantine_path')
            ->whereIn('status', [
                UploadStatus::PENDING_SCAN->value,
                UploadStatus::SCANNING->value,
                UploadStatus::SCAN_FAILED->value,
            ])
            ->where(function ($q) use ($cutoff) {
                $q->where('expires_at', '<=', now())
                    ->orWhere('created_at', '<=', $cutoff);
            })
            ->get();

        foreach ($expired as $upload) {
            $disk = $upload->quarantine_disk ?: 'quarantine';
            if ($upload->quarantine_path && Storage::disk($disk)->exists($upload->quarantine_path)) {
                Storage::disk($disk)->delete($upload->quarantine_path);
            }

            $prev = $upload->status->value;
            $upload->forceFill([
                'status' => $upload->status === UploadStatus::PENDING_SCAN ? UploadStatus::SCAN_FAILED : $upload->status,
                'quarantine_path' => null,
                'rejection_reason' => $upload->rejection_reason ?: 'File karantina kedaluwarsa dan dibersihkan.',
            ])->save();

            $audit->record('CLEANUP_PURGED', $upload, [
                'status_from' => $prev,
                'status_to' => $upload->status->value,
                'rejection_reason' => 'Quarantine TTL expired',
            ]);
            $purgedRecords++;
        }

        // Purge orphan files in pending/ directory older than cutoff
        $qDisk = (string) config('uploads.quarantine.disk', 'quarantine');
        $disk = Storage::disk($qDisk);
        foreach ($disk->files('pending') as $relPath) {
            $lastModified = $disk->lastModified($relPath);
            if ($lastModified <= $cutoff->getTimestamp()) {
                $disk->delete($relPath);
                $purgedOrphans++;
            }
        }

        $this->info("Quarantine cleanup complete: {$purgedRecords} expired records, {$purgedOrphans} orphan files purged.");

        return self::SUCCESS;
    }
}
