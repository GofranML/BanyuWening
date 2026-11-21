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

        return [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'BanyuWening IoT & Realtime Aquaculture API',
                'version' => '2.3.0',
                'description' => implode("\n\n", [
                    'Standar dokumentasi OpenAPI 3.0.3 / Swagger UI untuk platform pemantauan kualitas air kolam lele **BanyuWening**.',
                    '### Arsitektur Transportasi Hybrid (WebSocket-First + HTTP Fallback)',
                    '- **Jalur Utama Kecepatan Tinggi (WebSocket Multi-Protokol)**: menggunakan 4 sub-protokol khusus (`banyuwening.telemetry.v1`, `banyuwening.control.v1`, `banyuwening.alerts.v1`, `banyuwening.heartbeat.v1`) di `' . $realtime['ws_base_url'] . '` untuk latensi milidetik.',
                    '- **Jalur Cadangan Otomatis (HTTP Fallback)**: jika koneksi WebSocket gagal atau terputus di jaringan lapangan, node ESP32 dan dashboard otomatis beralih ke endpoint `/api/http/*`, `/api/latest`, dan `/api/alerts/recent` tanpa kehilangan data.',
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
            'paths' => $this->paths(),
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

    private function paths(): array
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
                    'description' => 'Dipanggil otomatis oleh ESP32 saat koneksi `ws://host:8081/ws/telemetry` gagal atau terputus. Mencatat transport sebagai `HTTP_FALLBACK` dan tetap mengembalikan perintah aerator terbaru.',
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
                    'description' => 'Diambil secara periodik oleh alat saat `ws://host:8081/ws/control` tidak terhubung untuk mengetahui perintah aerator terkini atau perintah tertunda dari operator.',
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
                    'description' => 'Mengembalikan URL WebSocket untuk ke-4 sub-protokol (`banyuwening.telemetry.v1`, `banyuwening.control.v1`, `banyuwening.alerts.v1`, `banyuwening.heartbeat.v1`), interval HTTP fallback, serta tiket stream dashboard jika pengguna sedang login.',
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
