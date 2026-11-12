<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\LandingContent;

class LandingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Home', [
            'landingContent' => LandingContent::getAllSettings(),
        ]);
    }

    public function demo(): Response
    {
        $now = now();
        $start = $now->copy()->subHours(24);
        $dummyReadings = [];

        for ($i = 0; $i < 288; $i++) {
            $ts = $start->copy()->addMinutes($i * 5);
            $hour = $ts->hour;

            $ph = 7.3 + (sin(($hour - 6) * 0.2618) * 0.35) + (rand(-10, 10) / 150);
            $temp = 28.5 + (sin(($hour - 9) * 0.2618) * 2.2) + (rand(-10, 10) / 100);
            $tds = 380 + (sin($hour * 0.2618) * 25) + rand(-10, 10);
            $turb = 35 + rand(-5, 5);

            $aeratorOn = ($ph < 6.5 || $temp > 32.0);

            $dummyReadings[] = [
                'id' => $i + 1,
                'device_id' => 'BANYUWENING-SIM-01',
                'ts' => $ts->toIso8601String(),
                'ph' => round($ph, 2),
                'temperature_c' => round($temp, 1),
                'tds_ppm' => round($tds, 0),
                'turbidity_ntu' => round($turb, 1),
                'water_level' => 'NORMAL',
                'aerator_on' => $aeratorOn,
                'mode' => 'AUTO',
            ];
        }

        $latestDummy = end($dummyReadings);

        $dummyAlerts = [
            [
                'id' => 1,
                'ts' => $now->copy()->subMinutes(12)->toIso8601String(),
                'level' => 'INFO',
                'param' => 'AERATOR',
                'message' => 'Simulasi: Aerator kolam diaktifkan otomatis oleh aturan cloud.',
                'value' => 'ON',
                'telegram_sent' => true,
                'whatsapp_sent' => true,
                'email_sent' => false,
                'acknowledged_at' => null,
                'acknowledged_by' => null,
            ],
            [
                'id' => 2,
                'ts' => $now->copy()->subHours(2)->toIso8601String(),
                'level' => 'WASPADA',
                'param' => 'SUHU',
                'message' => 'Simulasi: Suhu siang hari terdeteksi 31.8 °C mendekati batas atas 32.0 °C.',
                'value' => '31.8 °C',
                'telegram_sent' => true,
                'whatsapp_sent' => false,
                'email_sent' => false,
                'acknowledged_at' => $now->copy()->subHours(1)->toIso8601String(),
                'acknowledged_by' => 'Operator Lapangan (Simulasi)',
            ],
        ];

        return Inertia::render('Demo', [
            'allReadings' => $dummyReadings,
            'currentReading' => $latestDummy,
            'alerts' => $dummyAlerts,
            'prediction' => [
                'risk' => 'AMAN',
                'p_aman' => 0.94,
                'p_waspada' => 0.05,
                'p_bahaya' => 0.01,
                'model_version' => '1.0.0-rf-sim',
                'timeframe' => '1–3 jam',
                'triggers' => [],
                'recommended_action' => 'Kondisi air kolam lele stabil sesuai SNI.',
                'failsafe_active' => false,
            ],
            'device' => [
                'device_code' => 'BANYUWENING-SIM-01',
                'name' => 'Node Sensor Kolam 01 (Simulator Demo)',
                'pond_name' => 'Kolam Terpal Sangkuriang 01 (Simulasi)',
                'firmware_version' => 'v1.4.2-demo',
                'status' => 'ONLINE',
                'mode' => 'AUTO',
                'aerator_on' => false,
            ],
        ]);
    }
}
