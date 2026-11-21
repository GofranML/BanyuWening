<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->text('api_token_encrypted')->nullable()->after('api_token_hash');
        });

        // Backfill encrypted token untuk node default seeder jika hash cocok
        $defaultSeedToken = env('ESP32_NODE_01_TOKEN', 'bw_dev_esp32_node_01_default_token_2026');
        $defaultHash = hash('sha256', $defaultSeedToken);

        DB::table('devices')
            ->where('api_token_hash', $defaultHash)
            ->whereNull('api_token_encrypted')
            ->update([
                'api_token_encrypted' => Crypt::encryptString($defaultSeedToken),
            ]);
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn('api_token_encrypted');
        });
    }
};
