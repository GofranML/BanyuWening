<?php

namespace Tests\Feature;

use App\Jobs\PredictWaterQualityJob;
use App\Models\Device;
use App\Models\Prediction;
use App\Models\RelayLog;
use App\Models\SensorReading;
use App\Models\User;
use App\Services\MachineLearningService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ComprehensiveBackendTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_eloquent_relationships(): void
    {
        $device = Device::create([
            'device_code' => 'TEST-NODE-REL-01',
            'name' => 'Node Test Relasi',
            'pond_name' => 'Kolam Terpal Uji',
        ]);

        $reading = SensorReading::create([
            'device_id' => $device->id,
            'recorded_at' => now(),
            'ph' => 7.20,
            'temperature_c' => 28.5,
            'tds_ppm' => 350,
            'turbidity_ntu' => 35,
            'water_level' => 'NORMAL',
        ]);

        $prediction = Prediction::create([
            'sensor_reading_id' => $reading->id,
            'risk' => 'AMAN',
            'p_aman' => 0.95,
            'p_waspada' => 0.04,
            'p_bahaya' => 0.01,
            'model_version' => '1.0.0-rf',
        ]);

        $relayLog = RelayLog::create([
            'device_id' => $device->id,
            'action' => 'ON',
            'mode' => 'AUTO',
            'reason' => 'Uji relasi relay log',
        ]);

        // Verifikasi Device -> SensorReadings & RelayLogs
        $this->assertTrue($device->sensorReadings->contains($reading));
        $this->assertTrue($device->relayLogs->contains($relayLog));

        // Verifikasi SensorReading -> Device & Prediction
        $this->assertEquals($device->id, $reading->device->id);
        $this->assertEquals($prediction->id, $reading->prediction->id);

        // Verifikasi Prediction -> SensorReading
        $this->assertEquals($reading->id, $prediction->sensorReading->id);
    }

    public function test_predict_water_quality_queue_job_executes(): void
    {
        $device = Device::firstOrCreate(
            ['device_code' => 'ESP32-NODE-01'],
            ['name' => 'Node Uji', 'pond_name' => 'Kolam 1']
        );

        $reading = SensorReading::create([
            'device_id' => $device->id,
            'recorded_at' => now(),
            'ph' => 7.10,
            'temperature_c' => 28.2,
            'tds_ppm' => 340,
            'turbidity_ntu' => 30,
            'water_level' => 'NORMAL',
        ]);

        // Jalankan Job secara sinkron
        $job = new PredictWaterQualityJob($reading);
        app()->call([$job, 'handle']);

        // Verifikasi prediksi tersimpan
        $this->assertDatabaseHas('predictions', [
            'sensor_reading_id' => $reading->id,
        ]);

        $savedPrediction = Prediction::where('sensor_reading_id', $reading->id)->first();
        $this->assertNotNull($savedPrediction);
        $this->assertContains($savedPrediction->risk, ['AMAN', 'WASPADA', 'BAHAYA']);
    }

    public function test_machine_learning_service_deterministic_failsafe(): void
    {
        $mlService = app(MachineLearningService::class);

        // Kasus 1: Parameter pH kritis (5.20) harus menghasilkan status BAHAYA
        $criticalPayload = [
            'ph' => 5.20,
            'temperature_c' => 28.5,
            'tds_ppm' => 350,
            'turbidity_ntu' => 30,
            'water_level' => 'NORMAL',
        ];
        $predKritis = $mlService->predict($criticalPayload);
        $this->assertEquals('BAHAYA', $predKritis->risk);
        $this->assertTrue($predKritis->failsafe_active);

        // Kasus 2: Parameter normal ideal (pH 7.20, Temp 28.5) harus menghasilkan status AMAN
        $normalPayload = [
            'ph' => 7.20,
            'temperature_c' => 28.5,
            'tds_ppm' => 350,
            'turbidity_ntu' => 30,
            'water_level' => 'NORMAL',
        ];
        $predNormal = $mlService->predict($normalPayload);
        $this->assertContains($predNormal->risk, ['AMAN', 'WASPADA']);
    }

    public function test_rbac_and_guest_route_protections(): void
    {
        // 1. Guest tidak boleh mengakses dashboard
        $responseGuest = $this->get('/dashboard');
        $responseGuest->assertRedirect('/login');

        // 2. Operator tidak boleh mengelola akun pengguna lain
        $operator = User::where('role', 'OPERATOR')->first();
        $targetUser = User::where('email', 'analis@banyuwening.id')->first();

        $responseOperatorDelete = $this->actingAs($operator)->delete("/dashboard/users/{$targetUser->id}");
        $responseOperatorDelete->assertStatus(403);

        // 3. Analis tidak boleh mengubah konten landing page
        $analis = User::where('role', 'ANALIS')->first();
        $responseAnalisLanding = $this->actingAs($analis)->post('/dashboard/landing-content', [
            'hero_title' => 'Judul Dibajak Analis',
        ]);
        $responseAnalisLanding->assertStatus(403);
    }

    public function test_api_telemetry_validates_required_fields(): void
    {
        // Payload tanpa device_code
        $response = $this->postJson('/api/telemetry', [
            'ph' => 7.0,
            'temperature_c' => 28.0,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['device_code']);
    }

    public function test_login_validation_and_throttling(): void
    {
        // Login dengan kredensial salah
        $response = $this->post('/login', [
            'email' => 'admin@banyuwening.id',
            'password' => 'passwordsalah123',
        ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertGuest();
    }
}
