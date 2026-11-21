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
                'device_id' => 'BW-CORE-SIM01',
                'pond_id' => 'P01',
                'ts' => $ts->toIso8601String(),
                'ph' => round($ph, 2),
                'temperature_c' => round($temp, 1),
                'tds_ppm' => round($tds, 0),
                'turbidity_ntu' => round($turb, 1),
                'water_level' => 'NORMAL',
                'aerator_on' => $aeratorOn,
                'pump_on' => false,
                'mode' => 'AUTO',
                'sensor_health' => 'OK',
                'power_source' => 'PLN',
            ];
        }

        $latestDummy = end($dummyReadings);

        $dummyAlerts = [
            [
                'id' => 1,
                'ts' => $now->copy()->subMinutes(12)->toIso8601String(),
                'level' => 'INFO',
                'param' => 'AERATOR',
                'message' => 'Simulasi Core Hub (1 Hub : 4 Kolam): Relay aerator Kolam 1 aktif otomatis via Edge Fuzzy + Safety Clamp.',
                'value' => null,
                'telegram_sent' => true,
                'whatsapp_sent' => true,
                'email_sent' => false,
                'acknowledged_at' => null,
                'acknowledged_by' => null,
                'pond_name' => 'Kolam Terpal 1 (P01)',
                'channel_primary' => 'WHATSAPP',
            ],
            [
                'id' => 2,
                'ts' => $now->copy()->subHours(2)->toIso8601String(),
                'level' => 'WASPADA',
                'param' => 'SUHU',
                'message' => 'Simulasi WeningBot WhatsApp-First + Telegram: Suhu siang terdeteksi 31,8 C mendekati batas atas 32,0 C.',
                'value' => 31.8,
                'telegram_sent' => true,
                'whatsapp_sent' => true,
                'email_sent' => false,
                'acknowledged_at' => $now->copy()->subHours(1)->toIso8601String(),
                'acknowledged_by' => 'Operator Lapangan (Simulasi)',
                'pond_name' => 'Kolam Terpal 1 (P01)',
                'channel_primary' => 'WHATSAPP',
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
                'model_version' => 'rf-edge-sim',
                'timeframe' => '1-3 jam',
                'triggers' => [],
                'recommended_action' => 'Klaster 4 kolam lele stabil sesuai SNI. Cloud Always-On (EMQX + FastAPI + Supabase Pro) aktif bersama HITL Safety Gate & Offline-Plus Rp0.',
                'failsafe_active' => false,
                'pond_id' => 'P01',
                'is_pilot_model' => true,
                'hitl_approved' => true,
            ],
            'device' => [
                'device_code' => 'BW-CORE-SIM01',
                'name' => 'Core Hub (1 Hub : 4 Kolam) Simulator',
                'pond_name' => 'Klaster 4 Kolam Lele Sangkuriang (Demo)',
                'firmware_version' => 'edge-fuzzy-demo',
                'status' => 'ONLINE',
                'transport_protocol' => 'EMQX_TLS_8883',
                'mode' => 'AUTO',
                'aerator_on' => false,
                'hardware_variant' => 'JURAGAN_4K',
                'pond_count' => 4,
                'backup_mode' => 'LITTLEFS_72H',
                'backup_health_pct' => 100,
                'offline_plus_active' => true,
                'adc_channels' => 12,
                'relay_channels' => 8,
            ],
        ]);
    }
}
