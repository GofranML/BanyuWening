<?php

namespace App\Services;

use App\Models\SensorReading;
use App\Models\Prediction;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Illuminate\Support\Facades\Log;

class MachineLearningService
{
    protected string $pythonPath;
    protected string $predictScriptPath;

    public function __construct()
    {
        // Deteksi path python dan script di sistem melalui konfigurasi services.ml
        $this->pythonPath = config('services.ml.python_path', env('ML_PYTHON_PATH', 'C:\\Users\\epann\\AppData\\Local\\Programs\\Python\\Python310\\python.exe'));
        $this->predictScriptPath = config('services.ml.predict_script', base_path('../ml/src/predict.py'));
    }

    /**
     * Menjalankan inferensi Random Forest untuk suatu data pembacaan sensor.
     */
    public function predict(SensorReading|array $reading): Prediction
    {
        $payload = is_array($reading) ? $reading : [
            'ph' => $reading->ph,
            'temperature_c' => $reading->temperature_c,
            'tds_ppm' => $reading->tds_ppm,
            'turbidity_ntu' => $reading->turbidity_ntu,
            'water_level' => $reading->water_level,
        ];

        $jsonPayload = json_encode($payload);
        $process = new Process([$this->pythonPath, $this->predictScriptPath, $jsonPayload]);
        $process->setTimeout(15); // Maksimal 15 detik

        try {
            $process->run();

            if (!$process->isSuccessful()) {
                Log::warning('ML Script Warning/Error: ' . $process->getErrorOutput());
            }

            $output = trim($process->getOutput());
            $result = json_decode($output, true);

            if (!$result || !isset($result['risk'])) {
                // Fallback jika proses output tidak valid
                Log::error('Output ML Python tidak valid: ' . $output);
                return $this->fallbackDeterministicPrediction($reading, $payload);
            }

            $readingId = ($reading instanceof SensorReading) ? $reading->id : null;

            return Prediction::create([
                'sensor_reading_id' => $readingId,
                'risk' => $result['risk'] ?? 'AMAN',
                'p_aman' => $result['p_aman'] ?? 0.90,
                'p_waspada' => $result['p_waspada'] ?? 0.08,
                'p_bahaya' => $result['p_bahaya'] ?? 0.02,
                'model_version' => $result['model_version'] ?? '1.0.0-rf',
                'timeframe' => '1–3 jam',
                'triggers' => $result['triggers'] ?? [],
                'recommended_action' => $result['recommended_action'] ?? 'Parameter dalam batas normal.',
                'failsafe_active' => $result['failsafe_active'] ?? false,
                'predicted_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Gagal menjalankan proses Python ML: ' . $e->getMessage());
            return $this->fallbackDeterministicPrediction($reading, $payload);
        }
    }

    /**
     * Fallback deterministik keselamatan jika Python runtime tidak merespons
     */
    protected function fallbackDeterministicPrediction(SensorReading|array $reading, array $payload): Prediction
    {
        $ph = $payload['ph'] ?? 7.0;
        $temp = $payload['temperature_c'] ?? 28.5;
        $tds = $payload['tds_ppm'] ?? 350;
        $wl = $payload['water_level'] ?? 'NORMAL';

        $isBahaya = ($ph < 6.0 || $ph > 8.8 || $temp > 33.0 || $wl === 'LOW');
        $isWaspada = ($ph < 6.5 || $ph > 8.5 || $temp > 32.0 || $tds > 600);

        $risk = $isBahaya ? 'BAHAYA' : ($isWaspada ? 'WASPADA' : 'AMAN');
        $readingId = ($reading instanceof SensorReading) ? $reading->id : null;

        return Prediction::create([
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
            'predicted_at' => now(),
        ]);
    }
}
