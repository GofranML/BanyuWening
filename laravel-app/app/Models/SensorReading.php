<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SensorReading extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'recorded_at',
        'ph',
        'temperature_c',
        'tds_ppm',
        'turbidity_ntu',
        'water_level',
        'aerator_on',
        'mode',
        'battery_v',
    ];

    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
            'ph' => 'float',
            'temperature_c' => 'float',
            'tds_ppm' => 'float',
            'turbidity_ntu' => 'float',
            'aerator_on' => 'boolean',
            'battery_v' => 'float',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function prediction(): HasOne
    {
        return $this->hasOne(Prediction::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }
}
