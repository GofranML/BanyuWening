<?php

return [
    'async_scan' => filter_var(env('UPLOAD_SCAN_ASYNC', false), FILTER_VALIDATE_BOOL),

    'rate_limit_per_minute' => (int) env('UPLOAD_RATE_LIMIT_PER_MINUTE', 30),

    'max_request_bytes' => (int) env('UPLOAD_MAX_REQUEST_BYTES', 57671680), // 55 MB

    'quarantine' => [
        'disk' => 'quarantine',
        'ttl_minutes' => (int) env('UPLOAD_QUARANTINE_TTL_MINUTES', 60),
        'retain_infected' => filter_var(env('UPLOAD_QUARANTINE_RETAIN_INFECTED', true), FILTER_VALIDATE_BOOL),
        'cleanup_on_failure' => true,
        'max_total_bytes' => (int) env('UPLOAD_QUARANTINE_MAX_BYTES', 524288000), // 500 MB
    ],

    'scanner' => [
        'driver' => env('UPLOAD_SCANNER_DRIVER', 'clamav'),
        'timeout_seconds' => (int) env('UPLOAD_SCANNER_TIMEOUT', 30),
        'max_scan_bytes' => (int) env('UPLOAD_SCANNER_MAX_BYTES', 52428800), // 50 MB
        'clamav' => [
            'mode' => env('CLAMAV_MODE', 'auto'),
            'host' => env('CLAMAV_HOST', '127.0.0.1'),
            'port' => (int) env('CLAMAV_PORT', 3310),
            'socket' => env('CLAMAV_SOCKET', ''),
            'binary' => env('CLAMAV_BINARY', 'clamdscan'),
            'fallback_binary' => env('CLAMAV_FALLBACK_BINARY', 'clamscan'),
        ],
    ],

    'firmware_require_esp32_magic' => filter_var(env('UPLOAD_FIRMWARE_REQUIRE_ESP32_MAGIC', false), FILTER_VALIDATE_BOOL),

    'archive_limits' => [
        'max_entries' => 100,
        'max_uncompressed_bytes' => 26214400, // 25 MB
        'max_single_entry_bytes' => 15728640, // 15 MB
        'max_compression_ratio' => 100.0,
    ],

    'profiles' => [
        'landing_media' => [
            'extensions' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'ogg'],
            'mime_map' => [
                'jpg' => ['image/jpeg'],
                'jpeg' => ['image/jpeg'],
                'png' => ['image/png'],
                'webp' => ['image/webp'],
                'gif' => ['image/gif'],
                'mp4' => ['video/mp4', 'application/mp4'],
                'webm' => ['video/webm', 'audio/webm'],
                'ogg' => ['video/ogg', 'audio/ogg', 'application/ogg'],
            ],
            'max_bytes' => 52428800, // 50 MB
            'image_max_bytes' => 15728640, // 15 MB
            'max_width' => 8192,
            'max_height' => 8192,
            'max_pixels' => 40000000,
            'destination_disk' => 'landing_public',
            'destination_prefix' => 'landing',
            'public_url_prefix' => '/uploads/landing',
            'is_public' => true,
        ],

        'firmware' => [
            'extensions' => ['bin'],
            'mime_map' => [
                'bin' => ['application/octet-stream', 'application/x-binary', 'text/plain'],
            ],
            'max_bytes' => 16777216, // 16 MB
            'destination_disk' => 'firmware_private',
            'destination_prefix' => '',
            'public_url_prefix' => null,
            'is_public' => false,
        ],

        'tenant_document' => [
            'extensions' => ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'csv', 'txt', 'zip'],
            'mime_map' => [
                'pdf' => ['application/pdf'],
                'jpg' => ['image/jpeg'],
                'jpeg' => ['image/jpeg'],
                'png' => ['image/png'],
                'webp' => ['image/webp'],
                'csv' => ['text/csv', 'text/plain', 'application/csv'],
                'txt' => ['text/plain'],
                'zip' => ['application/zip', 'application/x-zip-compressed'],
            ],
            'max_bytes' => 10485760, // 10 MB
            'image_max_bytes' => 10485760,
            'max_width' => 8192,
            'max_height' => 8192,
            'max_pixels' => 40000000,
            'destination_disk' => 'private_uploads',
            'destination_prefix' => 'tenants',
            'public_url_prefix' => null,
            'is_public' => false,
        ],
    ],
];
