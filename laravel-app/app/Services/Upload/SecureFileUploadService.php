<?php

namespace App\Services\Upload;

use App\Enums\UploadStatus;
use App\Jobs\ScanAndPromoteUploadJob;
use App\Models\FirmwareRelease;
use App\Models\SecureUpload;
use App\Models\User;
use App\Services\Upload\Contracts\MalwareScannerInterface;
use App\Services\Upload\Exceptions\FileValidationException;
use App\Services\Upload\Exceptions\ScannerTransientException;
use Illuminate\Http\Testing\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SecureFileUploadService
{
    public function __construct(
        private readonly FileSecurityInspector $inspector,
        private readonly MalwareScannerInterface $scanner,
        private readonly SecureUploadAuditService $audit,
    ) {}

    /**
     * Ingest an uploaded file into private quarantine, validate it, and dispatch scan/promotion.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function ingest(
        UploadedFile $file,
        string $profile,
        User $actor,
        ?string $requestedTenantCode = null,
        array $metadata = [],
        ?SecureUpload $replaces = null,
    ): SecureUpload {
        $tenantCode = $this->resolveAndAuthorizeTenant($actor, $requestedTenantCode);

        if (! $file->isValid()) {
            throw new FileValidationException('UPLOAD_TRANSFER_ERROR', 'File gagal diunggah ke server.');
        }

        $quarantineDisk = (string) config('uploads.quarantine.disk', 'quarantine');
        $this->enforceQuarantineQuota($quarantineDisk);

        $uuid = (string) Str::uuid();
        $quarantineRelPath = 'pending/'.$uuid.'.part';

        $this->storeInQuarantine($file, $quarantineDisk, $quarantineRelPath);
        $quarantineAbsPath = Storage::disk($quarantineDisk)->path($quarantineRelPath);
        @chmod($quarantineAbsPath, 0600);

        $clientName = (string) $file->getClientOriginalName();

        try {
            $inspection = $this->inspector->inspect($quarantineAbsPath, $clientName, $profile);
        } catch (FileValidationException $e) {
            Storage::disk($quarantineDisk)->delete($quarantineRelPath);

            $rejected = SecureUpload::create([
                'uuid' => $uuid,
                'user_id' => $actor->id,
                'tenant_code' => $tenantCode,
                'profile' => $profile,
                'status' => UploadStatus::REJECTED,
                'original_name_sanitized' => $this->fallbackSafeName($clientName),
                'quarantine_disk' => $quarantineDisk,
                'quarantine_path' => null,
                'file_size_bytes' => (int) (@$file->getSize() ?: 0),
                'sha256_hash' => str_repeat('0', 64),
                'rejection_reason' => $e->getMessage(),
                'replaces_upload_id' => $replaces?->id,
                'metadata' => $metadata,
            ]);

            $this->audit->record('VALIDATION_FAILED', $rejected, [
                'status_from' => null,
                'status_to' => UploadStatus::REJECTED->value,
                'rejection_reason' => $e->getMessage(),
            ]);

            throw $e;
        }

        $ttlMinutes = max(5, (int) config('uploads.quarantine.ttl_minutes', 60));

        $upload = SecureUpload::create([
            'uuid' => $uuid,
            'user_id' => $actor->id,
            'tenant_code' => $tenantCode,
            'profile' => $profile,
            'status' => UploadStatus::PENDING_SCAN,
            'original_name_sanitized' => $inspection->originalNameSanitized,
            'quarantine_disk' => $quarantineDisk,
            'quarantine_path' => $quarantineRelPath,
            'detected_mime' => $inspection->mime,
            'detected_extension' => $inspection->extension,
            'file_size_bytes' => $inspection->sizeBytes,
            'sha256_hash' => $inspection->sha256,
            'expires_at' => now()->addMinutes($ttlMinutes),
            'replaces_upload_id' => $replaces?->id,
            'metadata' => array_merge($metadata, $inspection->metadata),
        ]);

        $this->audit->record('UPLOAD_RECEIVED', $upload, [
            'status_from' => null,
            'status_to' => UploadStatus::PENDING_SCAN->value,
        ]);

        if (config('uploads.async_scan', false)) {
            ScanAndPromoteUploadJob::dispatch($upload->id);

            return $upload->fresh();
        }

        ScanAndPromoteUploadJob::dispatchSync($upload->id);

        return $upload->fresh();
    }

    /**
     * Scan a quarantined upload and atomically promote it to permanent storage if CLEAN.
     */
    public function processScanAndPromote(SecureUpload $upload, bool $allowRetryThrow = false): SecureUpload
    {
        $lock = Cache::lock("secure-upload:process:{$upload->uuid}", 60);
        if (! $lock->get()) {
            return $upload->fresh();
        }

        try {
            $upload = $upload->fresh();
            if (! $upload) {
                throw new \RuntimeException('Record SecureUpload tidak ditemukan.');
            }

            // Idempotency: terminal states are never re-processed
            if ($upload->status->isTerminal()) {
                return $upload;
            }

            $qDisk = $upload->quarantine_disk ?: 'quarantine';
            $qPath = $upload->quarantine_path;
            if (! $qPath || ! Storage::disk($qDisk)->exists($qPath)) {
                $upload = $upload->transitionTo(UploadStatus::REJECTED, [
                    'rejection_reason' => 'File karantina tidak ditemukan sebelum pemindaian.',
                ]);
                $this->audit->record('VALIDATION_FAILED', $upload, [
                    'status_to' => UploadStatus::REJECTED->value,
                    'rejection_reason' => $upload->rejection_reason,
                ]);

                return $upload;
            }

            $absPath = Storage::disk($qDisk)->path($qPath);

            // TOCTOU integrity check
            $liveSha256 = hash_file('sha256', $absPath);
            if (! is_string($liveSha256) || ! hash_equals($upload->sha256_hash, $liveSha256)) {
                Storage::disk($qDisk)->delete($qPath);
                $upload = $upload->transitionTo(UploadStatus::REJECTED, [
                    'quarantine_path' => null,
                    'rejection_reason' => 'Checksum file di karantina berubah sebelum pemindaian (TOCTOU).',
                ]);
                $this->audit->record('VALIDATION_FAILED', $upload, [
                    'status_to' => UploadStatus::REJECTED->value,
                    'rejection_reason' => $upload->rejection_reason,
                ]);

                return $upload;
            }

            $previousStatus = $upload->status->value;
            if ($upload->status !== UploadStatus::SCANNING) {
                $upload = $upload->transitionTo(UploadStatus::SCANNING, [
                    'scan_attempts' => $upload->scan_attempts + 1,
                ]);
            } else {
                $upload->increment('scan_attempts');
                $upload = $upload->fresh();
            }

            $this->audit->record('SCAN_STARTED', $upload, [
                'status_from' => $previousStatus,
                'status_to' => UploadStatus::SCANNING->value,
            ]);

            // Defense-in-depth re-inspection before malware scan
            try {
                $this->inspector->inspect($absPath, $upload->original_name_sanitized, $upload->profile);
            } catch (FileValidationException $e) {
                Storage::disk($qDisk)->delete($qPath);
                $upload = $upload->transitionTo(UploadStatus::REJECTED, [
                    'quarantine_path' => null,
                    'rejection_reason' => $e->getMessage(),
                ]);
                $this->syncLinkedFirmwareStatus($upload, 'REJECTED', false);
                $this->audit->record('VALIDATION_FAILED', $upload, [
                    'status_from' => UploadStatus::SCANNING->value,
                    'status_to' => UploadStatus::REJECTED->value,
                    'rejection_reason' => $e->getMessage(),
                ]);

                return $upload;
            }

            $scanResult = $this->scanner->scan($absPath);

            if ($scanResult->isClean()) {
                return $this->promoteCleanUpload($upload, $absPath, $scanResult);
            }

            if ($scanResult->isInfected()) {
                $retainInfected = (bool) config('uploads.quarantine.retain_infected', true);
                $finalQPath = $qPath;

                if ($retainInfected) {
                    $infectedPath = 'infected/'.$upload->uuid.'.quarantined';
                    Storage::disk($qDisk)->move($qPath, $infectedPath);
                    @chmod(Storage::disk($qDisk)->path($infectedPath), 0600);
                    $finalQPath = $infectedPath;
                } else {
                    Storage::disk($qDisk)->delete($qPath);
                    $finalQPath = null;
                }

                $reason = 'Malware terdeteksi: '.($scanResult->signature ?: 'Unknown.Threat');
                $upload = $upload->transitionTo(UploadStatus::QUARANTINED, [
                    'quarantine_path' => $finalQPath,
                    'scanner_name' => $scanResult->scannerName,
                    'scanner_version' => $scanResult->scannerVersion,
                    'scan_result' => $scanResult->status,
                    'scan_signature' => $scanResult->signature,
                    'rejection_reason' => $reason,
                    'processing_duration_ms' => $scanResult->durationMs,
                ]);

                $this->syncLinkedFirmwareStatus($upload, 'QUARANTINED', false);

                $this->audit->record('SCAN_INFECTED', $upload, [
                    'status_from' => UploadStatus::SCANNING->value,
                    'status_to' => UploadStatus::QUARANTINED->value,
                    'scanner_version' => $scanResult->scannerVersion,
                    'scan_result' => $scanResult->status,
                    'rejection_reason' => $reason,
                    'processing_duration_ms' => $scanResult->durationMs,
                    'promotion_result' => 'BLOCKED_QUARANTINED',
                ]);

                return $upload;
            }

            // Fail-closed for TIMEOUT, UNAVAILABLE, or ERROR
            $upload = $upload->transitionTo(UploadStatus::SCAN_FAILED, [
                'scanner_name' => $scanResult->scannerName,
                'scanner_version' => $scanResult->scannerVersion,
                'scan_result' => $scanResult->status,
                'rejection_reason' => $scanResult->message,
                'processing_duration_ms' => $scanResult->durationMs,
            ]);

            $this->syncLinkedFirmwareStatus($upload, 'SCAN_FAILED', false);

            $this->audit->record('SCAN_FAILED', $upload, [
                'status_from' => UploadStatus::SCANNING->value,
                'status_to' => UploadStatus::SCAN_FAILED->value,
                'scanner_version' => $scanResult->scannerVersion,
                'scan_result' => $scanResult->status,
                'rejection_reason' => $scanResult->message,
                'processing_duration_ms' => $scanResult->durationMs,
                'promotion_result' => 'BLOCKED_FAIL_CLOSED',
            ]);

            if ($allowRetryThrow) {
                throw new ScannerTransientException($scanResult->status, $scanResult->message);
            }

            if (config('uploads.quarantine.cleanup_on_failure', true) && Storage::disk($qDisk)->exists($qPath)) {
                Storage::disk($qDisk)->delete($qPath);
                $upload->forceFill(['quarantine_path' => null])->save();
            }

            return $upload->fresh();
        } finally {
            $lock->release();
        }
    }

    /**
     * Assert that the actor is authorized to download the upload and it is CLEAN.
     */
    public function assertDownloadAllowed(SecureUpload $upload, User $actor, ?string $ip = null): string
    {
        if (! $upload->isAccessibleBy($actor)) {
            $this->audit->record('ACCESS_DENIED', $upload, [
                'user_id' => $actor->id,
                'rejection_reason' => 'Cross-tenant download attempt blocked.',
                'ip_address' => $ip,
            ]);
            abort(403, 'Anda tidak memiliki izin mengakses file milik tenant lain.');
        }

        if (! $upload->isApproved()) {
            $this->audit->record('ACCESS_DENIED', $upload, [
                'user_id' => $actor->id,
                'rejection_reason' => 'Attempted access to unapproved/quarantined file.',
                'ip_address' => $ip,
            ]);
            abort(403, 'File belum lolos verifikasi keamanan atau sedang dikarantina.');
        }

        $disk = (string) $upload->permanent_disk;
        $path = (string) $upload->permanent_path;

        if (! Storage::disk($disk)->exists($path)) {
            abort(404, 'File tidak ditemukan di penyimpanan permanen.');
        }

        $absPath = Storage::disk($disk)->path($path);
        $liveHash = hash_file('sha256', $absPath);
        if (! is_string($liveHash) || ! hash_equals($upload->sha256_hash, $liveHash)) {
            $this->audit->record('INTEGRITY_MISMATCH', $upload, [
                'user_id' => $actor->id,
                'rejection_reason' => 'Permanent file SHA-256 mismatch on download.',
                'ip_address' => $ip,
            ]);
            abort(500, 'Integritas file gagal diverifikasi.');
        }

        $this->audit->record('DOWNLOADED', $upload, [
            'user_id' => $actor->id,
            'ip_address' => $ip,
        ]);

        return $absPath;
    }

    public function deleteUpload(SecureUpload $upload, User $actor, ?string $ip = null): void
    {
        if (! $upload->isAccessibleBy($actor)) {
            $this->audit->record('ACCESS_DENIED', $upload, [
                'user_id' => $actor->id,
                'rejection_reason' => 'Cross-tenant delete attempt blocked.',
                'ip_address' => $ip,
            ]);
            abort(403, 'Anda tidak memiliki izin menghapus file milik tenant lain.');
        }

        if ($upload->quarantine_path && Storage::disk($upload->quarantine_disk ?: 'quarantine')->exists($upload->quarantine_path)) {
            Storage::disk($upload->quarantine_disk ?: 'quarantine')->delete($upload->quarantine_path);
        }

        if ($upload->permanent_disk && $upload->permanent_path && Storage::disk($upload->permanent_disk)->exists($upload->permanent_path)) {
            Storage::disk($upload->permanent_disk)->delete($upload->permanent_path);
        }

        $this->audit->record('DELETED', $upload, [
            'user_id' => $actor->id,
            'ip_address' => $ip,
        ]);

        $upload->delete();
    }

    private function promoteCleanUpload(SecureUpload $upload, string $quarantineAbsPath, ScanResult $scanResult): SecureUpload
    {
        $cfg = config("uploads.profiles.{$upload->profile}");
        $destDisk = (string) ($cfg['destination_disk'] ?? 'private_uploads');
        $destPath = $this->buildPermanentPath($upload, $cfg);
        $publicUrl = ! empty($cfg['is_public']) && ! empty($cfg['public_url_prefix'])
            ? rtrim((string) $cfg['public_url_prefix'], '/').'/'.basename($destPath)
            : null;

        $stream = fopen($quarantineAbsPath, 'rb');
        if ($stream === false) {
            throw new \RuntimeException('Gagal membuka file karantina untuk promosi.');
        }

        try {
            Storage::disk($destDisk)->put($destPath, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        $destAbsPath = Storage::disk($destDisk)->path($destPath);
        @chmod($destAbsPath, ! empty($cfg['is_public']) ? 0644 : 0600);

        $promotedSha = hash_file('sha256', $destAbsPath);
        if (! is_string($promotedSha) || ! hash_equals($upload->sha256_hash, $promotedSha)) {
            Storage::disk($destDisk)->delete($destPath);
            throw new \RuntimeException('Checksum file permanen tidak cocok setelah promosi.');
        }

        try {
            DB::transaction(function () use (&$upload, $destDisk, $destPath, $publicUrl, $scanResult) {
                $upload = $upload->transitionTo(UploadStatus::CLEAN, [
                    'permanent_disk' => $destDisk,
                    'permanent_path' => $destPath,
                    'public_url' => $publicUrl,
                    'quarantine_path' => null,
                    'scanner_name' => $scanResult->scannerName,
                    'scanner_version' => $scanResult->scannerVersion,
                    'scan_result' => $scanResult->status,
                    'scan_signature' => null,
                    'rejection_reason' => null,
                    'processing_duration_ms' => $scanResult->durationMs,
                    'promoted_at' => now(),
                ]);

                $this->syncLinkedFirmwareStatus($upload, 'CLEAN', true, $destPath);
            });
        } catch (\Throwable $e) {
            // Rollback orphan file in permanent storage on DB failure
            if (Storage::disk($destDisk)->exists($destPath)) {
                Storage::disk($destDisk)->delete($destPath);
            }
            $this->audit->record('PROMOTION_FAILED', $upload, [
                'status_from' => UploadStatus::SCANNING->value,
                'status_to' => $upload->status->value,
                'rejection_reason' => $e->getMessage(),
                'promotion_result' => 'ROLLED_BACK',
            ]);
            throw $e;
        }

        // Clean up quarantine source file after transaction commits
        $qDisk = $upload->quarantine_disk ?: 'quarantine';
        $origQPath = 'pending/'.$upload->uuid.'.part';
        if (Storage::disk($qDisk)->exists($origQPath)) {
            Storage::disk($qDisk)->delete($origQPath);
        }

        // Clean up superseded file if this upload replaced an older one
        if ($upload->replaces_upload_id) {
            $old = SecureUpload::find($upload->replaces_upload_id);
            if ($old && $old->permanent_disk && $old->permanent_path) {
                if (Storage::disk($old->permanent_disk)->exists($old->permanent_path)) {
                    Storage::disk($old->permanent_disk)->delete($old->permanent_path);
                }
                $this->audit->record('REPLACED', $old, [
                    'user_id' => $upload->user_id,
                    'promotion_result' => 'SUPERSEDED_BY_'.$upload->uuid,
                ]);
            }
        }

        $this->audit->record('PROMOTED', $upload, [
            'status_from' => UploadStatus::SCANNING->value,
            'status_to' => UploadStatus::CLEAN->value,
            'scanner_version' => $scanResult->scannerVersion,
            'scan_result' => $scanResult->status,
            'processing_duration_ms' => $scanResult->durationMs,
            'promotion_result' => 'PROMOTED',
        ]);

        return $upload;
    }

    /**
     * @param  array<string, mixed>  $cfg
     */
    private function buildPermanentPath(SecureUpload $upload, array $cfg): string
    {
        $ext = strtolower((string) $upload->detected_extension);
        $prefix = trim((string) ($cfg['destination_prefix'] ?? ''), '/');

        if ($upload->profile === 'firmware') {
            $ver = preg_replace('/[^A-Za-z0-9._-]/', '_', (string) ($upload->metadata['version'] ?? 'fw')) ?: 'fw';
            $filename = $ver.'_'.substr($upload->uuid, 0, 8).'.bin';

            return $prefix !== '' ? "{$prefix}/{$filename}" : $filename;
        }

        if ($upload->profile === 'tenant_document') {
            $safeTenant = preg_replace('/[^A-Za-z0-9_-]/', '_', strtoupper((string) ($upload->tenant_code ?: 'GLOBAL'))) ?: 'GLOBAL';
            $filename = $upload->uuid.'.'.$ext;

            return $prefix !== '' ? "{$prefix}/{$safeTenant}/{$filename}" : "{$safeTenant}/{$filename}";
        }

        $filename = $upload->uuid.'.'.$ext;

        return $prefix !== '' ? "{$prefix}/{$filename}" : $filename;
    }

    private function syncLinkedFirmwareStatus(
        SecureUpload $upload,
        string $scanStatus,
        bool $isActive,
        ?string $permanentPath = null,
    ): void {
        $releaseId = $upload->metadata['firmware_release_id'] ?? null;
        if (! $releaseId) {
            return;
        }

        $release = FirmwareRelease::find((int) $releaseId);
        if (! $release) {
            return;
        }

        $updates = [
            'scan_status' => $scanStatus,
            'is_active' => $isActive,
        ];
        if ($permanentPath !== null) {
            $updates['file_path'] = ltrim($permanentPath, '/');
        }

        $release->update($updates);
    }

    private function resolveAndAuthorizeTenant(User $actor, ?string $requestedTenantCode): ?string
    {
        $actorTenant = $actor->tenant_code ? User::normalizeTenantCode($actor->tenant_code) : null;
        $requested = $requestedTenantCode ? User::normalizeTenantCode($requestedTenantCode) : null;

        if ($actor->isAdmin()) {
            return $requested ?? $actorTenant ?? 'GLOBAL';
        }

        if (! $actorTenant) {
            abort(403, 'Akun Anda tidak terikat ke tenant mana pun.');
        }

        if ($requested !== null && strcasecmp($requested, $actorTenant) !== 0) {
            $this->audit->record('ACCESS_DENIED', null, [
                'user_id' => $actor->id,
                'tenant_code' => $actorTenant,
                'rejection_reason' => "Cross-tenant upload blocked ({$actorTenant} -> {$requested}).",
            ]);
            abort(403, 'CROSS_TENANT_UPLOAD_FORBIDDEN: Anda tidak dapat mengunggah ke tenant lain.');
        }

        return $actorTenant;
    }

    private function enforceQuarantineQuota(string $quarantineDisk): void
    {
        $maxTotal = (int) config('uploads.quarantine.max_total_bytes', 524288000);
        $disk = Storage::disk($quarantineDisk);
        $total = 0;

        foreach ($disk->allFiles() as $file) {
            $total += (int) $disk->size($file);
        }

        if ($total >= $maxTotal) {
            throw new FileValidationException(
                'QUARANTINE_QUOTA_EXCEEDED',
                'Kapasitas penyimpanan karantina sementara penuh. Coba lagi setelah pembersihan otomatis.',
                507
            );
        }
    }

    private function storeInQuarantine(UploadedFile $file, string $disk, string $relPath): void
    {
        if ($file instanceof File) {
            try {
                $prop = new \ReflectionProperty(File::class, 'tempFile');
                $resource = $prop->getValue($file);
                if (is_resource($resource)) {
                    rewind($resource);
                    $bytes = stream_get_contents($resource);
                    rewind($resource);
                    Storage::disk($disk)->put($relPath, is_string($bytes) ? $bytes : '');

                    return;
                }
            } catch (\Throwable) {
                // fallback below
            }
        }

        $realPath = $file->getRealPath();
        if (is_string($realPath) && $realPath !== '' && is_file($realPath)) {
            $stream = @fopen($realPath, 'rb');
            if ($stream !== false) {
                try {
                    Storage::disk($disk)->put($relPath, $stream);

                    return;
                } finally {
                    fclose($stream);
                }
            }
        }

        Storage::disk($disk)->put($relPath, $file->get());
    }

    private function fallbackSafeName(string $raw): string
    {
        $clean = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($raw)) ?: 'rejected_upload';

        return substr($clean, 0, 120);
    }
}
