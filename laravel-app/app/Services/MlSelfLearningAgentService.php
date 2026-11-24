<?php

namespace App\Services;

use App\Models\MlAgentConfig;
use App\Models\MlAgentRun;
use App\Models\MlFieldValidation;
use App\Models\MlModelVersion;
use App\Models\PondHarvestCycle;
use App\Models\Prediction;
use App\Models\SensorReading;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class MlSelfLearningAgentService
{
    public const AVAILABLE_AGENT_MODELS = [
        [
            'id' => 'rf-autonomous-local',
            'name' => 'BanyuWening Autonomous RF Agent (Lokal)',
            'provider' => 'Local Python Engine',
            'protocol' => 'local',
            'default_api_url' => '',
            'badge' => 'Default · Offline Ready',
            'description' => 'Orkestrator deterministik lokal (TimeSeriesSplit 3-fold + Safety Gate SNI) tanpa ketergantungan API eksternal.',
            'requires_api_key' => false,
        ],
        [
            'id' => 'deepseek-v4-pro',
            'name' => 'DeepSeek V4 Pro',
            'provider' => 'DeepSeek API',
            'protocol' => 'openai_compatible',
            'default_api_url' => 'https://api.deepseek.com/chat/completions',
            'badge' => 'Deep Reasoning · DeepSeek',
            'description' => 'Retraining RF grid mendalam (hingga 240 trees) + analisis drift, validasi lapangan & mortalitas panen via DeepSeek V4 Pro (mendukung DeepSeek API & OpenRouter).',
            'requires_api_key' => true,
        ],
        [
            'id' => 'deepseek-reasoner',
            'name' => 'DeepSeek Reasoner',
            'provider' => 'DeepSeek API',
            'protocol' => 'openai_compatible',
            'default_api_url' => 'https://api.deepseek.com/chat/completions',
            'badge' => 'Reasoning · DeepSeek',
            'description' => 'Penalaran bertahap DeepSeek untuk evaluasi anomali kualitas air dan Safety Gate SNI.',
            'requires_api_key' => true,
        ],
        [
            'id' => 'gemini-2.5-flash',
            'name' => 'Google Gemini 2.5 Flash',
            'provider' => 'Google AI',
            'protocol' => 'gemini',
            'default_api_url' => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            'badge' => 'Cepat & Hemat',
            'description' => 'Retraining RF cepat + ringkasan analisis drift, validasi lapangan, dan korelasi mortalitas panen.',
            'requires_api_key' => true,
        ],
        [
            'id' => 'gemini-2.5-pro',
            'name' => 'Google Gemini 2.5 Pro',
            'provider' => 'Google AI',
            'protocol' => 'gemini',
            'default_api_url' => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
            'badge' => 'Deep Grid Search',
            'description' => 'Pencarian hyperparameter RF lebih mendalam (hingga 240 trees) + evaluasi teknis budidaya mendalam.',
            'requires_api_key' => true,
        ],
        [
            'id' => 'gpt-4o-mini',
            'name' => 'OpenAI GPT-4o Mini',
            'provider' => 'OpenAI',
            'protocol' => 'openai_compatible',
            'default_api_url' => 'https://api.openai.com/v1/chat/completions',
            'badge' => 'Balanced MLOps',
            'description' => 'Profil retraining seimbang untuk pembaruan model berkala dengan evaluasi lapangan & panen.',
            'requires_api_key' => true,
        ],
        [
            'id' => 'claude-3-5-sonnet',
            'name' => 'Anthropic Claude 3.5 Sonnet',
            'provider' => 'Anthropic',
            'protocol' => 'anthropic',
            'default_api_url' => 'https://api.anthropic.com/v1/messages',
            'badge' => 'Safety-Gate Strict',
            'description' => 'Fokus konservatif pada recall kelas BAHAYA dan audit stabilitas distribusi sensor.',
            'requires_api_key' => true,
        ],
        [
            'id' => 'llama-3.3-70b-local',
            'name' => 'Llama 3.3 70B (Ollama / DMZ Local)',
            'provider' => 'Ollama Local',
            'protocol' => 'ollama',
            'default_api_url' => 'http://127.0.0.1:11434/api/generate',
            'badge' => 'Private DMZ',
            'description' => 'Integrasi agent LLM lokal di jaringan privat/DMZ tanpa mengirim data tambak ke cloud publik.',
            'requires_api_key' => false,
        ],
    ];

    public static function findAgentModelMeta(string $modelId): ?array
    {
        foreach (self::AVAILABLE_AGENT_MODELS as $item) {
            if ($item['id'] === $modelId) {
                return $item;
            }
        }
        return null;
    }

    public static function validAgentModelIds(): array
    {
        return array_column(self::AVAILABLE_AGENT_MODELS, 'id');
    }

    public function __construct(
        private readonly MachineLearningService $mlService,
        private readonly RealtimeBroadcaster $broadcaster
    ) {
    }

    /**
     * Pastikan versi model aktif awal terdaftar di tabel ml_model_versions.
     */
    public function ensureBaselineVersion(): MlModelVersion
    {
        $existingActive = MlModelVersion::where('is_active', true)->latest('id')->first();
        if ($existingActive) {
            return $existingActive;
        }

        if (MlModelVersion::count() > 0) {
            $latest = MlModelVersion::latest('id')->firstOrFail();
            $latest->update(['is_active' => true, 'status' => 'ACTIVE', 'promoted_at' => $latest->promoted_at ?? now()]);
            return $latest;
        }

        $card = $this->mlService->getModelCard();
        $version = $this->mlService->activeModelVersion();
        $modelsDir = base_path('../ml/models');
        $versionsDir = $modelsDir . DIRECTORY_SEPARATOR . 'versions';
        if (!is_dir($versionsDir)) {
            @mkdir($versionsDir, 0755, true);
        }

        $activeArtifact = $modelsDir . DIRECTORY_SEPARATOR . 'random_forest_water_quality.joblib';
        $backupArtifact = $versionsDir . DIRECTORY_SEPARATOR . 'rf_' . $version . '.joblib';
        if (is_file($activeArtifact) && !is_file($backupArtifact)) {
            @copy($activeArtifact, $backupArtifact);
        }

        return MlModelVersion::create([
            'version' => $version,
            'algorithm' => (string) ($card['algorithm'] ?? 'RandomForestClassifier'),
            'artifact_path' => is_file($backupArtifact) ? $backupArtifact : $activeArtifact,
            'model_card_path' => $modelsDir . DIRECTORY_SEPARATOR . 'model_card.json',
            'status' => 'ACTIVE',
            'is_active' => true,
            'accuracy' => (float) ($card['accuracy'] ?? 1.0),
            'macro_f1' => (float) ($card['macro_f1'] ?? 1.0),
            'weighted_f1' => (float) ($card['weighted_f1'] ?? ($card['macro_f1'] ?? 1.0)),
            'bahaya_recall' => (float) ($card['bahaya_recall'] ?? 1.0),
            'drift_score' => 0.0,
            'avg_latency_ms' => (float) ($card['avg_latency_ms'] ?? 12.0),
            'train_samples' => (int) ($card['train_samples'] ?? 2000),
            'test_samples' => (int) ($card['test_samples'] ?? 500),
            'live_samples_included' => (int) ($card['live_samples_included'] ?? 0),
            'hyperparameters' => $card['hyperparameters'] ?? [
                'n_estimators' => 100,
                'max_depth' => 8,
                'min_samples_leaf' => 2,
            ],
            'confusion_matrix' => $card['confusion_matrix'] ?? [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            'feature_importances' => $card['feature_importances'] ?? [],
            'per_class_metrics' => $card['per_class_metrics'] ?? null,
            'trained_by' => 'BOOTSTRAP',
            'notes' => 'Model baseline awal Random Forest BanyuWening (SNI 8228.4:2015).',
            'trained_at' => now(),
            'promoted_at' => now(),
        ]);
    }

    /**
     * Jalankan siklus Agent AI untuk Auto-Evaluate atau Auto-Training Self-Learning.
     */
    public function runCycle(
        string $mode = 'self_learn',
        bool $forceRetrain = false,
        string $triggerSource = 'MANUAL',
        ?string $agentModelId = null
    ): MlAgentRun {
        $activeModel = $this->ensureBaselineVersion();
        $config = MlAgentConfig::current();
        $selectedAgentModel = ($agentModelId && preg_match('/^[a-zA-Z0-9._:\/-]{2,80}$/', $agentModelId))
            ? $agentModelId
            : ($config->agent_model_id ?: 'rf-autonomous-local');
        $started = microtime(true);

        $fieldValidations = MlFieldValidation::latest('validated_at')
            ->latest('id')
            ->take(300)
            ->get();

        $harvestCycles = PondHarvestCycle::whereNotNull('mortality_rate_pct')
            ->latest('harvest_date')
            ->latest('id')
            ->take(100)
            ->get();

        $run = MlAgentRun::create([
            'run_type' => $mode === 'evaluate' ? 'AUTO_EVALUATE' : 'SELF_LEARNING',
            'trigger_source' => strtoupper($triggerSource),
            'agent_model_id' => $selectedAgentModel,
            'status' => 'RUNNING',
            'active_model_version' => $activeModel->version,
            'accuracy_before' => $activeModel->accuracy,
            'macro_f1_before' => $activeModel->macro_f1,
            'field_validation_count' => $fieldValidations->count(),
            'harvest_eval_count' => $harvestCycles->count(),
            'started_at' => now(),
        ]);

        $readings = SensorReading::with('prediction')
            ->latest('recorded_at')
            ->take(500)
            ->get()
            ->reverse()
            ->values();

        $liveReadings = [];
        $livePredictions = [];

        foreach ($readings as $r) {
            $liveReadings[] = [
                'recorded_at' => $r->recorded_at?->toIso8601String(),
                'ph' => $r->ph,
                'temperature_c' => $r->temperature_c,
                'tds_ppm' => $r->tds_ppm,
                'turbidity_ntu' => $r->turbidity_ntu,
                'water_level' => $r->water_level,
            ];

            if ($r->prediction) {
                $livePredictions[] = [
                    'risk' => $r->prediction->risk,
                    'ph' => $r->ph,
                    'temperature_c' => $r->temperature_c,
                    'is_fallback' => (bool) $r->prediction->is_fallback,
                    'model_version' => $r->prediction->model_version,
                ];
            }
        }

        $tmpDir = storage_path('app/private/ml-tmp');
        if (!is_dir($tmpDir)) {
            @mkdir($tmpDir, 0755, true);
        }
        $tmpFile = $tmpDir . DIRECTORY_SEPARATOR . 'agent_input_' . uniqid('', true) . '.json';

        $inputPayload = [
            'live_readings' => $liveReadings,
            'live_predictions' => $livePredictions,
            'field_validations' => $fieldValidations->map(fn (MlFieldValidation $fv) => [
                'ph' => $fv->ph,
                'temperature_c' => $fv->temperature_c,
                'tds_ppm' => $fv->tds_ppm,
                'turbidity_ntu' => $fv->turbidity_ntu,
                'water_level' => $fv->water_level,
                'predicted_risk' => $fv->predicted_risk,
                'actual_risk' => $fv->actual_risk,
                'is_match' => (bool) $fv->is_match,
                'validated_at' => $fv->validated_at?->toIso8601String(),
            ])->values()->all(),
            'harvest_evaluations' => $harvestCycles->map(fn (PondHarvestCycle $hc) => [
                'cycle_name' => $hc->cycle_name,
                'pond_name' => $hc->pond_name,
                'seed_count' => (int) $hc->seed_count,
                'harvest_weight_kg' => $hc->harvest_weight_kg,
                'fish_per_kg' => $hc->fish_per_kg,
                'survival_rate_pct' => $hc->survival_rate_pct,
                'mortality_rate_pct' => $hc->mortality_rate_pct,
                'mortality_status' => $hc->mortality_status,
                'ai_danger_events' => (int) $hc->ai_danger_events,
                'ai_warning_events' => (int) $hc->ai_warning_events,
            ])->values()->all(),
            'config' => [
                'min_f1_threshold' => (float) $config->min_f1_threshold,
                'max_drift_threshold' => (float) $config->max_drift_threshold,
                'min_new_samples' => (int) $config->min_new_samples,
                'promotion_mode' => $config->promotion_mode,
                'force_retrain' => $forceRetrain,
                'agent_model_id' => $selectedAgentModel,
            ],
            'current_version' => $activeModel->version,
            'models_dir' => base_path('../ml/models'),
            'datasets_dir' => base_path('../ml/datasets'),
        ];

        file_put_contents($tmpFile, json_encode($inputPayload, JSON_UNESCAPED_SLASHES));

        $pythonPath = (string) config('services.ml.python_path', env('ML_PYTHON_PATH', 'python3'));
        $agentScript = (string) config('services.ml.agent_script', base_path('../ml/src/self_learning_agent.py'));

        try {
            $process = new Process([
                $pythonPath,
                $agentScript,
                '--mode',
                $mode,
                '--input',
                $tmpFile,
            ]);
            $process->setTimeout(60);
            $process->run();

            $durationMs = (int) max(1, round((microtime(true) - $started) * 1000));
            $output = trim($process->getOutput());
            $decoded = json_decode($output, true);

            if (!$process->isSuccessful() || !is_array($decoded) || empty($decoded['success'])) {
                $errDetail = $decoded['error'] ?? ($process->getErrorOutput() ?: $output ?: 'Proses Python agent tidak mengembalikan JSON valid.');
                return $this->completeFallbackEvaluation($run, $activeModel, $config, $liveReadings, $livePredictions, $durationMs, $errDetail);
            }

            $currentMetrics = $decoded['current_metrics'] ?? [];
            $candidateMetrics = $decoded['candidate_metrics'] ?? null;
            $promoted = (bool) ($decoded['promoted'] ?? false);
            $decision = (string) ($decoded['decision'] ?? 'EVALUATED_ONLY');
            $candidateVersion = $decoded['candidate_version'] ?? null;

            $activeModel->update([
                'drift_score' => (float) ($decoded['drift_score'] ?? $activeModel->drift_score ?? 0),
                'avg_latency_ms' => (float) ($currentMetrics['avg_latency_ms'] ?? $activeModel->avg_latency_ms),
                'per_class_metrics' => $currentMetrics['per_class_metrics'] ?? $activeModel->per_class_metrics,
            ]);

            if ($candidateVersion && is_array($candidateMetrics)) {
                $candStatus = $promoted
                    ? 'ACTIVE'
                    : ($decision === 'REJECTED_SAFETY_GATE' ? 'REJECTED' : 'CANDIDATE_READY');

                DB::transaction(function () use (
                    $candidateVersion,
                    $candidateMetrics,
                    $candStatus,
                    $promoted,
                    $decoded,
                    $activeModel,
                    $triggerSource,
                    $selectedAgentModel
                ) {
                    if ($promoted) {
                        MlModelVersion::where('is_active', true)->update([
                            'is_active' => false,
                            'status' => 'ARCHIVED',
                        ]);
                    }

                    MlModelVersion::create([
                        'version' => $candidateVersion,
                        'algorithm' => 'RandomForestClassifier',
                        'artifact_path' => (string) ($decoded['artifact_path'] ?? ''),
                        'model_card_path' => $decoded['model_card_path'] ?? null,
                        'status' => $candStatus,
                        'is_active' => $promoted,
                        'accuracy' => (float) ($candidateMetrics['accuracy'] ?? 0),
                        'macro_f1' => (float) ($candidateMetrics['macro_f1'] ?? 0),
                        'weighted_f1' => (float) ($candidateMetrics['weighted_f1'] ?? 0),
                        'bahaya_recall' => (float) ($candidateMetrics['bahaya_recall'] ?? 0),
                        'drift_score' => (float) ($decoded['drift_score'] ?? 0),
                        'avg_latency_ms' => (float) ($candidateMetrics['avg_latency_ms'] ?? 0),
                        'train_samples' => (int) ($decoded['train_samples'] ?? 0),
                        'test_samples' => (int) ($decoded['test_samples'] ?? 0),
                        'live_samples_included' => (int) ($decoded['new_live_samples'] ?? 0),
                        'hyperparameters' => $decoded['hyperparameters'] ?? null,
                        'confusion_matrix' => $candidateMetrics['confusion_matrix'] ?? null,
                        'feature_importances' => $candidateMetrics['feature_importances'] ?? null,
                        'per_class_metrics' => $candidateMetrics['per_class_metrics'] ?? null,
                        'trained_by' => 'AI_AGENT:' . $selectedAgentModel,
                        'notes' => (string) ($decoded['summary'] ?? "Dilatih oleh AI Agent dari {$activeModel->version}"),
                        'trained_at' => now(),
                        'promoted_at' => $promoted ? now() : null,
                    ]);
                });
            }

            $summary = (string) ($decoded['summary'] ?? 'Siklus Agent AI selesai.');
            $effectiveApiKey = (string) ($config->agent_api_key ?: config('services.ai_agent.llm_api_key'));
            $meta = self::findAgentModelMeta($selectedAgentModel);
            $effectiveApiUrl = (string) ($config->agent_api_url ?: ($meta['default_api_url'] ?? '') ?: config('services.ai_agent.llm_api_url'));
            if ($selectedAgentModel !== 'rf-autonomous-local' && $effectiveApiUrl !== '' && ($effectiveApiKey !== '' || ($meta['protocol'] ?? '') === 'ollama')) {
                $summary = $this->enrichSummaryWithLlm($summary, $decoded, $selectedAgentModel, $effectiveApiUrl, $effectiveApiKey);
            }

            $run->update([
                'status' => 'COMPLETED',
                'decision' => $decision,
                'candidate_model_version' => $candidateVersion,
                'accuracy_before' => (float) ($currentMetrics['accuracy'] ?? $activeModel->accuracy),
                'macro_f1_before' => (float) ($currentMetrics['macro_f1'] ?? $activeModel->macro_f1),
                'accuracy_after' => is_array($candidateMetrics)
                    ? (float) $candidateMetrics['accuracy']
                    : (float) ($currentMetrics['accuracy'] ?? $activeModel->accuracy),
                'macro_f1_after' => is_array($candidateMetrics)
                    ? (float) $candidateMetrics['macro_f1']
                    : (float) ($currentMetrics['macro_f1'] ?? $activeModel->macro_f1),
                'drift_score' => (float) ($decoded['drift_score'] ?? 0),
                'live_agreement_rate' => (float) ($decoded['live_agreement_rate'] ?? 1.0),
                'new_live_samples' => (int) ($decoded['new_live_samples'] ?? count($liveReadings)),
                'duration_ms' => $durationMs,
                'reasoning_steps' => $decoded['reasoning_steps'] ?? [],
                'summary' => $summary,
                'metrics_snapshot' => [
                    'current_metrics' => $currentMetrics,
                    'candidate_metrics' => $candidateMetrics,
                    'candidates_compared' => $decoded['candidates_compared'] ?? [],
                ],
                'finished_at' => now(),
            ]);

            $config->update(['last_run_at' => now()]);

            $this->broadcaster->publish('alerts', 'ml.agent_cycle', [
                'run_id' => $run->id,
                'run_type' => $run->run_type,
                'decision' => $run->decision,
                'active_model_version' => $promoted ? $candidateVersion : $activeModel->version,
                'candidate_model_version' => $candidateVersion,
                'macro_f1_after' => $run->macro_f1_after,
                'drift_score' => $run->drift_score,
                'summary' => $run->summary,
            ]);

            return $run->fresh();
        } catch (\Throwable $e) {
            $durationMs = (int) max(1, round((microtime(true) - $started) * 1000));
            Log::error('ML Self-Learning Agent error: ' . $e->getMessage());
            return $this->completeFallbackEvaluation($run, $activeModel, $config, $liveReadings, $livePredictions, $durationMs, $e->getMessage());
        } finally {
            if (is_file($tmpFile)) {
                @unlink($tmpFile);
            }
        }
    }

    /**
     * Promosikan atau rollback model Random Forest tertentu menjadi model aktif produksi.
     */
    public function promoteVersion(MlModelVersion $target, string $actor): MlModelVersion
    {
        $artifactPath = $this->resolveArtifactPath($target);
        if (!$artifactPath || !is_file($artifactPath)) {
            throw new \RuntimeException("File artefak model .joblib untuk versi {$target->version} tidak ditemukan.");
        }

        $modelsDir = base_path('../ml/models');
        $activeArtifact = $modelsDir . DIRECTORY_SEPARATOR . 'random_forest_water_quality.joblib';
        $tmpArtifact = $activeArtifact . '.tmp';

        if (!@copy($artifactPath, $tmpArtifact) || !@rename($tmpArtifact, $activeArtifact)) {
            throw new \RuntimeException('Gagal menyalin artefak model ke jalur aktif produksi.');
        }

        $cardData = [
            'model_name' => 'BanyuWening Random Forest Water Quality Classifier',
            'algorithm' => $target->algorithm ?: 'RandomForestClassifier',
            'version' => $target->version,
            'accuracy' => (float) $target->accuracy,
            'macro_f1' => (float) $target->macro_f1,
            'weighted_f1' => (float) ($target->weighted_f1 ?? $target->macro_f1),
            'bahaya_recall' => (float) ($target->bahaya_recall ?? 1.0),
            'avg_latency_ms' => (float) ($target->avg_latency_ms ?? 0),
            'feature_columns' => array_keys($target->feature_importances ?: []),
            'feature_importances' => $target->feature_importances ?: [],
            'classes' => ['0' => 'AMAN', '1' => 'WASPADA', '2' => 'BAHAYA'],
            'confusion_matrix' => $target->confusion_matrix ?: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            'per_class_metrics' => $target->per_class_metrics,
            'hyperparameters' => $target->hyperparameters,
            'train_samples' => (int) $target->train_samples,
            'test_samples' => (int) $target->test_samples,
            'live_samples_included' => (int) $target->live_samples_included,
            'promoted_by' => $actor,
            'updated_at' => now()->toIso8601String(),
        ];

        $cardPath = $modelsDir . DIRECTORY_SEPARATOR . 'model_card.json';
        @file_put_contents($cardPath . '.tmp', json_encode($cardData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        @rename($cardPath . '.tmp', $cardPath);

        DB::transaction(function () use ($target, $actor) {
            MlModelVersion::where('id', '!=', $target->id)
                ->where('is_active', true)
                ->update([
                    'is_active' => false,
                    'status' => 'ARCHIVED',
                ]);

            $target->update([
                'is_active' => true,
                'status' => 'ACTIVE',
                'promoted_at' => now(),
                'notes' => trim(($target->notes ? $target->notes . "\n" : '') . "Diaktifkan oleh {$actor} pada " . now()->format('Y-m-d H:i:s')),
            ]);
        });

        $this->broadcaster->publish('alerts', 'ml.model_promoted', [
            'version' => $target->version,
            'accuracy' => (float) $target->accuracy,
            'macro_f1' => (float) $target->macro_f1,
            'promoted_by' => $actor,
        ]);

        return $target->fresh();
    }

    /**
     * Agregasi seluruh metrik performa, trafik inferensi, dan riwayat AI Agent untuk dashboard Super Admin & API.
     *
     * @return array<string, mixed>
     */
    public function getPerformanceMetrics(int $hours = 24, ?string $deviceCode = null): array
    {
        $activeModel = $this->ensureBaselineVersion();
        $config = MlAgentConfig::current();
        $card = $this->mlService->getModelCard();

        $predQuery = Prediction::query();
        if ($hours > 0) {
            $predQuery->where('predicted_at', '>=', now()->subHours($hours));
        }
        if ($deviceCode) {
            $predQuery->whereHas('sensorReading.device', fn ($q) => $q->where('device_code', $deviceCode));
        }

        $windowPredictions = $predQuery->orderBy('predicted_at')->get();
        $totalPredictionsAll = Prediction::count();
        $inWindowCount = $windowPredictions->count();

        $amanCount = $windowPredictions->where('risk', 'AMAN')->count();
        $waspadaCount = $windowPredictions->where('risk', 'WASPADA')->count();
        $bahayaCount = $windowPredictions->where('risk', 'BAHAYA')->count();
        $fallbackCount = $windowPredictions->where('is_fallback', true)->count();

        $latencies = $windowPredictions->pluck('latency_ms')->filter(fn ($v) => $v !== null)->map(fn ($v) => (float) $v)->values();
        $avgLatency = $latencies->isNotEmpty()
            ? round((float) $latencies->avg(), 2)
            : round((float) ($activeModel->avg_latency_ms ?? 0), 2);

        $p95Latency = 0.0;
        if ($latencies->isNotEmpty()) {
            $sorted = $latencies->sort()->values();
            $idx = (int) min($sorted->count() - 1, max(0, ceil($sorted->count() * 0.95) - 1));
            $p95Latency = round((float) $sorted->get($idx), 2);
        }

        // Grouping trafik inferensi per bucket waktu
        $bucketFormat = $hours > 48 ? 'd/m H:00' : 'H:00';
        $buckets = [];
        foreach ($windowPredictions as $p) {
            $ts = $p->predicted_at ?? $p->created_at ?? now();
            $key = $ts->format($hours > 48 ? 'Y-m-d H:00' : 'Y-m-d H:00');
            if (!isset($buckets[$key])) {
                $buckets[$key] = [
                    'ts' => $ts->toIso8601String(),
                    'label' => $ts->format($bucketFormat),
                    'aman' => 0,
                    'waspada' => 0,
                    'bahaya' => 0,
                    'total' => 0,
                    'lat_sum' => 0.0,
                    'lat_n' => 0,
                    'conf_sum' => 0.0,
                    'fallback_count' => 0,
                ];
            }

            $buckets[$key]['total']++;
            if ($p->risk === 'AMAN') {
                $buckets[$key]['aman']++;
            } elseif ($p->risk === 'WASPADA') {
                $buckets[$key]['waspada']++;
            } elseif ($p->risk === 'BAHAYA') {
                $buckets[$key]['bahaya']++;
            }

            if ($p->is_fallback) {
                $buckets[$key]['fallback_count']++;
            }
            if ($p->latency_ms !== null) {
                $buckets[$key]['lat_sum'] += (float) $p->latency_ms;
                $buckets[$key]['lat_n']++;
            }
            $conf = max((float) $p->p_aman, (float) $p->p_waspada, (float) $p->p_bahaya);
            $buckets[$key]['conf_sum'] += $conf * 100.0;
        }

        $trafficSeries = array_values(array_map(function ($b) {
            return [
                'ts' => $b['ts'],
                'label' => $b['label'],
                'aman' => $b['aman'],
                'waspada' => $b['waspada'],
                'bahaya' => $b['bahaya'],
                'total' => $b['total'],
                'avg_latency_ms' => $b['lat_n'] > 0 ? round($b['lat_sum'] / $b['lat_n'], 1) : 0,
                'avg_confidence' => $b['total'] > 0 ? round($b['conf_sum'] / $b['total'], 1) : 0,
                'fallback_count' => $b['fallback_count'],
            ];
        }, $buckets));

        $runsDesc = MlAgentRun::latest('id')->take(20)->get();
        $evaluationTrend = $runsDesc->reverse()->values()->map(function (MlAgentRun $r) {
            return [
                'run_id' => $r->id,
                'label' => ($r->finished_at ?? $r->created_at)?->format('d/m H:i') ?? ('Run #' . $r->id),
                'run_type' => $r->run_type,
                'decision' => $r->decision,
                'accuracy_pct' => round((float) ($r->accuracy_after ?? $r->accuracy_before ?? 0) * 100, 2),
                'macro_f1_pct' => round((float) ($r->macro_f1_after ?? $r->macro_f1_before ?? 0) * 100, 2),
                'drift_pct' => round((float) ($r->drift_score ?? 0) * 100, 2),
                'duration_ms' => (int) ($r->duration_ms ?? 0),
                'new_live_samples' => (int) ($r->new_live_samples ?? 0),
            ];
        })->all();

        $latestRun = $runsDesc->first();

        return [
            'kpi' => [
                'active_version' => $activeModel->version,
                'algorithm' => $activeModel->algorithm,
                'accuracy' => (float) $activeModel->accuracy,
                'macro_f1' => (float) $activeModel->macro_f1,
                'weighted_f1' => (float) ($activeModel->weighted_f1 ?? $activeModel->macro_f1),
                'bahaya_recall' => (float) ($activeModel->bahaya_recall ?? 1.0),
                'drift_score' => (float) ($activeModel->drift_score ?? $latestRun?->drift_score ?? 0.0),
                'total_predictions' => $totalPredictionsAll,
                'predictions_in_window' => $inWindowCount,
                'avg_latency_ms' => $avgLatency,
                'p95_latency_ms' => $p95Latency,
                'fallback_count' => $fallbackCount,
                'fallback_rate_pct' => $inWindowCount > 0 ? round(($fallbackCount / $inWindowCount) * 100, 2) : 0.0,
                'aman_count' => $amanCount,
                'waspada_count' => $waspadaCount,
                'bahaya_count' => $bahayaCount,
                'live_agreement_rate' => (float) ($latestRun?->live_agreement_rate ?? 1.0),
                'last_trained_at' => $activeModel->trained_at?->toIso8601String(),
                'last_run_at' => $config->last_run_at?->toIso8601String(),
            ],
            'traffic_series' => $trafficSeries,
            'evaluation_trend' => $evaluationTrend,
            'class_distribution' => [
                ['name' => 'AMAN', 'count' => $amanCount],
                ['name' => 'WASPADA', 'count' => $waspadaCount],
                ['name' => 'BAHAYA', 'count' => $bahayaCount],
            ],
            'confusion_matrix' => $activeModel->confusion_matrix ?? ($card['confusion_matrix'] ?? [[0, 0, 0], [0, 0, 0], [0, 0, 0]]),
            'feature_importances' => $activeModel->feature_importances ?? ($card['feature_importances'] ?? []),
            'per_class_metrics' => $activeModel->per_class_metrics ?? ($card['per_class_metrics'] ?? null),
            'model_versions' => MlModelVersion::latest('id')->get()->map(fn (MlModelVersion $m) => [
                'id' => $m->id,
                'version' => $m->version,
                'algorithm' => $m->algorithm,
                'status' => $m->status,
                'is_active' => (bool) $m->is_active,
                'accuracy' => (float) $m->accuracy,
                'macro_f1' => (float) $m->macro_f1,
                'weighted_f1' => $m->weighted_f1 !== null ? (float) $m->weighted_f1 : null,
                'bahaya_recall' => $m->bahaya_recall !== null ? (float) $m->bahaya_recall : null,
                'drift_score' => $m->drift_score !== null ? (float) $m->drift_score : null,
                'avg_latency_ms' => $m->avg_latency_ms !== null ? (float) $m->avg_latency_ms : null,
                'train_samples' => (int) $m->train_samples,
                'test_samples' => (int) $m->test_samples,
                'live_samples_included' => (int) $m->live_samples_included,
                'hyperparameters' => $m->hyperparameters,
                'trained_by' => $m->trained_by,
                'notes' => $m->notes,
                'trained_at' => $m->trained_at?->toIso8601String(),
                'promoted_at' => $m->promoted_at?->toIso8601String(),
            ])->values()->all(),
            'agent_runs' => $runsDesc->map(fn (MlAgentRun $r) => [
                'id' => $r->id,
                'run_type' => $r->run_type,
                'trigger_source' => $r->trigger_source,
                'agent_model_id' => $r->agent_model_id ?: 'rf-autonomous-local',
                'status' => $r->status,
                'decision' => $r->decision,
                'active_model_version' => $r->active_model_version,
                'candidate_model_version' => $r->candidate_model_version,
                'accuracy_before' => $r->accuracy_before,
                'macro_f1_before' => $r->macro_f1_before,
                'accuracy_after' => $r->accuracy_after,
                'macro_f1_after' => $r->macro_f1_after,
                'drift_score' => $r->drift_score,
                'live_agreement_rate' => $r->live_agreement_rate,
                'new_live_samples' => (int) $r->new_live_samples,
                'field_validation_count' => (int) ($r->field_validation_count ?? 0),
                'harvest_eval_count' => (int) ($r->harvest_eval_count ?? 0),
                'duration_ms' => $r->duration_ms,
                'reasoning_steps' => $r->reasoning_steps ?? [],
                'summary' => $r->summary,
                'error_message' => $r->error_message,
                'started_at' => $r->started_at?->toIso8601String(),
                'finished_at' => $r->finished_at?->toIso8601String(),
            ])->values()->all(),
            'agent_config' => [
                'auto_learning_enabled' => (bool) $config->auto_learning_enabled,
                'promotion_mode' => $config->promotion_mode,
                'min_f1_threshold' => (float) $config->min_f1_threshold,
                'max_drift_threshold' => (float) $config->max_drift_threshold,
                'min_new_samples' => (int) $config->min_new_samples,
                'schedule_interval_hours' => (int) $config->schedule_interval_hours,
                'llm_advisor_enabled' => (bool) $config->llm_advisor_enabled,
                'agent_model_id' => $config->agent_model_id ?: 'rf-autonomous-local',
                'agent_api_url' => $config->agent_api_url,
                'has_agent_api_key' => !empty($config->agent_api_key) || !empty(config('services.ai_agent.llm_api_key')),
                'last_run_at' => $config->last_run_at?->toIso8601String(),
            ],
            'available_agent_models' => self::AVAILABLE_AGENT_MODELS,
            'field_validations' => $this->getFieldValidationPayload(),
            'field_validation_stats' => $this->getFieldValidationStats(),
            'recent_predictions_for_validation' => $this->getRecentPredictionsForValidation(),
            'harvest_evaluation_summary' => $this->getHarvestEvaluationSummary(),
            'active_model' => [
                'id' => $activeModel->id,
                'version' => $activeModel->version,
                'algorithm' => $activeModel->algorithm,
                'hyperparameters' => $activeModel->hyperparameters,
                'train_samples' => (int) $activeModel->train_samples,
                'test_samples' => (int) $activeModel->test_samples,
                'promoted_at' => $activeModel->promoted_at?->toIso8601String(),
            ],
            'model_card' => $card,
        ];
    }

    private function resolveArtifactPath(MlModelVersion $target): ?string
    {
        if ($target->artifact_path && is_file($target->artifact_path)) {
            return $target->artifact_path;
        }

        $candidate = base_path('../ml/models/versions/rf_' . $target->version . '.joblib');
        if (is_file($candidate)) {
            return $candidate;
        }

        if ($target->is_active) {
            $active = base_path('../ml/models/random_forest_water_quality.joblib');
            if (is_file($active)) {
                return $active;
            }
        }

        return null;
    }

    private function completeFallbackEvaluation(
        MlAgentRun $run,
        MlModelVersion $activeModel,
        MlAgentConfig $config,
        array $liveReadings,
        array $livePredictions,
        int $durationMs,
        string $errorDetail
    ): MlAgentRun {
        $compared = 0;
        $matched = 0;
        foreach ($livePredictions as $item) {
            $ph = $item['ph'] ?? null;
            $temp = $item['temperature_c'] ?? null;
            $risk = strtoupper((string) ($item['risk'] ?? ''));
            if ($ph === null || $temp === null || $risk === '') {
                continue;
            }
            $isBahaya = ($ph < 6.0 || $ph > 8.8 || $temp > 33.0 || $temp < 22.0);
            $isWaspada = ($ph < 6.5 || $ph > 8.5 || $temp > 30.0 || $temp < 25.0);
            $expected = $isBahaya ? 'BAHAYA' : ($isWaspada ? 'WASPADA' : 'AMAN');
            $compared++;
            if ($risk === $expected) {
                $matched++;
            }
        }
        $agreement = $compared > 0 ? round($matched / $compared, 4) : 1.0;

        $steps = [
            [
                'step' => 'OBSERVE',
                'status' => 'DONE',
                'detail' => 'Mengumpulkan ' . count($liveReadings) . ' pembacaan live dari database.',
            ],
            [
                'step' => 'FALLBACK_EVALUATE',
                'status' => 'WARNING',
                'detail' => 'Runtime Python tidak tersedia (' . mb_substr($errorDetail, 0, 140) . '). Evaluasi dihitung via agreement rule SNI: ' . round($agreement * 100, 1) . '%.',
            ],
        ];

        $run->update([
            'status' => 'COMPLETED_FALLBACK',
            'decision' => 'KEEP_CURRENT',
            'accuracy_after' => $activeModel->accuracy,
            'macro_f1_after' => $activeModel->macro_f1,
            'drift_score' => (float) ($activeModel->drift_score ?? 0.0),
            'live_agreement_rate' => $agreement,
            'new_live_samples' => count($liveReadings),
            'duration_ms' => $durationMs,
            'reasoning_steps' => $steps,
            'summary' => "Siklus evaluasi fallback selesai untuk {$activeModel->version}. Agreement live SNI: " . round($agreement * 100, 1) . '%.',
            'error_message' => $errorDetail,
            'finished_at' => now(),
        ]);

        $config->update(['last_run_at' => now()]);
        return $run->fresh();
    }

    private function getFieldValidationPayload(): array
    {
        return MlFieldValidation::latest('validated_at')
            ->latest('id')
            ->take(30)
            ->get()
            ->map(fn (MlFieldValidation $fv) => [
                'id' => $fv->id,
                'device_id' => $fv->device_id,
                'prediction_id' => $fv->prediction_id,
                'tenant_code' => $fv->tenant_code,
                'device_code' => $fv->device_code,
                'pond_name' => $fv->pond_name,
                'ph' => (float) $fv->ph,
                'temperature_c' => (float) $fv->temperature_c,
                'tds_ppm' => $fv->tds_ppm !== null ? (float) $fv->tds_ppm : null,
                'turbidity_ntu' => $fv->turbidity_ntu !== null ? (float) $fv->turbidity_ntu : null,
                'water_level' => $fv->water_level,
                'predicted_risk' => $fv->predicted_risk,
                'actual_risk' => $fv->actual_risk,
                'is_match' => (bool) $fv->is_match,
                'model_version' => $fv->model_version,
                'field_notes' => $fv->field_notes,
                'validated_by' => $fv->validated_by,
                'validated_at' => $fv->validated_at?->toIso8601String() ?? $fv->created_at?->toIso8601String(),
            ])->values()->all();
    }

    private function getFieldValidationStats(): array
    {
        $total = MlFieldValidation::count();
        $matched = MlFieldValidation::where('is_match', true)->count();
        $mismatched = max(0, $total - $matched);

        return [
            'total' => $total,
            'matched' => $matched,
            'mismatched' => $mismatched,
            'match_rate_pct' => $total > 0 ? round(($matched / $total) * 100, 1) : null,
        ];
    }

    private function getRecentPredictionsForValidation(): array
    {
        $validatedPredIds = MlFieldValidation::whereNotNull('prediction_id')
            ->pluck('prediction_id')
            ->all();

        return Prediction::with('sensorReading.device:id,device_code,name,pond_name,tenant_code')
            ->latest('predicted_at')
            ->take(15)
            ->get()
            ->map(function (Prediction $p) use ($validatedPredIds) {
                $r = $p->sensorReading;
                $d = $r?->device;
                return [
                    'prediction_id' => $p->id,
                    'device_id' => $d?->id,
                    'device_code' => $d?->device_code ?? 'MANUAL',
                    'pond_name' => $d?->pond_name ?? 'Kolam Utama',
                    'tenant_code' => $d?->tenant_code,
                    'ph' => $r?->ph !== null ? (float) $r->ph : null,
                    'temperature_c' => $r?->temperature_c !== null ? (float) $r->temperature_c : null,
                    'tds_ppm' => $r?->tds_ppm !== null ? (float) $r->tds_ppm : null,
                    'turbidity_ntu' => $r?->turbidity_ntu !== null ? (float) $r->turbidity_ntu : null,
                    'water_level' => $r?->water_level ?? 'NORMAL',
                    'predicted_risk' => $p->risk,
                    'model_version' => $p->model_version,
                    'predicted_at' => $p->predicted_at?->toIso8601String() ?? $p->created_at?->toIso8601String(),
                    'already_validated' => in_array($p->id, $validatedPredIds, true),
                ];
            })
            ->filter(fn ($item) => $item['ph'] !== null && $item['temperature_c'] !== null)
            ->values()
            ->all();
    }

    private function getHarvestEvaluationSummary(): array
    {
        $all = PondHarvestCycle::all();
        $completed = $all->filter(fn (PondHarvestCycle $c) => $c->mortality_rate_pct !== null);
        $highMortality = $completed->filter(fn (PondHarvestCycle $c) => (float) $c->mortality_rate_pct > 25.0);

        return [
            'total_cycles' => $all->count(),
            'completed_cycles' => $completed->count(),
            'total_seeds' => (int) $all->sum('seed_count'),
            'total_harvest_kg' => round((float) $completed->sum('harvest_weight_kg'), 2),
            'avg_survival_rate_pct' => $completed->isNotEmpty()
                ? round((float) $completed->avg('survival_rate_pct'), 1)
                : null,
            'avg_mortality_rate_pct' => $completed->isNotEmpty()
                ? round((float) $completed->avg('mortality_rate_pct'), 1)
                : null,
            'high_mortality_cycles' => $highMortality->count(),
        ];
    }

    /**
     * Uji koneksi langsung ke model AI Agent (DeepSeek / OpenRouter / Gemini / Anthropic / Ollama).
     *
     * @return array<string, mixed>
     */
    public function testAgentConnection(
        ?string $agentModelId = null,
        ?string $apiUrl = null,
        ?string $apiKey = null
    ): array {
        $config = MlAgentConfig::current();
        $model = trim((string) ($agentModelId ?: $config->agent_model_id ?: 'rf-autonomous-local'));
        $meta = self::findAgentModelMeta($model);
        $protocol = $meta['protocol'] ?? $this->inferProtocol($model, (string) ($apiUrl ?: $config->agent_api_url));

        if ($protocol === 'local') {
            return [
                'ok' => true,
                'protocol' => 'local',
                'model' => $model,
                'endpoint' => 'Local Python scikit-learn Engine',
                'latency_ms' => 1,
                'reply' => 'Engine lokal BanyuWening siap digunakan tanpa API key eksternal.',
            ];
        }

        $effectiveUrl = trim((string) ($apiUrl ?: $config->agent_api_url ?: ($meta['default_api_url'] ?? '') ?: config('services.ai_agent.llm_api_url')));
        $effectiveKey = trim((string) ($apiKey ?: $config->agent_api_key ?: config('services.ai_agent.llm_api_key')));

        if ($effectiveUrl === '') {
            return [
                'ok' => false,
                'protocol' => $protocol,
                'model' => $model,
                'endpoint' => '-',
                'error' => 'Endpoint URL belum diisi.',
            ];
        }

        if ($protocol !== 'ollama' && $effectiveKey === '') {
            return [
                'ok' => false,
                'protocol' => $protocol,
                'model' => $model,
                'endpoint' => $effectiveUrl,
                'error' => 'API Key wajib diisi untuk menghubungi ' . ($meta['provider'] ?? $model) . '.',
            ];
        }

        $started = microtime(true);
        $res = $this->callLlmProvider(
            $protocol,
            $model,
            $effectiveUrl,
            $effectiveKey,
            'Jawab singkat dalam 1 kalimat Bahasa Indonesia: Konfirmasi bahwa kamu terhubung sebagai AI Agent MLOps BanyuWening.'
        );
        $latencyMs = (int) max(1, round((microtime(true) - $started) * 1000));

        return [
            'ok' => $res['ok'],
            'protocol' => $protocol,
            'model' => $model,
            'endpoint' => $effectiveUrl,
            'http_status' => $res['status'] ?? null,
            'latency_ms' => $latencyMs,
            'reply' => $res['text'] ?? null,
            'error' => $res['error'] ?? null,
        ];
    }

    private function inferProtocol(string $modelId, string $url): string
    {
        $lowerModel = strtolower($modelId);
        $lowerUrl = strtolower($url);
        if ($lowerModel === 'rf-autonomous-local') {
            return 'local';
        }
        if (str_contains($lowerUrl, 'generativelanguage.googleapis.com') || (str_starts_with($lowerModel, 'gemini') && $lowerUrl === '')) {
            return 'gemini';
        }
        if (str_contains($lowerUrl, 'api.anthropic.com') || (str_starts_with($lowerModel, 'claude') && $lowerUrl === '')) {
            return 'anthropic';
        }
        if (str_contains($lowerUrl, '/api/generate') || str_contains($lowerUrl, ':11434')) {
            return 'ollama';
        }
        return 'openai_compatible';
    }

    /**
     * Panggil API LLM sesuai protokol (OpenAI/DeepSeek/OpenRouter, Gemini, Anthropic, atau Ollama).
     *
     * @return array{ok: bool, status?: int, text?: string, error?: string}
     */
    private function callLlmProvider(
        string $protocol,
        string $modelId,
        string $url,
        string $apiKey,
        string $prompt
    ): array {
        try {
            if ($protocol === 'openai_compatible') {
                $resp = Http::timeout(20)
                    ->withToken($apiKey)
                    ->acceptJson()
                    ->post($url, [
                        'model' => $modelId,
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => 'Anda adalah AI Agent MLOps untuk sistem akuakultur BanyuWening (Random Forest kualitas air lele SNI 8228.4:2015). Jawab ringkas, teknis, dan objektif dalam Bahasa Indonesia.',
                            ],
                            [
                                'role' => 'user',
                                'content' => $prompt,
                            ],
                        ],
                        'temperature' => 0.2,
                        'max_tokens' => 300,
                    ]);

                if (!$resp->successful()) {
                    $errMsg = $resp->json('error.message') ?? $resp->body();
                    return ['ok' => false, 'status' => $resp->status(), 'error' => 'HTTP ' . $resp->status() . ': ' . mb_substr((string) $errMsg, 0, 240)];
                }

                $text = trim((string) ($resp->json('choices.0.message.content') ?? ''));
                return ['ok' => $text !== '', 'status' => $resp->status(), 'text' => $text, 'error' => $text === '' ? 'Respon kosong dari server LLM.' : null];
            }

            if ($protocol === 'gemini') {
                $resp = Http::timeout(20)
                    ->withHeaders(['x-goog-api-key' => $apiKey])
                    ->acceptJson()
                    ->post($url, [
                        'contents' => [
                            ['parts' => [['text' => $prompt]]],
                        ],
                    ]);

                if (!$resp->successful()) {
                    $errMsg = $resp->json('error.message') ?? $resp->body();
                    return ['ok' => false, 'status' => $resp->status(), 'error' => 'HTTP ' . $resp->status() . ': ' . mb_substr((string) $errMsg, 0, 240)];
                }

                $text = trim((string) ($resp->json('candidates.0.content.parts.0.text') ?? ''));
                return ['ok' => $text !== '', 'status' => $resp->status(), 'text' => $text, 'error' => $text === '' ? 'Respon kosong dari Gemini.' : null];
            }

            if ($protocol === 'anthropic') {
                $resp = Http::timeout(20)
                    ->withHeaders([
                        'x-api-key' => $apiKey,
                        'anthropic-version' => '2023-06-01',
                    ])
                    ->acceptJson()
                    ->post($url, [
                        'model' => $modelId,
                        'max_tokens' => 300,
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt],
                        ],
                    ]);

                if (!$resp->successful()) {
                    $errMsg = $resp->json('error.message') ?? $resp->body();
                    return ['ok' => false, 'status' => $resp->status(), 'error' => 'HTTP ' . $resp->status() . ': ' . mb_substr((string) $errMsg, 0, 240)];
                }

                $text = trim((string) ($resp->json('content.0.text') ?? ''));
                return ['ok' => $text !== '', 'status' => $resp->status(), 'text' => $text, 'error' => $text === '' ? 'Respon kosong dari Anthropic.' : null];
            }

            // Ollama / custom gateway
            $req = Http::timeout(20)->acceptJson();
            if ($apiKey !== '') {
                $req = $req->withToken($apiKey);
            }
            $resp = $req->post($url, [
                'model' => $modelId,
                'prompt' => $prompt,
                'stream' => false,
            ]);

            if (!$resp->successful()) {
                return ['ok' => false, 'status' => $resp->status(), 'error' => 'HTTP ' . $resp->status() . ': ' . mb_substr($resp->body(), 0, 240)];
            }

            $text = trim((string) ($resp->json('response') ?? $resp->json('summary') ?? $resp->json('text') ?? ''));
            return ['ok' => $text !== '', 'status' => $resp->status(), 'text' => $text, 'error' => $text === '' ? 'Respon kosong dari endpoint LLM.' : null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => mb_substr($e->getMessage(), 0, 240)];
        }
    }

    private function enrichSummaryWithLlm(
        string $defaultSummary,
        array $agentResult,
        string $agentModelId = 'deepseek-v4-pro',
        string $apiUrl = '',
        string $apiKey = ''
    ): string {
        $meta = self::findAgentModelMeta($agentModelId);
        $protocol = $meta['protocol'] ?? $this->inferProtocol($agentModelId, $apiUrl);
        $url = $apiUrl !== '' ? $apiUrl : (string) (($meta['default_api_url'] ?? '') ?: config('services.ai_agent.llm_api_url'));
        $key = $apiKey !== '' ? $apiKey : (string) config('services.ai_agent.llm_api_key');

        if ($protocol === 'local' || $url === '' || ($protocol !== 'ollama' && $key === '')) {
            return $defaultSummary;
        }

        $prompt = "Ringkas hasil siklus MLOps Random Forest BanyuWening berikut dalam 2-3 kalimat Bahasa Indonesia teknis yang objektif, termasuk rekomendasi jika ada mismatch lapangan atau mortalitas panen tinggi:\n"
            . json_encode([
                'agent_model' => $agentModelId,
                'decision' => $agentResult['decision'] ?? null,
                'current_version' => $agentResult['current_version'] ?? null,
                'candidate_version' => $agentResult['candidate_version'] ?? null,
                'drift_score' => $agentResult['drift_score'] ?? null,
                'field_match_rate' => $agentResult['field_match_rate'] ?? null,
                'avg_mortality_rate_pct' => $agentResult['avg_mortality_rate_pct'] ?? null,
                'summary' => $defaultSummary,
            ]);

        $res = $this->callLlmProvider($protocol, $agentModelId, $url, $key, $prompt);
        if (!empty($res['ok']) && !empty($res['text'])) {
            return $res['text'];
        }

        return $defaultSummary;
    }
}
