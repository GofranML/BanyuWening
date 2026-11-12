<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RelayLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'action',
        'mode',
        'reason',
        'actor',
        'duration_seconds',
        'triggered_at',
    ];

    protected function casts(): array
    {
        return [
            'duration_seconds' => 'integer',
            'triggered_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
