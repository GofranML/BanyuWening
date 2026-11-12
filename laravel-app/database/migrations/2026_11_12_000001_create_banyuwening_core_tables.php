<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Devices (Node Sensor IoT)
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->string('device_code')->unique();
            $table->string('name');
            $table->string('pond_name')->default('Kolam Terpal Sangkuriang 01');
            $table->string('firmware_version')->default('v1.4.2-failsafe');
            $table->string('ip_address')->nullable();
            $table->string('mac_address')->nullable();
            $table->string('mqtt_topic')->default('banyuwening/pond01/telemetry');
            $table->string('status')->default('ONLINE'); // ONLINE, OFFLINE, BASI
            $table->string('mode')->default('AUTO'); // AUTO, MANUAL, FAILSAFE
            $table->boolean('aerator_on')->default(false);
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->timestamps();
        });

        // 2. Sensor Readings (Telemetri Kualitas Air)
        Schema::create('sensor_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->timestamp('recorded_at')->index();
            $table->decimal('ph', 4, 2)->nullable();
            $table->decimal('temperature_c', 4, 2)->nullable();
            $table->decimal('tds_ppm', 6, 2)->nullable();
            $table->decimal('turbidity_ntu', 6, 2)->nullable();
            $table->string('water_level', 20)->default('NORMAL'); // NORMAL, LOW
            $table->boolean('aerator_on')->default(false);
            $table->string('mode', 20)->default('AUTO'); // AUTO, MANUAL, FAILSAFE
            $table->decimal('battery_v', 4, 2)->nullable();
            $table->timestamps();

            $table->index(['device_id', 'recorded_at']);
        });

        // 3. Predictions (Inferensi Machine Learning Random Forest)
        Schema::create('predictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sensor_reading_id')->nullable()->constrained('sensor_readings')->nullOnDelete();
            $table->string('risk', 20)->default('AMAN'); // AMAN, WASPADA, BAHAYA
            $table->decimal('p_aman', 5, 4)->default(0.90);
            $table->decimal('p_waspada', 5, 4)->default(0.08);
            $table->decimal('p_bahaya', 5, 4)->default(0.02);
            $table->string('model_version', 50)->default('1.0.0-rf');
            $table->string('timeframe', 50)->default('1–3 jam');
            $table->json('triggers')->nullable();
            $table->text('recommended_action')->nullable();
            $table->boolean('failsafe_active')->default(false);
            $table->timestamp('predicted_at')->useCurrent();
            $table->timestamps();
        });

        // 4. Alerts (Peringatan & Notifikasi Operasional Kolam)
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sensor_reading_id')->nullable()->constrained('sensor_readings')->nullOnDelete();
            $table->string('level', 20); // BAHAYA, WASPADA, INFO
            $table->string('parameter', 50); // pH, Suhu, TDS, Kekeruhan, Level Air
            $table->text('message');
            $table->decimal('value', 8, 2)->nullable();
            $table->boolean('telegram_sent')->default(false);
            $table->boolean('whatsapp_sent')->default(false);
            $table->boolean('email_sent')->default(false);
            $table->timestamp('acknowledged_at')->nullable();
            $table->string('acknowledged_by')->nullable();
            $table->timestamps();
        });

        // 5. Relay Logs (Catatan Kendali Relay Aerator DC 12V)
        Schema::create('relay_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->string('action', 10); // ON, OFF
            $table->string('mode', 20); // AUTO, MANUAL, FAILSAFE
            $table->string('reason');
            $table->string('actor')->default('System');
            $table->integer('duration_seconds')->nullable();
            $table->timestamp('triggered_at')->useCurrent();
            $table->timestamps();
        });

        // 6. Notification Settings (Konfigurasi Telegram Bot, WA & Email)
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique()->default('default');
            $table->json('telegram_config');
            $table->json('whatsapp_config');
            $table->json('email_config');
            $table->json('trigger_rules');
            $table->timestamps();
        });

        // 7. Dispatch Logs (Audit Pengiriman Pesan Bot & Email)
        Schema::create('dispatch_logs', function (Blueprint $table) {
            $table->id();
            $table->string('channel', 20); // TELEGRAM, WHATSAPP, EMAIL
            $table->string('recipient');
            $table->string('trigger_type', 30); // TEST, BAHAYA, WASPADA, OFFLINE, RELAY
            $table->string('status', 20); // SUCCESS, SIMULATED, FAILED
            $table->text('preview');
            $table->text('details')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispatch_logs');
        Schema::dropIfExists('notification_settings');
        Schema::dropIfExists('relay_logs');
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('predictions');
        Schema::dropIfExists('sensor_readings');
        Schema::dropIfExists('devices');
    }
};
