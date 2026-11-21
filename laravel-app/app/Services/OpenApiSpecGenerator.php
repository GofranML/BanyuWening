<?php

namespace App\Services;

class OpenApiSpecGenerator
{
    public function __construct(
        private readonly RealtimeBroadcaster $broadcaster
    ) {
    }

    public function generate(string $httpOrigin): array
    {
        $origin = rtrim($httpOrigin, '/');
        $realtime = $this->broadcaster->getRealtimeConfig(null, $origin);
        $wsBaseUrl = $realtime['ws_base_url'];

        return [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'BanyuWening IoT, Dual-OTA & Random Forest MLOps API',
                'version' => '2.4.0',
                'description' => implode("\n\n", [
                    'Standar dokumentasi OpenAPI 3.0.3 / Swagger UI untuk platform pemantauan kualitas air kolam lele **BanyuWening**.',
                    '### Arsitektur Transportasi Hybrid (WebSocket-First + HTTP Fallback)',
                    '- **Jalur Utama Kecepatan Tinggi (WebSocket Multi-Protokol)**: menggunakan 5 sub-protokol khusus (`banyuwening.telemetry.v1`, `banyuwening.control.v1`, `banyuwening.alerts.v1`, `banyuwening.heartbeat.v1`, `banyuwening.ota.v1`) di `' . $wsBaseUrl . '` untuk latensi milidetik.',
                    '- **Jalur Cadangan Otomatis (HTTP Fallback)**: jika koneksi WebSocket gagal atau terputus di jaringan lapangan, node ESP32 dan dashboard otomatis beralih ke endpoint `/api/http/*`, `/api/http/ota/*`, `/api/latest`, dan `/api/alerts/recent` tanpa kehilangan data.',
                    '### Protokol Dual-OTA & Random Forest API',
                    '- **Dual-OTA ESP32**: signed manifest HMAC-SHA256 + SHA-256 checksum verification + auto-rollback 60 detik (`/api/http/ota/*` & `/ws/ota`).',
                    '- **Random Forest ML API & Self-Learning**: inferensi on-demand/batch, monitoring performa & latensi, serta siklus evaluasi/training AI Agent (`/api/ml/*`).',
                    '### Autentikasi Token Per Alat',
                    'Setiap node alat IoT memiliki token unik (`bw_dev_...`) yang disimpan sebagai hash SHA-256 dan hanya berlaku untuk `device_code` miliknya (mencegah spoofing antar-alat). Kirim via header `Authorization: Bearer <token>` atau `X-Device-Token: <token>`.',
                    '### Catatan Standar Parameter (SNI 8228.4:2015)',
                    'Rentang aman **Suhu (25–30 °C)** dan **pH (6,5–8,5)** mengacu pada SNI 8228.4:2015. Parameter **TDS, Turbidity, dan Ketinggian Air** tetap diterima sebagai fitur pengujian/pemantauan, namun batas universalnya belum ditetapkan dan harus divalidasi secara lokal per kolam.',
                ]),
                'contact' => [
                    'name' => 'Tim Teknis BanyuWening',
                    'email' => 'admin@banyuwening.id',
                ],
            ],
            'servers' => [
                [
                    'url' => $origin,
                    'description' => 'Server HTTP & Fallback REST API Aktif',
                ],
            ],
            'tags' => [
                [
                    'name' => 'Telemetry (HTTP & Fallback)',
                    'description' => 'Ingesti data sensor per alat (satuan & batch) saat WebSocket banyuwening.telemetry.v1 tidak terhubung atau via HTTP langsung.',
                ],
                [
                    'name' => 'Device Control & Heartbeat (HTTP Fallback)',
                    'description' => 'Pengganti HTTP untuk protokol WebSocket banyuwening.control.v1 dan banyuwening.heartbeat.v1.',
                ],
                [
                    'name' => 'ESP32 Dual-OTA Firmware Protocol',
                    'description' => 'HTTP Fallback protokol pembaruan firmware Over-The-Air ESP32 (`banyuwening.ota.v1`) dengan manifest bertanda tangan HMAC-SHA256, SHA-256 binary checksum, dan pelaporan auto-rollback.',
                ],
                [
                    'name' => 'Random Forest ML & Performance',
                    'description' => 'Inferensi Random Forest on-demand/batch, status model aktif, riwayat prediksi, serta metrik trafik performa & AI self-learning.',
                ],
                [
                    'name' => 'Monitoring & History',
                    'description' => 'Pembacaan data terkini, riwayat deret waktu, dan peringatan terbaru (juga dipakai sebagai HTTP fallback Dashboard).',
                ],
                [
                    'name' => 'Realtime & WebSocket Discovery',
                    'description' => 'Penemuan endpoint WebSocket multi-protokol, sub-protokol aktif, dan konfigurasi HTTP fallback.',
                ],
                [
                    'name' => 'System Health',
                    'description' => 'Pemeriksaan kesehatan layanan REST API dan status server.',
                ],
            ],
            'x-websocket-protocols' => $realtime['protocols'],
            'components' => [
                'securitySchemes' => [
                    'DeviceBearerAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'bw_dev_<48-hex>',
                        'description' => 'Token unik per alat IoT. Contoh: `Authorization: Bearer bw_dev_...`. Dapat dibuat/dirotasi di menu Super Admin > API & Token Alat.',
                    ],
                    'DeviceHeaderAuth' => [
                        'type' => 'apiKey',
                        'in' => 'header',
                        'name' => 'X-Device-Token',
                        'description' => 'Header alternatif untuk mikrokontroler ESP32 / gateway lapangan.',
                    ],
                ],
                'schemas' => $this->schemas(),
            ],
            'paths' => $this->paths($wsBaseUrl),
        ];
    }

    private function schemas(): array
    {
        return [
            'TelemetryPayload' => [
                'type' => 'object',
                'required' => ['ph', 'temperature_c'],
                'properties' => [
                    'device_code' => [
                        'type' => 'string',
                        'example' => 'ESP32-NODE-01',
                        'description' => 'Opsional jika sudah terikat pada token alat. Jika dikirim, wajib sama dengan perangkat pemilik token.',
                    ],
                    'ph' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 14, 'example' => 7.15],
                    'temperature_c' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 50, 'example' => 28.4],
                    'tds_ppm' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 10000, 'example' => 360.5],
                    'turbidity_ntu' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 1000, 'example' => 38.2],
                    'water_level' => ['type' => 'string', 'enum' => ['NORMAL', 'LOW', 'SURUT', 'MELIMPAH'], 'example' => 'NORMAL'],
                    'aerator_on' => ['type' => 'boolean', 'example' => false],
                    'mode' => ['type' => 'string', 'enum' => ['AUTO', 'MANUAL', 'FAILSAFE'], 'example' => 'AUTO'],
                    'battery_v' => ['type' => 'number', 'format' => 'float', 'example' => 4.12],
                    'recorded_at' => ['type' => 'string', 'format' => 'date-time', 'example' => '2026-11-20T13:45:00+07:00'],
                ],
            ],
            'BatchTelemetryPayload' => [
                'type' => 'object',
                'required' => ['readings'],
                'properties' => [
                    'device_code' => ['type' => 'string', 'example' => 'ESP32-NODE-01'],
                    'readings' => [
                        'type' => 'array',
                        'minItems' => 1,
                        'maxItems' => 100,
                        'items' => ['$ref' => '#/components/schemas/TelemetryPayload'],
                    ],
                ],
            ],
            'TelemetryResponse' => [
                'type' => 'object',
                'properties' => [
                    'success' => ['type' => 'boolean', 'example' => true],
                    'message' => ['type' => 'string', 'example' => 'Telemetri tersimpan.'],
                    'transport' => ['type' => 'string', 'example' => 'HTTP_FALLBACK'],
                    'device_code' => ['type' => 'string', 'example' => 'ESP32-NODE-01'],
                    'reading_id' => ['type' => 'integer', 'example' => 42],
                    'aerator_command' => ['type' => 'string', 'enum' => ['ON', 'OFF'], 'example' => 'OFF'],
                    'failsafe_triggered' => ['type' => 'boolean', 'example' => false],
                ],
            ],
            'HeartbeatPayload' => [
                'type' => 'object',
                'properties' => [
                    'rssi' => ['type' => 'integer', 'example' => -62, 'description' => 'Kekuatan sinyal WiFi (dBm)'],
                    'uptime_s' => ['type' => 'integer', 'example' => 86420],
                    'free_heap' => ['type' => 'integer', 'example' => 198432],
                    'battery_v' => ['type' => 'number', 'format' => 'float', 'example' => 4.15],
                    'fallback_reason' => ['type' => 'string', 'example' => 'ws_connect_timeout'],
                ],
            ],
            'CommandAckPayload' => [
                'type' => 'object',
                'required' => ['applied_action'],
                'properties' => [
                    'command_id' => ['type' => 'string', 'example' => 'cmd-9f8e7d6c'],
                    'applied_action' => ['type' => 'string', 'enum' => ['ON', 'OFF', 'AUTO'], 'example' => 'ON'],
                    'mode' => ['type' => 'string', 'enum' => ['AUTO', 'MANUAL', 'FAILSAFE'], 'example' => 'MANUAL'],
                ],
            ],
            'OtaStatusPayload' => [
                'type' => 'object',
                'required' => ['status'],
                'properties' => [
                    'rollout_id' => ['type' => 'integer', 'example' => 1],
                    'to_version' => ['type' => 'string', 'example' => 'v1.5.0-ota'],
                    'status' => [
                        'type' => 'string',
                        'enum' => ['NOTIFIED', 'DOWNLOADING', 'VERIFYING', 'FLASHING', 'REBOOTING', 'HEALTH_CHECK', 'COMPLETED', 'FAILED', 'ROLLED_BACK'],
                        'example' => 'COMPLETED',
                    ],
                    'progress_pct' => ['type' => 'integer', 'minimum' => 0, 'maximum' => 100, 'example' => 100],
                    'active_partition' => ['type' => 'string', 'example' => 'ota_1'],
                    'boot_health_ok' => ['type' => 'boolean', 'example' => true],
                    'error_message' => ['type' => 'string', 'nullable' => true],
                ],
            ],
            'MlPredictPayload' => [
                'type' => 'object',
                'required' => ['ph', 'temperature_c'],
                'properties' => [
                    'ph' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 14, 'example' => 7.15],
                    'temperature_c' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 50, 'example' => 28.4],
                    'tds_ppm' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 10000, 'example' => 355.0],
                    'turbidity_ntu' => ['type' => 'number', 'format' => 'float', 'minimum' => 0, 'maximum' => 1000, 'example' => 36.2],
                    'water_level' => ['type' => 'string', 'enum' => ['NORMAL', 'LOW', 'SURUT', 'MELIMPAH'], 'example' => 'NORMAL'],
                    'persist' => ['type' => 'boolean', 'example' => true, 'description' => 'Simpan hasil prediksi ke riwayat database (default true).'],
                ],
            ],
            'MlBatchPredictPayload' => [
                'type' => 'object',
                'required' => ['readings'],
                'properties' => [
                    'persist' => ['type' => 'boolean', 'example' => false],
                    'readings' => [
                        'type' => 'array',
                        'minItems' => 1,
                        'maxItems' => 100,
                        'items' => ['$ref' => '#/components/schemas/MlPredictPayload'],
                    ],
                ],
            ],
            'MlPredictionResponse' => [
                'type' => 'object',
                'properties' => [
                    'success' => ['type' => 'boolean', 'example' => true],
                    'device_code' => ['type' => 'string', 'example' => 'ESP32-NODE-01'],
                    'persisted' => ['type' => 'boolean', 'example' => true],
                    'prediction' => [
                        'type' => 'object',
                        'properties' => [
                            'risk' => ['type' => 'string', 'enum' => ['AMAN', 'WASPADA', 'BAHAYA'], 'example' => 'AMAN'],
                            'p_aman' => ['type' => 'number', 'example' => 0.99],
                            'p_waspada' => ['type' => 'number', 'example' => 0.01],
                            'p_bahaya' => ['type' => 'number', 'example' => 0.0],
                            'model_version' => ['type' => 'string', 'example' => '1.0.0-rf'],
                            'latency_ms' => ['type' => 'integer', 'example' => 145],
                            'is_fallback' => ['type' => 'boolean', 'example' => false],
                            'recommended_action' => ['type' => 'string'],
                        ],
                    ],
                ],
            ],
            'ErrorResponse' => [
                'type' => 'object',
                'properties' => [
                    'success' => ['type' => 'boolean', 'example' => false],
                    'error' => ['type' => 'string', 'example' => 'UNAUTHORIZED_DEVICE_TOKEN'],
                    'message' => ['type' => 'string', 'example' => 'Token perangkat tidak valid atau telah dinonaktifkan.'],
                ],
            ],
        ];
    }

    private function deviceSecurity(): array
    {
        return [
            ['DeviceBearerAuth' => []],
            ['DeviceHeaderAuth' => []],
        ];
    }

    private function paths(string $wsBaseUrl): array
    {
        $unauthorized = [
            'description' => 'Token perangkat hilang, tidak valid, atau sudah dicabut',
            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ErrorResponse']]],
        ];

        $forbidden = [
            'description' => 'Token milik alat lain (DEVICE_TOKEN_MISMATCH)',
            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/ErrorResponse']]],
        ];

        return [
            '/api/telemetry' => [
                'post' => [
                    'tags' => ['Telemetry (HTTP & Fallback)'],
                    'summary' => 'Ingesti telemetri sensor (HTTP standar)',
                    'description' => 'Menerima 1 paket pembacaan sensor dari alat terautentikasi, memeriksa failsafe deterministik, menyiarkan event ke kanal WebSocket `banyuwening.telemetry.v1`, dan menjadwalkan prediksi Random Forest.',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/TelemetryPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Telemetri berhasil disimpan',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/TelemetryResponse']]],
                        ],
                        '401' => $unauthorized,
                        '403' => $forbidden,
                        '422' => ['description' => 'Validasi payload gagal'],
                    ],
                ],
            ],
            '/api/http/telemetry' => [
                'post' => [
                    'tags' => ['Telemetry (HTTP & Fallback)'],
                    'summary' => 'HTTP Fallback untuk WebSocket banyuwening.telemetry.v1',
                    'description' => 'Dipanggil otomatis oleh ESP32 saat koneksi `' . $wsBaseUrl . '/ws/telemetry` gagal atau terputus. Mencatat transport sebagai `HTTP_FALLBACK` dan tetap mengembalikan perintah aerator terbaru.',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/TelemetryPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '201' => [
                            'description' => 'Telemetri HTTP fallback tersimpan',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/TelemetryResponse']]],
                        ],
                        '401' => $unauthorized,
                        '403' => $forbidden,
                    ],
                ],
            ],
            '/api/http/telemetry/batch' => [
                'post' => [
                    'tags' => ['Telemetry (HTTP & Fallback)'],
                    'summary' => 'Unggah batch buffer telemetri pasca-putus jaringan',
                    'description' => 'Mengunggah hingga 100 pembacaan sensor sekaligus yang sempat disimpan di buffer lokal ESP32 ketika WebSocket dan HTTP sama-sama offline.',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/BatchTelemetryPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '201' => ['description' => 'Seluruh pembacaan batch berhasil disimpan'],
                        '401' => $unauthorized,
                        '403' => $forbidden,
                    ],
                ],
            ],
            '/api/http/heartbeat' => [
                'post' => [
                    'tags' => ['Device Control & Heartbeat (HTTP Fallback)'],
                    'summary' => 'HTTP Fallback untuk WebSocket banyuwening.heartbeat.v1',
                    'description' => 'Melaporkan status hidup alat (RSSI, uptime, free heap, baterai) saat WebSocket heartbeat tidak dapat terhubung.',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => false,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/HeartbeatPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Heartbeat tercatat dan waktu server dikembalikan'],
                        '401' => $unauthorized,
                    ],
                ],
            ],
            '/api/http/commands' => [
                'get' => [
                    'tags' => ['Device Control & Heartbeat (HTTP Fallback)'],
                    'summary' => 'Polling perintah relay aerator (HTTP Fallback banyuwening.control.v1)',
                    'description' => 'Diambil secara periodik oleh alat saat `' . $wsBaseUrl . '/ws/control` tidak terhubung untuk mengetahui perintah aerator terkini atau perintah tertunda dari operator.',
                    'security' => $this->deviceSecurity(),
                    'responses' => [
                        '200' => ['description' => 'Status target relay & perintah tertunda untuk alat ini'],
                        '401' => $unauthorized,
                    ],
                ],
            ],
            '/api/http/commands/ack' => [
                'post' => [
                    'tags' => ['Device Control & Heartbeat (HTTP Fallback)'],
                    'summary' => 'Konfirmasi eksekusi perintah relay (HTTP Fallback)',
                    'description' => 'Alat melaporkan bahwa perintah relay yang diambil via `/api/http/commands` telah dieksekusi di GPIO fisik.',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/CommandAckPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Konfirmasi eksekusi tercatat'],
                        '401' => $unauthorized,
                    ],
                ],
            ],
            '/api/http/ota/check' => [
                'get' => [
                    'tags' => ['ESP32 Dual-OTA Firmware Protocol'],
                    'summary' => 'Cek ketersediaan pembaruan firmware Dual-OTA & signed manifest',
                    'description' => 'HTTP Fallback untuk `' . $wsBaseUrl . '/ws/ota` (`banyuwening.ota.v1`). Mengembalikan manifest berisi `sha256`, `signature_hmac_sha256`, `rollback_timeout_s`, dan URL unduhan binary.',
                    'security' => $this->deviceSecurity(),
                    'responses' => [
                        '200' => ['description' => 'Status ketersediaan OTA & manifest'],
                        '401' => $unauthorized,
                    ],
                ],
            ],
            '/api/http/ota/download/{version}' => [
                'get' => [
                    'tags' => ['ESP32 Dual-OTA Firmware Protocol'],
                    'summary' => 'Unduh binary firmware .bin ESP32',
                    'description' => 'Mengalirkan file binary `.bin` dengan header `X-Firmware-Sha256` dan `X-Firmware-Signature` agar ESP32 memverifikasi keutuhan sebelum flashing ke partisi `ota_0`/`ota_1`.',
                    'security' => $this->deviceSecurity(),
                    'parameters' => [
                        [
                            'name' => 'version',
                            'in' => 'path',
                            'required' => true,
                            'schema' => ['type' => 'string', 'example' => 'v1.5.0-ota'],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Stream binary application/octet-stream'],
                        '401' => $unauthorized,
                        '404' => ['description' => 'Rilis firmware tidak ditemukan'],
                    ],
                ],
            ],
            '/api/http/ota/status' => [
                'post' => [
                    'tags' => ['ESP32 Dual-OTA Firmware Protocol'],
                    'summary' => 'Laporkan progres flashing, boot health check 60s, atau auto-rollback',
                    'description' => 'ESP32 mengirim pembaruan state (`DOWNLOADING`, `VERIFYING`, `FLASHING`, `REBOOTING`, `HEALTH_CHECK`, `COMPLETED`, `ROLLED_BACK`) yang otomatis memperbarui `devices.firmware_version` bila sukses atau mempertahankan versi lama saat rollback.',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/OtaStatusPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Status OTA berhasil dicatat'],
                        '401' => $unauthorized,
                        '404' => ['description' => 'Rollout OTA tidak ditemukan'],
                    ],
                ],
            ],
            '/api/ml/status' => [
                'get' => [
                    'tags' => ['Random Forest ML & Performance'],
                    'summary' => 'Status model Random Forest aktif & kebijakan AI Self-Learning',
                    'responses' => [
                        '200' => ['description' => 'Informasi model aktif, konfigurasi agen, dan siklus evaluasi terakhir'],
                    ],
                ],
            ],
            '/api/ml/predict' => [
                'post' => [
                    'tags' => ['Random Forest ML & Performance'],
                    'summary' => 'Inferensi Random Forest on-demand untuk satu sampel parameter air',
                    'description' => 'Menjalankan model Random Forest aktif beserta pengaman failsafe deterministik SNI 8228.4:2015, mencatat `latency_ms`, dan mengembalikan probabilitas kelas `AMAN/WASPADA/BAHAYA`.',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/MlPredictPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '200' => [
                            'description' => 'Hasil inferensi Random Forest',
                            'content' => ['application/json' => ['schema' => ['$ref' => '#/components/schemas/MlPredictionResponse']]],
                        ],
                        '401' => $unauthorized,
                        '422' => ['description' => 'Validasi payload gagal'],
                    ],
                ],
            ],
            '/api/ml/predict/batch' => [
                'post' => [
                    'tags' => ['Random Forest ML & Performance'],
                    'summary' => 'Inferensi batch Random Forest hingga 100 sampel sekaligus',
                    'security' => $this->deviceSecurity(),
                    'requestBody' => [
                        'required' => true,
                        'content' => [
                            'application/json' => [
                                'schema' => ['$ref' => '#/components/schemas/MlBatchPredictPayload'],
                            ],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Daftar hasil inferensi batch'],
                        '401' => $unauthorized,
                    ],
                ],
            ],
            '/api/ml/predictions' => [
                'get' => [
                    'tags' => ['Random Forest ML & Performance'],
                    'summary' => 'Riwayat hasil prediksi Random Forest',
                    'parameters' => [
                        ['name' => 'limit', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'integer', 'default' => 50, 'maximum' => 200]],
                        ['name' => 'risk', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['AMAN', 'WASPADA', 'BAHAYA']]],
                        ['name' => 'device_code', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'example' => 'ESP32-NODE-01']],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Daftar prediksi terbaru'],
                    ],
                ],
            ],
            '/api/ml/predictions/latest' => [
                'get' => [
                    'tags' => ['Random Forest ML & Performance'],
                    'summary' => 'Prediksi Random Forest terbaru',
                    'parameters' => [
                        ['name' => 'device_code', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'example' => 'ESP32-NODE-01']],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Prediksi terakhir'],
                    ],
                ],
            ],
            '/api/ml/performance' => [
                'get' => [
                    'tags' => ['Random Forest ML & Performance'],
                    'summary' => 'Metrik trafik inferensi, latensi, confusion matrix & performa Random Forest',
                    'parameters' => [
                        ['name' => 'hours', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'integer', 'default' => 24, 'description' => 'Jendela jam (0 = seluruh histori)']],
                        ['name' => 'device_code', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Ringkasan KPI, seri trafik, tren evaluasi agen AI, confusion matrix, dan feature importances'],
                    ],
                ],
            ],
            '/api/latest' => [
                'get' => [
                    'tags' => ['Monitoring & History'],
                    'summary' => 'Ambil data sensor & prediksi terkini (HTTP Fallback Dashboard)',
                    'description' => 'Mengembalikan pembacaan sensor terbaru, prediksi Random Forest terakhir, dan status perangkat. Mendukung filter opsional `?device_code=ESP32-NODE-01`.',
                    'parameters' => [
                        [
                            'name' => 'device_code',
                            'in' => 'query',
                            'required' => false,
                            'schema' => ['type' => 'string', 'example' => 'ESP32-NODE-01'],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Snapshot kondisi kolam terkini'],
                    ],
                ],
            ],
            '/api/history' => [
                'get' => [
                    'tags' => ['Monitoring & History'],
                    'summary' => 'Ambil deret waktu historis sensor',
                    'parameters' => [
                        [
                            'name' => 'limit',
                            'in' => 'query',
                            'required' => false,
                            'schema' => ['type' => 'integer', 'default' => 72, 'maximum' => 288],
                        ],
                        [
                            'name' => 'device_code',
                            'in' => 'query',
                            'required' => false,
                            'schema' => ['type' => 'string', 'example' => 'ESP32-NODE-01'],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Daftar pembacaan historis kronologis'],
                    ],
                ],
            ],
            '/api/alerts/recent' => [
                'get' => [
                    'tags' => ['Monitoring & History'],
                    'summary' => 'HTTP Fallback untuk WebSocket banyuwening.alerts.v1',
                    'description' => 'Mengambil daftar peringatan terbaru serta prediksi ML terkini saat stream WebSocket alerts tidak terhubung.',
                    'parameters' => [
                        [
                            'name' => 'limit',
                            'in' => 'query',
                            'required' => false,
                            'schema' => ['type' => 'integer', 'default' => 25, 'maximum' => 100],
                        ],
                    ],
                    'responses' => [
                        '200' => ['description' => 'Daftar peringatan dan prediksi terbaru'],
                    ],
                ],
            ],
            '/api/realtime/config' => [
                'get' => [
                    'tags' => ['Realtime & WebSocket Discovery'],
                    'summary' => 'Konfigurasi WebSocket Multi-Protokol & Endpoint HTTP Fallback',
                    'description' => 'Mengembalikan URL WebSocket untuk ke-5 sub-protokol (`banyuwening.telemetry.v1`, `banyuwening.control.v1`, `banyuwening.alerts.v1`, `banyuwening.heartbeat.v1`, `banyuwening.ota.v1`), interval HTTP fallback, serta tiket stream dashboard jika pengguna sedang login.',
                    'responses' => [
                        '200' => ['description' => 'Metadata protokol realtime dan fallback'],
                    ],
                ],
            ],
            '/api/health' => [
                'get' => [
                    'tags' => ['System Health'],
                    'summary' => 'Cek kesehatan REST API & daftar protokol',
                    'responses' => [
                        '200' => ['description' => 'Layanan aktif'],
                    ],
                ],
            ],
        ];
    }
}
