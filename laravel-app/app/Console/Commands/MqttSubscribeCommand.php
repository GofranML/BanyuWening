<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\ConnectionSettings;
use App\Models\Device;
use App\Services\TelemetryIngestionService;
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

        $deviceCode = $data['device_code'] ?? ($data['device_id'] ?? 'ESP32-NODE-01');
        $device = Device::firstOrCreate(
            ['device_code' => $deviceCode],
            [
                'name' => 'ESP32 Node Sensor Kolam',
                'pond_name' => 'Kolam Terpal Sangkuriang 01',
                'status' => 'ONLINE',
                'transport_protocol' => 'MQTT',
                'mode' => 'AUTO',
                'last_heartbeat_at' => Carbon::now(),
            ]
        );

        // Jika perangkat sudah memiliki token aktif dan payload menyertakan token, verifikasi kecocokannya
        if (!empty($data['device_token']) && $device->api_token_hash) {
            if (!hash_equals($device->api_token_hash, hash('sha256', (string) $data['device_token']))) {
                $this->warn("[!] Token perangkat MQTT tidak cocok untuk {$deviceCode}; paket diabaikan.");
                return;
            }
        }

        $result = app(TelemetryIngestionService::class)->ingest($device, $data, 'MQTT');
        $reading = $result['reading'];

        $this->info("[+] [{$reading->recorded_at->toTimeString()}] Data sensor MQTT tersimpan ID #{$reading->id} (pH: {$reading->ph}, Suhu: {$reading->temperature_c}°C)");
    }
}
