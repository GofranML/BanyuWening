<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prediction extends Model
{
    use HasFactory;

    protected $fillable = [
        'sensor_reading_id',
        'risk',
        'p_aman',
        'p_waspada',
        'p_bahaya',
        'model_version',
        'timeframe',
        'triggers',
        'recommended_action',
        'failsafe_active',
        'predicted_at',
    ];

    protected function casts(): array
    {
        return [
            'p_aman' => 'float',
            'p_waspada' => 'float',
            'p_bahaya' => 'float',
            'triggers' => 'array',
            'failsafe_active' => 'boolean',
            'predicted_at' => 'datetime',
        ];
    }

    public function sensorReading(): BelongsTo
    {
        return $this->belongsTo(SensorReading::class);
    }
}
