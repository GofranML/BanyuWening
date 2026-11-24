<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class RealtimeBroadcaster
{
    public const PROTOCOLS = [
        'telemetry' => [
            'subprotocol' => 'banyuwening.telemetry.v1',
            'path' => '/ws/telemetry',
            'direction' => 'bidirectional',
            'purpose' => 'Streaming data sensor frekuensi tinggi (pH, suhu, TDS, turbiditas, level air) dengan latensi milidetik.',
            'http_fallback' => [
                'ingest' => 'POST /api/http/telemetry',
                'batch' => 'POST /api/http/telemetry/batch',
                'read' => 'GET /api/latest',
            ],
        ],
        'control' => [
            'subprotocol' => 'banyuwening.control.v1',
            'path' => '/ws/control',
            'direction' => 'bidirectional',
            'purpose' => 'Pengiriman perintah aktuator relay aerator instan (ON/OFF/AUTO/FAILSAFE) beserta ACK perangkat.',
            'http_fallback' => [
                'poll_commands' => 'GET /api/http/commands',
                'ack' => 'POST /api/http/commands/ack',
            ],
        ],
        'alerts' => [
            'subprotocol' => 'banyuwening.alerts.v1',
            'path' => '/ws/alerts',
            'direction' => 'server_to_client',
            'purpose' => 'Push seketika hasil inferensi Random Forest (AMAN/WASPADA/BAHAYA) dan alarm darurat failsafe.',
            'http_fallback' => [
                'read' => 'GET /api/alerts/recent',
            ],
        ],
        'heartbeat' => [
            'subprotocol' => 'banyuwening.heartbeat.v1',
            'path' => '/ws/heartbeat',
            'direction' => 'bidirectional',
            'purpose' => 'Keepalive low-overhead (ping/pong, RSSI WiFi, uptime, free heap) untuk deteksi perangkat offline cepat.',
            'http_fallback' => [
                'ping' => 'POST /api/http/heartbeat',
            ],
        ],
        'ota' => [
            'subprotocol' => 'banyuwening.ota.v1',
            'path' => '/ws/ota',
            'direction' => 'bidirectional',
            'purpose' => 'Distribusi manifest pembaruan firmware Dual-OTA ESP32 bertanda tangan HMAC-SHA256 dan pelaporan status flashing/auto-rollback.',
            'http_fallback' => [
                'check' => 'GET /api/http/ota/check',
                'download' => 'GET /api/http/ota/download/{version}',
                'status' => 'POST /api/http/ota/status',
            ],
        ],
    ];

    public const DASHBOARD_SUBPROTOCOL = 'banyuwening.dashboard.v1';

    public function busFilePath(): string
    {
        return storage_path('framework/realtime-bus.jsonl');
    }

    /**
     * Terbitkan event realtime ke bus lokal agar segera diteruskan oleh server WebSocket (ws:serve).
     */
    public function publish(string $channel, string $event, array $payload, ?string $deviceCode = null): array
    {
        $envelope = [
            'id' => (string) Str::uuid(),
            'channel' => $channel,
            'protocol' => self::PROTOCOLS[$channel]['subprotocol'] ?? self::DASHBOARD_SUBPROTOCOL,
            'event' => $event,
            'device_code' => $deviceCode,
            'timestamp' => now()->toIso8601String(),
            'payload' => $payload,
        ];

        $path = $this->busFilePath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        // Jaga ukuran bus tetap kecil (rotasi jika > 2 MB)
        if (is_file($path) && @filesize($path) > 2 * 1024 * 1024) {
            @file_put_contents($path, '', LOCK_EX);
        }

        $line = json_encode($envelope, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
        @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);

        return $envelope;
    }

    /**
     * Terbitkan tiket sementara bertanda tangan HMAC untuk koneksi WebSocket Dashboard Browser.
     */
    public function issueDashboardTicket(User $user, int $ttlSeconds = 7200): string
    {
        $payload = [
            'uid' => $user->id,
            'role' => $user->role,
            'exp' => time() + $ttlSeconds,
            'nonce' => bin2hex(random_bytes(8)),
        ];

        $encoded = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $encoded, $this->signingKey());

        return $encoded . '.' . $sig;
    }

    /**
     * Verifikasi tiket koneksi WebSocket Dashboard Browser.
     */
    public function verifyDashboardTicket(string $ticket): ?array
    {
        $parts = explode('.', trim($ticket), 2);
        if (count($parts) !== 2) {
            return null;
        }

        [$encoded, $sig] = $parts;
        $expected = hash_hmac('sha256', $encoded, $this->signingKey());

        if (!hash_equals($expected, $sig)) {
            return null;
        }

        $padded = strtr($encoded, '-_', '+/');
        $mod = strlen($padded) % 4;
        if ($mod > 0) {
            $padded .= str_repeat('=', 4 - $mod);
        }

        $decoded = json_decode(base64_decode($padded, true) ?: '', true);
        if (!is_array($decoded) || ($decoded['exp'] ?? 0) < time()) {
            return null;
        }

        return $decoded;
    }

    /**
     * Konfigurasi protokol WebSocket + HTTP fallback yang dikirim ke dashboard dan endpoint /api/realtime/config.
     */
    public function getRealtimeConfig(?User $user = null, ?string $httpOrigin = null): array
    {
        $wsBase = rtrim((string) config('services.realtime.ws_public_url', 'ws://127.0.0.1:8081'), '/');
        $httpBase = rtrim($httpOrigin ?: (string) config('app.url', 'http://127.0.0.1:8000'), '/');

        if ($httpOrigin) {
            $httpHost = parse_url($httpOrigin, PHP_URL_HOST);
            $wsHost = parse_url($wsBase, PHP_URL_HOST);
            $isLocalHttp = in_array($httpHost, ['127.0.0.1', 'localhost'], true);
            if (!$isLocalHttp && $httpHost && $wsHost && str_contains((string) $wsHost, '.ciptasol.cloud') && strcasecmp((string) $httpHost, (string) $wsHost) !== 0) {
                $scheme = parse_url($httpOrigin, PHP_URL_SCHEME) === 'https' ? 'wss' : 'ws';
                $port = parse_url($httpOrigin, PHP_URL_PORT);
                $wsBase = $scheme . '://' . $httpHost . ($port ? ':' . $port : '');
            }
        }

        $protocols = [];
        foreach (self::PROTOCOLS as $key => $meta) {
            $protocols[$key] = [
                'channel' => $key,
                'subprotocol' => $meta['subprotocol'],
                'ws_url' => $wsBase . $meta['path'],
                'direction' => $meta['direction'],
                'purpose' => $meta['purpose'],
                'http_fallback' => $meta['http_fallback'],
            ];
        }

        return [
            'ws_base_url' => $wsBase,
            'ws_stream_url' => $wsBase . '/ws/stream',
            'dashboard_subprotocol' => self::DASHBOARD_SUBPROTOCOL,
            'dashboard_ticket' => $user ? $this->issueDashboardTicket($user) : null,
            'ws_connect_timeout_ms' => (int) config('services.realtime.ws_connect_timeout_ms', 3000),
            'http_fallback' => [
                'enabled' => true,
                'poll_interval_ms' => (int) config('services.realtime.http_fallback_poll_ms', 5000),
                'base_url' => $httpBase . '/api',
                'endpoints' => [
                    'telemetry_ingest' => $httpBase . '/api/http/telemetry',
                    'telemetry_batch' => $httpBase . '/api/http/telemetry/batch',
                    'heartbeat' => $httpBase . '/api/http/heartbeat',
                    'commands_poll' => $httpBase . '/api/http/commands',
                    'commands_ack' => $httpBase . '/api/http/commands/ack',
                    'ota_check' => $httpBase . '/api/http/ota/check',
                    'ota_status' => $httpBase . '/api/http/ota/status',
                    'ml_status' => $httpBase . '/api/ml/status',
                    'ml_predict' => $httpBase . '/api/ml/predict',
                    'ml_performance' => $httpBase . '/api/ml/performance',
                    'latest' => $httpBase . '/api/latest',
                    'history' => $httpBase . '/api/history',
                    'alerts_recent' => $httpBase . '/api/alerts/recent',
                ],
            ],
            'protocols' => $protocols,
            'auth' => [
                'device_token_header' => 'Authorization: Bearer <device_token>',
                'device_token_alt_header' => 'X-Device-Token: <device_token>',
                'device_token_ws_query' => '?token=<device_token>',
            ],
        ];
    }

    private function signingKey(): string
    {
        return (string) config('app.key', 'banyuwening-realtime-fallback-key');
    }
}
