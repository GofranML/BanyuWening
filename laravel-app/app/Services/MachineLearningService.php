<?php

namespace App\Services;

use App\Models\Prediction;
use App\Models\SensorReading;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class MachineLearningService
{
    protected string $pythonPath;
    protected string $predictScriptPath;

    public function __construct()
    {
        $this->pythonPath = (string) config('services.ml.python_path', env('ML_PYTHON_PATH', 'python3'));
        $this->predictScriptPath = (string) config('services.ml.predict_script', base_path('../ml/src/predict.py'));
    }

    /**
     * Menjalankan inferensi Random Forest untuk satu sampel telemetri.
     */
    public function predict(SensorReading|array $reading, bool $persist = true, string $source = 'TELEMETRY'): Prediction
    {
        $payload = $this->normalizePayload($reading);
        $readingId = ($reading instanceof SensorReading) ? $reading->id : null;

        $started = microtime(true);
        $jsonPayload = json_encode($payload);
        $process = new Process([$this->pythonPath, $this->predictScriptPath, $jsonPayload]);
        $process->setTimeout(6);

        try {
            $process->run();
            $latencyMs = (int) max(1, round((microtime(true) - $started) * 1000));

            if (!$process->isSuccessful()) {
                Log::warning('ML Script Warning/Error: ' . $process->getErrorOutput());
            }

            $output = trim($process->getOutput());
            $result = json_decode($output, true);

            if (!$result || !isset($result['risk'])) {
                Log::error('Output ML Python tidak valid: ' . $output);
                return $this->fallbackDeterministicPrediction($readingId, $payload, $latencyMs, $persist, $source);
            }

            $attributes = [
                'sensor_reading_id' => $readingId,
                'risk' => $result['risk'] ?? 'AMAN',
                'p_aman' => (float) ($result['p_aman'] ?? 0.90),
                'p_waspada' => (float) ($result['p_waspada'] ?? 0.08),
                'p_bahaya' => (float) ($result['p_bahaya'] ?? 0.02),
                'model_version' => $result['model_version'] ?? $this->activeModelVersion(),
                'timeframe' => '1–3 jam',
                'triggers' => $result['triggers'] ?? [],
                'recommended_action' => $result['recommended_action'] ?? 'Parameter dalam batas normal.',
                'failsafe_active' => (bool) ($result['failsafe_active'] ?? false),
                'latency_ms' => $latencyMs,
                'is_fallback' => false,
                'source' => $source,
                'predicted_at' => now(),
            ];

            return $persist ? Prediction::create($attributes) : new Prediction($attributes);
        } catch (\Throwable $e) {
            $latencyMs = (int) max(1, round((microtime(true) - $started) * 1000));
            Log::error('Gagal menjalankan proses Python ML: ' . $e->getMessage());
            return $this->fallbackDeterministicPrediction($readingId, $payload, $latencyMs, $persist, $source);
        }
    }

    /**
     * Menjalankan inferensi batch Random Forest dalam satu proses Python.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, Prediction>
     */
    public function predictBatch(array $items, bool $persist = false, string $source = 'API_BATCH'): array
    {
        $normalized = array_map(fn ($item) => $this->normalizePayload(is_array($item) ? $item : []), $items);
        $started = microtime(true);
        $process = new Process([
            $this->pythonPath,
            $this->predictScriptPath,
            json_encode(['batch' => $normalized]),
        ]);
        $process->setTimeout(12);

        try {
            $process->run();
            $totalMs = (int) max(1, round((microtime(true) - $started) * 1000));
            $output = trim($process->getOutput());
            $decoded = json_decode($output, true);

            if (is_array($decoded) && isset($decoded['predictions']) && is_array($decoded['predictions'])) {
                $perItemFallbackLatency = (int) max(1, round($totalMs / max(1, count($decoded['predictions']))));
                $predictions = [];

                foreach ($decoded['predictions'] as $result) {
                    $itemLatency = isset($result['inference_ms'])
                        ? (int) max(1, round((float) $result['inference_ms']))
                        : $perItemFallbackLatency;

                    $attrs = [
                        'sensor_reading_id' => null,
                        'risk' => $result['risk'] ?? 'AMAN',
                        'p_aman' => (float) ($result['p_aman'] ?? 0.90),
                        'p_waspada' => (float) ($result['p_waspada'] ?? 0.08),
                        'p_bahaya' => (float) ($result['p_bahaya'] ?? 0.02),
                        'model_version' => $result['model_version'] ?? ($decoded['model_version'] ?? $this->activeModelVersion()),
                        'timeframe' => '1–3 jam',
                        'triggers' => $result['triggers'] ?? [],
                        'recommended_action' => $result['recommended_action'] ?? 'Parameter dalam batas normal.',
                        'failsafe_active' => (bool) ($result['failsafe_active'] ?? false),
                        'latency_ms' => $itemLatency,
                        'is_fallback' => false,
                        'source' => $source,
                        'predicted_at' => now(),
                    ];

                    $predictions[] = $persist ? Prediction::create($attrs) : new Prediction($attrs);
                }

                return $predictions;
            }
        } catch (\Throwable $e) {
            Log::error('Gagal menjalankan batch Python ML: ' . $e->getMessage());
        }

        $fallbackLatency = (int) max(1, round((microtime(true) - $started) * 1000));
        $results = [];
        foreach ($normalized as $payload) {
            $results[] = $this->fallbackDeterministicPrediction(null, $payload, $fallbackLatency, $persist, $source);
        }
        return $results;
    }

    /**
     * Membaca model_card.json aktif secara aman.
     *
     * @return array<string, mixed>
     */
    public function getModelCard(): array
    {
        $cardPath = base_path('../ml/models/model_card.json');
        if (!is_file($cardPath)) {
            return [];
        }

        $decoded = json_decode((string) @file_get_contents($cardPath), true);
        return is_array($decoded) ? $decoded : [];
    }

    public function activeModelVersion(): string
    {
        $card = $this->getModelCard();
        $version = trim((string) ($card['version'] ?? ''));
        if ($version === '' || $version === '1.0.0') {
            return '1.0.0-rf';
        }
        return $version;
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizePayload(SensorReading|array $reading): array
    {
        if ($reading instanceof SensorReading) {
            return [
                'ph' => $reading->ph,
                'temperature_c' => $reading->temperature_c,
                'tds_ppm' => $reading->tds_ppm,
                'turbidity_ntu' => $reading->turbidity_ntu,
                'water_level' => $reading->water_level,
            ];
        }

        return [
            'ph' => $reading['ph'] ?? null,
            'temperature_c' => $reading['temperature_c'] ?? ($reading['temperature'] ?? null),
            'tds_ppm' => $reading['tds_ppm'] ?? ($reading['tds'] ?? null),
            'turbidity_ntu' => $reading['turbidity_ntu'] ?? ($reading['turbidity'] ?? null),
            'water_level' => $reading['water_level'] ?? 'NORMAL',
        ];
    }

    /**
     * Fallback deterministik keselamatan jika Python runtime tidak merespons.
     */
    protected function fallbackDeterministicPrediction(
        ?int $readingId,
        array $payload,
        int $latencyMs,
        bool $persist = true,
        string $source = 'TELEMETRY'
    ): Prediction {
        $ph = isset($payload['ph']) && $payload['ph'] !== null ? (float) $payload['ph'] : 7.0;
        $temp = isset($payload['temperature_c']) && $payload['temperature_c'] !== null ? (float) $payload['temperature_c'] : 28.5;
        $tds = isset($payload['tds_ppm']) && $payload['tds_ppm'] !== null ? (float) $payload['tds_ppm'] : 350.0;
        $wl = strtoupper((string) ($payload['water_level'] ?? 'NORMAL'));

        $isBahaya = ($ph < 6.0 || $ph > 8.8 || $temp > 33.0 || $temp < 22.0 || $wl === 'LOW' || $wl === 'SURUT');
        $isWaspada = ($ph < 6.5 || $ph > 8.5 || $temp > 30.0 || $temp < 25.0 || $tds > 600);

        $risk = $isBahaya ? 'BAHAYA' : ($isWaspada ? 'WASPADA' : 'AMAN');

        $attributes = [
            'sensor_reading_id' => $readingId,
            'risk' => $risk,
            'p_aman' => $risk === 'AMAN' ? 0.95 : 0.05,
            'p_waspada' => $risk === 'WASPADA' ? 0.85 : 0.10,
            'p_bahaya' => $risk === 'BAHAYA' ? 0.90 : 0.05,
            'model_version' => '1.0.0-fallback-rules',
            'timeframe' => '1–3 jam',
            'triggers' => $isBahaya ? ['Aturan darurat failsafe lokal aktif'] : ($isWaspada ? ['Parameter mendekati batas ambang'] : []),
            'recommended_action' => $isBahaya ? 'Segera cek aerator dan tambahkan air bersih.' : 'Amati perkembangan kualitas air kolam.',
            'failsafe_active' => $isBahaya,
            'latency_ms' => $latencyMs,
            'is_fallback' => true,
            'source' => $source,
            'predicted_at' => now(),
        ];

        return $persist ? Prediction::create($attributes) : new Prediction($attributes);
    }
}
