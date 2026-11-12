<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = [
        'sensor_reading_id',
        'level',
        'parameter',
        'message',
        'value',
        'telegram_sent',
        'whatsapp_sent',
        'email_sent',
        'acknowledged_at',
        'acknowledged_by',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'telegram_sent' => 'boolean',
            'whatsapp_sent' => 'boolean',
            'email_sent' => 'boolean',
            'acknowledged_at' => 'datetime',
        ];
    }

    public function sensorReading(): BelongsTo
    {
        return $this->belongsTo(SensorReading::class);
    }
}
