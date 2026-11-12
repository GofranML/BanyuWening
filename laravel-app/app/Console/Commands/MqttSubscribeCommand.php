<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\ConnectionSettings;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\RelayLog;
use App\Jobs\PredictWaterQualityJob;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MqttSubscribeCommand extends Command
{
    protected $signature = 'mqtt:subscribe {--topic=banyuwening/+/telemetry}';
    protected $description = 'Mendengarkan paket telemetri sensor ESP32 secara realtime via MQTT TLS';

    public function handle(): int
    {
        $server = config('services.mqtt.host', env('MQTT_HOST', 'broker.hivemq.com'));
        $port = (int) config('services.mqtt.port', env('MQTT_PORT', 1883));
        $clientId = 'banyuwening-laravel-' . uniqid();
        $useTls = config('services.mqtt.tls', env('MQTT_TLS', false));

        $this->info("Menghubungkan ke broker MQTT: {$server}:{$port}...");

        try {
            $client = new MqttClient($server, $port, $clientId);

            $settings = (new ConnectionSettings)
                ->setKeepAliveInterval(60)
                ->setConnectTimeout(10)
                ->setUseTls($useTls)
                ->setTlsVerifyPeer(false);

            if ($username = env('MQTT_USERNAME')) {
                $settings->setUsername($username);
                $settings->setPassword(env('MQTT_PASSWORD', ''));
            }

            $client->connect($settings, true);
            $this->info("[✓] Berhasil terhubung ke broker MQTT!");

            $topic = $this->option('topic');
            $this->info("[*] Mendengarkan topik: {$topic}...");

            $client->subscribe($topic, function (string $topic, string $message) {
                $this->handleIncomingMessage($topic, $message);
            }, 0);

            $client->loop(true);
        } catch (\Throwable $e) {
            $this->error("Error MQTT: " . $e->getMessage());
            Log::error("MQTT Error: " . $e->getMessage());
            return 1;
        }

        return 0;
    }

    protected function handleIncomingMessage(string $topic, string $message): void
    {
        $data = json_decode($message, true);
        if (!$data) {
            $this->warn("[!] Menerima payload non-JSON: {$message}");
            return;
        }

        $deviceCode = $data['device_code'] ?? 'ESP32-NODE-01';
        $device = Device::firstOrCreate(
            ['device_code' => $deviceCode],
            [
                'name' => 'ESP32 Node Sensor Kolam',
                'pond_name' => 'Kolam Terpal Sangkuriang 01',
                'status' => 'ONLINE',
                'mode' => 'AUTO',
                'last_heartbeat_at' => Carbon::now(),
            ]
        );

        $ph = isset($data['ph']) ? (float)$data['ph'] : null;
        $temp = isset($data['temperature_c']) ? (float)$data['temperature_c'] : (isset($data['temperature']) ? (float)$data['temperature'] : null);
        $tds = isset($data['tds_ppm']) ? (float)$data['tds_ppm'] : (isset($data['tds']) ? (float)$data['tds'] : null);
        $turb = isset($data['turbidity_ntu']) ? (float)$data['turbidity_ntu'] : (isset($data['turbidity']) ? (float)$data['turbidity'] : null);
        $waterLevel = strtoupper($data['water_level'] ?? 'NORMAL');

        // Aturan Failsafe Lokal ESP32 & Cloud
        $failsafeAerator = false;
        if (($ph !== null && ($ph < 6.0 || $ph > 8.8)) || ($temp !== null && $temp > 33.0)) {
            $failsafeAerator = true;
        }

        $reading = SensorReading::create([
            'device_id' => $device->id,
            'recorded_at' => Carbon::now(),
            'ph' => $ph,
            'temperature_c' => $temp,
            'tds_ppm' => $tds,
            'turbidity_ntu' => $turb,
            'water_level' => $waterLevel,
            'aerator_on' => $failsafeAerator || ($data['aerator_on'] ?? false),
            'mode' => $failsafeAerator ? 'FAILSAFE' : ($data['mode'] ?? 'AUTO'),
            'battery_v' => $data['battery_v'] ?? 4.1,
        ]);

        // Perbarui status device
        $device->update([
            'status' => 'ONLINE',
            'last_heartbeat_at' => Carbon::now(),
            'aerator_on' => $reading->aerator_on,
            'mode' => $reading->mode,
        ]);

        if ($failsafeAerator) {
            RelayLog::create([
                'device_id' => $device->id,
                'action' => 'ON',
                'mode' => 'FAILSAFE',
                'reason' => "Failsafe aktif otomatis: pH={$ph}, Temp={$temp}°C",
                'actor' => 'ESP32 Hardware Rule',
                'triggered_at' => Carbon::now(),
            ]);
        }

        // Dispatch background job untuk prediksi Machine Learning
        PredictWaterQualityJob::dispatch($reading);

        $this->info("[+] [{$reading->recorded_at->toTimeString()}] Data sensor tersimpan ID #{$reading->id} (pH: {$ph}, Suhu: {$temp}°C)");
    }
}
