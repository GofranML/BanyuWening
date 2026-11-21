<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('devices') && !Schema::hasColumn('devices', 'hardware_profile')) {
            Schema::table('devices', function (Blueprint $table) {
                $table->string('hardware_profile', 80)
                    ->default('ESP32-WROOM-CoreHub-v2')
                    ->after('firmware_version');
            });
        }

        if (Schema::hasTable('firmware_releases') && !Schema::hasColumn('firmware_releases', 'allowed_device_ids')) {
            Schema::table('firmware_releases', function (Blueprint $table) {
                $table->json('allowed_device_ids')->nullable()->after('target_hardware');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('firmware_releases') && Schema::hasColumn('firmware_releases', 'allowed_device_ids')) {
            Schema::table('firmware_releases', function (Blueprint $table) {
                $table->dropColumn('allowed_device_ids');
            });
        }

        if (Schema::hasTable('devices') && Schema::hasColumn('devices', 'hardware_profile')) {
            Schema::table('devices', function (Blueprint $table) {
                $table->dropColumn('hardware_profile');
            });
        }
    }
};
