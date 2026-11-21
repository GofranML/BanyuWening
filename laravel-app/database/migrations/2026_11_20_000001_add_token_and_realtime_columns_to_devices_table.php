<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->string('api_token_hash', 64)->nullable()->unique()->after('mqtt_topic');
            $table->string('api_token_prefix', 32)->nullable()->after('api_token_hash');
            $table->boolean('token_active')->default(true)->after('api_token_prefix');
            $table->timestamp('token_rotated_at')->nullable()->after('token_active');
            $table->timestamp('token_last_used_at')->nullable()->after('token_rotated_at');
            $table->string('transport_protocol', 24)->default('STANDBY')->after('status'); // WEBSOCKET, HTTP_FALLBACK, MQTT, STANDBY
            $table->timestamp('ws_connected_at')->nullable()->after('last_heartbeat_at');
            $table->json('pending_command')->nullable()->after('ws_connected_at');
        });

        Schema::table('sensor_readings', function (Blueprint $table) {
            $table->string('transport', 24)->default('HTTP')->after('battery_v');
        });
    }

    public function down(): void
    {
        Schema::table('sensor_readings', function (Blueprint $table) {
            $table->dropColumn('transport');
        });

        Schema::table('devices', function (Blueprint $table) {
            $table->dropUnique(['api_token_hash']);
            $table->dropColumn([
                'api_token_hash',
                'api_token_prefix',
                'token_active',
                'token_rotated_at',
                'token_last_used_at',
                'transport_protocol',
                'ws_connected_at',
                'pending_command',
            ]);
        });
    }
};
