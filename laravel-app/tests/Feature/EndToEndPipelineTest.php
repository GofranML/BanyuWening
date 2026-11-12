<?php

namespace Tests\Feature;

use App\Jobs\PredictWaterQualityJob;
use App\Models\Device;
use App\Models\Prediction;
use App\Models\SensorReading;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndToEndPipelineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_end_to_end_telemetry_to_dashboard_pipeline(): void
    {
        // 1. SIMULASI: ESP32 mengirim paket telemetri normal
        $payloadNormal = [
            'device_code' => 'ESP32-NODE-01',
            'ph' => 7.20,
            'temperature_c' => 28.5,
            'tds_ppm' => 350.0,
            'turbidity_ntu' => 32.0,
            'water_level' => 'NORMAL',
            'aerator_on' => false,
            'mode' => 'AUTO',
        ];

        $ingestResponse = $this->postJson('/api/telemetry', $payloadNormal);
        $ingestResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'aerator_command' => 'OFF',
                'failsafe_triggered' => false,
            ]);

        $readingId = $ingestResponse->json('reading_id');
        $this->assertNotNull($readingId);

        // 2. Verifikasi Sensor Reading & Device di Database
        $reading = SensorReading::find($readingId);
        $this->assertNotNull($reading);
        $this->assertEquals(7.20, $reading->ph);

        $device = Device::where('device_code', 'ESP32-NODE-01')->first();
        $this->assertEquals('ONLINE', $device->status);
        $this->assertNotNull($device->last_heartbeat_at);

        // 3. Verifikasi Queue Job memproses ML Random Forest
        $job = new PredictWaterQualityJob($reading);
        app()->call([$job, 'handle']);

        $prediction = Prediction::where('sensor_reading_id', $readingId)->first();
        $this->assertNotNull($prediction);
        $this->assertEquals('AMAN', $prediction->risk);

        // 4. Verifikasi REST API /api/latest menyajikan data terkini
        $latestApi = $this->getJson('/api/latest');
        $latestApi->assertStatus(200)
            ->assertJsonPath('reading.id', $readingId)
            ->assertJsonPath('prediction.risk', 'AMAN');

        // 5. Verifikasi Dashboard Inertia.js menampilkan data untuk pengguna terautentikasi
        $user = User::where('email', 'admin@banyuwening.id')->first();
        $dashboardResponse = $this->actingAs($user)->get('/dashboard');
        $dashboardResponse->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('currentReading.id', $readingId)
                ->where('prediction.risk', 'AMAN')
            );
    }

    public function test_end_to_end_failsafe_critical_telemetry_pipeline(): void
    {
        // 1. SIMULASI: ESP32 mengirim paket telemetri kritis (pH anjlok 5.82)
        $payloadKritis = [
            'device_code' => 'ESP32-NODE-01',
            'ph' => 5.82,
            'temperature_c' => 33.8,
            'tds_ppm' => 820.0,
            'turbidity_ntu' => 135.0,
            'water_level' => 'NORMAL',
            'aerator_on' => false,
            'mode' => 'AUTO',
        ];

        $ingestResponse = $this->postJson('/api/telemetry', $payloadKritis);
        $ingestResponse->assertStatus(201)
            ->assertJson([
                'success' => true,
                'aerator_command' => 'ON', // Aerator otomatis diperintahkan ON untuk mitigasi darurat
                'failsafe_triggered' => true,
            ]);

        $readingId = $ingestResponse->json('reading_id');
        $reading = SensorReading::find($readingId);
        $this->assertTrue($reading->aerator_on);
        $this->assertEquals('FAILSAFE', $reading->mode);

        // 2. Eksekusi Queue Job ML
        $job = new PredictWaterQualityJob($reading);
        app()->call([$job, 'handle']);

        $prediction = Prediction::where('sensor_reading_id', $readingId)->first();
        $this->assertNotNull($prediction);
        $this->assertEquals('BAHAYA', $prediction->risk);
        $this->assertTrue($prediction->failsafe_active);
    }
}
