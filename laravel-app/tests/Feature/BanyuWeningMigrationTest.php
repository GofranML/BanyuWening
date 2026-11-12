<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Prediction;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BanyuWeningMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_landing_page_can_be_rendered(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
    }

    public function test_demo_page_can_be_rendered(): void
    {
        $response = $this->get('/demo');
        $response->assertStatus(200);
    }

    public function test_login_page_can_be_rendered(): void
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
        $response->assertSee('data-theme="light"', false);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->post('/login', [
            'email' => 'admin@banyuwening.id',
            'password' => 'admin',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();
    }

    public function test_authenticated_user_can_view_dashboard(): void
    {
        $user = User::where('email', 'admin@banyuwening.id')->first();

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('user')
            ->where('user.email', 'admin@banyuwening.id')
            ->has('currentReading')
            ->has('prediction')
        );
    }

    public function test_api_latest_returns_json(): void
    {
        $response = $this->getJson('/api/latest');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'reading',
                'prediction',
                'device',
            ]);
    }

    public function test_api_history_returns_json(): void
    {
        $response = $this->getJson('/api/history?limit=10');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'count',
                'data',
            ]);
    }

    public function test_api_telemetry_ingestion(): void
    {
        $payload = [
            'device_id' => 'ESP32-NODE-01',
            'ph' => 7.15,
            'temperature_c' => 28.3,
            'tds_ppm' => 340,
            'turbidity_ntu' => 41.5,
            'water_level' => 'NORMAL',
            'aerator_on' => false,
            'mode' => 'AUTO',
        ];

        $response = $this->postJson('/api/telemetry', $payload);
        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Telemetri tersimpan.',
            ]);

        $this->assertDatabaseHas('sensor_readings', [
            'ph' => 7.15,
            'tds_ppm' => 340,
        ]);
    }

    public function test_admin_can_delete_user(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();
        $target = User::where('email', 'operator@banyuwening.id')->first();

        $response = $this->actingAs($admin)->delete("/dashboard/users/{$target->id}");
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_admin_can_delete_user_with_prefixed_id(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();
        $target = User::where('email', 'analis@banyuwening.id')->first();

        $response = $this->actingAs($admin)->delete("/dashboard/users/usr-{$target->id}");
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
    }

    public function test_admin_cannot_delete_primary_admin(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();

        $response = $this->actingAs($admin)->delete("/dashboard/users/{$admin->id}");
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_can_update_landing_page_content_including_email(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();
        $this->assertEquals('Gofran Muttaqi Likhan', $admin->name);

        $payload = [
            'hero_title' => 'BANYUWENING REVOLUSI',
            'contact_email' => 'gofran@banyuwening.id',
            'institution_name' => 'ITB PalComTech Palembang',
        ];

        $response = $this->actingAs($admin)->post('/dashboard/landing-content', $payload);
        $response->assertSessionHas('success');

        // Verifikasi di landing page publik
        $landingResponse = $this->get('/');
        $landingResponse->assertStatus(200);
        $landingResponse->assertInertia(fn ($page) => $page
            ->component('Home')
            ->has('landingContent')
            ->where('landingContent.contact_email', 'gofran@banyuwening.id')
            ->where('landingContent.hero_title', 'BANYUWENING REVOLUSI')
        );
    }

    public function test_non_admin_cannot_update_landing_content(): void
    {
        $operator = User::where('email', 'operator@banyuwening.id')->first();

        $response = $this->actingAs($operator)->post('/dashboard/landing-content', [
            'contact_email' => 'hacked@example.com',
        ]);
        $response->assertStatus(403);
    }

    public function test_admin_can_upload_landing_media(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();

        \Illuminate\Support\Facades\Storage::fake('public');
        $file = \Illuminate\Http\UploadedFile::fake()->create('test_pond.jpg', 100, 'image/jpeg');

        $response = $this->actingAs($admin)->postJson('/dashboard/landing-media/upload', [
            'file' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);
        $this->assertNotEmpty($response->json('url'));
    }

    public function test_non_admin_cannot_upload_landing_media(): void
    {
        $operator = User::where('email', 'operator@banyuwening.id')->first();
        $file = \Illuminate\Http\UploadedFile::fake()->create('test_pond.jpg', 100, 'image/jpeg');

        $response = $this->actingAs($operator)->postJson('/dashboard/landing-media/upload', [
            'file' => $file,
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_update_user_account(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();
        $operator = User::where('email', 'operator@banyuwening.id')->first();

        $response = $this->actingAs($admin)->put("/dashboard/users/{$operator->id}/update", [
            'name' => 'Operator Baru Terlatih',
            'email' => 'operator.baru@banyuwening.id',
            'role' => 'ANALIS',
            'pond_name' => 'Tambak Bioflok Lele C',
            'phone' => '081298765432',
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('users', [
            'id' => $operator->id,
            'name' => 'Operator Baru Terlatih',
            'email' => 'operator.baru@banyuwening.id',
            'role' => 'ANALIS',
            'pond_name' => 'Tambak Bioflok Lele C',
            'phone' => '081298765432',
        ]);
    }

    public function test_non_admin_cannot_update_other_users(): void
    {
        $operator = User::where('email', 'operator@banyuwening.id')->first();
        $analis = User::where('email', 'analis@banyuwening.id')->first();

        $response = $this->actingAs($operator)->put("/dashboard/users/{$analis->id}/update", [
            'name' => 'Hacker Name',
            'email' => 'hacked@banyuwening.id',
            'role' => 'ADMIN',
        ]);

        $response->assertStatus(403);
    }

    public function test_user_can_update_own_profile_and_password(): void
    {
        $user = User::where('email', 'operator@banyuwening.id')->first();

        // Update profil
        $profileResponse = $this->actingAs($user)->put('/dashboard/profile', [
            'name' => 'Riko Kurniawan ST',
            'email' => 'riko.kurniawan@banyuwening.id',
            'pond_name' => 'Kolam Terpal 04',
            'phone' => '081377889900',
        ]);

        $profileResponse->assertSessionHas('success');
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Riko Kurniawan ST',
            'email' => 'riko.kurniawan@banyuwening.id',
        ]);

        // Update password
        $passwordResponse = $this->actingAs($user->fresh())->put('/dashboard/profile/password', [
            'current_password' => 'operator',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $passwordResponse->assertSessionHas('success');
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('newpassword123', $user->fresh()->password));
    }

    public function test_two_factor_setup_confirmation_and_login_challenge(): void
    {
        $twoFactorService = app(\App\Services\TwoFactorService::class);
        $user = User::where('email', 'analis@banyuwening.id')->first();

        // 1. Dapatkan Secret QR
        $qrResponse = $this->actingAs($user)->getJson('/dashboard/profile/2fa/qr');
        $qrResponse->assertStatus(200);
        $secret = $qrResponse->json('secret');
        $this->assertNotEmpty($secret);

        // 2. Hitung OTP valid
        $validCode = $twoFactorService->calculateCode($secret);

        // 3. Konfirmasi 2FA
        $confirmResponse = $this->actingAs($user)->post('/dashboard/profile/2fa/confirm', [
            'code' => $validCode,
        ]);
        $confirmResponse->assertSessionHas('success');
        $confirmResponse->assertSessionHas('recovery_codes');

        $user->refresh();
        $this->assertTrue($user->hasTwoFactor());

        // 4. Logout dan Login kembali - Harus terkena tantangan 2FA
        $this->post('/logout');

        $loginResponse = $this->from('/login')->post('/login', [
            'email' => 'analis@banyuwening.id',
            'password' => 'analis',
        ]);

        $loginResponse->assertRedirect('/login');
        $loginResponse->assertSessionHas('login.2fa.user_id', $user->id);
        $this->assertGuest(); // Belum login sepenuhnya sampai lolos 2FA

        // 5. Submit valid OTP pada tantangan 2FA
        $otp = $twoFactorService->calculateCode($secret);
        $verify2faResponse = $this->post('/login/2fa', [
            'code' => $otp,
        ]);

        $verify2faResponse->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    public function test_landing_page_renders_whatsapp_hotline_and_institution_hyperlink(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Home')
            ->has('landingContent')
            ->where('landingContent.contact_phone', '+62 8566-9548-964')
            ->where('landingContent.institution_url', 'https://palcomtech.ac.id/')
        );
    }

    public function test_admin_can_update_institution_url_and_phone(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();

        $response = $this->actingAs($admin)->post('/dashboard/landing-content', [
            'contact_email' => 'support@banyuwening.id',
            'contact_phone' => '+62 821-9988-7766',
            'institution_name' => 'Institut Teknologi dan Bisnis PalComTech Palembang',
            'institution_url' => 'https://palcomtech.ac.id/profil',
        ]);

        $response->assertSessionHas('success');

        $landing = $this->get('/');
        $landing->assertInertia(fn ($page) => $page
            ->component('Home')
            ->where('landingContent.contact_phone', '+62 821-9988-7766')
            ->where('landingContent.institution_url', 'https://palcomtech.ac.id/profil')
        );
    }

    public function test_admin_can_create_download_and_delete_backup(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->first();

        // 1. Create backup
        $createResponse = $this->actingAs($admin)->post('/dashboard/backups/create');
        $createResponse->assertSessionHas('success');

        $backupDir = storage_path('app/backups');
        $files = glob($backupDir . '/*');
        $this->assertNotEmpty($files);

        $testFile = basename($files[0]);

        // 2. Download backup
        $downloadResponse = $this->actingAs($admin)->get("/dashboard/backups/{$testFile}/download");
        $downloadResponse->assertStatus(200);

        // 3. Delete backup
        $deleteResponse = $this->actingAs($admin)->delete("/dashboard/backups/{$testFile}");
        $deleteResponse->assertSessionHas('success');
        $this->assertFileDoesNotExist($backupDir . '/' . $testFile);
    }

    public function test_non_admin_cannot_manage_backups(): void
    {
        $operator = User::where('email', 'operator@banyuwening.id')->first();

        $createResponse = $this->actingAs($operator)->post('/dashboard/backups/create');
        $createResponse->assertStatus(403);

        $downloadResponse = $this->actingAs($operator)->get('/dashboard/backups/test.json/download');
        $downloadResponse->assertStatus(403);

        $deleteResponse = $this->actingAs($operator)->delete('/dashboard/backups/test.json');
        $deleteResponse->assertStatus(403);
    }
}
