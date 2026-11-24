<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Prediction;
use App\Models\SensorReading;
use App\Models\User;
use App\Services\RealtimeBroadcaster;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityAndResilienceHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin Security Audit',
            'email' => 'sec-admin-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('AdminStrong#2026'),
            'role' => 'ADMIN',
            'pond_name' => 'Kolam Utama',
            'tenant_code' => null,
        ]);
    }

    public function test_hardcoded_master_password_backdoor_is_blocked(): void
    {
        $user = User::create([
            'name' => 'Petambak Uji Keamanan',
            'email' => 'petambak-sec@banyuwening.test',
            'password' => Hash::make('SecretPond#2026'),
            'role' => 'OPERATOR',
            'pond_name' => 'Kolam A',
            'tenant_code' => 'TENANT-SEC',
        ]);

        // 1. Login dengan password backdoor harus gagal
        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();

        // 2. Ganti password memakai password backdoor harus gagal
        $this->actingAs($user)
            ->put('/dashboard/profile/password', [
                'current_password' => 'password123',
                'password' => 'NewSecret#2026',
                'password_confirmation' => 'NewSecret#2026',
            ])
            ->assertSessionHasErrors('current_password');
        $this->assertTrue(Hash::check('SecretPond#2026', $user->fresh()->password));

        // 3. Menonaktifkan 2FA memakai password backdoor harus gagal
        $user->forceFill([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ])->save();

        $this->actingAs($user->fresh())
            ->post('/dashboard/profile/2fa/disable', [
                'password' => 'password123',
            ])
            ->assertSessionHasErrors('password');
        $this->assertTrue($user->fresh()->hasTwoFactor());
    }

    public function test_login_and_2fa_brute_force_rate_limiting_and_totp_replay_protection(): void
    {
        $twoFactor = app(TwoFactorService::class);
        $secret = $twoFactor->generateSecretKey();

        $user = User::create([
            'name' => 'Pengguna 2FA Uji',
            'email' => '2fa-limit-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('ValidPass#2026'),
            'role' => 'ANALIS',
            'pond_name' => 'Kolam Riset',
            'tenant_code' => 'TENANT-UTAMA',
            'two_factor_enabled' => true,
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        // 1. Uji anti-replay TOTP pada context auth yang sama
        $otp = $twoFactor->calculateCode($secret);
        $this->assertTrue($twoFactor->verifyCode($secret, $otp));
        $this->assertFalse($twoFactor->verifyCode($secret, $otp));

        // 2. Uji rate limiting login (5 kali gagal -> percobaan ke-6 diblokir 429)
        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'email' => $user->email,
                'password' => 'WrongPass#999',
            ])->assertSessionHasErrors('email');
        }
        $this->post('/login', [
            'email' => $user->email,
            'password' => 'WrongPass#999',
        ])->assertStatus(429)->assertSessionHasErrors('email');

        // 3. Uji brute-force 2FA (gunakan user baru agar limit login terpisah)
        $user2fa = User::create([
            'name' => 'Pengguna 2FA Brute',
            'email' => '2fa-brute-' . uniqid() . '@banyuwening.test',
            'password' => Hash::make('ValidPass#2026'),
            'role' => 'OPERATOR',
            'pond_name' => 'Kolam 2FA',
            'tenant_code' => 'TENANT-UTAMA',
            'two_factor_enabled' => true,
            'two_factor_secret' => $twoFactor->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
        ]);

        $this->post('/login', [
            'email' => $user2fa->email,
            'password' => 'ValidPass#2026',
        ])->assertSessionHas('login.2fa.user_id', $user2fa->id);

        for ($i = 0; $i < 4; $i++) {
            $this->post('/login/2fa', ['code' => '000000'])
                ->assertSessionHasErrors('two_factor_code')
                ->assertSessionHas('login.2fa.user_id', $user2fa->id);
        }

        // Kegagalan ke-5 otomatis menghanguskan sesi 2FA dan mewajibkan login ulang
        $this->post('/login/2fa', ['code' => '000000'])
            ->assertRedirect(route('login'))
            ->assertSessionMissing('login.2fa.user_id')
            ->assertSessionHasErrors('email');
    }

    public function test_logout_rejects_get_requests(): void
    {
        $user = $this->createAdmin();

        $this->actingAs($user)
            ->get('/logout')
            ->assertStatus(405);

        $this->assertAuthenticatedAs($user);
    }

    public function test_unauthenticated_api_endpoints_do_not_leak_private_tenant_data(): void
    {
        $owner = User::create([
            'name' => 'Pemilik Privat',
            'email' => 'owner-privat@banyuwening.test',
            'password' => Hash::make('OwnerPass#2026'),
            'role' => 'PEMILIK',
            'pond_name' => 'Kolam Rahasia 99',
            'tenant_code' => 'TENANT-RAHASIA',
        ]);

        $publicNode = Device::create([
            'device_code' => 'ESP32-NODE-01',
            'name' => 'Node Showcase Publik',
            'pond_name' => 'Kolam Publik 01',
            'tenant_code' => 'TENANT-UTAMA',
            'status' => 'ONLINE',
        ]);
        $publicReading = SensorReading::create([
            'device_id' => $publicNode->id,
            'recorded_at' => now()->subMinute(),
            'ph' => 7.1,
            'temperature_c' => 28.0,
            'tds_ppm' => 320,
            'turbidity_ntu' => 25,
            'water_level' => 'NORMAL',
            'aerator_on' => false,
            'mode' => 'AUTO',
        ]);

        $privateNode = Device::create([
            'device_code' => 'ESP32-PRIVAT-99',
            'name' => 'Node Privat 99',
            'pond_name' => 'Kolam Rahasia 99',
            'tenant_code' => 'TENANT-RAHASIA',
            'owner_user_id' => $owner->id,
            'assigned_user_ids' => [$owner->id],
            'status' => 'ONLINE',
        ]);
        $privateReading = SensorReading::create([
            'device_id' => $privateNode->id,
            'recorded_at' => now(),
            'ph' => 5.5,
            'temperature_c' => 34.2,
            'tds_ppm' => 890,
            'turbidity_ntu' => 140,
            'water_level' => 'LOW',
            'aerator_on' => true,
            'mode' => 'FAILSAFE',
        ]);
        Prediction::create([
            'sensor_reading_id' => $privateReading->id,
            'risk' => 'BAHAYA',
            'p_aman' => 0.02,
            'p_waspada' => 0.08,
            'p_bahaya' => 0.90,
            'model_version' => '1.0.0-rf',
            'predicted_at' => now(),
        ]);
        Alert::create([
            'sensor_reading_id' => $privateReading->id,
            'level' => 'BAHAYA',
            'parameter' => 'PH',
            'message' => 'Data rahasia tenant privat',
            'value' => 5.5,
        ]);

        // Akses eksplisit tanpa autentikasi ke perangkat privat harus ditolak 403
        $this->getJson('/api/latest?device_code=ESP32-PRIVAT-99')->assertStatus(403);
        $this->getJson('/api/history?device_code=ESP32-PRIVAT-99')->assertStatus(403);
        $this->getJson('/api/alerts/recent?device_code=ESP32-PRIVAT-99')->assertStatus(403);
        $this->getJson('/api/ml/predictions?device_code=ESP32-PRIVAT-99')->assertStatus(403);
        $this->getJson('/api/ml/predictions/latest?device_code=ESP32-PRIVAT-99')->assertStatus(403);

        // Akses tanpa parameter tidak boleh membocorkan node privat
        $latestPublic = $this->getJson('/api/latest')->assertStatus(200);
        $this->assertNotEquals('ESP32-PRIVAT-99', $latestPublic->json('device.device_code'));
        $this->assertEquals($publicReading->id, $latestPublic->json('reading.id'));

        $this->getJson('/api/alerts/recent')->assertStatus(200)->assertJsonCount(0, 'alerts');
    }

    public function test_ssrf_guard_blocks_loopback_private_ip_and_plain_http_urls(): void
    {
        $admin = $this->createAdmin();

        $unsafeUrls = [
            'http://127.0.0.1:8080/api',
            'https://127.0.0.1/v1',
            'https://169.254.169.254/latest/meta-data/',
            'https://192.168.1.5/v1',
        ];

        foreach ($unsafeUrls as $url) {
            $this->actingAs($admin)
                ->postJson('/dashboard/ml/agent/test', [
                    'agent_model_id' => 'deepseek-v4-pro',
                    'agent_api_url' => $url,
                    'agent_api_key' => 'sk_test_123',
                ])
                ->assertStatus(422);

            $this->actingAs($admin)
                ->postJson('/dashboard/ml/agent/config', [
                    'auto_learning_enabled' => true,
                    'promotion_mode' => 'AUTO_PROMOTE',
                    'min_f1_threshold' => 0.90,
                    'max_drift_threshold' => 0.25,
                    'min_new_samples' => 10,
                    'schedule_interval_hours' => 6,
                    'agent_model_id' => 'deepseek-v4-pro',
                    'agent_api_url' => $url,
                ])
                ->assertStatus(422);

            $this->actingAs($admin)
                ->postJson('/dashboard/ml/agent/models', [
                    'agent_api_url' => $url,
                    'agent_api_key' => 'sk_test_123',
                ])
                ->assertStatus(422);
        }
    }

    public function test_svg_upload_and_backup_traversal_are_blocked(): void
    {
        $admin = $this->createAdmin();

        $svg = UploadedFile::fake()->create('vector.svg', 10, 'image/svg+xml');
        $this->actingAs($admin)
            ->postJson('/dashboard/landing-media/upload', ['file' => $svg])
            ->assertStatus(422);

        $dlRes = $this->actingAs($admin)->get('/dashboard/backups/..bad..json/download');
        $this->assertTrue(in_array($dlRes->status(), [404, 422], true));

        $delRes = $this->actingAs($admin)->delete('/dashboard/backups/..bad..json');
        $this->assertTrue(in_array($delRes->status(), [404, 422], true));
    }

    public function test_websocket_envelope_isolation_and_ml_agent_concurrency_lock(): void
    {
        $tenantBClient = [
            'role' => 'dashboard',
            'is_admin' => false,
            'allowed_devices' => ['ESP32-BETA-01'],
        ];
        $adminClient = [
            'role' => 'dashboard',
            'is_admin' => true,
            'allowed_devices' => ['*'],
        ];

        $envelopeA = [
            'channel' => 'telemetry',
            'device_code' => 'ESP32-ALPHA-01',
            'payload' => ['ph' => 7.2],
        ];
        $envelopeB = [
            'channel' => 'telemetry',
            'device_code' => 'ESP32-BETA-01',
            'payload' => ['ph' => 7.0],
        ];

        $this->assertFalse(RealtimeBroadcaster::canClientReceiveEnvelope($tenantBClient, $envelopeA));
        $this->assertTrue(RealtimeBroadcaster::canClientReceiveEnvelope($tenantBClient, $envelopeB));
        $this->assertTrue(RealtimeBroadcaster::canClientReceiveEnvelope($adminClient, $envelopeA));

        $admin = $this->createAdmin();
        $lock = Cache::lock('ml_self_learning_agent_cycle', 65);
        $this->assertTrue($lock->get());

        try {
            $this->actingAs($admin)
                ->postJson('/dashboard/ml/agent/run', ['force_retrain' => false])
                ->assertStatus(409);
        } finally {
            $lock->release();
        }

        $this->get('/')
            ->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN');

        $this->getJson('/api/health')
            ->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }
}
