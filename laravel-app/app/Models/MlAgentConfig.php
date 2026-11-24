<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MlAgentConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'auto_learning_enabled',
        'promotion_mode',
        'min_f1_threshold',
        'max_drift_threshold',
        'min_new_samples',
        'schedule_interval_hours',
        'llm_advisor_enabled',
        'agent_model_id',
        'agent_api_url',
        'agent_api_key',
        'last_run_at',
    ];

    protected $hidden = [
        'agent_api_key',
    ];

    protected function casts(): array
    {
        return [
            'auto_learning_enabled' => 'boolean',
            'min_f1_threshold' => 'float',
            'max_drift_threshold' => 'float',
            'min_new_samples' => 'integer',
            'schedule_interval_hours' => 'integer',
            'llm_advisor_enabled' => 'boolean',
            'last_run_at' => 'datetime',
        ];
    }

    public static function current(): self
    {
        return static::firstOrCreate(
            ['key' => 'default'],
            [
                'auto_learning_enabled' => true,
                'promotion_mode' => 'AUTO_PROMOTE',
                'min_f1_threshold' => 0.90,
                'max_drift_threshold' => 0.25,
                'min_new_samples' => 10,
                'schedule_interval_hours' => 6,
                'llm_advisor_enabled' => false,
                'agent_model_id' => 'rf-autonomous-local',
            ]
        );
    }
}
