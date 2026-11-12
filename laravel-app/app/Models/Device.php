<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Device extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_code',
        'name',
        'pond_name',
        'firmware_version',
        'ip_address',
        'mac_address',
        'mqtt_topic',
        'status',
        'mode',
        'aerator_on',
        'last_heartbeat_at',
    ];

    protected function casts(): array
    {
        return [
            'aerator_on' => 'boolean',
            'last_heartbeat_at' => 'datetime',
        ];
    }

    public function sensorReadings(): HasMany
    {
        return $this->hasMany(SensorReading::class);
    }

    public function relayLogs(): HasMany
    {
        return $this->hasMany(RelayLog::class);
    }
}
