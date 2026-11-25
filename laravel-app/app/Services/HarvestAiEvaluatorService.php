<?php

namespace App\Services;

use App\Models\Device;
use App\Models\Prediction;
use App\Models\SensorReading;
use Carbon\Carbon;

class HarvestAiEvaluatorService
{
    /**
     * Hitung Survival Rate: SR = (Nt / N0) × 100%, evaluasi ukuran ikan,
     * korelasi kualitas air + prediksi AI, dan susun diagnosis terstruktur untuk AI Self-Learning.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function evaluate(array $data, ?Device $device = null): array
    {
        $n0 = max(1, (int) $data['seed_count']);
        $harvestKg = isset($data['harvest_weight_kg']) && $data['harvest_weight_kg'] !== '' && $data['harvest_weight_kg'] !== null
            ? (float) $data['harvest_weight_kg']
            : null;
        $fishPerKg = isset($data['fish_per_kg']) && $data['fish_per_kg'] !== '' && $data['fish_per_kg'] !== null
            ? (float) $data['fish_per_kg']
            : null;
        $explicitNt = isset($data['harvest_fish_count']) && $data['harvest_fish_count'] !== '' && $data['harvest_fish_count'] !== null
            ? (int) $data['harvest_fish_count']
            : null;

        $startAt = Carbon::parse($data['stocking_date'])->startOfDay();
        $endAt = ! empty($data['harvest_date'])
            ? Carbon::parse($data['harvest_date'])->endOfDay()
            : now();
        $cultureDays = max(1, (int) $startAt->diffInDays($endAt));

        $readingQuery = SensorReading::whereBetween('recorded_at', [$startAt, $endAt]);
        $predQuery = Prediction::whereBetween('predicted_at', [$startAt, $endAt]);

        if ($device) {
            $readingQuery->where('device_id', $device->id);
            $predQuery->whereHas('sensorReading', fn ($q) => $q->where('device_id', $device->id));
        }

        $avgPh = $readingQuery->avg('ph');
        $avgTemp = $readingQuery->avg('temperature_c');
        $avgTds = $readingQuery->avg('tds_ppm');
        $avgTurb = $readingQuery->avg('turbidity_ntu');
        $dangerEvents = (clone $predQuery)->where('risk', 'BAHAYA')->count();
        $warningEvents = (clone $predQuery)->where('risk', 'WASPADA')->count();
        $amanEvents = (clone $predQuery)->where('risk', 'AMAN')->count();

        // Tentukan Nt (jumlah ikan hidup di akhir pemeliharaan)
        $nt = null;
        if ($explicitNt !== null && $explicitNt >= 0) {
            $nt = $explicitNt;
        } elseif ($harvestKg !== null && $fishPerKg !== null) {
            $nt = (int) round($harvestKg * $fishPerKg);
        }

        if ($nt === null) {
            return [
                'avg_fish_weight_g' => null,
                'harvest_fish_count' => null,
                'estimated_harvest_count' => null,
                'estimated_mortality_count' => null,
                'survival_rate_pct' => null,
                'mortality_rate_pct' => null,
                'mortality_status' => 'BERJALAN',
                'ai_danger_events' => $dangerEvents,
                'ai_warning_events' => $warningEvents,
                'avg_ph_cycle' => $avgPh !== null ? round((float) $avgPh, 2) : null,
                'avg_temp_cycle' => $avgTemp !== null ? round((float) $avgTemp, 2) : null,
                'ai_evaluation_note' => 'Siklus masih berjalan. Lengkapi jumlah ikan hidup akhir (Nt) atau berat panen (KG) & isi/kg saat panen untuk perhitungan SR = (Nt / N0) × 100% dan diagnosis AI.',
                'ai_diagnosis' => [
                    'formula' => 'SR = (Nt / N0) × 100%',
                    'n0' => $n0,
                    'nt' => null,
                    'sr_pct' => null,
                    'mortality_pct' => null,
                    'model_issues' => ['Menunggu data panen (Nt) untuk mengevaluasi akurasi alarm model selama siklus.'],
                    'harvest_issues' => ['Siklus budidaya masih berlangsung (' . $cultureDays . ' hari).'],
                    'recommendations' => ['Pantau pH (6.5–8.5) dan suhu (25–30°C) sesuai SNI 8228.4:2015 secara berkala.'],
                    'self_learning_priority' => 'LOW',
                    'fed_to_self_learning' => false,
                    'analyzed_at' => now()->toIso8601String(),
                ],
            ];
        }

        // Rumus resmi Survival Rate: SR = (Nt / N0) × 100%
        $survivalRate = round(min(100.0, ($nt / max(1, $n0)) * 100.0), 2);
        $mortalityRate = round(max(0.0, 100.0 - $survivalRate), 2);
        $estMortalityCount = max(0, $n0 - $nt);

        $avgWeightG = null;
        if ($fishPerKg !== null && $fishPerKg > 0) {
            $avgWeightG = round(1000.0 / $fishPerKg, 2);
        } elseif ($harvestKg !== null && $nt > 0) {
            $avgWeightG = round(($harvestKg * 1000.0) / $nt, 2);
            $fishPerKg = round($nt / max(0.1, $harvestKg), 2);
        }

        $modelIssues = [];
        $harvestIssues = [];
        $recommendations = [];

        // 1. Analisis Diagnosis Kesalahan Model AI
        if ($survivalRate < 75.0 && $dangerEvents === 0 && $warningEvents === 0) {
            $modelIssues[] = "False Negative Model RF: SR rendah ({$survivalRate}%, ±{$estMortalityCount} ekor mati), namun model mencatat 0 kejadian BAHAYA & 0 WASPADA. Model gagal mendeteksi kondisi stres atau anomali kualitas air non-linear.";
            $recommendations[] = 'Lakukan Generate Ulang RF (Self-Learning) dengan bobot koreksi lapangan dan data siklus ini agar recall kelas BAHAYA/WASPADA meningkat.';
        } elseif ($survivalRate < 85.0 && $dangerEvents === 0) {
            $modelIssues[] = "Sensitivitas Model Kurang Agresif: SR {$survivalRate}% (mortalitas {$mortalityRate}%) terjadi tanpa satu pun alarm BAHAYA dari model (WASPADA={$warningEvents}).";
            $recommendations[] = 'Kalibrasi ambang batas feature TDS/kekeruhan pada retraining berikutnya untuk menangkap stres kronis.';
        } elseif ($survivalRate >= 90.0 && $dangerEvents > 15) {
            $modelIssues[] = "Potensi False Positive Model: Model memicu {$dangerEvents} alarm BAHAYA, tetapi hasil panen tetap sangat baik (SR {$survivalRate}%).";
            $recommendations[] = 'Evaluasi apakah sensor pH/suhu mengalami spike sesaat atau model terlalu sensitif pada kelas BAHAYA.';
        } else {
            $modelIssues[] = "Prediksi model selaras dengan hasil biologis kolam (SR {$survivalRate}%, tercatat {$dangerEvents} BAHAYA & {$warningEvents} WASPADA dari " . ($amanEvents + $warningEvents + $dangerEvents) . " inferensi).";
        }

        if ($avgPh !== null && ($avgPh < 6.5 || $avgPh > 8.5)) {
            $modelIssues[] = 'Rata-rata pH siklus (' . round((float) $avgPh, 2) . ') berada di luar rentang optimal SNI 8228.4:2015 (6.5–8.5).';
        }
        if ($avgTemp !== null && ($avgTemp < 25.0 || $avgTemp > 30.0)) {
            $modelIssues[] = 'Rata-rata suhu siklus (' . round((float) $avgTemp, 2) . '°C) berada di luar rentang optimal SNI 8228.4:2015 (25–30°C).';
        }

        // 2. Analisis Diagnosis Hasil Panen & Ukuran Ikan
        if ($survivalRate >= 90.0) {
            $status = 'BAIK';
            $harvestIssues[] = "Survival Rate sangat baik ({$survivalRate}%, Nt={$nt} dari N0={$n0} ekor) dengan mortalitas terkendali ({$mortalityRate}%).";
        } elseif ($survivalRate >= 75.0) {
            $status = 'PERLU_EVALUASI';
            $harvestIssues[] = "Survival Rate moderat ({$survivalRate}%, mortalitas {$mortalityRate}% atau ±{$estMortalityCount} ekor mati) — perlu audit manajemen kualitas air dan padat tebar.";
            $recommendations[] = 'Periksa kepadatan tebar awal, fluktuasi amonia/TDS, serta jadwal pergantian air pada minggu ke-2 hingga ke-4.';
        } else {
            $status = 'TINGGI';
            $harvestIssues[] = "Survival Rate kritis ({$survivalRate}%, mortalitas TINGGI {$mortalityRate}% atau ±{$estMortalityCount} ekor mati dari N0={$n0}).";
            $recommendations[] = 'Wajib evaluasi kualitas bibit awal, aerasi terlarut, dan cek apakah terjadi kematian mendadak akibat lonjakan pH/suhu malam hari.';
        }

        $harvestSizeLabel = ! empty($data['harvest_size_cm']) ? trim((string) $data['harvest_size_cm']) : null;
        if ($fishPerKg !== null && $avgWeightG !== null) {
            if ($fishPerKg > 11.0 || $avgWeightG < 90.0) {
                $harvestIssues[] = "Ukuran ikan panen tergolong kecil (isi {$fishPerKg} ekor/kg, ~{$avgWeightG} g/ekor" . ($harvestSizeLabel ? ", ukuran {$harvestSizeLabel}" : '') . " dalam {$cultureDays} hari) — indikasi pertumbuhan melambat / FCR kurang optimal.";
                $recommendations[] = 'Evaluasi dosis pakan berprotein, suhu air rata-rata, dan distribusi ukuran bibit agar seragam (tidak kanibalisme).';
            } elseif ($fishPerKg <= 9.0) {
                $harvestIssues[] = "Ukuran ikan panen optimal (isi {$fishPerKg} ekor/kg, ~{$avgWeightG} g/ekor" . ($harvestSizeLabel ? ", ukuran {$harvestSizeLabel}" : '') . " dalam {$cultureDays} hari).";
            } else {
                $harvestIssues[] = "Ukuran ikan panen standar konsumsi kecil-sedang (isi {$fishPerKg} ekor/kg, ~{$avgWeightG} g/ekor" . ($harvestSizeLabel ? ", ukuran {$harvestSizeLabel}" : '') . ").";
            }
        } elseif ($harvestSizeLabel) {
            $harvestIssues[] = "Ukuran ikan panen tercatat {$harvestSizeLabel} dengan lama pemeliharaan {$cultureDays} hari.";
        }

        if ($avgTds !== null && (float) $avgTds > 600.0) {
            $harvestIssues[] = 'Rata-rata TDS tinggi (' . round((float) $avgTds, 0) . ' ppm) mengindikasikan akumulasi bahan organik / sisa pakan berlebih.';
        }
        if ($avgTurb !== null && (float) $avgTurb > 100.0) {
            $harvestIssues[] = 'Rata-rata kekeruhan tinggi (' . round((float) $avgTurb, 1) . ' NTU) berpotensi mengganggu insang & pertumbuhan lele.';
        }

        if (empty($recommendations)) {
            $recommendations[] = 'Pertahankan pola aerasi, manajemen pakan, dan masukkan hasil siklus ini ke AI Self-Learning untuk memperkaya baseline model.';
        }

        $hasFalseNegative = $survivalRate < 75.0 && $dangerEvents === 0 && $warningEvents === 0;
        $priority = ($survivalRate < 75.0 || $hasFalseNegative)
            ? 'CRITICAL'
            : ($survivalRate < 85.0 ? 'HIGH' : (($fishPerKg !== null && $fishPerKg > 11.0) ? 'MEDIUM' : 'LOW'));

        $evalNote = "SR = ({$nt} / {$n0}) × 100% = {$survivalRate}% (Mortalitas {$mortalityRate}%). "
            . ($modelIssues[0] ?? '') . ' ' . ($harvestIssues[1] ?? $harvestIssues[0] ?? '');

        return [
            'avg_fish_weight_g' => $avgWeightG,
            'harvest_fish_count' => $nt,
            'estimated_harvest_count' => $nt,
            'estimated_mortality_count' => $estMortalityCount,
            'survival_rate_pct' => $survivalRate,
            'mortality_rate_pct' => $mortalityRate,
            'mortality_status' => $status,
            'ai_danger_events' => $dangerEvents,
            'ai_warning_events' => $warningEvents,
            'avg_ph_cycle' => $avgPh !== null ? round((float) $avgPh, 2) : null,
            'avg_temp_cycle' => $avgTemp !== null ? round((float) $avgTemp, 2) : null,
            'ai_evaluation_note' => trim($evalNote),
            'ai_diagnosis' => [
                'formula' => 'SR = (Nt / N0) × 100%',
                'n0' => $n0,
                'nt' => $nt,
                'sr_pct' => $survivalRate,
                'mortality_pct' => $mortalityRate,
                'culture_days' => $cultureDays,
                'model_issues' => $modelIssues,
                'harvest_issues' => $harvestIssues,
                'recommendations' => $recommendations,
                'self_learning_priority' => $priority,
                'fed_to_self_learning' => false,
                'analyzed_at' => now()->toIso8601String(),
            ],
        ];
    }
}
