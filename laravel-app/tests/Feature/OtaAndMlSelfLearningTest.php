<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\FirmwareRelease;
use App\Models\MlModelVersion;
use App\Models\SensorReading;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class OtaAndMlSelfLearningTest extends TestCase
{
    use RefreshDatabase;

    private ?string $backupModelBytes = null;
    private ?string $backupCardBytes = null;
    private array $existingVersionFiles = [];
    private array $existingFirmwareFiles = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $modelPath = base_path('../ml/models/random_forest_water_quality.joblib');
        $cardPath = base_path('../ml/models/model_card.json');
        $this->backupModelBytes = is_file($modelPath) ? (string) file_get_contents($modelPath) : null;
        $this->backupCardBytes = is_file($cardPath) ? (string) file_get_contents($cardPath) : null;

        $versionsDir = base_path('../ml/models/versions');
        if (is_dir($versionsDir)) {
            $this->existingVersionFiles = glob($versionsDir . '/*') ?: [];
        }

        $fwDir = storage_path('app/private/firmware');
        if (is_dir($fwDir)) {
            $this->existingFirmwareFiles = glob($fwDir . '/*') ?: [];
        }
    }

    protected function tearDown(): void
    {
        $modelPath = base_path('../ml/models/random_forest_water_quality.joblib');
        $cardPath = base_path('../ml/models/model_card.json');
        if ($this->backupModelBytes !== null) {
            @file_put_contents($modelPath, $this->backupModelBytes);
        }
        if ($this->backupCardBytes !== null) {
            @file_put_contents($cardPath, $this->backupCardBytes);
        }

        $versionsDir = base_path('../ml/models/versions');
        if (is_dir($versionsDir)) {
            foreach (glob($versionsDir . '/*') ?: [] as $file) {
                if (!in_array($file, $this->existingVersionFiles, true) && is_file($file)) {
                    @unlink($file);
                }
            }
        }

        $fwDir = storage_path('app/private/firmware');
        if (is_dir($fwDir)) {
            foreach (glob($fwDir . '/*') ?: [] as $file) {
                if (!in_array($file, $this->existingFirmwareFiles, true) && is_file($file)) {
                    @unlink($file);
                }
            }
        }

        parent::tearDown();
    }

    public function test_rbac_blocks_non_admin_and_guest_from_ota_and_ml_admin_endpoints(): void
    {
        $this->get('/dashboard/ota/overview')->assertRedirect('/login');
        $this->getJson('/dashboard/ml/overview')->assertStatus(401);

        $operator = User::where('role', 'OPERATOR')->firstOrFail();
        $analis = User::where('role', 'ANALIS')->firstOrFail();
        $pemilik = User::where('role', 'PEMILIK')->firstOrFail();

        foreach ([$operator, $analis, $pemilik] as $nonAdmin) {
            $this->actingAs($nonAdmin)->getJson('/dashboard/ota/overview')->assertStatus(403);
            $this->actingAs($nonAdmin)->postJson('/dashboard/ota/releases', [])->assertStatus(403);
            $this->actingAs($nonAdmin)->postJson('/dashboard/ota/rollout', [])->assertStatus(403);
            $this->actingAs($nonAdmin)->getJson('/dashboard/ml/overview')->assertStatus(403);
            $this->actingAs($nonAdmin)->postJson('/dashboard/ml/evaluate')->assertStatus(403);
            $this->actingAs($nonAdmin)->postJson('/dashboard/ml/agent/run')->assertStatus(403);
            $this->actingAs($nonAdmin)->postJson('/dashboard/ml/agent/config', [])->assertStatus(403);
        }

        // Operator tidak menerima otaOverview / mlOverview pada props Dashboard
        $this->actingAs($operator)->get('/dashboard')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('otaOverview', null)
                ->where('mlOverview', null)
            );
    }

    public function test_dual_ota_release_rollout_download_completed_and_rollback_cycle(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $device = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $token = $device->issueToken();

        // 1. Tanpa token perangkat -> 401
        $this->getJson('/api/http/ota/check')->assertStatus(401);
        $this->postJson('/api/http/ota/status', ['status' => 'COMPLETED'])->assertStatus(401);

        // 2. Super Admin upload binary firmware .bin
        $binaryBytes = str_repeat("ESP32_BW_FIRMWARE_V150_", 64);
        $fakeFile = UploadedFile::fake()->createWithContent('banyuwening_v1.5.0.bin', $binaryBytes);

        $upload = $this->actingAs($admin)->post('/dashboard/ota/releases', [
            'version' => 'v1.5.0-ota',
            'channel' => 'stable',
            'target_hardware' => 'ESP32-WROOM-CoreHub-v2',
            'rollback_timeout_s' => 60,
            'changelog' => 'Dukungan protokol banyuwening.ota.v1',
            'is_mandatory' => true,
            'firmware_file' => $fakeFile,
        ], ['Accept' => 'application/json']);

        $upload->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('release.version', 'v1.5.0-ota')
            ->assertJsonPath('release.sha256_checksum', hash('sha256', $binaryBytes));

        $releaseId = $upload->json('release.id');
        $expectedSha = hash('sha256', $binaryBytes);
        $expectedHmac = FirmwareRelease::computeSignature('v1.5.0-ota', $expectedSha, strlen($binaryBytes), null);
        $this->assertEquals($expectedHmac, $upload->json('release.hmac_signature'));

        // 3. Super Admin trigger rollout
        $rolloutRes = $this->actingAs($admin)->postJson('/dashboard/ota/rollout', [
            'release_id' => $releaseId,
            'device_ids' => [$device->id],
        ]);
        $rolloutRes->assertStatus(201);
        $rolloutId = $rolloutRes->json('rollouts.0.id');

        // 4. Device cek update via HTTP fallback
        $check = $this->withToken($token)->getJson('/api/http/ota/check');
        $check->assertStatus(200)
            ->assertJsonPath('update_available', true)
            ->assertJsonPath('manifest.version', 'v1.5.0-ota')
            ->assertJsonPath('manifest.sha256', $expectedSha)
            ->assertJsonPath('manifest.signature_hmac_sha256', $expectedHmac);

        // 5. Device unduh binary & verifikasi header integritas
        $dl = $this->withToken($token)->get('/api/http/ota/download/v1.5.0-ota');
        $dl->assertStatus(200)
            ->assertHeader('X-Firmware-Version', 'v1.5.0-ota')
            ->assertHeader('X-Firmware-Sha256', $expectedSha)
            ->assertHeader('X-Firmware-Signature', $expectedHmac);
        $downloadedPath = $dl->baseResponse->getFile()->getPathname();
        $this->assertSame($binaryBytes, file_get_contents($downloadedPath));

        // 6. Device laporkan progres & boot health OK -> firmware_version diperbarui
        $this->withToken($token)->postJson('/api/http/ota/status', [
            'rollout_id' => $rolloutId,
            'status' => 'DOWNLOADING',
            'progress_pct' => 50,
            'active_partition' => 'ota_1',
        ])->assertStatus(200)->assertJsonPath('rollout.progress_pct', 50);

        $this->withToken($token)->postJson('/api/http/ota/status', [
            'rollout_id' => $rolloutId,
            'status' => 'COMPLETED',
            'progress_pct' => 100,
            'active_partition' => 'ota_1',
            'boot_health_ok' => true,
        ])->assertStatus(200)
            ->assertJsonPath('firmware_version', 'v1.5.0-ota')
            ->assertJsonPath('rollout.status', 'COMPLETED');

        $this->assertEquals('v1.5.0-ota', $device->fresh()->firmware_version);

        // 7. Skenario rollback: rilis v1.5.1 gagal health check -> versi tetap v1.5.0-ota
        $badFile = UploadedFile::fake()->createWithContent('banyuwening_v1.5.1.bin', 'BAD_BIN_IMAGE');
        $badUpload = $this->actingAs($admin)->post('/dashboard/ota/releases', [
            'version' => 'v1.5.1-beta',
            'channel' => 'beta',
            'firmware_file' => $badFile,
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $badRollout = $this->actingAs($admin)->postJson('/dashboard/ota/rollout', [
            'release_id' => $badUpload->json('release.id'),
            'device_ids' => [$device->id],
        ])->assertStatus(201);

        $this->withToken($token)->postJson('/api/http/ota/status', [
            'rollout_id' => $badRollout->json('rollouts.0.id'),
            'status' => 'ROLLED_BACK',
            'progress_pct' => 0,
            'active_partition' => 'ota_0',
            'boot_health_ok' => false,
            'error_message' => 'Health check 60s gagal',
        ])->assertStatus(200)
            ->assertJsonPath('firmware_version', 'v1.5.0-ota')
            ->assertJsonPath('rollout.status', 'ROLLED_BACK');
    }

    public function test_random_forest_api_endpoints_and_performance_metrics(): void
    {
        $device = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $token = $device->issueToken();

        $this->getJson('/api/ml/status')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'active_model' => ['version', 'algorithm', 'accuracy', 'macro_f1'],
                'agent_config' => ['auto_learning_enabled', 'promotion_mode'],
            ]);

        // Tanpa token ditolak 401
        $this->postJson('/api/ml/predict', ['ph' => 7.2, 'temperature_c' => 28.0])
            ->assertStatus(401);

        // Inferensi tunggal on-demand
        $predRes = $this->withToken($token)->postJson('/api/ml/predict', [
            'ph' => 5.65,
            'temperature_c' => 34.0,
            'tds_ppm' => 840,
            'turbidity_ntu' => 140,
            'water_level' => 'LOW',
            'persist' => true,
        ]);
        $predRes->assertStatus(200)
            ->assertJsonPath('prediction.risk', 'BAHAYA')
            ->assertJsonPath('prediction.source', 'API_ON_DEMAND');
        $this->assertNotNull($predRes->json('prediction.latency_ms'));

        // Inferensi batch
        $batchRes = $this->withToken($token)->postJson('/api/ml/predict/batch', [
            'persist' => false,
            'readings' => [
                ['ph' => 7.15, 'temperature_c' => 28.4, 'tds_ppm' => 350, 'turbidity_ntu' => 35, 'water_level' => 'NORMAL'],
                ['ph' => 5.80, 'temperature_c' => 33.6, 'tds_ppm' => 810, 'turbidity_ntu' => 130, 'water_level' => 'NORMAL'],
            ],
        ]);
        $batchRes->assertStatus(200)
            ->assertJsonPath('count', 2)
            ->assertJsonPath('predictions.1.risk', 'BAHAYA');

        $this->getJson('/api/ml/predictions?limit=10')
            ->assertStatus(200)
            ->assertJsonPath('count', 1);

        $this->getJson('/api/ml/predictions/latest')
            ->assertStatus(200)
            ->assertJsonPath('prediction.risk', 'BAHAYA');

        $this->getJson('/api/ml/performance?hours=24')
            ->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'performance' => [
                    'kpi' => ['active_version', 'accuracy', 'macro_f1', 'avg_latency_ms', 'p95_latency_ms', 'total_predictions'],
                    'traffic_series',
                    'evaluation_trend',
                    'confusion_matrix',
                    'feature_importances',
                    'model_versions',
                    'agent_runs',
                    'agent_config',
                ],
            ]);
    }

    public function test_ai_agent_auto_evaluate_self_learn_and_one_click_rollback(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $device = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();

        SensorReading::create([
            'device_id' => $device->id,
            'recorded_at' => now()->subMinutes(5),
            'ph' => 7.18,
            'temperature_c' => 28.3,
            'tds_ppm' => 348,
            'turbidity_ntu' => 34,
            'water_level' => 'NORMAL',
        ]);

        // 1. Auto-Evaluasi
        $eval = $this->actingAs($admin)->postJson('/dashboard/ml/evaluate');
        $eval->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('run.run_type', 'AUTO_EVALUATE');
        $baselineVersion = $eval->json('overview.kpi.active_version');

        // 2. Simpan konfigurasi agen
        $this->actingAs($admin)->postJson('/dashboard/ml/agent/config', [
            'auto_learning_enabled' => true,
            'promotion_mode' => 'AUTO_PROMOTE',
            'min_f1_threshold' => 0.90,
            'max_drift_threshold' => 0.25,
            'min_new_samples' => 10,
            'schedule_interval_hours' => 6,
            'llm_advisor_enabled' => false,
        ])->assertStatus(200)->assertJsonPath('overview.agent_config.promotion_mode', 'AUTO_PROMOTE');

        // 3. Jalankan Self-Learning (force_retrain=true) -> kandidat baru terlatih & terpromosi
        $learn = $this->actingAs($admin)->postJson('/dashboard/ml/agent/run', [
            'force_retrain' => true,
        ]);
        $learn->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('run.decision', 'PROMOTED_NEW_MODEL');

        $baseline = MlModelVersion::where('version', $baselineVersion)->firstOrFail();
        $this->assertFalse((bool) $baseline->is_active);

        // 4. 1-Klik Rollback kembali ke versi baseline awal
        $rollback = $this->actingAs($admin)->postJson("/dashboard/ml/models/{$baseline->id}/promote");
        $rollback->assertStatus(200)
            ->assertJsonPath('overview.kpi.active_version', $baselineVersion);
        $this->assertTrue((bool) $baseline->fresh()->is_active);
    }

    public function test_openapi_and_asyncapi_specs_and_admin_dashboard_props(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();

        $openapi = $this->getJson('/api/docs/openapi.json');
        $openapi->assertStatus(200)
            ->assertJsonStructure([
                'paths' => [
                    '/api/http/ota/check',
                    '/api/http/ota/download/{version}',
                    '/api/http/ota/status',
                    '/api/ml/status',
                    '/api/ml/predict',
                    '/api/ml/predict/batch',
                    '/api/ml/predictions',
                    '/api/ml/predictions/latest',
                    '/api/ml/performance',
                ],
            ]);
        $openapi->assertDontSee('ws://host:8081', false);

        $asyncapi = $this->getJson('/api/docs/asyncapi.json');
        $asyncapi->assertStatus(200)
            ->assertJsonPath('channels.ota.address', '/ws/ota')
            ->assertJsonStructure([
                'channels' => ['telemetry', 'control', 'alerts', 'heartbeat', 'ota', 'dashboardStream'],
                'operations' => ['receiveOtaManifest', 'sendOtaStatus'],
            ]);

        $this->actingAs($admin)->get('/dashboard')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('otaOverview')
                ->has('mlOverview')
            );
    }

    public function test_super_admin_can_customize_and_enforce_per_user_permissions(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $operator = User::where('email', 'operator@banyuwening.id')->firstOrFail();
        $pemilik = User::where('email', 'pemilik@banyuwening.id')->firstOrFail();

        $alert = \App\Models\Alert::create([
            'device_id' => Device::where('device_code', 'ESP32-NODE-01')->firstOrFail()->id,
            'level' => 'WASPADA',
            'parameter' => 'ph',
            'message' => 'Uji coba alert hak akses',
            'value' => 6.3,
        ]);

        // 1. Default permissions: OPERATOR bisa kontrol aerator tapi ditolak backup, PEMILIK ditolak aerator & ack
        $this->actingAs($operator)->post('/dashboard/backups/create')->assertStatus(403);
        $this->actingAs($pemilik)->post('/dashboard/aerator', ['action' => 'ON', 'duration_minutes' => 10])->assertStatus(403);
        $this->actingAs($pemilik)->post("/dashboard/alerts/{$alert->id}/ack")->assertStatus(403);

        // 2. Super Admin memberi izin kustom control_aerator & ack_alerts kepada PEMILIK
        $this->actingAs($admin)
            ->postJson("/dashboard/users/{$pemilik->id}/permissions", [
                'permissions' => [
                    'control_aerator' => true,
                    'ack_alerts' => true,
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.has_custom_permissions', true)
            ->assertJsonPath('user.permissions.control_aerator', true)
            ->assertJsonPath('user.permissions.ack_alerts', true);

        // PEMILIK kini bisa kendali aerator & acknowledge alert
        $this->actingAs($pemilik->fresh())->post('/dashboard/aerator', ['action' => 'ON', 'duration_minutes' => 15])->assertStatus(302);
        $this->actingAs($pemilik->fresh())->post("/dashboard/alerts/{$alert->id}/ack")->assertStatus(302);

        // 3. Super Admin mencabut control_aerator dari OPERATOR & memberi izin view_docs_api ke OPERATOR
        $this->actingAs($admin)
            ->postJson("/dashboard/users/{$operator->id}/permissions", [
                'permissions' => [
                    'control_aerator' => false,
                    'view_docs_api' => true,
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('user.permissions.control_aerator', false)
            ->assertJsonPath('user.permissions.view_docs_api', true);

        $this->actingAs($operator->fresh())->post('/dashboard/aerator', ['action' => 'OFF', 'duration_minutes' => 5])->assertStatus(403);
        $this->actingAs($operator->fresh())->getJson('/dashboard/ml/overview')->assertStatus(200);

        // 4. Reset ke default role
        $this->actingAs($admin)
            ->postJson("/dashboard/users/{$pemilik->id}/permissions", ['reset' => true])
            ->assertStatus(200)
            ->assertJsonPath('user.has_custom_permissions', false)
            ->assertJsonPath('user.permissions.control_aerator', false);

        $this->actingAs($pemilik->fresh())->post('/dashboard/aerator', ['action' => 'ON', 'duration_minutes' => 10])->assertStatus(403);
    }

    public function test_per_device_ota_token_access_compatibility_and_simulator_scenarios(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $devPrimary = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $tokenPrimary = $devPrimary->issueToken();

        // Buat perangkat kedua dengan profil hardware berbeda
        $devEntry = Device::create([
            'device_code' => 'ESP32-ENTRY-02',
            'name' => 'Node Kolam Entry 02',
            'pond_name' => 'Kolam Terpal 02',
            'firmware_version' => 'v1.2.0-entry',
            'hardware_profile' => 'ESP32-WROOM-Entry1K-v1',
            'mqtt_topic' => 'banyuwening/esp32-entry-02/telemetry',
            'status' => 'ONLINE',
            'mode' => 'AUTO',
            'aerator_on' => false,
        ]);
        $tokenEntry = $devEntry->issueToken();

        // 1. Buat sampel rilis khusus ESP32-WROOM-CoreHub-v2 dan hanya beri izin ke $devPrimary
        $sampleRes = $this->actingAs($admin)->postJson('/dashboard/ota/releases/sample', [
            'version' => 'v1.6.0-corehub-sim',
            'channel' => 'beta',
            'target_hardware' => 'ESP32-WROOM-CoreHub-v2',
            'min_previous_version' => 'v1.4.0',
            'allowed_device_ids' => [$devPrimary->id],
        ]);
        $sampleRes->assertStatus(201)->assertJsonPath('release.version', 'v1.6.0-corehub-sim');
        $releaseId = $sampleRes->json('release.id');

        // 2. Perangkat kedua ($devEntry) dengan token sendiri DITOLAK (403) mengunduh rilis yang bukan haknya
        $this->withToken($tokenEntry)
            ->getJson('/api/http/ota/download/v1.6.0-corehub-sim')
            ->assertStatus(403)
            ->assertJsonPath('error', 'FIRMWARE_ACCESS_DENIED_FOR_DEVICE');

        // 3. Rollout ke $devEntry juga DITOLAK (422) karena hardware_profile tidak cocok
        $this->actingAs($admin)->postJson('/dashboard/ota/rollout', [
            'release_id' => $releaseId,
            'device_ids' => [$devEntry->id],
        ])->assertStatus(422)->assertJsonPath('error', 'OTA_DEVICE_INCOMPATIBLE');

        // 4. Meskipun $devEntry dipaksakan masuk allowed_device_ids, download tetap DITOLAK (422) karena incompat hardware/min_version
        $this->actingAs($admin)->postJson("/dashboard/ota/releases/{$releaseId}/access", [
            'allowed_device_ids' => [$devPrimary->id, $devEntry->id],
        ])->assertStatus(200);

        $this->withToken($tokenEntry)
            ->getJson('/api/http/ota/download/v1.6.0-corehub-sim')
            ->assertStatus(422)
            ->assertJsonPath('error', 'FIRMWARE_INCOMPATIBLE_WITH_DEVICE');

        // 5. Jalankan semua 4 skenario Simulator OTA via endpoint /dashboard/ota/simulate
        // 5a. INCOMPATIBLE_BLOCKED pada $devEntry -> passed=true, http_status=422
        $this->actingAs($admin)->postJson('/dashboard/ota/simulate', [
            'device_id' => $devEntry->id,
            'release_id' => $releaseId,
            'scenario' => 'INCOMPATIBLE_BLOCKED',
        ])->assertStatus(200)
            ->assertJsonPath('simulation.passed', true)
            ->assertJsonPath('simulation.http_status', 422);

        // 5b. CHECKSUM_TAMPERED pada $devPrimary -> dibatalkan, versi tetap v1.4.2-failsafe
        $this->actingAs($admin)->postJson('/dashboard/ota/simulate', [
            'device_id' => $devPrimary->id,
            'release_id' => $releaseId,
            'scenario' => 'CHECKSUM_TAMPERED',
        ])->assertStatus(200)
            ->assertJsonPath('simulation.passed', true)
            ->assertJsonPath('simulation.active_partition', 'ota_0')
            ->assertJsonPath('simulation.final_device_version', 'v1.4.2-failsafe');

        // 5c. WATCHDOG_ROLLBACK_60S pada $devPrimary -> rollback otomatis ke ota_0
        $this->actingAs($admin)->postJson('/dashboard/ota/simulate', [
            'device_id' => $devPrimary->id,
            'release_id' => $releaseId,
            'scenario' => 'WATCHDOG_ROLLBACK_60S',
        ])->assertStatus(200)
            ->assertJsonPath('simulation.passed', true)
            ->assertJsonPath('simulation.active_partition', 'ota_0')
            ->assertJsonPath('simulation.final_device_version', 'v1.4.2-failsafe');

        // 5d. NORMAL_SUCCESS pada $devPrimary -> sukses upgrade ke v1.6.0-corehub-sim (ota_1)
        $this->actingAs($admin)->postJson('/dashboard/ota/simulate', [
            'device_id' => $devPrimary->id,
            'release_id' => $releaseId,
            'scenario' => 'NORMAL_SUCCESS',
        ])->assertStatus(200)
            ->assertJsonPath('simulation.passed', true)
            ->assertJsonPath('simulation.active_partition', 'ota_1')
            ->assertJsonPath('simulation.final_device_version', 'v1.6.0-corehub-sim');

        $this->assertEquals('v1.6.0-corehub-sim', $devPrimary->fresh()->firmware_version);
    }

    public function test_multi_tenant_isolation_device_assignment_and_farmer_self_ota(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();

        // 1. Buat dua akun peternak pada tenant terpisah (seperti toko Shopee masing-masing)
        $farmerA = User::create([
            'name' => 'Petambak Andi',
            'email' => 'andi@tambak-a.id',
            'password' => \Illuminate\Support\Facades\Hash::make('secret123'),
            'role' => 'PEMILIK',
            'pond_name' => 'Tambak Andi A1',
            'tenant_code' => 'TENANT-ANDI',
            'avatar_initials' => 'PA',
        ]);

        $farmerB = User::create([
            'name' => 'Petambak Budi',
            'email' => 'budi@tambak-b.id',
            'password' => \Illuminate\Support\Facades\Hash::make('secret123'),
            'role' => 'OPERATOR',
            'pond_name' => 'Tambak Budi B1',
            'tenant_code' => 'TENANT-BUDI',
            'avatar_initials' => 'PB',
        ]);

        // 2. Super Admin mendaftarkan 2 alat baru terpisah + langsung assign ke peternak masing-masing & izinkan Self-OTA
        $createA = $this->actingAs($admin)->postJson('/dashboard/devices', [
            'device_code' => 'ESP32-ANDI-01',
            'name' => 'Node Kolam Andi',
            'pond_name' => 'Kolam Bioflok Andi',
            'hardware_profile' => 'ESP32-WROOM-CoreHub-v2',
            'tenant_code' => 'TENANT-ANDI',
            'owner_user_id' => $farmerA->id,
            'assigned_user_ids' => [$farmerA->id],
            'grant_ota_permission' => true,
        ]);
        $createA->assertStatus(201)->assertJsonPath('device.tenant_code', 'TENANT-ANDI');
        $devA = Device::findOrFail($createA->json('device.id'));
        $tokenA = $createA->json('plain_token');

        $createB = $this->actingAs($admin)->postJson('/dashboard/devices', [
            'device_code' => 'ESP32-BUDI-01',
            'name' => 'Node Kolam Budi',
            'pond_name' => 'Kolam Terpal Budi',
            'hardware_profile' => 'ESP32-S3-Juragan4K-v2',
            'tenant_code' => 'TENANT-BUDI',
            'owner_user_id' => $farmerB->id,
            'assigned_user_ids' => [$farmerB->id],
            'grant_ota_permission' => true,
        ]);
        $createB->assertStatus(201)->assertJsonPath('device.tenant_code', 'TENANT-BUDI');
        $devB = Device::findOrFail($createB->json('device.id'));
        $tokenB = $createB->json('plain_token');

        // 3. Masing-masing alat mengirim telemetri fisik berbeda (pH 7.45 untuk Andi, pH 5.80 BAHAYA untuk Budi)
        $this->withToken($tokenA)->postJson('/api/http/telemetry', [
            'device_code' => 'ESP32-ANDI-01',
            'ph' => 7.45,
            'temperature_c' => 28.2,
            'tds_ppm' => 320,
            'turbidity_ntu' => 25,
        ])->assertStatus(201);

        $this->withToken($tokenB)->postJson('/api/http/telemetry', [
            'device_code' => 'ESP32-BUDI-01',
            'ph' => 5.80,
            'temperature_c' => 33.6,
            'tds_ppm' => 810,
            'turbidity_ntu' => 115,
        ])->assertStatus(201);

        // 4. Isolasi Data Tenant: Petambak Andi hanya melihat ESP32-ANDI-01 (pH 7.45) dan TIDAK melihat data Budi
        $this->flushHeaders();
        $this->actingAs($farmerA->fresh())->get('/dashboard')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->where('activeDeviceCode', 'ESP32-ANDI-01')
                ->where('currentReading.ph', 7.45)
                ->has('tenantDevices', 1)
                ->where('tenantDevices.0.device_code', 'ESP32-ANDI-01')
            );

        $this->actingAs($farmerA->fresh())->getJson('/api/latest')
            ->assertStatus(200)
            ->assertJsonPath('device.device_code', 'ESP32-ANDI-01');

        // Andi mencoba mengakses data alat Budi via API -> DITOLAK 403
        $this->actingAs($farmerA->fresh())->getJson('/api/latest?device_code=ESP32-BUDI-01')
            ->assertStatus(403)
            ->assertJsonPath('error', 'TENANT_ACCESS_DENIED');

        $this->actingAs($farmerA->fresh())->getJson('/api/history?device_code=ESP32-BUDI-01')
            ->assertStatus(403);

        // Petambak Budi hanya melihat ESP32-BUDI-01 dan ditolak mengontrol aerator alat Andi (403)
        $this->actingAs($farmerB->fresh())->getJson('/dashboard/ota/overview')
            ->assertStatus(200)
            ->assertJsonCount(1, 'overview.devices')
            ->assertJsonPath('overview.devices.0.device_code', 'ESP32-BUDI-01');

        $this->actingAs($farmerB->fresh())->post('/dashboard/aerator', [
            'action' => 'ON',
            'duration_minutes' => 10,
            'device_code' => 'ESP32-ANDI-01',
        ])->assertStatus(403);

        // 5. Petambak Andi yang diberi izin update_device_firmware bisa update & simulasi alatnya sendiri
        $relA = $this->actingAs($admin)->postJson('/dashboard/ota/releases/sample', [
            'version' => 'v1.7.0-andi-self',
            'target_hardware' => 'ESP32-WROOM-CoreHub-v2',
            'allowed_device_ids' => [$devA->id],
        ])->assertStatus(201);
        $relAId = $relA->json('release.id');

        // Andi tidak bisa mem-push/simulasi OTA ke alat Budi -> DITOLAK 403
        $this->actingAs($farmerA->fresh())->postJson('/dashboard/ota/simulate', [
            'device_id' => $devB->id,
            'release_id' => $relAId,
            'scenario' => 'NORMAL_SUCCESS',
        ])->assertStatus(403)->assertJsonPath('error', 'TENANT_DEVICE_FORBIDDEN');

        // Andi melakukan simulasi & rollout mandiri pada alatnya sendiri (ESP32-ANDI-01) -> SUKSES
        $this->actingAs($farmerA->fresh())->postJson('/dashboard/ota/simulate', [
            'device_id' => $devA->id,
            'release_id' => $relAId,
            'scenario' => 'NORMAL_SUCCESS',
        ])->assertStatus(200)
            ->assertJsonPath('simulation.passed', true)
            ->assertJsonPath('simulation.final_device_version', 'v1.7.0-andi-self');

        // 6. Super Admin tetap bisa melihat seluruh tenant & semua alat sekaligus
        $this->actingAs($admin)->getJson('/dashboard/ota/overview')
            ->assertStatus(200)
            ->assertJsonCount(3, 'overview.devices');
    }

    public function test_admin_can_upload_ino_sketch_and_ai_agent_compiles_to_signed_bin(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $device = Device::where('device_code', 'ESP32-NODE-01')->firstOrFail();
        $token = $device->issueToken();

        $inoCode = <<<'INO'
#include <WiFi.h>
#include <HTTPClient.h>

void setup() {
  Serial.begin(115200);
}

void loop() {
  delay(5000);
}
INO;

        $inoFile = UploadedFile::fake()->createWithContent('banyuwening_sensor_v1.8.0.ino', $inoCode);

        $upload = $this->actingAs($admin)->post('/dashboard/ota/releases', [
            'version' => 'v1.8.0-ino',
            'channel' => 'beta',
            'target_hardware' => 'ESP32-WROOM-CoreHub-v2',
            'allowed_device_ids' => [$device->id],
            'firmware_file' => $inoFile,
        ], ['Accept' => 'application/json']);

        $upload->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('release.version', 'v1.8.0-ino')
            ->assertJsonPath('release.source_type', 'ino')
            ->assertJsonPath('release.compile_status', 'COMPILED')
            ->assertJsonPath('release.compile_log.has_setup', true)
            ->assertJsonPath('release.compile_log.has_loop', true)
            ->assertJsonPath('release.compile_log.fqbn', 'esp32:esp32:esp32');

        $dl = $this->withToken($token)->get('/api/http/ota/download/v1.8.0-ino');
        $dl->assertStatus(200)
            ->assertHeader('X-Firmware-Version', 'v1.8.0-ino');

        $maliciousIno = UploadedFile::fake()->createWithContent('evil.ino', "<?php system('id'); ?>");
        $this->actingAs($admin)->post('/dashboard/ota/releases', [
            'version' => 'v1.8.1-bad',
            'channel' => 'beta',
            'firmware_file' => $maliciousIno,
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }
}
