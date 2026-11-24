<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\MlAgentConfig;
use App\Models\MlAgentRun;
use App\Models\MlFieldValidation;
use App\Models\MlModelVersion;
use App\Models\Prediction;
use App\Services\MachineLearningService;
use App\Services\MlSelfLearningAgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class MlApiController extends Controller
{
    public function __construct(
        private readonly MachineLearningService $mlService,
        private readonly MlSelfLearningAgentService $agentService
    ) {
    }

    /**
     * Public API: Status model Random Forest aktif, model_card, & konfigurasi self-learning agent.
     */
    public function status(): JsonResponse
    {
        $activeModel = $this->agentService->ensureBaselineVersion();
        $config = MlAgentConfig::current();
        $latestRun = MlAgentRun::latest('id')->first();

        return response()->json([
            'success' => true,
            'active_model' => [
                'version' => $activeModel->version,
                'algorithm' => $activeModel->algorithm,
                'accuracy' => (float) $activeModel->accuracy,
                'macro_f1' => (float) $activeModel->macro_f1,
                'weighted_f1' => $activeModel->weighted_f1,
                'bahaya_recall' => $activeModel->bahaya_recall,
                'drift_score' => $activeModel->drift_score,
                'avg_latency_ms' => $activeModel->avg_latency_ms,
                'hyperparameters' => $activeModel->hyperparameters,
                'promoted_at' => $activeModel->promoted_at?->toIso8601String(),
            ],
            'agent_config' => [
                'auto_learning_enabled' => (bool) $config->auto_learning_enabled,
                'promotion_mode' => $config->promotion_mode,
                'min_f1_threshold' => (float) $config->min_f1_threshold,
                'max_drift_threshold' => (float) $config->max_drift_threshold,
                'min_new_samples' => (int) $config->min_new_samples,
                'schedule_interval_hours' => (int) $config->schedule_interval_hours,
                'last_run_at' => $config->last_run_at?->toIso8601String(),
            ],
            'latest_agent_run' => $latestRun,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Device API (device.token): Inferensi on-demand satu paket parameter air dengan Random Forest.
     */
    public function predict(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $validated = $request->validate([
            'ph' => ['required', 'numeric', 'between:0,14'],
            'temperature_c' => ['required', 'numeric', 'between:0,50'],
            'tds_ppm' => ['nullable', 'numeric', 'between:0,10000'],
            'turbidity_ntu' => ['nullable', 'numeric', 'between:0,1000'],
            'water_level' => ['nullable', 'string', 'max:20'],
            'persist' => ['nullable', 'boolean'],
        ]);

        $persist = $request->boolean('persist', true);
        $prediction = $this->mlService->predict($validated, $persist, 'API_ON_DEMAND');

        return response()->json([
            'success' => true,
            'device_code' => $device->device_code,
            'persisted' => $persist,
            'prediction' => $prediction,
        ]);
    }

    /**
     * Device API (device.token): Inferensi batch hingga 100 sampel parameter air sekaligus.
     */
    public function predictBatch(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $validated = $request->validate([
            'readings' => ['required', 'array', 'min:1', 'max:100'],
            'readings.*.ph' => ['required', 'numeric', 'between:0,14'],
            'readings.*.temperature_c' => ['required', 'numeric', 'between:0,50'],
            'readings.*.tds_ppm' => ['nullable', 'numeric', 'between:0,10000'],
            'readings.*.turbidity_ntu' => ['nullable', 'numeric', 'between:0,1000'],
            'readings.*.water_level' => ['nullable', 'string', 'max:20'],
            'persist' => ['nullable', 'boolean'],
        ]);

        $persist = $request->boolean('persist', false);
        $predictions = $this->mlService->predictBatch($validated['readings'], $persist, 'API_BATCH');

        return response()->json([
            'success' => true,
            'device_code' => $device->device_code,
            'persisted' => $persist,
            'count' => count($predictions),
            'predictions' => $predictions,
        ]);
    }

    /**
     * Public API: Riwayat hasil prediksi Random Forest (?limit=50&risk=BAHAYA&device_code=).
     */
    public function predictions(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->input('limit', 50), 1), 200);
        $risk = strtoupper(trim((string) $request->query('risk', '')));
        $deviceCode = trim((string) ($request->query('device_code') ?? ''));

        $query = Prediction::with('sensorReading.device:id,device_code,name,pond_name')
            ->latest('predicted_at');

        if (in_array($risk, ['AMAN', 'WASPADA', 'BAHAYA'], true)) {
            $query->where('risk', $risk);
        }

        if ($deviceCode !== '') {
            $query->whereHas('sensorReading.device', fn ($q) => $q->where('device_code', $deviceCode));
        }

        $items = $query->take($limit)->get();

        return response()->json([
            'success' => true,
            'count' => $items->count(),
            'data' => $items,
        ]);
    }

    /**
     * Public API: Prediksi Random Forest paling akhir (?device_code=).
     */
    public function latestPrediction(Request $request): JsonResponse
    {
        $deviceCode = trim((string) ($request->query('device_code') ?? ''));

        $query = Prediction::with('sensorReading.device:id,device_code,name,pond_name')
            ->latest('predicted_at');

        if ($deviceCode !== '') {
            $query->whereHas('sensorReading.device', fn ($q) => $q->where('device_code', $deviceCode));
        }

        $prediction = $query->first();

        return response()->json([
            'success' => true,
            'prediction' => $prediction,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Public API: Metrik trafik inferensi, latensi, confusion matrix, dan performa Random Forest.
     */
    public function performance(Request $request): JsonResponse
    {
        $hoursRaw = $request->query('hours', 24);
        $hours = $hoursRaw === '0' || $hoursRaw === 0 ? 0 : min(max((int) $hoursRaw, 1), 720);
        $deviceCode = $request->query('device_code') ? trim((string) $request->query('device_code')) : null;

        return response()->json([
            'success' => true,
            'performance' => $this->agentService->getPerformanceMetrics($hours, $deviceCode),
        ]);
    }

    /**
     * Super Admin: Ambil overview lengkap dashboard MLOps & AI Agent.
     */
    public function adminOverview(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $hoursRaw = $request->query('hours', 24);
        $hours = $hoursRaw === '0' || $hoursRaw === 0 ? 0 : min(max((int) $hoursRaw, 1), 720);

        return response()->json([
            'success' => true,
            'overview' => $this->agentService->getPerformanceMetrics($hours),
        ]);
    }

    /**
     * Super Admin: Jalankan siklus Auto-Evaluasi model aktif saat ini.
     */
    public function triggerEvaluate(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $agentModelId = $request->input('agent_model_id');
        if ($agentModelId !== null && !in_array($agentModelId, MlSelfLearningAgentService::validAgentModelIds(), true)) {
            $agentModelId = null;
        }

        $run = $this->agentService->runCycle('evaluate', false, 'MANUAL', $agentModelId);

        return response()->json([
            'success' => true,
            'message' => $run->summary ?: 'Auto-Evaluasi model Random Forest selesai dijalankan.',
            'run' => $run,
            'overview' => $this->agentService->getPerformanceMetrics(24),
        ]);
    }

    /**
     * Super Admin: Jalankan AI Agent Self-Learning (Auto-Evaluate + Auto-Train + Safety Gate).
     */
    public function triggerSelfLearn(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'force_retrain' => ['nullable', 'boolean'],
            'agent_model_id' => ['nullable', 'string', Rule::in(MlSelfLearningAgentService::validAgentModelIds())],
        ]);

        $force = (bool) ($validated['force_retrain'] ?? false);
        $agentModelId = $validated['agent_model_id'] ?? null;

        if ($agentModelId) {
            MlAgentConfig::current()->update(['agent_model_id' => $agentModelId]);
        }

        $run = $this->agentService->runCycle('self_learn', $force, 'MANUAL', $agentModelId);

        return response()->json([
            'success' => true,
            'message' => $run->summary ?: 'Siklus AI Agent Self-Learning selesai dijalankan.',
            'run' => $run,
            'overview' => $this->agentService->getPerformanceMetrics(24),
        ]);
    }

    /**
     * Super Admin: Perbarui kebijakan jadwal, ambang F1/Drift, model AI Agent, dan mode promosi.
     */
    public function updateAgentConfig(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'auto_learning_enabled' => ['required', 'boolean'],
            'promotion_mode' => ['required', 'in:AUTO_PROMOTE,HITL_REVIEW'],
            'min_f1_threshold' => ['required', 'numeric', 'between:0.5,0.9999'],
            'max_drift_threshold' => ['required', 'numeric', 'between:0.05,0.9999'],
            'min_new_samples' => ['required', 'integer', 'min:1', 'max:5000'],
            'schedule_interval_hours' => ['required', 'integer', 'min:1', 'max:168'],
            'llm_advisor_enabled' => ['nullable', 'boolean'],
            'agent_model_id' => ['nullable', 'string', Rule::in(MlSelfLearningAgentService::validAgentModelIds())],
            'agent_api_url' => ['nullable', 'url', 'max:255'],
            'agent_api_key' => ['nullable', 'string', 'max:500'],
            'clear_api_key' => ['nullable', 'boolean'],
        ]);

        $config = MlAgentConfig::current();
        $updatePayload = [
            'auto_learning_enabled' => (bool) $validated['auto_learning_enabled'],
            'promotion_mode' => $validated['promotion_mode'],
            'min_f1_threshold' => (float) $validated['min_f1_threshold'],
            'max_drift_threshold' => (float) $validated['max_drift_threshold'],
            'min_new_samples' => (int) $validated['min_new_samples'],
            'schedule_interval_hours' => (int) $validated['schedule_interval_hours'],
            'llm_advisor_enabled' => (bool) ($validated['llm_advisor_enabled'] ?? false),
            'agent_model_id' => $validated['agent_model_id'] ?? $config->agent_model_id ?? 'rf-autonomous-local',
            'agent_api_url' => $validated['agent_api_url'] ?? null,
        ];

        if (!empty($validated['clear_api_key'])) {
            $updatePayload['agent_api_key'] = null;
        } elseif (!empty($validated['agent_api_key'])) {
            $updatePayload['agent_api_key'] = trim((string) $validated['agent_api_key']);
        }

        $config->update($updatePayload);

        return response()->json([
            'success' => true,
            'message' => 'Konfigurasi kebijakan & model AI Self-Learning Agent berhasil disimpan.',
            'overview' => $this->agentService->getPerformanceMetrics(24),
        ]);
    }

    /**
     * Super Admin / Petugas: Catat validasi lapangan (Prediksi RF vs Kondisi Aktual Kolam).
     */
    public function storeFieldValidation(Request $request): JsonResponse
    {
        $user = $this->authorizeAdmin();

        $validated = $request->validate([
            'prediction_id' => ['nullable', 'integer', 'exists:predictions,id'],
            'device_id' => ['nullable', 'integer', 'exists:devices,id'],
            'device_code' => ['nullable', 'string', 'max:64'],
            'pond_name' => ['nullable', 'string', 'max:120'],
            'ph' => ['required', 'numeric', 'between:0,14'],
            'temperature_c' => ['required', 'numeric', 'between:0,50'],
            'tds_ppm' => ['nullable', 'numeric', 'between:0,10000'],
            'turbidity_ntu' => ['nullable', 'numeric', 'between:0,1000'],
            'water_level' => ['nullable', 'in:NORMAL,LOW'],
            'predicted_risk' => ['required', 'in:AMAN,WASPADA,BAHAYA'],
            'actual_risk' => ['required', 'in:AMAN,WASPADA,BAHAYA'],
            'field_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $device = !empty($validated['device_id'])
            ? Device::find($validated['device_id'])
            : (!empty($validated['device_code']) ? Device::where('device_code', $validated['device_code'])->first() : null);

        $activeModel = $this->agentService->ensureBaselineVersion();
        $isMatch = strtoupper($validated['predicted_risk']) === strtoupper($validated['actual_risk']);

        $record = MlFieldValidation::create([
            'device_id' => $device?->id,
            'prediction_id' => $validated['prediction_id'] ?? null,
            'tenant_code' => $device?->tenant_code ?? $user->tenant_code,
            'device_code' => $device?->device_code ?? ($validated['device_code'] ?? 'MANUAL'),
            'pond_name' => $device?->pond_name ?? ($validated['pond_name'] ?? 'Kolam Lapangan'),
            'ph' => (float) $validated['ph'],
            'temperature_c' => (float) $validated['temperature_c'],
            'tds_ppm' => isset($validated['tds_ppm']) ? (float) $validated['tds_ppm'] : null,
            'turbidity_ntu' => isset($validated['turbidity_ntu']) ? (float) $validated['turbidity_ntu'] : null,
            'water_level' => $validated['water_level'] ?? 'NORMAL',
            'predicted_risk' => strtoupper($validated['predicted_risk']),
            'actual_risk' => strtoupper($validated['actual_risk']),
            'is_match' => $isMatch,
            'model_version' => $activeModel->version,
            'field_notes' => $validated['field_notes'] ?? null,
            'validated_by' => $user->name . ' (' . $user->role . ')',
            'validated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $isMatch
                ? 'Validasi lapangan tersimpan: Prediksi RF SESUAI kondisi aktual di kolam.'
                : 'Koreksi lapangan tersimpan: Prediksi RF tidak sesuai — data siap dipakai AI Agent untuk generate ulang model.',
            'validation' => $record,
            'overview' => $this->agentService->getPerformanceMetrics(24),
        ]);
    }

    /**
     * Super Admin: Hapus catatan validasi lapangan.
     */
    public function destroyFieldValidation(MlFieldValidation $validation): JsonResponse
    {
        $this->authorizeAdmin();
        $validation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Catatan validasi lapangan berhasil dihapus.',
            'overview' => $this->agentService->getPerformanceMetrics(24),
        ]);
    }

    /**
     * Super Admin: Promosikan atau rollback 1-klik model versi tertentu menjadi aktif.
     */
    public function promoteModel(MlModelVersion $mlModelVersion): JsonResponse
    {
        $admin = $this->authorizeAdmin();

        $promoted = $this->agentService->promoteVersion(
            $mlModelVersion,
            $admin->name . ' (' . $admin->role . ')'
        );

        return response()->json([
            'success' => true,
            'message' => "Model {$promoted->version} berhasil diaktifkan untuk inferensi produksi.",
            'overview' => $this->agentService->getPerformanceMetrics(24),
        ]);
    }

    private function authorizeAdmin()
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator atau pengguna dengan izin Dokumentasi & MLOps.');
        }
        return $user;
    }
}
