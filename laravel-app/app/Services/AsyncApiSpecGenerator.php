<?php

namespace App\Services;

class AsyncApiSpecGenerator
{
    public function __construct(
        private readonly RealtimeBroadcaster $broadcaster
    ) {
    }

    /**
     * Hasilkan dokumen standar AsyncAPI 3.0.0 untuk seluruh protokol WebSocket BanyuWening.
     */
    public function generate(string $httpOrigin): array
    {
        $origin = rtrim($httpOrigin, '/');
        $realtime = $this->broadcaster->getRealtimeConfig(null, $origin);
        $wsUrl = $realtime['ws_base_url'];
        $parsed = parse_url($wsUrl);
        $wsScheme = $parsed['scheme'] ?? 'ws';
        $wsHost = ($parsed['host'] ?? '127.0.0.1') . (isset($parsed['port']) ? ':' . $parsed['port'] : '');

        return [
            'asyncapi' => '3.0.0',
            'id' => 'urn:id:banyuwening:iot:realtime',
            'info' => [
                'title' => 'BanyuWening Multi-Protocol WebSocket API (AsyncAPI 3.0)',
                'version' => '2.3.0',
                'description' => implode("\n\n", [
                    'Spesifikasi **AsyncAPI 3.0.0** untuk komunikasi realtime kecepatan tinggi berbasis **WebSocket multi-protokol** pada sistem akuakultur cerdas **BanyuWening**.',
                    '- **Jalankan Server WS**: `php artisan ws:serve` (default `' . $wsUrl . '`).',
                    '- **Autentikasi Per Alat**: wajib menyertakan token unik per alat (`bw_dev_...`) via query `?token=<token>`, header `Authorization: Bearer <token>`, atau `X-Device-Token: <token>`.',
                    '- **HTTP Fallback Otomatis**: bila koneksi WebSocket gagal atau timeout, perangkat otomatis beralih ke `' . $origin . '/api/http/*` dan Dashboard beralih ke `' . $origin . '/api/latest` + `/api/alerts/recent`.',
                    '- **Standar Parameter**: Suhu (25–30 °C) dan pH (6,5–8,5) mengacu pada **SNI 8228.4:2015**. TDS, turbidity, dan ketinggian air dipantau sebagai fitur pengujian sampai batas lokal kolam tervalidasi.',
                ]),
                'contact' => [
                    'name' => 'Tim Teknis BanyuWening',
                    'email' => 'admin@banyuwening.id',
                ],
            ],
            'defaultContentType' => 'application/json',
            'servers' => [
                'banyuweningWs' => [
                    'host' => $wsHost,
                    'protocol' => $wsScheme,
                    'description' => 'Server WebSocket Multi-Protokol BanyuWening (php artisan ws:serve)',
                    'security' => [
                        ['$ref' => '#/components/securitySchemes/deviceTokenQuery'],
                        ['$ref' => '#/components/securitySchemes/deviceBearerAuth'],
                        ['$ref' => '#/components/securitySchemes/deviceHeaderAuth'],
                    ],
                ],
            ],
            'channels' => [
                'telemetry' => [
                    'address' => '/ws/telemetry',
                    'title' => 'Telemetry Stream (banyuwening.telemetry.v1)',
                    'description' => 'Sub-protokol `banyuwening.telemetry.v1` untuk pengiriman data sensor frekuensi tinggi dari ESP32 dan penerimaan ACK failsafe instan. HTTP Fallback: `POST /api/http/telemetry` & `POST /api/http/telemetry/batch`.',
                    'messages' => [
                        'telemetryIngest' => ['$ref' => '#/components/messages/TelemetryIngest'],
                        'telemetryAck' => ['$ref' => '#/components/messages/TelemetryAck'],
                    ],
                    'bindings' => [
                        'ws' => [
                            'method' => 'GET',
                            'query' => [
                                'type' => 'object',
                                'properties' => [
                                    'token' => [
                                        'type' => 'string',
                                        'description' => 'Token unik per alat (bw_dev_...)',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                'control' => [
                    'address' => '/ws/control',
                    'title' => 'Actuator Control Channel (banyuwening.control.v1)',
                    'description' => 'Sub-protokol `banyuwening.control.v1` untuk push perintah relay aerator (ON/OFF/AUTO/FAILSAFE) secara instan dan penerimaan konfirmasi eksekusi (ACK). HTTP Fallback: `GET /api/http/commands` & `POST /api/http/commands/ack`.',
                    'messages' => [
                        'controlCommand' => ['$ref' => '#/components/messages/ControlCommand'],
                        'controlAck' => ['$ref' => '#/components/messages/ControlAck'],
                    ],
                ],
                'alerts' => [
                    'address' => '/ws/alerts',
                    'title' => 'ML Prediction & Critical Alerts (banyuwening.alerts.v1)',
                    'description' => 'Sub-protokol `banyuwening.alerts.v1` untuk push hasil inferensi Random Forest (AMAN/WASPADA/BAHAYA) dan peringatan darurat. HTTP Fallback: `GET /api/alerts/recent`.',
                    'messages' => [
                        'predictionUpdate' => ['$ref' => '#/components/messages/PredictionUpdate'],
                    ],
                ],
                'heartbeat' => [
                    'address' => '/ws/heartbeat',
                    'title' => 'Device Heartbeat & Presence (banyuwening.heartbeat.v1)',
                    'description' => 'Sub-protokol `banyuwening.heartbeat.v1` untuk keepalive ringan (RSSI WiFi, uptime, free heap, tegangan baterai) dan pengukuran latensi RTT. HTTP Fallback: `POST /api/http/heartbeat`.',
                    'messages' => [
                        'heartbeatPing' => ['$ref' => '#/components/messages/HeartbeatPing'],
                        'heartbeatPong' => ['$ref' => '#/components/messages/HeartbeatPong'],
                    ],
                ],
                'ota' => [
                    'address' => '/ws/ota',
                    'title' => 'Dual-OTA Firmware Protocol (banyuwening.ota.v1)',
                    'description' => 'Sub-protokol `banyuwening.ota.v1` untuk push manifest firmware bertanda tangan HMAC-SHA256 secara instan ke ESP32 dan menerima progres flashing / boot health check 60 detik / auto-rollback. HTTP Fallback: `GET /api/http/ota/check`, `GET /api/http/ota/download/{version}`, `POST /api/http/ota/status`.',
                    'messages' => [
                        'otaManifestPush' => ['$ref' => '#/components/messages/OtaManifestPush'],
                        'otaStatusReport' => ['$ref' => '#/components/messages/OtaStatusReport'],
                    ],
                ],
                'dashboardStream' => [
                    'address' => '/ws/stream',
                    'title' => 'Multiplexed Dashboard Stream (banyuwening.dashboard.v1)',
                    'description' => 'Sub-protokol `banyuwening.dashboard.v1` untuk Dashboard Web terautentikasi (menggunakan `?ticket=<hmac_ticket>&channels=telemetry,control,alerts,heartbeat,ota`). HTTP Fallback: `GET /api/latest` + `GET /api/alerts/recent`.',
                    'messages' => [
                        'telemetryBroadcast' => ['$ref' => '#/components/messages/TelemetryBroadcast'],
                        'controlCommand' => ['$ref' => '#/components/messages/ControlCommand'],
                        'predictionUpdate' => ['$ref' => '#/components/messages/PredictionUpdate'],
                        'heartbeatPong' => ['$ref' => '#/components/messages/HeartbeatPong'],
                        'otaStatusReport' => ['$ref' => '#/components/messages/OtaStatusReport'],
                    ],
                ],
            ],
            'operations' => [
                'sendTelemetry' => [
                    'action' => 'send',
                    'channel' => ['$ref' => '#/channels/telemetry'],
                    'summary' => 'Alat ESP32 mengirim paket sensor realtime ke server',
                    'messages' => [
                        ['$ref' => '#/channels/telemetry/messages/telemetryIngest'],
                    ],
                ],
                'receiveTelemetryAck' => [
                    'action' => 'receive',
                    'channel' => ['$ref' => '#/channels/telemetry'],
                    'summary' => 'Server membalas ACK penyimpanan + perintah aerator/failsafe instan',
                    'messages' => [
                        ['$ref' => '#/channels/telemetry/messages/telemetryAck'],
                    ],
                ],
                'receiveControlCommand' => [
                    'action' => 'receive',
                    'channel' => ['$ref' => '#/channels/control'],
                    'summary' => 'Alat menerima perintah kontrol relay aerator dari Dashboard/Server',
                    'messages' => [
                        ['$ref' => '#/channels/control/messages/controlCommand'],
                    ],
                ],
                'sendControlAck' => [
                    'action' => 'send',
                    'channel' => ['$ref' => '#/channels/control'],
                    'summary' => 'Alat mengirim konfirmasi bahwa relay fisik sudah dieksekusi',
                    'messages' => [
                        ['$ref' => '#/channels/control/messages/controlAck'],
                    ],
                ],
                'receivePredictionAlerts' => [
                    'action' => 'receive',
                    'channel' => ['$ref' => '#/channels/alerts'],
                    'summary' => 'Klien menerima hasil prediksi Random Forest & alarm realtime',
                    'messages' => [
                        ['$ref' => '#/channels/alerts/messages/predictionUpdate'],
                    ],
                ],
                'sendHeartbeat' => [
                    'action' => 'send',
                    'channel' => ['$ref' => '#/channels/heartbeat'],
                    'summary' => 'Alat mengirim frame heartbeat ringan (RSSI, uptime, baterai)',
                    'messages' => [
                        ['$ref' => '#/channels/heartbeat/messages/heartbeatPing'],
                    ],
                ],
                'receiveHeartbeatPong' => [
                    'action' => 'receive',
                    'channel' => ['$ref' => '#/channels/heartbeat'],
                    'summary' => 'Server membalas heartbeat.pong beserta waktu server',
                    'messages' => [
                        ['$ref' => '#/channels/heartbeat/messages/heartbeatPong'],
                    ],
                ],
                'receiveOtaManifest' => [
                    'action' => 'receive',
                    'channel' => ['$ref' => '#/channels/ota'],
                    'summary' => 'Alat ESP32 menerima manifest firmware Dual-OTA bertanda tangan HMAC-SHA256',
                    'messages' => [
                        ['$ref' => '#/channels/ota/messages/otaManifestPush'],
                    ],
                ],
                'sendOtaStatus' => [
                    'action' => 'send',
                    'channel' => ['$ref' => '#/channels/ota'],
                    'summary' => 'Alat mengirim progres flashing, health-check 60s, atau status rollback OTA',
                    'messages' => [
                        ['$ref' => '#/channels/ota/messages/otaStatusReport'],
                    ],
                ],
                'subscribeDashboardStream' => [
                    'action' => 'receive',
                    'channel' => ['$ref' => '#/channels/dashboardStream'],
                    'summary' => 'Dashboard Web menerima seluruh event realtime multi-kanal',
                    'messages' => [
                        ['$ref' => '#/channels/dashboardStream/messages/telemetryBroadcast'],
                        ['$ref' => '#/channels/dashboardStream/messages/controlCommand'],
                        ['$ref' => '#/channels/dashboardStream/messages/predictionUpdate'],
                    ],
                ],
            ],
            'components' => [
                'securitySchemes' => [
                    'deviceTokenQuery' => [
                        'type' => 'httpApiKey',
                        'name' => 'token',
                        'in' => 'query',
                        'description' => 'Token unik per alat pada URL WebSocket (`?token=bw_dev_...`).',
                    ],
                    'deviceBearerAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'bw_dev_<48-hex>',
                        'description' => 'Header `Authorization: Bearer <token>` pada WebSocket upgrade (ESP32/Python).',
                    ],
                    'deviceHeaderAuth' => [
                        'type' => 'httpApiKey',
                        'name' => 'X-Device-Token',
                        'in' => 'header',
                        'description' => 'Header alternatif token per alat untuk klien IoT.',
                    ],
                    'dashboardTicket' => [
                        'type' => 'httpApiKey',
                        'name' => 'ticket',
                        'in' => 'query',
                        'description' => 'Tiket sementara bertanda tangan HMAC-SHA256 untuk Dashboard Web (`/ws/stream`).',
                    ],
                ],
                'messages' => [
                    'TelemetryIngest' => [
                        'name' => 'TelemetryIngest',
                        'title' => 'Frame Telemetri Sensor ESP32',
                        'contentType' => 'application/json',
                        'summary' => 'Payload sensor yang dikirim perangkat melalui banyuwening.telemetry.v1',
                        'payload' => [
                            'type' => 'object',
                            'required' => ['type', 'ph', 'temperature_c'],
                            'properties' => [
                                'type' => ['type' => 'string', 'const' => 'telemetry'],
                                'seq' => ['type' => 'integer', 'description' => 'Nomor urut frame untuk pelacakan ACK'],
                                'ph' => ['type' => 'number', 'minimum' => 0, 'maximum' => 14],
                                'temperature_c' => ['type' => 'number', 'minimum' => 0, 'maximum' => 50],
                                'tds_ppm' => ['type' => 'number', 'minimum' => 0, 'maximum' => 10000],
                                'turbidity_ntu' => ['type' => 'number', 'minimum' => 0, 'maximum' => 1000],
                                'water_level' => ['type' => 'string', 'enum' => ['NORMAL', 'LOW', 'SURUT', 'MELIMPAH']],
                                'aerator_on' => ['type' => 'boolean'],
                                'mode' => ['type' => 'string', 'enum' => ['AUTO', 'MANUAL', 'FAILSAFE']],
                                'battery_v' => ['type' => 'number'],
                            ],
                        ],
                        'examples' => [
                            [
                                'name' => 'KondisiNormalSNI',
                                'summary' => 'Pembacaan aman sesuai SNI 8228.4:2015',
                                'payload' => [
                                    'type' => 'telemetry',
                                    'seq' => 101,
                                    'ph' => 7.15,
                                    'temperature_c' => 28.4,
                                    'tds_ppm' => 355.0,
                                    'turbidity_ntu' => 36.2,
                                    'water_level' => 'NORMAL',
                                    'aerator_on' => false,
                                    'mode' => 'AUTO',
                                    'battery_v' => 4.14,
                                ],
                            ],
                        ],
                    ],
                    'TelemetryAck' => [
                        'name' => 'TelemetryAck',
                        'title' => 'ACK Telemetri Server',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'properties' => [
                                'type' => ['type' => 'string', 'const' => 'telemetry.ack'],
                                'protocol' => ['type' => 'string', 'const' => 'banyuwening.telemetry.v1'],
                                'seq' => ['type' => 'integer'],
                                'reading_id' => ['type' => 'integer'],
                                'aerator_command' => ['type' => 'string', 'enum' => ['ON', 'OFF']],
                                'failsafe_triggered' => ['type' => 'boolean'],
                                'server_time' => ['type' => 'string', 'format' => 'date-time'],
                            ],
                        ],
                    ],
                    'TelemetryBroadcast' => [
                        'name' => 'TelemetryBroadcast',
                        'title' => 'Siaran Telemetri Realtime ke Dashboard',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'properties' => [
                                'id' => ['type' => 'string', 'format' => 'uuid'],
                                'channel' => ['type' => 'string', 'const' => 'telemetry'],
                                'protocol' => ['type' => 'string', 'const' => 'banyuwening.telemetry.v1'],
                                'event' => ['type' => 'string', 'const' => 'telemetry.update'],
                                'device_code' => ['type' => 'string'],
                                'timestamp' => ['type' => 'string', 'format' => 'date-time'],
                                'payload' => ['type' => 'object'],
                            ],
                        ],
                    ],
                    'ControlCommand' => [
                        'name' => 'ControlCommand',
                        'title' => 'Perintah Aktuator Relay Aerator',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'properties' => [
                                'event' => ['type' => 'string', 'const' => 'control.command'],
                                'protocol' => ['type' => 'string', 'const' => 'banyuwening.control.v1'],
                                'device_code' => ['type' => 'string'],
                                'payload' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'command_id' => ['type' => 'string'],
                                        'action' => ['type' => 'string', 'enum' => ['ON', 'OFF', 'AUTO']],
                                        'aerator_on' => ['type' => 'boolean'],
                                        'mode' => ['type' => 'string', 'enum' => ['AUTO', 'MANUAL', 'FAILSAFE']],
                                        'duration_seconds' => ['type' => 'integer'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'ControlAck' => [
                        'name' => 'ControlAck',
                        'title' => 'Konfirmasi Eksekusi Relay dari Alat',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'required' => ['type', 'applied_action'],
                            'properties' => [
                                'type' => ['type' => 'string', 'const' => 'control.ack'],
                                'command_id' => ['type' => 'string'],
                                'applied_action' => ['type' => 'string', 'enum' => ['ON', 'OFF', 'AUTO']],
                                'mode' => ['type' => 'string', 'enum' => ['AUTO', 'MANUAL', 'FAILSAFE']],
                            ],
                        ],
                    ],
                    'PredictionUpdate' => [
                        'name' => 'PredictionUpdate',
                        'title' => 'Pembaruan Prediksi Random Forest & Alert',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'properties' => [
                                'channel' => ['type' => 'string', 'const' => 'alerts'],
                                'protocol' => ['type' => 'string', 'const' => 'banyuwening.alerts.v1'],
                                'event' => ['type' => 'string', 'const' => 'prediction.update'],
                                'device_code' => ['type' => 'string'],
                                'payload' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'prediction' => ['type' => 'object'],
                                        'alert' => ['type' => ['object', 'null']],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'HeartbeatPing' => [
                        'name' => 'HeartbeatPing',
                        'title' => 'Heartbeat Perangkat IoT',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'required' => ['type'],
                            'properties' => [
                                'type' => ['type' => 'string', 'const' => 'heartbeat'],
                                'rssi' => ['type' => 'integer', 'example' => -59],
                                'uptime_s' => ['type' => 'integer', 'example' => 3600],
                                'free_heap' => ['type' => 'integer', 'example' => 204800],
                                'battery_v' => ['type' => 'number', 'example' => 4.15],
                            ],
                        ],
                    ],
                    'HeartbeatPong' => [
                        'name' => 'HeartbeatPong',
                        'title' => 'Balasan Heartbeat Server',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'properties' => [
                                'type' => ['type' => 'string', 'const' => 'heartbeat.pong'],
                                'protocol' => ['type' => 'string', 'const' => 'banyuwening.heartbeat.v1'],
                                'device_code' => ['type' => 'string'],
                                'server_time' => ['type' => 'string', 'format' => 'date-time'],
                            ],
                        ],
                    ],
                    'OtaManifestPush' => [
                        'name' => 'OtaManifestPush',
                        'title' => 'Push Manifest Firmware Dual-OTA ESP32',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'properties' => [
                                'type' => ['type' => 'string', 'const' => 'ota.manifest'],
                                'protocol' => ['type' => 'string', 'const' => 'banyuwening.ota.v1'],
                                'device_code' => ['type' => 'string'],
                                'payload' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'rollout_id' => ['type' => 'integer'],
                                        'version' => ['type' => 'string'],
                                        'size_bytes' => ['type' => 'integer'],
                                        'sha256' => ['type' => 'string'],
                                        'signature_hmac_sha256' => ['type' => 'string'],
                                        'rollback_timeout_s' => ['type' => 'integer'],
                                        'download_url' => ['type' => 'string', 'format' => 'uri'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                    'OtaStatusReport' => [
                        'name' => 'OtaStatusReport',
                        'title' => 'Laporan Progres & Health Check Dual-OTA ESP32',
                        'contentType' => 'application/json',
                        'payload' => [
                            'type' => 'object',
                            'required' => ['type', 'status'],
                            'properties' => [
                                'type' => ['type' => 'string', 'const' => 'ota.status'],
                                'rollout_id' => ['type' => 'integer'],
                                'status' => [
                                    'type' => 'string',
                                    'enum' => ['NOTIFIED', 'DOWNLOADING', 'VERIFYING', 'FLASHING', 'REBOOTING', 'HEALTH_CHECK', 'COMPLETED', 'FAILED', 'ROLLED_BACK'],
                                ],
                                'progress_pct' => ['type' => 'integer', 'minimum' => 0, 'maximum' => 100],
                                'active_partition' => ['type' => 'string'],
                                'boot_health_ok' => ['type' => 'boolean'],
                                'error_message' => ['type' => 'string'],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Serialisasi struktur AsyncAPI 3.0.0 menjadi YAML valid tanpa dependensi eksternal.
     */
    public function toYaml(array $spec): string
    {
        return $this->dumpYamlValue($spec, 0) . "\n";
    }

    private function dumpYamlValue(mixed $value, int $indent): string
    {
        $pad = str_repeat('  ', $indent);

        if (is_array($value)) {
            if ($value === []) {
                return '[]';
            }

            $isList = array_is_list($value);
            $lines = [];

            if ($isList) {
                foreach ($value as $item) {
                    if (is_array($item) && $item !== []) {
                        $nested = $this->dumpYamlValue($item, $indent + 1);
                        $nestedLines = explode("\n", $nested);
                        $first = array_shift($nestedLines);
                        $lines[] = $pad . '- ' . ltrim($first);
                        foreach ($nestedLines as $nl) {
                            $lines[] = $nl;
                        }
                    } else {
                        $lines[] = $pad . '- ' . $this->formatScalar($item);
                    }
                }
            } else {
                foreach ($value as $k => $v) {
                    $keyStr = $this->formatKey((string) $k);
                    if (is_array($v) && $v !== []) {
                        $lines[] = $pad . $keyStr . ':';
                        $lines[] = $this->dumpYamlValue($v, $indent + 1);
                    } elseif (is_string($v) && str_contains($v, "\n")) {
                        $lines[] = $pad . $keyStr . ': |';
                        foreach (explode("\n", $v) as $ml) {
                            $lines[] = $pad . '  ' . $ml;
                        }
                    } else {
                        $lines[] = $pad . $keyStr . ': ' . $this->formatScalar($v);
                    }
                }
            }

            return implode("\n", $lines);
        }

        return $this->formatScalar($value);
    }

    private function formatKey(string $key): string
    {
        if (preg_match('/^[A-Za-z0-9_.-]+$/', $key) && !in_array(strtolower($key), ['true', 'false', 'null', 'yes', 'no'], true)) {
            return $key;
        }
        return "'" . str_replace("'", "''", $key) . "'";
    }

    private function formatScalar(mixed $v): string
    {
        if ($v === null) {
            return 'null';
        }
        if (is_bool($v)) {
            return $v ? 'true' : 'false';
        }
        if (is_int($v) || is_float($v)) {
            return (string) $v;
        }
        if (is_array($v)) {
            return '[]';
        }

        $s = (string) $v;
        if ($s === '') {
            return "''";
        }
        if (
            preg_match('/[:#\[\]{}&*!|>\'"%@`,?]/', $s)
            || preg_match('/^\s|\s$/', $s)
            || is_numeric($s)
            || in_array(strtolower($s), ['true', 'false', 'null', 'yes', 'no', 'on', 'off'], true)
        ) {
            return json_encode($s, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        return $s;
    }
}
