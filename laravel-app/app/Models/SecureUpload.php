<?php

namespace App\Models;

use App\Enums\UploadStatus;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SecureUpload extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'tenant_code',
        'profile',
        'status',
        'original_name_sanitized',
        'quarantine_disk',
        'quarantine_path',
        'permanent_disk',
        'permanent_path',
        'public_url',
        'detected_mime',
        'detected_extension',
        'file_size_bytes',
        'sha256_hash',
        'scanner_name',
        'scanner_version',
        'scan_result',
        'scan_signature',
        'rejection_reason',
        'scan_attempts',
        'processing_duration_ms',
        'promoted_at',
        'expires_at',
        'replaces_upload_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'status' => UploadStatus::class,
            'file_size_bytes' => 'integer',
            'scan_attempts' => 'integer',
            'processing_duration_ms' => 'integer',
            'promoted_at' => 'datetime',
            'expires_at' => 'datetime',
            'replaces_upload_id' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(SecureUploadAuditLog::class, 'secure_upload_id');
    }

    public function replacesUpload(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaces_upload_id');
    }

    /**
     * Enforce explicit upload lifecycle state transitions.
     *
     * @param  array<string, mixed>  $extra
     */
    public function transitionTo(UploadStatus $next, array $extra = []): self
    {
        $current = $this->status instanceof UploadStatus
            ? $this->status
            : UploadStatus::from((string) $this->status);

        if (! $current->canTransitionTo($next)) {
            throw new DomainException(
                "Illegal upload lifecycle transition from {$current->value} to {$next->value}."
            );
        }

        $this->forceFill(array_merge($extra, ['status' => $next]))->save();

        return $this->fresh();
    }

    public function isApproved(): bool
    {
        return $this->status === UploadStatus::CLEAN
            && ! empty($this->permanent_disk)
            && ! empty($this->permanent_path);
    }

    public function isAccessibleBy(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        $userTenant = strtoupper(trim((string) ($user->tenant_code ?? '')));
        $uploadTenant = strtoupper(trim((string) ($this->tenant_code ?? '')));

        if ($userTenant === '' || $uploadTenant === '') {
            return false;
        }

        return hash_equals($userTenant, $uploadTenant);
    }
}
