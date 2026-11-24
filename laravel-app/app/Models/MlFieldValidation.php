<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MlFieldValidation extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'prediction_id',
        'tenant_code',
        'device_code',
        'pond_name',
        'ph',
        'temperature_c',
        'tds_ppm',
        'turbidity_ntu',
        'water_level',
        'predicted_risk',
        'actual_risk',
        'is_match',
        'model_version',
        'field_notes',
        'validated_by',
        'validated_at',
    ];

    protected function casts(): array
    {
        return [
            'ph' => 'float',
            'temperature_c' => 'float',
            'tds_ppm' => 'float',
            'turbidity_ntu' => 'float',
            'is_match' => 'boolean',
            'validated_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function prediction(): BelongsTo
    {
        return $this->belongsTo(Prediction::class);
    }
}
