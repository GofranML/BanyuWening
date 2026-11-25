<?php

namespace App\Services\Upload;

use App\Models\SecureUpload;
use App\Models\SecureUploadAuditLog;
use Illuminate\Support\Facades\Log;

class SecureUploadAuditService
{
    private const FORBIDDEN_KEYS = [
        'password',
        'token',
        'secret',
        'api_key',
        'app_key',
        'content',
        'body',
        'authorization',
    ];

    /**
     * Record a security audit event in both database and dedicated security log channel.
     *
     * @param  array<string, mixed>  $context
     */
    public function record(string $event, ?SecureUpload $upload, array $context = []): SecureUploadAuditLog
    {
        $sanitizedContext = $this->stripForbiddenKeys($context);

        $statusFrom = $sanitizedContext['status_from'] ?? null;
        $statusTo = $sanitizedContext['status_to'] ?? ($upload?->status?->value ?? null);
        $userId = $sanitizedContext['user_id'] ?? $upload?->user_id;
        $tenantCode = $sanitizedContext['tenant_code'] ?? $upload?->tenant_code;
        $sha256 = $sanitizedContext['sha256_hash'] ?? $upload?->sha256_hash;
        $fileSize = $sanitizedContext['file_size_bytes'] ?? $upload?->file_size_bytes;
        $detectedMime = $sanitizedContext['detected_mime'] ?? $upload?->detected_mime;
        $scannerVersion = $sanitizedContext['scanner_version'] ?? $upload?->scanner_version;
        $scanResult = $sanitizedContext['scan_result'] ?? $upload?->scan_result;
        $rejectionReason = $sanitizedContext['rejection_reason'] ?? $upload?->rejection_reason;
        $durationMs = $sanitizedContext['processing_duration_ms'] ?? $upload?->processing_duration_ms;
        $promotionResult = $sanitizedContext['promotion_result'] ?? null;
        $ipAddress = $sanitizedContext['ip_address'] ?? (app()->runningInConsole() ? null : request()?->ip());

        $logEntry = SecureUploadAuditLog::create([
            'secure_upload_id' => $upload?->id,
            'upload_uuid' => $sanitizedContext['upload_uuid'] ?? $upload?->uuid,
            'user_id' => $userId,
            'tenant_code' => $tenantCode,
            'event' => $event,
            'status_from' => $statusFrom,
            'status_to' => $statusTo,
            'sha256_hash' => $sha256,
            'file_size_bytes' => $fileSize,
            'detected_mime' => $detectedMime,
            'scanner_version' => $scannerVersion,
            'scan_result' => $scanResult,
            'rejection_reason' => $rejectionReason,
            'processing_duration_ms' => $durationMs,
            'promotion_result' => $promotionResult,
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);

        Log::channel('security_uploads')->info('secure_upload.'.strtolower($event), [
            'event' => $event,
            'upload_id' => $logEntry->upload_uuid,
            'user_id' => $userId,
            'tenant_code' => $tenantCode,
            'status_from' => $statusFrom,
            'status_to' => $statusTo,
            'sha256' => $sha256,
            'file_size_bytes' => $fileSize,
            'detected_mime' => $detectedMime,
            'scanner_version' => $scannerVersion,
            'scan_result' => $scanResult,
            'rejection_reason' => $rejectionReason,
            'processing_duration_ms' => $durationMs,
            'promotion_result' => $promotionResult,
            'ip_address' => $ipAddress,
            'timestamp' => now()->toIso8601String(),
        ]);

        return $logEntry;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function stripForbiddenKeys(array $data): array
    {
        $clean = [];
        foreach ($data as $key => $value) {
            $lowerKey = strtolower((string) $key);
            $isForbidden = false;
            foreach (self::FORBIDDEN_KEYS as $forbidden) {
                if (str_contains($lowerKey, $forbidden)) {
                    $isForbidden = true;
                    break;
                }
            }
            if ($isForbidden) {
                continue;
            }
            $clean[$key] = is_array($value) ? $this->stripForbiddenKeys($value) : $value;
        }

        return $clean;
    }
}
