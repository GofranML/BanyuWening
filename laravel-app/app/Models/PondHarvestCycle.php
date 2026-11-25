<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PondHarvestCycle extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'tenant_code',
        'device_code',
        'pond_name',
        'cycle_name',
        'stocking_date',
        'harvest_date',
        'seed_count',
        'seed_size_cm',
        'harvest_weight_kg',
        'fish_per_kg',
        'harvest_fish_count',
        'harvest_size_cm',
        'avg_fish_weight_g',
        'estimated_harvest_count',
        'estimated_mortality_count',
        'survival_rate_pct',
        'mortality_rate_pct',
        'mortality_status',
        'ai_danger_events',
        'ai_warning_events',
        'avg_ph_cycle',
        'avg_temp_cycle',
        'ai_evaluation_note',
        'ai_diagnosis',
        'notes',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'stocking_date' => 'date:Y-m-d',
            'harvest_date' => 'date:Y-m-d',
            'seed_count' => 'integer',
            'harvest_weight_kg' => 'float',
            'fish_per_kg' => 'float',
            'harvest_fish_count' => 'integer',
            'avg_fish_weight_g' => 'float',
            'estimated_harvest_count' => 'integer',
            'estimated_mortality_count' => 'integer',
            'survival_rate_pct' => 'float',
            'mortality_rate_pct' => 'float',
            'ai_danger_events' => 'integer',
            'ai_warning_events' => 'integer',
            'avg_ph_cycle' => 'float',
            'avg_temp_cycle' => 'float',
            'ai_diagnosis' => 'array',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
