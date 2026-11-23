<?php

use App\Models\Device;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tenants')) {
            Schema::create('tenants', function (Blueprint $table) {
                $table->id();
                $table->string('code', 80)->unique()->index();
                $table->string('name', 120);
                $table->string('pond_name', 120)->nullable();
                $table->string('pic_name', 120)->nullable();
                $table->string('phone', 40)->nullable();
                $table->text('address')->nullable();
                $table->unsignedBigInteger('owner_user_id')->nullable()->index();
                $table->string('status', 20)->default('ACTIVE')->index(); // ACTIVE, TRIAL, SUSPENDED
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // Backfill data tenant bawaan (TENANT-UTAMA)
        $defaultTenant = Tenant::where('code', 'TENANT-UTAMA')->first();
        if (!$defaultTenant) {
            $primaryOwner = User::where('email', 'pemilik@banyuwening.id')->first();
            Tenant::create([
                'code' => 'TENANT-UTAMA',
                'name' => 'Sentra Tambak BanyuWening Utama',
                'pond_name' => 'Kolam Terpal Sangkuriang 01',
                'pic_name' => $primaryOwner?->name ?? 'Bapak Pemilik Tambak',
                'phone' => $primaryOwner?->phone ?? '081234567890',
                'address' => 'Sentra Budidaya Lele BanyuWening, Sleman, D.I. Yogyakarta',
                'owner_user_id' => $primaryOwner?->id,
                'status' => 'ACTIVE',
                'notes' => 'Klaster tenant utama bawaan sistem BanyuWening.',
            ]);
        }

        // Pindai kode tenant lain yang mungkin sudah ada di tabel users atau devices
        $existingCodes = collect();

        if (Schema::hasColumn('users', 'tenant_code')) {
            $userCodes = User::whereNotNull('tenant_code')
                ->where('tenant_code', '!=', '')
                ->pluck('tenant_code');
            $existingCodes = $existingCodes->merge($userCodes);
        }

        if (Schema::hasColumn('devices', 'tenant_code')) {
            $deviceCodes = Device::whereNotNull('tenant_code')
                ->where('tenant_code', '!=', '')
                ->pluck('tenant_code');
            $existingCodes = $existingCodes->merge($deviceCodes);
        }

        $uniqueCodes = $existingCodes->unique()->filter()->values();

        foreach ($uniqueCodes as $code) {
            $codeStr = strtoupper(trim((string)$code));
            if ($codeStr === '' || $codeStr === 'TENANT-UTAMA') {
                continue;
            }

            if (!Tenant::where('code', $codeStr)->exists()) {
                $cleanName = ucwords(str_replace(['TENANT-', '-'], ['', ' '], $codeStr));
                $owner = User::where('tenant_code', $codeStr)->where('role', 'PEMILIK')->first()
                    ?: User::where('tenant_code', $codeStr)->first();

                Tenant::create([
                    'code' => $codeStr,
                    'name' => 'Tambak ' . ($cleanName ?: 'Mitra BanyuWening'),
                    'pond_name' => $owner?->pond_name ?? 'Kolam Terpal Sangkuriang',
                    'pic_name' => $owner?->name,
                    'phone' => $owner?->phone,
                    'address' => 'Area Budidaya Tambak Mitra BanyuWening',
                    'owner_user_id' => $owner?->id,
                    'status' => 'ACTIVE',
                    'notes' => 'Otomatis diimpor dari kode tenant akun/alat yang telah terdaftar.',
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
