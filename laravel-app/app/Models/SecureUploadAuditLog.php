<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecureUploadAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'secure_upload_id',
        'upload_uuid',
        'user_id',
        'tenant_code',
        'event',
        'status_from',
        'status_to',
        'sha256_hash',
        'file_size_bytes',
        'detected_mime',
        'scanner_version',
        'scan_result',
        'rejection_reason',
        'processing_duration_ms',
        'promotion_result',
        'ip_address',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
            'processing_duration_ms' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function upload(): BelongsTo
    {
        return $this->belongsTo(SecureUpload::class, 'secure_upload_id');
    }
}
