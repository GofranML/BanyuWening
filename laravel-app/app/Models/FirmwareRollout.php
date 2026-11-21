<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FirmwareRollout extends Model
{
    use HasFactory;

    protected $fillable = [
        'firmware_release_id',
        'device_id',
        'status',
        'progress_pct',
        'from_version',
        'to_version',
        'active_partition',
        'transport',
        'boot_health_ok',
        'error_message',
        'initiated_by',
        'started_at',
        'completed_at',
        'rolled_back_at',
    ];

    protected function casts(): array
    {
        return [
            'progress_pct' => 'integer',
            'boot_health_ok' => 'boolean',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'rolled_back_at' => 'datetime',
        ];
    }

    public function release(): BelongsTo
    {
        return $this->belongsTo(FirmwareRelease::class, 'firmware_release_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
