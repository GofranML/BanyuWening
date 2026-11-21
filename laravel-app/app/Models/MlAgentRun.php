<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MlAgentRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'run_type',
        'trigger_source',
        'status',
        'decision',
        'active_model_version',
        'candidate_model_version',
        'accuracy_before',
        'macro_f1_before',
        'accuracy_after',
        'macro_f1_after',
        'drift_score',
        'live_agreement_rate',
        'new_live_samples',
        'duration_ms',
        'reasoning_steps',
        'summary',
        'metrics_snapshot',
        'error_message',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'accuracy_before' => 'float',
            'macro_f1_before' => 'float',
            'accuracy_after' => 'float',
            'macro_f1_after' => 'float',
            'drift_score' => 'float',
            'live_agreement_rate' => 'float',
            'new_live_samples' => 'integer',
            'duration_ms' => 'integer',
            'reasoning_steps' => 'array',
            'metrics_snapshot' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }
}
