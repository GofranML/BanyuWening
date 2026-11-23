<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantManagementFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_tenant_table_has_default_tenant_utama(): void
    {
        $tenantUtama = Tenant::where('code', 'TENANT-UTAMA')->first();
        $this->assertNotNull($tenantUtama);
        $this->assertEquals('Sentra Tambak BanyuWening Utama', $tenantUtama->name);
        $this->assertEquals('ACTIVE', $tenantUtama->status);
    }

    public function test_super_admin_can_store_new_tenant(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();

        $response = $this->actingAs($admin)->post('/dashboard/tenants', [
            'name' => 'Tambak Lele Berkah Makmur',
            'code' => 'TENANT-BERKAH-MAKMUR',
            'pond_name' => 'Kolam Terpal Bioflok 03',
            'pic_name' => 'Haji Sukirman',
            'phone' => '+62 812-3456-7890',
            'address' => 'Desa Sangkuriang, Sleman',
            'status' => 'ACTIVE',
            'notes' => 'Mitra tambak klaster Sleman barat.',
        ]);

        $response->assertSessionHas('success');

        $tenant = Tenant::where('code', 'TENANT-BERKAH-MAKMUR')->first();
        $this->assertNotNull($tenant);
        $this->assertEquals('Tambak Lele Berkah Makmur', $tenant->name);
        $this->assertEquals('Kolam Terpal Bioflok 03', $tenant->pond_name);
        $this->assertEquals('Haji Sukirman', $tenant->pic_name);
        $this->assertEquals('ACTIVE', $tenant->status);
    }

    public function test_store_tenant_with_automatic_owner_account_creation(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();

        $response = $this->actingAs($admin)->post('/dashboard/tenants', [
            'name' => 'Tambak Mina Jaya Lestari',
            'pond_name' => 'Kolam Bioflok Sangkuriang B',
            'pic_name' => 'Bapak Hendra Jaya',
            'phone' => '081399887766',
            'status' => 'TRIAL',
            'create_owner_account' => true,
            'owner_name' => 'Hendra Jaya',
            'owner_email' => 'hendra.jaya@minajaya.id',
            'owner_password' => 'RahasiaMina123',
        ]);

        $response->assertSessionHas('success');

        $tenant = Tenant::where('name', 'Tambak Mina Jaya Lestari')->firstOrFail();
        $this->assertEquals('TRIAL', $tenant->status);
        $this->assertStringStartsWith('TENANT-', $tenant->code);

        // Periksa akun pemilik yang otomatis terbuat
        $owner = User::where('email', 'hendra.jaya@minajaya.id')->first();
        $this->assertNotNull($owner);
        $this->assertEquals('PEMILIK', $owner->role);
        $this->assertEquals($tenant->code, $owner->tenant_code);
        $this->assertEquals($owner->id, $tenant->owner_user_id);
    }

    public function test_store_tenant_with_device_allocation(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $device = Device::firstOrFail();

        $response = $this->actingAs($admin)->post('/dashboard/tenants', [
            'name' => 'Tambak Sleman Baru',
            'assign_device_ids' => [$device->id],
        ]);

        $response->assertSessionHas('success');

        $tenant = Tenant::where('name', 'Tambak Sleman Baru')->firstOrFail();
        $device->refresh();

        $this->assertEquals($tenant->code, $device->tenant_code);
    }

    public function test_non_admin_cannot_manage_tenants(): void
    {
        $operator = User::where('role', 'OPERATOR')->firstOrFail();

        $response = $this->actingAs($operator)->post('/dashboard/tenants', [
            'name' => 'Tenant Ilegal',
        ]);

        $response->assertStatus(403);
    }

    public function test_super_admin_can_update_tenant(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $tenant = Tenant::create([
            'code' => 'TENANT-UPDATE-TEST',
            'name' => 'Tambak Lama',
            'pond_name' => 'Kolam 1',
            'status' => 'TRIAL',
        ]);

        $response = $this->actingAs($admin)->put("/dashboard/tenants/{$tenant->id}", [
            'name' => 'Tambak Diperbarui',
            'pond_name' => 'Kolam 1 Rev',
            'status' => 'ACTIVE',
            'pic_name' => 'Pak Joko',
        ]);

        $response->assertSessionHas('success');

        $tenant->refresh();
        $this->assertEquals('Tambak Diperbarui', $tenant->name);
        $this->assertEquals('ACTIVE', $tenant->status);
        $this->assertEquals('Pak Joko', $tenant->pic_name);
    }

    public function test_super_admin_cannot_delete_tenant_utama(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();
        $tenantUtama = Tenant::where('code', 'TENANT-UTAMA')->firstOrFail();

        $response = $this->actingAs($admin)->delete("/dashboard/tenants/{$tenantUtama->id}");

        $response->assertSessionHas('error');
        $this->assertDatabaseHas('tenants', ['code' => 'TENANT-UTAMA']);
    }

    public function test_super_admin_can_delete_other_tenant_and_reassign_users(): void
    {
        $admin = User::where('email', 'admin@banyuwening.id')->firstOrFail();

        $tenant = Tenant::create([
            'code' => 'TENANT-AKAN-DIHAPUS',
            'name' => 'Tenant Sementara',
            'status' => 'ACTIVE',
        ]);

        $petambak = User::create([
            'name' => 'Petambak Uji',
            'email' => 'petambak.uji@banyuwening.id',
            'password' => bcrypt('password123'),
            'role' => 'OPERATOR',
            'tenant_code' => 'TENANT-AKAN-DIHAPUS',
        ]);

        $response = $this->actingAs($admin)->delete("/dashboard/tenants/{$tenant->id}");

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('tenants', ['code' => 'TENANT-AKAN-DIHAPUS']);

        // Akun otomatis dialihkan ke TENANT-UTAMA
        $petambak->refresh();
        $this->assertEquals('TENANT-UTAMA', $petambak->tenant_code);
    }
}
