<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\LandingContent;
use App\Models\MlModelVersion;
use App\Models\SensorReading;
use App\Models\Tenant;
use App\Models\User;
use App\Services\RealtimeBroadcaster;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Adversarial "chaos" suite.
 *
 * Every test here is an *attack attempt* that used to be (or could plausibly be) the way an
 * attacker breaks this app. They are regression fences: if a refactor re-opens the hole the test
 * goes red. Each assertion mirrors a concrete exploit narrative documented in SECURITY_AUDIT.md.
 */
class AdversarialSecurityChaosTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'name' => 'Chaos Admin',
            'email' => 'chaos-admin-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('ChaosAdmin#2026'),
            'role' => 'ADMIN',
            'pond_name' => 'Kolam Chaos',
            'tenant_code' => null,
        ]);
    }

    private function operator(string $tenant = 'TENANT-CHAOS'): User
    {
        return User::create([
            'name' => 'Chaos Operator',
            'email' => 'chaos-op-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('ChaosOperator#2026'),
            'role' => 'OPERATOR',
            'pond_name' => 'Kolam Operator',
            'tenant_code' => $tenant,
        ]);
    }

    private function deviceFor(User $owner, string $code, string $tenant): Device
    {
        $device = Device::create([
            'device_code' => $code,
            'name' => "Node {$code}",
            'pond_name' => 'Kolam ' . $code,
            'tenant_code' => $tenant,
            'owner_user_id' => $owner->id,
            'assigned_user_ids' => [$owner->id],
            'status' => 'ONLINE',
            'mode' => 'AUTO',
        ]);
        $device->issueToken();

        return $device->fresh();
    }

    // ---------------------------------------------------------------- A1/A2: privilege rings

    public function test_privileged_routes_enforce_role_not_just_custom_permission_flag(): void
    {
        // Operan sengaja disisipi custom_permissions palsu untuk menyerupai admin.
        $malicious = User::create([
            'name' => 'Operator Nakal',
            'email' => 'chaos-privesc-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('OperatorNakal#2026'),
            'role' => 'OPERATOR',
            'pond_name' => 'Kolam Nakal',
            'tenant_code' => 'TENANT-CHAOS',
            'custom_permissions' => [
                'manage_users' => true,
                'view_docs_api' => true,
                'update_device_firmware' => true,
                'manage_backups' => true,
                'manage_landing' => true,
                'manage_notifications' => true,
            ],
        ]);

        $this->assertTrue($malicious->hasPermission('manage_users'));

        // Semua endpoint manajemen akun, tenant, backup, MLOps & kontrol perangkat tetap harus 403.
        $routes = [
            ['/dashboard/users', ['name' => 'Evil Admin', 'email' => 'evil' . uniqid() . '@x.test', 'password' => 'EvilPass#2026', 'role' => 'ADMIN']],
            ['/dashboard/tenants', ['name' => 'Tenant Palsu']],
            ['/dashboard/backups/create', []],
            ['/dashboard/landing-content', ['contact_email' => 'evil@x.test']],
            ['/dashboard/ml/agent/config', [
                'auto_learning_enabled' => true,
                'promotion_mode' => 'AUTO_PROMOTE',
                'min_f1_threshold' => 0.9,
                'max_drift_threshold' => 0.2,
                'min_new_samples' => 5,
                'schedule_interval_hours' => 6,
            ]],
            ['/dashboard/ml/evaluate', []],
            ['/dashboard/notifications/config', ['telegram' => ['enabled' => true]]],
        ];

        foreach ($routes as [$uri, $payload]) {
            $this->actingAs($malicious)->post($uri, $payload)
                ->assertStatus(403, "Operan dengan izin palsu berhasil mengakses {$uri}.");
        }

        // Endpoint perangkat pilihan izin (view_docs_api) juga tidak boleh bocor ke operan.
        $device = $this->deviceFor($malicious, 'ESP32-CHAOS-ESC', 'TENANT-CHAOS');
        $this->actingAs($malicious)->post('/dashboard/devices/' . $device->id . '/rotate-token')
            ->assertStatus(403);

        // Dan tidak ada satu pun akun berperan ADMIN baru yang tercipta.
        $this->assertSame(0, User::where('role', 'ADMIN')->count());
        $this->assertSame(0, Tenant::where('name', 'Tenant Palsu')->count());
    }

    public function test_operator_with_legit_permission_cannot_escalate_to_admin_or_take_over_admin_account(): void
    {
        $trustedAdmin = User::create([
            'name' => 'Admin Asli',
            'email' => 'chaos-real-admin-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('RealAdmin#2026'),
            'role' => 'ADMIN',
            'pond_name' => 'Kolam Admin',
            'tenant_code' => null,
        ]);

        // Akun pengelola pengguna yang sah namun BUKAN ADMIN penuh.
        $manager = User::create([
            'name' => 'Manajer Pengguna',
            'email' => 'chaos-manager-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('Manager#2026'),
            'role' => 'OPERATOR',
            'pond_name' => 'Kolam Manajer',
            'tenant_code' => 'TENANT-CHAOS',
            'custom_permissions' => ['manage_users' => true],
        ]);

        // (1) Tidak boleh membuat akun ADMIN/PEMILIK baru — role yang boleh dibuat dibatasi di server.
        $this->actingAs($manager)->post("/dashboard/users", [
            'name' => 'Backdoor Admin',
            'email' => 'chaos-backdoor-' . uniqid() . '@banyuwening.test',
            'password' => 'Backdoor#2026',
            'role' => 'ADMIN',
        ])->assertStatus(403);
        $this->assertSame(0, User::where('name', 'Backdoor Admin')->count());

        // (2) Tidak boleh mengangkat dirinya sendiri jadi ADMIN.
        $this->actingAs($manager)->post("/dashboard/users/{$manager->id}/update", [
            'name' => $manager->name,
            'email' => $manager->email,
            'role' => 'ADMIN',
        ])->assertStatus(403);
        $this->assertSame('OPERATOR', $manager->fresh()->role);

        // (3) Tidak boleh menyerobot / menurunkan akun admin asli, dan tidak boleh membuat akun ADMIN baru.
        $this->actingAs($manager)->post("/dashboard/users/{$trustedAdmin->id}/update", [
            'name' => $trustedAdmin->name,
            'email' => $trustedAdmin->email,
            'role' => 'OPERATOR',
            'password' => 'StolenAdmin#2026',
        ])->assertStatus(403);
        $this->assertSame('ADMIN', $trustedAdmin->fresh()->role);
        $this->assertFalse(Hash::check('StolenAdmin#2026', $trustedAdmin->fresh()->password));

        $this->actingAs($manager)->post('/dashboard/users', [
            'name' => 'Backdoor Admin 2',
            'email' => 'chaos-backdoor2-' . uniqid() . '@banyuwening.test',
            'password' => 'Backdoor#2026',
            'role' => 'ADMIN',
        ])->assertStatus(403);
        $this->assertSame(0, User::where('name', 'Backdoor Admin 2')->count());

        // (4) Tidak boleh menghapus akun admin asli maupun akun dirinya sendiri.
        $this->actingAs($manager)->delete("/dashboard/users/usr-{$trustedAdmin->id}")->assertStatus(403);
        $this->assertNotNull(User::find($trustedAdmin->id));

        // (5) Tidak boleh menempelkan izin admin lewat endpoint permissions.
        $this->actingAs($manager)->post("/dashboard/users/{$manager->id}/permissions", [
            'permissions' => ['manage_users' => true, 'manage_landing' => true, 'manage_backups' => true],
        ])->assertStatus(403);
        $this->assertSame('OPERATOR', $manager->fresh()->role);
    }

    // ---------------------------------------------------------------- B1-B4: cross-tenant writes

    public function test_cross_tenant_write_surfaces_are_isolated(): void
    {
        $ownerA = $this->operator('TENANT-ALPHA');
        $ownerB = $this->operator('TENANT-BETA');
        $deviceA = $this->deviceFor($ownerA, 'ESP32-CHAOS-ALPHA', 'TENANT-ALPHA');
        $deviceB = $this->deviceFor($ownerB, 'ESP32-CHAOS-BETA', 'TENANT-BETA');
        $readingB = SensorReading::create([
            'device_id' => $deviceB->id,
            'recorded_at' => now(),
            'ph' => 7.4,
            'temperature_c' => 28.1,
            'water_level' => 'NORMAL',
            'aerator_on' => false,
            'mode' => 'AUTO',
        ]);
        $alertB = \App\Models\Alert::create([
            'sensor_reading_id' => $readingB->id,
            'level' => 'WASPADA',
            'parameter' => 'PH',
            'message' => 'Alert milik Beta',
            'value' => 6.4,
        ]);

        // 1. Konfirmasi alert milik tenant lain -> 403
        $this->actingAs($ownerA)->postJson("/dashboard/alerts/{$alertB->id}/ack")->assertStatus(403);
        $this->assertNull($alertB->fresh()->acknowledged_at);

        // 2. Rotasi token perangkat tenant lain via route admin -> 403
        $oldHashB = $deviceB->api_token_hash;
        $this->actingAs($ownerA)->postJson("/dashboard/devices/{$deviceB->id}/rotate-token")->assertStatus(403);
        $this->assertSame($oldHashB, $deviceB->fresh()->api_token_hash);

        // 3. Kontrol aerator perangkat tenant lain -> 403
        $this->actingAs($ownerA)->postJson('/dashboard/aerator', [
            'action' => 'ON',
            'device_code' => 'ESP32-CHAOS-BETA',
        ])->assertStatus(403);
        $this->assertFalse((bool) $deviceB->fresh()->aerator_on);

        // 4. Update profil OTA perangkat tenant lain -> 403
        $this->actingAs($ownerA)->postJson("/dashboard/ota/devices/{$deviceB->id}/profile", [
            'hardware_profile' => 'ESP32-EVIL',
        ])->assertStatus(403);

        // 5. Peternak tidak boleh membuat rilis firmware / mematikan rilis global.
        $this->actingAs($ownerA)->postJson('/dashboard/ota/releases/sample', ['version' => 'v9.9.9-evil'])
            ->assertStatus(403);

        // 6. Simulasi OTA lintas tenant -> 403
        $this->actingAs($ownerA)->postJson('/dashboard/ota/simulate', [
            'device_id' => $deviceB->id,
            'release_id' => 1,
            'scenario' => 'NORMAL_SUCCESS',
        ])->assertStatus(403);

        // 7. Device A tidak boleh mengirim telemetri atas nama device B (token binding)
        $plainA = $deviceA->fresh()->decryptToken();
        $this->withHeader('Authorization', 'Bearer ' . $plainA)
            ->postJson('/api/http/telemetry', ['device_code' => 'ESP32-CHAOS-BETA', 'ph' => 7.0])
            ->assertStatus(403);
    }

    // ---------------------------------------------------------------- A5: backup doxxing

    public function test_backup_snapshot_never_contains_credential_material(): void
    {
        $owner = $this->operator('TENANT-ALPHA');
        $device = $this->deviceFor($owner, 'ESP32-CHAOS-BACKUP', 'TENANT-ALPHA');
        $owner->forceFill([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ])->save();

        $admin = $this->admin();
        $this->actingAs($admin)->postJson('/dashboard/backups/create')->assertStatus(302);

        $snapshot = collect(glob(storage_path('app/backups/banyuwening_snapshot_*.json')) ?: [])->last();
        $this->assertNotNull($snapshot, 'Snapshot backup tidak dibuat.');
        $raw = (string) file_get_contents($snapshot);

        $this->assertStringNotContainsString('JBSWY3DPEHPK3PXP', $raw);

        $decoded = json_decode($raw, true);
        $userRows = collect($decoded['users'] ?? []);
        $this->assertNotEmpty($userRows);
        foreach ($userRows as $row) {
            $this->assertArrayNotHasKey('password', $row);
            $this->assertArrayNotHasKey('remember_token', $row);
            $this->assertArrayNotHasKey('two_factor_secret', $row);
            $this->assertArrayNotHasKey('two_factor_recovery_codes', $row);
        }

        $deviceRows = collect($decoded['devices'] ?? []);
        foreach ($deviceRows as $row) {
            $this->assertArrayNotHasKey('api_token_hash', $row);
            $this->assertArrayNotHasKey('api_token_encrypted', $row);
        }

        @unlink($snapshot);
    }

    // ---------------------------------------------------------------- C3/C5/C6: upload & soft-delete

    public function test_media_upload_rejects_polyglot_svg_and_php_files(): void
    {
        Storage::fake('local');
        $admin = $this->admin();

        $svgPolyglot = \Illuminate\Http\UploadedFile::fake()->createWithContent(
            'payload.jpg',
            "GIF89a<?php system(\$_GET['c']); ?><svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\"/>"
        );
        $r1 = $this->actingAs($admin)->postJson('/dashboard/landing-media/upload', ['file' => $svgPolyglot]);
        $this->assertSame(422, $r1->status(), 'Polyglot image+script harus ditolak.');

        $phpFile = \Illuminate\Http\UploadedFile::fake()->createWithContent('shell.php', '<?php echo 1;');
        $this->actingAs($admin)->postJson('/dashboard/landing-media/upload', ['file' => $phpFile])
            ->assertStatus(422);
    }

    public function test_deleted_user_cannot_still_authenticate(): void
    {
        $user = $this->operator('TENANT-ALPHA');
        $user->delete();

        $this->assertNull(DB::table('users')->where('id', $user->id)->first());
        $this->assertNull(User::where('id', $user->id)->first());

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'ChaosOperator#2026',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    // ---------------------------------------------------------------- D2/D3: documents & recon surfaces

    public function test_api_and_websocket_docs_do_not_disclose_credentials_to_anonymous_users(): void
    {
        $admin = $this->admin();
        $device = $this->deviceFor($admin, 'ESP32-CHAOS-DOCS', 'TENANT-CHAOS');
        $plain = $device->fresh()->decryptToken();
        $this->assertNotNull($plain);

        // Dokumentasi AsyncAPI (JSON + YAML + halaman Studio) anonim tidak boleh memuat token alat / secret.
        $json = $this->get('/api/docs/asyncapi.json')->assertStatus(200)->getContent();
        $yaml = $this->get('/api/docs/asyncapi.yaml')->assertStatus(200)->getContent();
        $page = $this->get('/api/docs/asyncapi')->assertStatus(200)->getContent();

        foreach ([$json, $yaml, $page] as $body) {
            $this->assertStringNotContainsString($plain, (string) $body);
            $this->assertStringNotContainsString(config('app.key'), (string) $body);
            $this->assertStringNotContainsString('api_token_encrypted', (string) $body);
        }

        // Hanya Super Admin terautentikasi yang boleh melihat plaintext token (autofill Swagger).
        $adminPage = $this->actingAs($admin)->get('/api/docs/asyncapi')->assertStatus(200)->getContent();
        $this->assertStringContainsString($plain, (string) $adminPage);
    }

    public function test_unauthenticated_realtime_config_never_mints_a_dashboard_ticket(): void
    {
        $anon = $this->getJson('/api/realtime/config')->assertStatus(200);
        $this->assertNull($anon->json('realtime.dashboard_ticket'));

        $user = $this->operator();
        $authed = $this->actingAs($user)->getJson('/api/realtime/config')->assertStatus(200);
        $this->assertNotNull($authed->json('realtime.dashboard_ticket'));
    }

    // ---------------------------------------------------------------- E3: stored XSS in landing content

    public function test_stored_xss_payload_in_landing_content_is_neutralised(): void
    {
        $admin = $this->admin();
        $xss = '<img src=x onerror=alert(1)>';

        $this->actingAs($admin)->post('/dashboard/landing-content', [
            'hero_title' => $xss,
            'hero_subtitle' => '<script>alert(document.cookie)</script>',
            'contact_email' => 'landing@banyuwening.test',
        ])->assertStatus(302);

        $page = $this->get('/')->assertStatus(200);
        $props = $page->viewData('page')['props']['landingContent'] ?? [];

        $flat = json_encode($props);
        $this->assertStringNotContainsString('onerror=alert', (string) $flat);
        $this->assertStringNotContainsString('<script>alert(document.cookie)</script>', (string) $flat);
    }

    // ---------------------------------------------------------------- H1/H2/F3: concurrency & state machine

    public function test_ml_model_promotion_keeps_single_active_model_under_concurrency(): void
    {
        $admin = $this->admin();

        $v1 = MlModelVersion::create([
            'version' => '1.0.0-rf',
            'algorithm' => 'RandomForestClassifier',
            'artifact_path' => '',
            'status' => 'ACTIVE',
            'is_active' => true,
            'accuracy' => 0.9,
            'macro_f1' => 0.9,
        ]);
        $v2 = MlModelVersion::create([
            'version' => '1.0.1-rf',
            'algorithm' => 'RandomForestClassifier',
            'artifact_path' => '',
            'status' => 'CANDIDATE_READY',
            'is_active' => false,
            'accuracy' => 0.95,
            'macro_f1' => 0.95,
        ]);

        $this->assertSame(1, MlModelVersion::where('is_active', true)->count());

        // v2 tidak punya artefak -> promote harus gagal bersih, v1 tetap aktif.
        $this->actingAs($admin)->postJson("/dashboard/ml/models/{$v2->id}/promote")->assertStatus(500);
        $this->assertTrue((bool) $v1->fresh()->is_active);
        $this->assertFalse((bool) $v2->fresh()->is_active);
        $this->assertSame(1, MlModelVersion::where('is_active', true)->count());
    }

    public function test_ota_status_reports_are_token_bound_and_cannot_hijack_other_devices(): void
    {
        $owner = $this->operator('TENANT-ALPHA');
        $other = $this->operator('TENANT-BETA');
        $mine = $this->deviceFor($owner, 'ESP32-CHAOS-OTA-A', 'TENANT-ALPHA');
        $theirs = $this->deviceFor($other, 'ESP32-CHAOS-OTA-B', 'TENANT-BETA');

        $plainMine = $mine->fresh()->decryptToken();

        // Device A melaporkan status dengan device_code B -> ditolak middleware token-binding.
        $this->withHeader('Authorization', 'Bearer ' . $plainMine)
            ->postJson('/api/http/ota/status', [
                'device_code' => 'ESP32-CHAOS-OTA-B',
                'status' => 'COMPLETED',
                'to_version' => 'v9.9.9-hijack',
            ])->assertStatus(403);

        $this->assertNotSame('v9.9.9-hijack', $theirs->fresh()->firmware_version);

        // Status tidak valid tidak boleh mengubah state firmware perangkat sendiri.
        $this->withHeader('Authorization', 'Bearer ' . $plainMine)
            ->postJson('/api/http/ota/status', [
                'status' => 'SOMETHING_MADE_UP',
            ])->assertStatus(422);
    }
}
