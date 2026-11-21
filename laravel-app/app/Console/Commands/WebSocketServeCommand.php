<?php

namespace App\Console\Commands;

use App\Models\Device;
use App\Models\RelayLog;
use App\Services\FirmwareOtaService;
use App\Services\RealtimeBroadcaster;
use App\Services\TelemetryIngestionService;
use App\Services\WebSocketProtocol;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class WebSocketServeCommand extends Command
{
    protected $signature = 'ws:serve {--host= : Host bind (default dari config services.realtime.ws_host)} {--port= : Port bind (default dari config services.realtime.ws_port)}';
    protected $description = 'Menjalankan server WebSocket multi-protokol BanyuWening (telemetry, control, alerts, heartbeat, stream)';

    /** @var array<int, array<string, mixed>> */
    private array $clients = [];

    private int $busOffset = 0;

    public function handle(
        TelemetryIngestionService $ingestionService,
        RealtimeBroadcaster $broadcaster
    ): int {
        $host = (string) ($this->option('host') ?: config('services.realtime.ws_host', '0.0.0.0'));
        $port = (int) ($this->option('port') ?: config('services.realtime.ws_port', 8081));

        $errno = 0;
        $errstr = '';
        $server = @stream_socket_server("tcp://{$host}:{$port}", $errno, $errstr);

        if (!$server) {
            $this->error("Gagal membuka socket WebSocket di {$host}:{$port} — {$errstr} ({$errno})");
            return 1;
        }

        stream_set_blocking($server, false);

        // Mulai baca bus dari akhir file saat server dimulai agar tidak replay event lama
        $busPath = $broadcaster->busFilePath();
        if (is_file($busPath)) {
            $this->busOffset = (int) filesize($busPath);
        }

        $this->info("[✓] BanyuWening Multi-Protocol WebSocket Server aktif di ws://{$host}:{$port}");
        $this->line('    Protokol tersedia:');
        $this->line('      - /ws/telemetry  [banyuwening.telemetry.v1]  (Device token)');
        $this->line('      - /ws/control    [banyuwening.control.v1]    (Device token)');
        $this->line('      - /ws/alerts     [banyuwening.alerts.v1]     (Device token / Dashboard ticket)');
        $this->line('      - /ws/heartbeat  [banyuwening.heartbeat.v1]  (Device token)');
        $this->line('      - /ws/ota        [banyuwening.ota.v1]        (Device token)');
        $this->line('      - /ws/stream     [banyuwening.dashboard.v1]  (Dashboard ticket)');

        while (true) {
            $read = [$server];
            foreach ($this->clients as $client) {
                $read[] = $client['socket'];
            }

            $write = null;
            $except = null;

            $changed = @stream_select($read, $write, $except, 0, 50000); // 50ms tick
            if ($changed === false) {
                usleep(50000);
                continue;
            }

            if ($changed > 0) {
                // Terima koneksi masuk baru
                if (in_array($server, $read, true)) {
                    $conn = @stream_socket_accept($server, 0);
                    if ($conn) {
                        stream_set_blocking($conn, false);
                        $id = (int) $conn;
                        $this->clients[$id] = [
                            'id' => $id,
                            'socket' => $conn,
                            'handshaked' => false,
                            'buffer' => '',
                            'role' => null, // 'device' | 'dashboard'
                            'device_id' => null,
                            'device_code' => null,
                            'channels' => [],
                            'protocol' => null,
                            'connected_at' => time(),
                        ];
                    }
                }

                // Baca data dari klien yang sudah terhubung
                foreach ($read as $sock) {
                    if ($sock === $server) {
                        continue;
                    }

                    $id = (int) $sock;
                    if (!isset($this->clients[$id])) {
                        continue;
                    }

                    $chunk = @fread($sock, 65536);
                    if ($chunk === '' || $chunk === false) {
                        if (feof($sock)) {
                            $this->disconnectClient($id);
                        }
                        continue;
                    }

                    $this->clients[$id]['buffer'] .= $chunk;

                    if (!$this->clients[$id]['handshaked']) {
                        $this->handleHandshake($id, $broadcaster);
                    } else {
                        $this->handleFrames($id, $ingestionService, $broadcaster);
                    }
                }
            }

            // Teruskan event baru dari realtime-bus.jsonl (HTTP fallback, MQTT, ML Jobs, Control)
            $this->pumpRealtimeBus($broadcaster);
        }
    }

    private function handleHandshake(int $id, RealtimeBroadcaster $broadcaster): void
    {
        $client = &$this->clients[$id];
        if (!str_contains($client['buffer'], "\r\n\r\n")) {
            if (strlen($client['buffer']) > 16384) {
                $this->rejectAndClose($id, 400, 'Bad Request', 'Header terlalu besar');
            }
            return;
        }

        $req = WebSocketProtocol::parseHttpRequest($client['buffer']);
        if (!$req) {
            $this->rejectAndClose($id, 400, 'Bad Request', 'Format HTTP Upgrade tidak valid');
            return;
        }

        $client['buffer'] = substr($client['buffer'], $req['consumed_bytes']);
        $wsKey = $req['headers']['sec-websocket-key'] ?? null;
        if (!$wsKey) {
            $this->rejectAndClose($id, 400, 'Bad Request', 'Header Sec-WebSocket-Key wajib ada');
            return;
        }

        $path = rtrim($req['path'], '/') ?: '/';
        $routeMap = [
            '/ws/telemetry' => ['channel' => 'telemetry', 'subprotocol' => 'banyuwening.telemetry.v1', 'auth' => 'device'],
            '/ws/control' => ['channel' => 'control', 'subprotocol' => 'banyuwening.control.v1', 'auth' => 'device'],
            '/ws/alerts' => ['channel' => 'alerts', 'subprotocol' => 'banyuwening.alerts.v1', 'auth' => 'either'],
            '/ws/heartbeat' => ['channel' => 'heartbeat', 'subprotocol' => 'banyuwening.heartbeat.v1', 'auth' => 'device'],
            '/ws/ota' => ['channel' => 'ota', 'subprotocol' => 'banyuwening.ota.v1', 'auth' => 'device'],
            '/ws/stream' => ['channel' => 'stream', 'subprotocol' => RealtimeBroadcaster::DASHBOARD_SUBPROTOCOL, 'auth' => 'dashboard'],
        ];

        if (!isset($routeMap[$path])) {
            $this->rejectAndClose($id, 404, 'Not Found', "Kanal WebSocket '{$path}' tidak dikenal");
            return;
        }

        $route = $routeMap[$path];
        $deviceToken = $this->extractDeviceToken($req);
        $dashboardTicket = $req['query']['ticket'] ?? null;

        $authedDevice = null;
        $authedDashboard = null;

        if ($route['auth'] === 'device') {
            $authedDevice = $deviceToken ? Device::findByPlainToken($deviceToken) : null;
            if (!$authedDevice) {
                $this->rejectAndClose($id, 401, 'Unauthorized', 'Token per alat tidak valid atau nonaktif');
                return;
            }
        } elseif ($route['auth'] === 'dashboard') {
            $authedDashboard = $dashboardTicket ? $broadcaster->verifyDashboardTicket((string) $dashboardTicket) : null;
            if (!$authedDashboard) {
                $this->rejectAndClose($id, 401, 'Unauthorized', 'Tiket sesi WebSocket dashboard tidak valid atau kedaluwarsa');
                return;
            }
        } else {
            // 'either': terima token alat atau tiket dashboard
            if ($deviceToken) {
                $authedDevice = Device::findByPlainToken($deviceToken);
            } elseif ($dashboardTicket) {
                $authedDashboard = $broadcaster->verifyDashboardTicket((string) $dashboardTicket);
            }
            if (!$authedDevice && !$authedDashboard) {
                $this->rejectAndClose($id, 401, 'Unauthorized', 'Wajib menyertakan token alat atau tiket dashboard');
                return;
            }
        }

        $supportedSubprotocols = array_values(array_merge(
            array_map(fn ($p) => $p['subprotocol'], RealtimeBroadcaster::PROTOCOLS),
            [RealtimeBroadcaster::DASHBOARD_SUBPROTOCOL]
        ));
        $selectedProtocol = WebSocketProtocol::negotiateSubprotocol(
            $req['headers']['sec-websocket-protocol'] ?? null,
            $supportedSubprotocols
        );

        $handshake = WebSocketProtocol::buildHandshakeResponse($wsKey, $selectedProtocol);
        @fwrite($client['socket'], $handshake);

        $client['handshaked'] = true;
        $client['protocol'] = $selectedProtocol ?? $route['subprotocol'];

        if ($authedDevice) {
            $client['role'] = 'device';
            $client['device_id'] = $authedDevice->id;
            $client['device_code'] = $authedDevice->device_code;
            $client['channels'] = [$route['channel']];

            $authedDevice->forceFill([
                'status' => 'ONLINE',
                'transport_protocol' => 'WEBSOCKET',
                'ws_connected_at' => now(),
                'token_last_used_at' => now(),
            ])->saveQuietly();

            $this->info("[WS+] Device {$authedDevice->device_code} terhubung di {$path} ({$client['protocol']})");

            $this->sendJson($id, [
                'type' => 'connection.ready',
                'protocol' => $client['protocol'],
                'channel' => $route['channel'],
                'device_code' => $authedDevice->device_code,
                'server_time' => now()->toIso8601String(),
            ]);

            // Jika alat terhubung ke kanal control dan ada perintah tertunda, kirim langsung
            if ($route['channel'] === 'control' && is_array($authedDevice->pending_command)) {
                $this->sendJson($id, [
                    'type' => 'control.command',
                    'protocol' => 'banyuwening.control.v1',
                    'device_code' => $authedDevice->device_code,
                    'payload' => $authedDevice->pending_command,
                    'timestamp' => now()->toIso8601String(),
                ]);
            }

            // Jika alat terhubung ke kanal OTA dan ada rilis tertunda, push manifest langsung
            if ($route['channel'] === 'ota') {
                $otaCheck = app(FirmwareOtaService::class)->checkForDevice(
                    $authedDevice,
                    (string) config('app.url'),
                    'WEBSOCKET'
                );
                if (!empty($otaCheck['update_available']) && !empty($otaCheck['manifest'])) {
                    $this->sendJson($id, [
                        'type' => 'ota.manifest',
                        'protocol' => 'banyuwening.ota.v1',
                        'device_code' => $authedDevice->device_code,
                        'payload' => $otaCheck['manifest'],
                        'timestamp' => now()->toIso8601String(),
                    ]);
                }
            }
        } else {
            $requestedChannels = isset($req['query']['channels'])
                ? array_filter(array_map('trim', explode(',', (string) $req['query']['channels'])))
                : ['telemetry', 'control', 'alerts', 'heartbeat', 'ota'];

            $client['role'] = 'dashboard';
            $client['channels'] = $route['channel'] === 'stream' ? $requestedChannels : [$route['channel']];

            $this->info('[WS+] Dashboard client #' . $id . ' terhubung (' . implode(',', $client['channels']) . ')');

            $this->sendJson($id, [
                'type' => 'connection.ready',
                'protocol' => $client['protocol'],
                'channels' => $client['channels'],
                'transport' => 'WEBSOCKET',
                'server_time' => now()->toIso8601String(),
            ]);
        }
    }

    private function handleFrames(
        int $id,
        TelemetryIngestionService $ingestionService,
        RealtimeBroadcaster $broadcaster
    ): void {
        if (!isset($this->clients[$id])) {
            return;
        }

        $frames = WebSocketProtocol::decodeFrames($this->clients[$id]['buffer']);
        foreach ($frames as $frame) {
            $opcode = $frame['opcode'];
            $payload = $frame['payload'];

            if ($opcode === WebSocketProtocol::OPCODE_CLOSE) {
                @fwrite($this->clients[$id]['socket'], WebSocketProtocol::encodeFrame('', WebSocketProtocol::OPCODE_CLOSE));
                $this->disconnectClient($id);
                return;
            }

            if ($opcode === WebSocketProtocol::OPCODE_PING) {
                @fwrite($this->clients[$id]['socket'], WebSocketProtocol::encodeFrame($payload, WebSocketProtocol::OPCODE_PONG));
                continue;
            }

            if ($opcode === WebSocketProtocol::OPCODE_PONG) {
                continue;
            }

            if ($opcode === WebSocketProtocol::OPCODE_TEXT) {
                $this->handleTextMessage($id, $payload, $ingestionService, $broadcaster);
            }
        }
    }

    private function handleTextMessage(
        int $id,
        string $rawPayload,
        TelemetryIngestionService $ingestionService,
        RealtimeBroadcaster $broadcaster
    ): void {
        $client = $this->clients[$id] ?? null;
        if (!$client) {
            return;
        }

        $msg = json_decode($rawPayload, true);
        if (!is_array($msg)) {
            $this->sendJson($id, [
                'type' => 'error',
                'code' => 'INVALID_JSON',
                'message' => 'Payload WebSocket harus berupa objek JSON valid.',
            ]);
            return;
        }

        $type = strtolower((string) ($msg['type'] ?? ''));

        // Ping aplikasi universal (dashboard & alat)
        if ($type === 'ping') {
            $this->sendJson($id, [
                'type' => 'pong',
                'client_ts' => $msg['ts'] ?? null,
                'server_time' => now()->toIso8601String(),
            ]);
            return;
        }

        if ($client['role'] !== 'device' || !$client['device_id']) {
            return;
        }

        $device = Device::find($client['device_id']);
        if (!$device || !$device->token_active) {
            $this->rejectAndClose($id, 401, 'Unauthorized', 'Token alat dicabut');
            return;
        }

        $primaryChannel = $client['channels'][0] ?? 'telemetry';

        try {
            // 1. Protokol banyuwening.telemetry.v1
            if ($primaryChannel === 'telemetry' || $type === 'telemetry') {
                $sensorData = is_array($msg['payload'] ?? null) ? $msg['payload'] : $msg;
                $result = $ingestionService->ingest($device, $sensorData, 'WEBSOCKET');

                $this->sendJson($id, [
                    'type' => 'telemetry.ack',
                    'protocol' => 'banyuwening.telemetry.v1',
                    'seq' => $msg['seq'] ?? null,
                    'reading_id' => $result['reading']->id,
                    'aerator_command' => $result['aerator_command'],
                    'failsafe_triggered' => $result['failsafe_triggered'],
                    'server_time' => now()->toIso8601String(),
                ]);
                return;
            }

            // 2. Protokol banyuwening.heartbeat.v1
            if ($primaryChannel === 'heartbeat' || $type === 'heartbeat') {
                $device->forceFill([
                    'status' => 'ONLINE',
                    'transport_protocol' => 'WEBSOCKET',
                    'last_heartbeat_at' => now(),
                    'ws_connected_at' => now(),
                ])->saveQuietly();

                $broadcaster->publish('heartbeat', 'device.heartbeat', [
                    'device_code' => $device->device_code,
                    'status' => 'ONLINE',
                    'transport_protocol' => 'WEBSOCKET',
                    'rssi' => $msg['rssi'] ?? null,
                    'uptime_s' => $msg['uptime_s'] ?? null,
                    'free_heap' => $msg['free_heap'] ?? null,
                    'battery_v' => $msg['battery_v'] ?? null,
                ], $device->device_code);

                $this->sendJson($id, [
                    'type' => 'heartbeat.pong',
                    'protocol' => 'banyuwening.heartbeat.v1',
                    'device_code' => $device->device_code,
                    'server_time' => now()->toIso8601String(),
                ]);
                return;
            }

            // 3. Protokol banyuwening.control.v1 (ACK eksekusi relay dari alat)
            if ($primaryChannel === 'control' && in_array($type, ['control.ack', 'ack'], true)) {
                $applied = strtoupper((string) ($msg['applied_action'] ?? ($msg['aerator_on'] ? 'ON' : 'OFF')));
                $device->forceFill([
                    'aerator_on' => $applied === 'ON',
                    'mode' => strtoupper((string) ($msg['mode'] ?? $device->mode)),
                    'pending_command' => null,
                    'last_heartbeat_at' => now(),
                ])->save();

                RelayLog::create([
                    'device_id' => $device->id,
                    'action' => $applied,
                    'mode' => $device->mode,
                    'reason' => 'Konfirmasi eksekusi relay via WebSocket (banyuwening.control.v1)',
                    'actor' => $device->device_code,
                    'triggered_at' => now(),
                ]);

                $broadcaster->publish('control', 'control.ack', [
                    'device_code' => $device->device_code,
                    'command_id' => $msg['command_id'] ?? null,
                    'applied_action' => $applied,
                    'aerator_on' => (bool) $device->aerator_on,
                    'mode' => $device->mode,
                ], $device->device_code);

                $this->sendJson($id, [
                    'type' => 'control.ack_recorded',
                    'protocol' => 'banyuwening.control.v1',
                    'server_time' => now()->toIso8601String(),
                ]);
                return;
            }

            // 4. Protokol banyuwening.ota.v1 (Cek manifest & laporan status flashing / rollback)
            if ($primaryChannel === 'ota' || str_starts_with($type, 'ota.')) {
                $otaService = app(FirmwareOtaService::class);
                if ($type === 'ota.check') {
                    $check = $otaService->checkForDevice($device, (string) config('app.url'), 'WEBSOCKET');
                    if (!empty($check['update_available']) && !empty($check['manifest'])) {
                        $this->sendJson($id, [
                            'type' => 'ota.manifest',
                            'protocol' => 'banyuwening.ota.v1',
                            'device_code' => $device->device_code,
                            'payload' => $check['manifest'],
                            'server_time' => now()->toIso8601String(),
                        ]);
                    } else {
                        $this->sendJson($id, [
                            'type' => 'ota.up_to_date',
                            'protocol' => 'banyuwening.ota.v1',
                            'device_code' => $device->device_code,
                            'current_version' => $device->firmware_version,
                            'server_time' => now()->toIso8601String(),
                        ]);
                    }
                    return;
                }

                $statusData = is_array($msg['payload'] ?? null) ? $msg['payload'] : $msg;
                $rollout = $otaService->recordDeviceStatus($device, $statusData, 'WEBSOCKET');
                $this->sendJson($id, [
                    'type' => 'ota.status_ack',
                    'protocol' => 'banyuwening.ota.v1',
                    'device_code' => $device->device_code,
                    'rollout_id' => $rollout?->id,
                    'status' => $rollout?->status,
                    'server_time' => now()->toIso8601String(),
                ]);
                return;
            }
        } catch (\Throwable $e) {
            Log::error('WS message handling error: ' . $e->getMessage());
            $this->sendJson($id, [
                'type' => 'error',
                'code' => 'PROCESSING_ERROR',
                'message' => 'Gagal memproses frame WebSocket.',
            ]);
        }
    }

    private function pumpRealtimeBus(RealtimeBroadcaster $broadcaster): void
    {
        $path = $broadcaster->busFilePath();
        if (!is_file($path)) {
            return;
        }

        clearstatcache(true, $path);
        $size = (int) @filesize($path);
        if ($size < $this->busOffset) {
            $this->busOffset = 0; // Bus dirotasi
        }
        if ($size === $this->busOffset) {
            return;
        }

        $fp = @fopen($path, 'rb');
        if (!$fp) {
            return;
        }

        fseek($fp, $this->busOffset);
        $content = stream_get_contents($fp);
        $this->busOffset = (int) ftell($fp);
        fclose($fp);

        if (!$content) {
            return;
        }

        foreach (explode("\n", trim($content)) as $line) {
            if ($line === '') {
                continue;
            }
            $envelope = json_decode($line, true);
            if (!is_array($envelope)) {
                continue;
            }
            $this->broadcastEnvelope($envelope);
        }
    }

    private function broadcastEnvelope(array $envelope): void
    {
        $channel = $envelope['channel'] ?? 'telemetry';
        $targetDevice = $envelope['device_code'] ?? null;
        $encoded = WebSocketProtocol::encodeFrame(
            json_encode($envelope, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );

        foreach ($this->clients as $id => $client) {
            if (!$client['handshaked']) {
                continue;
            }
            if (!in_array($channel, $client['channels'], true)) {
                continue;
            }
            // Untuk klien perangkat, kirim hanya event yang ditujukan bagi alat tersebut
            if ($client['role'] === 'device' && $targetDevice && $client['device_code'] !== $targetDevice) {
                continue;
            }

            $written = @fwrite($client['socket'], $encoded);
            if ($written === false) {
                $this->disconnectClient($id);
            }
        }
    }

    private function extractDeviceToken(array $req): ?string
    {
        $auth = $req['headers']['authorization'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
            return trim($m[1]);
        }

        if (!empty($req['headers']['x-device-token'])) {
            return trim($req['headers']['x-device-token']);
        }

        if (!empty($req['query']['token'])) {
            return trim((string) $req['query']['token']);
        }

        return null;
    }

    private function sendJson(int $id, array $data): void
    {
        if (!isset($this->clients[$id])) {
            return;
        }
        $frame = WebSocketProtocol::encodeFrame(
            json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );
        $written = @fwrite($this->clients[$id]['socket'], $frame);
        if ($written === false) {
            $this->disconnectClient($id);
        }
    }

    private function rejectAndClose(int $id, int $status, string $reason, string $message): void
    {
        if (!isset($this->clients[$id])) {
            return;
        }
        $resp = WebSocketProtocol::buildHttpErrorResponse($status, $reason, json_encode([
            'success' => false,
            'message' => $message,
        ]));
        @fwrite($this->clients[$id]['socket'], $resp);
        $this->disconnectClient($id);
    }

    private function disconnectClient(int $id): void
    {
        if (!isset($this->clients[$id])) {
            return;
        }
        $client = $this->clients[$id];
        @fclose($client['socket']);
        unset($this->clients[$id]);

        if ($client['role'] === 'device' && $client['device_code']) {
            $this->line("[WS-] Device {$client['device_code']} terputus.");
        }
    }
}
