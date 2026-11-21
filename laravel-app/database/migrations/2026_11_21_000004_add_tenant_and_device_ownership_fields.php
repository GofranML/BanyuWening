<?php

use App\Models\Device;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'tenant_code')) {
                $table->string('tenant_code', 80)->nullable()->index()->after('pond_name');
            }
        });

        Schema::table('devices', function (Blueprint $table) {
            if (!Schema::hasColumn('devices', 'tenant_code')) {
                $table->string('tenant_code', 80)->nullable()->index()->after('pond_name');
            }
            if (!Schema::hasColumn('devices', 'owner_user_id')) {
                $table->unsignedBigInteger('owner_user_id')->nullable()->index()->after('tenant_code');
            }
            if (!Schema::hasColumn('devices', 'assigned_user_ids')) {
                $table->json('assigned_user_ids')->nullable()->after('owner_user_id');
            }
        });

        // Backfill data bawaan agar akun & node default terisolasi rapi dalam TENANT-UTAMA
        $defaultEmails = ['operator@banyuwening.id', 'analis@banyuwening.id', 'pemilik@banyuwening.id'];
        $defaultUserIds = [];

        foreach ($defaultEmails as $email) {
            $u = User::where('email', $email)->first();
            if ($u) {
                if (empty($u->tenant_code)) {
                    $u->forceFill(['tenant_code' => 'TENANT-UTAMA'])->save();
                }
                $defaultUserIds[] = (int) $u->id;
            }
        }

        $primaryOwnerId = User::where('email', 'pemilik@banyuwening.id')->value('id');
        $defaultDevice = Device::where('device_code', 'ESP32-NODE-01')->first();
        if ($defaultDevice) {
            $updates = [];
            if (empty($defaultDevice->tenant_code)) {
                $updates['tenant_code'] = 'TENANT-UTAMA';
            }
            if (empty($defaultDevice->owner_user_id) && $primaryOwnerId) {
                $updates['owner_user_id'] = (int) $primaryOwnerId;
            }
            if (empty($defaultDevice->assigned_user_ids) && !empty($defaultUserIds)) {
                $updates['assigned_user_ids'] = array_values(array_unique($defaultUserIds));
            }
            if (!empty($updates)) {
                $defaultDevice->forceFill($updates)->save();
            }
        }
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            if (Schema::hasColumn('devices', 'assigned_user_ids')) {
                $table->dropColumn('assigned_user_ids');
            }
            if (Schema::hasColumn('devices', 'owner_user_id')) {
                $table->dropColumn('owner_user_id');
            }
            if (Schema::hasColumn('devices', 'tenant_code')) {
                $table->dropColumn('tenant_code');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'tenant_code')) {
                $table->dropColumn('tenant_code');
            }
        });
    }
};
