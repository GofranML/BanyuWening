<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Swagger UI: BanyuWening OpenAPI 3.0</title>
    <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg?v=4">
    <link rel="alternate icon" type="image/x-icon" href="/favicon.ico?v=4">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body {
            margin: 0;
            background: #f8faf9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .bw-topbar {
            background: #173a38;
            color: #ffffff;
            padding: 10px 20px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 2px solid #287c78;
        }
        .bw-topbar-title {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            font-size: 13.5px;
            font-weight: 700;
        }
        .bw-badge {
            font-size: 11px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            padding: 3px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.14);
            color: #d7f3ef;
        }
        .bw-badge-ok {
            background: rgba(16, 185, 129, 0.22);
            border: 1px solid rgba(52, 211, 153, 0.45);
            color: #a7f3d0;
        }
        .bw-controls {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            font-size: 12px;
        }
        .bw-select {
            background: #102a29;
            color: #e6f6f3;
            border: 1px solid #2d6a66;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            cursor: pointer;
        }
        .bw-controls a {
            color: #d7f3ef;
            text-decoration: none;
            font-weight: 600;
        }
        .bw-controls a:hover {
            text-decoration: underline;
        }
        .swagger-ui .topbar {
            display: none;
        }
    </style>
</head>
<body>
    <header class="bw-topbar">
        <div class="bw-topbar-title">
            <span>BanyuWening API Documentation (Swagger UI · OpenAPI 3.0.3)</span>
            <span class="bw-badge">WS: {{ $wsUrl }}</span>
            @if(!empty($selectedDevice))
                <span id="bw-auto-auth-badge" class="bw-badge bw-badge-ok">
                    Auto-Authorized: {{ $selectedDevice['device_code'] }}
                </span>
            @else
                <span class="bw-badge">Auth: Per-Device Token</span>
            @endif
        </div>
        <div class="bw-controls">
            @if(!empty($autoAuthDevices))
                <label for="bw-device-switcher" style="color:#b7d9d4;">Token Alat:</label>
                <select id="bw-device-switcher" class="bw-select" aria-label="Pilih token perangkat untuk Swagger UI">
                    @foreach($autoAuthDevices as $dev)
                        <option
                            value="{{ $dev['device_code'] }}"
                            @selected($selectedDevice && $selectedDevice['device_code'] === $dev['device_code'])
                        >
                            {{ $dev['device_code'] }} ({{ $dev['pond_name'] }})
                        </option>
                    @endforeach
                </select>
            @endif
            <a href="{{ url('/api/docs/asyncapi') }}">AsyncAPI Studio (WS)</a>
            <a href="{{ $specUrl }}" target="_blank" rel="noopener noreferrer">OpenAPI JSON</a>
            <a href="{{ url('/dashboard') }}">Kembali ke Dashboard</a>
        </div>
    </header>

    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.addEventListener('DOMContentLoaded', function () {
            const autoAuthDevices = @json($autoAuthDevices ?? []);
            const initialDevice = @json($selectedDevice ?? null);

            function applyDeviceAuthorization(uiInstance, deviceEntry) {
                if (!uiInstance || !deviceEntry || !deviceEntry.token) return;
                uiInstance.preauthorizeApiKey('DeviceBearerAuth', deviceEntry.token);
                uiInstance.preauthorizeApiKey('DeviceHeaderAuth', deviceEntry.token);

                const badge = document.getElementById('bw-auto-auth-badge');
                if (badge) {
                    badge.textContent = 'Auto-Authorized: ' + deviceEntry.device_code;
                }
            }

            window.ui = SwaggerUIBundle({
                url: @json($specUrl),
                dom_id: '#swagger-ui',
                deepLinking: true,
                persistAuthorization: true,
                displayRequestDuration: true,
                docExpansion: 'list',
                filter: true,
                tryItOutEnabled: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                layout: 'BaseLayout',
                onComplete: function () {
                    if (initialDevice) {
                        applyDeviceAuthorization(window.ui, initialDevice);
                    }
                }
            });

            const switcher = document.getElementById('bw-device-switcher');
            if (switcher && autoAuthDevices.length > 0) {
                switcher.addEventListener('change', function (e) {
                    const chosen = autoAuthDevices.find(function (d) {
                        return d.device_code === e.target.value;
                    });
                    if (chosen) {
                        applyDeviceAuthorization(window.ui, chosen);
                    }
                });
            }
        });
    </script>
</body>
</html>
