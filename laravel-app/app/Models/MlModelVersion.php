<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MlModelVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'version',
        'algorithm',
        'model_format',
        'artifact_path',
        'model_card_path',
        'status',
        'is_active',
        'accuracy',
        'macro_f1',
        'weighted_f1',
        'bahaya_recall',
        'drift_score',
        'avg_latency_ms',
        'train_samples',
        'test_samples',
        'live_samples_included',
        'hyperparameters',
        'confusion_matrix',
        'feature_importances',
        'per_class_metrics',
        'trained_by',
        'notes',
        'trained_at',
        'promoted_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'accuracy' => 'float',
            'macro_f1' => 'float',
            'weighted_f1' => 'float',
            'bahaya_recall' => 'float',
            'drift_score' => 'float',
            'avg_latency_ms' => 'float',
            'train_samples' => 'integer',
            'test_samples' => 'integer',
            'live_samples_included' => 'integer',
            'hyperparameters' => 'array',
            'confusion_matrix' => 'array',
            'feature_importances' => 'array',
            'per_class_metrics' => 'array',
            'trained_at' => 'datetime',
            'promoted_at' => 'datetime',
        ];
    }
}
