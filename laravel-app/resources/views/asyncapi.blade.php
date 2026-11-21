<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AsyncAPI Studio &amp; WebSocket Simulator: BanyuWening</title>
    <link rel="icon" type="image/svg+xml" href="/brand/favicon.svg?v=4">
    <link rel="alternate icon" type="image/x-icon" href="/favicon.ico?v=4">
    <link rel="stylesheet" href="https://unpkg.com/@asyncapi/react-component@latest/styles/default.min.css">
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            background: #f4f7f6;
            color: #172726;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .bw-topbar {
            background: #173a38;
            color: #ffffff;
            padding: 10px 18px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border-bottom: 2px solid #287c78;
        }
        .bw-title-group {
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
        .bw-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }
        .bw-select {
            background: #102a29;
            color: #e6f6f3;
            border: 1px solid #2d6a66;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 11.5px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            cursor: pointer;
        }
        .bw-btn-link {
            color: #e6f6f3;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-decoration: none;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 11.5px;
            cursor: pointer;
        }
        .bw-btn-link:hover { background: rgba(255, 255, 255, 0.2); }
        .bw-btn-studio {
            background: #287c78;
            border-color: #3ca39e;
            color: #ffffff;
        }
        .bw-btn-studio:hover { background: #2f918c; }

        .bw-tabs {
            background: #ffffff;
            border-bottom: 1px solid #d7e2e0;
            padding: 0 18px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .bw-tab {
            padding: 10px 14px;
            font-size: 12.5px;
            font-weight: 600;
            color: #526664;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
        }
        .bw-tab.active {
            color: #173a38;
            border-bottom-color: #287c78;
        }
        .bw-container {
            max-width: 1360px;
            margin: 0 auto;
            padding: 16px 18px 32px;
        }
        .bw-panel { display: none; }
        .bw-panel.active { display: block; }

        /* Simulator Layout */
        .sim-grid {
            display: grid;
            grid-template-columns: minmax(320px, 440px) 1fr;
            gap: 16px;
        }
        @media (max-width: 920px) {
            .sim-grid { grid-template-columns: 1fr; }
        }
        .card {
            background: #ffffff;
            border: 1px solid #d7e2e0;
            border-radius: 6px;
            padding: 16px;
        }
        .card h3 {
            margin: 0 0 10px;
            font-size: 14px;
            color: #173a38;
        }
        .field { margin-bottom: 12px; }
        .field label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #526664;
            margin-bottom: 4px;
        }
        .input, .textarea, .select-light {
            width: 100%;
            border: 1px solid #cbd7d5;
            border-radius: 5px;
            padding: 7px 10px;
            font-size: 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            background: #f9fbfb;
            color: #172726;
        }
        .textarea {
            min-height: 155px;
            resize: vertical;
            line-height: 1.45;
        }
        .btn-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }
        .btn {
            border: 1px solid #cbd7d5;
            background: #f2f6f5;
            color: #172726;
            padding: 7px 12px;
            border-radius: 5px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn:hover { background: #e6efed; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary {
            background: #287c78;
            border-color: #287c78;
            color: #ffffff;
        }
        .btn-primary:hover { background: #216864; }
        .btn-danger {
            background: #c24136;
            border-color: #c24136;
            color: #ffffff;
        }
        .btn-amber {
            background: #d9822b;
            border-color: #d9822b;
            color: #ffffff;
        }
        .btn-xs {
            padding: 4px 8px;
            font-size: 11px;
        }
        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 9px;
            border-radius: 4px;
            font-size: 11px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-weight: 700;
        }
        .status-idle { background: #edf2f1; color: #526664; }
        .status-ws { background: #dcfce7; color: #166534; }
        .status-fb { background: #fef3c7; color: #92400e; }
        .status-err { background: #fee2e2; color: #991b1b; }

        .log-box {
            background: #0f1f1e;
            color: #dbece9;
            border-radius: 6px;
            padding: 12px;
            height: 465px;
            overflow-y: auto;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 11.5px;
            line-height: 1.5;
        }
        .log-entry {
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding: 6px 0;
        }
        .log-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 3px;
            font-size: 10.5px;
        }
        .tag {
            padding: 1px 6px;
            border-radius: 3px;
            font-weight: 700;
        }
        .tag-tx { background: #1e40af; color: #dbeafe; }
        .tag-rx { background: #065f46; color: #d1fae5; }
        .tag-fb { background: #92400e; color: #fef3c7; }
        .tag-sys { background: #334155; color: #e2e8f0; }
        .tag-err { background: #991b1b; color: #fee2e2; }
        .log-body {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            color: #cfe4e1;
        }
        .spec-pre {
            background: #0f1f1e;
            color: #dbece9;
            padding: 14px;
            border-radius: 6px;
            overflow: auto;
            max-height: 620px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 11.5px;
            line-height: 1.45;
        }
        #asyncapi-docs-root {
            background: #ffffff;
            border: 1px solid #d7e2e0;
            border-radius: 6px;
            padding: 14px;
            min-height: 520px;
        }
    </style>
</head>
<body>
    <header class="bw-topbar">
        <div class="bw-title-group">
            <span>AsyncAPI Studio 3.0 &amp; WebSocket Simulator</span>
            <span class="bw-badge">WS: {{ $realtimeConfig['ws_base_url'] }}</span>
            @if(!empty($selectedDevice))
                <span id="bw-ws-auth-badge" class="bw-badge bw-badge-ok">
                    Auto-Authorized: {{ $selectedDevice['device_code'] }}
                </span>
            @else
                <span class="bw-badge">Auth: Per-Device Token</span>
            @endif
        </div>

        <div class="bw-actions">
            @if(!empty($autoAuthDevices))
                <select id="bw-device-switcher" class="bw-select" aria-label="Pilih token alat untuk simulasi WebSocket">
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
            <button type="button" id="btn-open-external-studio" class="bw-btn-link bw-btn-studio">
                Buka di studio.asyncapi.com ↗
            </button>
            <a href="{{ $specYamlUrl }}" download="banyuwening-asyncapi-3.0.yaml" class="bw-btn-link">
                Unduh YAML
            </a>
            <a href="{{ url('/api/docs') }}" class="bw-btn-link">
                Swagger UI (HTTP)
            </a>
        </div>
    </header>

    <nav class="bw-tabs" role="tablist">
        <button type="button" class="bw-tab active" data-tab="simulator">
            1. Simulator WebSocket &amp; HTTP Fallback
        </button>
        <button type="button" class="bw-tab" data-tab="docs">
            2. Dokumentasi AsyncAPI 3.0 (Interaktif)
        </button>
        <button type="button" class="bw-tab" data-tab="spec">
            3. Spesifikasi AsyncAPI (YAML / JSON)
        </button>
    </nav>

    <main class="bw-container">
        <!-- TAB 1: INTERACTIVE WEBSOCKET SIMULATOR -->
        <section id="panel-simulator" class="bw-panel active">
            <div class="sim-grid">
                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h3 style="margin:0;">Konfigurasi Koneksi Protokol</h3>
                        <span id="sim-status" class="status-pill status-idle">Terputus</span>
                    </div>

                    <div class="field">
                        <label for="sim-channel">Kanal &amp; Sub-Protokol AsyncAPI</label>
                        <select id="sim-channel" class="select-light">
                            <option value="telemetry">/ws/telemetry · banyuwening.telemetry.v1 (Sensor)</option>
                            <option value="control">/ws/control · banyuwening.control.v1 (Relay Aktuator)</option>
                            <option value="alerts">/ws/alerts · banyuwening.alerts.v1 (Prediksi ML &amp; Alarm)</option>
                            <option value="heartbeat">/ws/heartbeat · banyuwening.heartbeat.v1 (Keepalive)</option>
                            <option value="stream">/ws/stream · banyuwening.dashboard.v1 (Dashboard Multiplex)</option>
                        </select>
                    </div>

                    <div class="field">
                        <label for="sim-token">Token Per Alat (Auto-Login Super Admin)</label>
                        <input
                            id="sim-token"
                            type="text"
                            class="input"
                            placeholder="Tempel token bw_dev_..."
                            value="{{ $selectedDevice['token'] ?? '' }}"
                        />
                    </div>

                    <div class="btn-row" style="margin-bottom:12px;">
                        <button type="button" id="btn-ws-connect" class="btn btn-primary">Connect WebSocket</button>
                        <button type="button" id="btn-ws-disconnect" class="btn btn-danger" disabled>Disconnect</button>
                        <button type="button" id="btn-auto-stream" class="btn" disabled>Auto-Stream (2d)</button>
                    </div>

                    <div class="field">
                        <label>Preset Payload Simulasi (Sesuai AsyncAPI 3.0)</label>
                        <div id="sim-presets" class="btn-row"></div>
                    </div>

                    <div class="field">
                        <label for="sim-payload">Frame JSON</label>
                        <textarea id="sim-payload" class="textarea"></textarea>
                    </div>

                    <div class="btn-row">
                        <button type="button" id="btn-ws-send" class="btn btn-primary" disabled>Kirim Frame WebSocket</button>
                        <button type="button" id="btn-http-fallback" class="btn btn-amber">Uji HTTP Fallback</button>
                    </div>
                    <p style="font-size:11px;color:#526664;margin:10px 0 0;line-height:1.45;">
                        Jalankan <code>php artisan ws:serve</code> untuk simulasi WebSocket langsung di <code>{{ $realtimeConfig['ws_base_url'] }}</code>.
                        Jika server WS mati/gagal connect, simulator otomatis menawarkan atau menjalankan jalur <strong>HTTP Fallback</strong> dengan token yang sama.
                    </p>
                </div>

                <div class="card">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h3 style="margin:0;">Inspektor Frame Realtime (TX / RX / HTTP Fallback)</h3>
                        <button type="button" id="btn-clear-log" class="btn btn-xs">Bersihkan Log</button>
                    </div>
                    <div id="sim-log" class="log-box">
                        <div class="log-entry">
                            <div class="log-meta"><span class="tag tag-sys">SYS</span><span>Siap</span></div>
                            <pre class="log-body">Pilih kanal protokol AsyncAPI di sebelah kiri lalu klik "Connect WebSocket". Token alat otomatis terisi jika login sebagai Super Admin.</pre>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- TAB 2: OFFICIAL ASYNCAPI 3.0 VISUAL DOCS -->
        <section id="panel-docs" class="bw-panel">
            <div id="asyncapi-docs-root">
                <p style="font-size:13px;color:#526664;">Memuat komponen visual AsyncAPI 3.0.0...</p>
            </div>
        </section>

        <!-- TAB 3: SPEC SOURCE YAML / JSON -->
        <section id="panel-spec" class="bw-panel">
            <div class="card">
                <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;">
                    <div class="btn-row">
                        <button type="button" id="btn-spec-yaml" class="btn btn-primary btn-xs">AsyncAPI 3.0 YAML</button>
                        <button type="button" id="btn-spec-json" class="btn btn-xs">AsyncAPI 3.0 JSON</button>
                    </div>
                    <div class="btn-row">
                        <button type="button" id="btn-copy-spec" class="btn btn-xs">Salin Spesifikasi</button>
                        <a href="{{ $specYamlUrl }}" download="banyuwening-asyncapi-3.0.yaml" class="btn btn-xs" style="text-decoration:none;">Unduh .yaml</a>
                        <a href="{{ $specJsonUrl }}" target="_blank" rel="noopener noreferrer" class="btn btn-xs" style="text-decoration:none;">Buka .json ↗</a>
                    </div>
                </div>
                <pre id="spec-viewer" class="spec-pre">{{ $specYaml }}</pre>
            </div>
        </section>
    </main>

    <script src="https://unpkg.com/@asyncapi/react-component@latest/browser/standalone/index.js"></script>
    <script>
        (function () {
            const realtimeConfig = @json($realtimeConfig);
            const autoAuthDevices = @json($autoAuthDevices ?? []);
            const specYaml = @json($specYaml);
            const specJson = JSON.stringify(@json($specArray), null, 2);
            const specJsonUrl = @json($specJsonUrl);
            const specYamlUrl = @json($specYamlUrl);

            let ws = null;
            let autoStreamId = null;
            let seqCounter = 1;
            let lastSentTs = 0;
            let docsRendered = false;
            let currentSpecMode = 'yaml';

            const channelConfigs = {
                telemetry: {
                    path: '/ws/telemetry',
                    subprotocol: 'banyuwening.telemetry.v1',
                    httpFallback: { method: 'POST', url: '/api/http/telemetry' },
                    presets: [
                        {
                            label: 'Normal SNI',
                            body: { type: 'telemetry', seq: 1, ph: 7.15, temperature_c: 28.4, tds_ppm: 350, turbidity_ntu: 35.5, water_level: 'NORMAL', aerator_on: false, mode: 'AUTO', battery_v: 4.14 }
                        },
                        {
                            label: 'Waspada',
                            body: { type: 'telemetry', seq: 2, ph: 6.32, temperature_c: 31.3, tds_ppm: 610, turbidity_ntu: 88.0, water_level: 'NORMAL', aerator_on: false, mode: 'AUTO', battery_v: 4.08 }
                        },
                        {
                            label: 'Failsafe Bahaya',
                            body: { type: 'telemetry', seq: 3, ph: 5.65, temperature_c: 34.1, tds_ppm: 860, turbidity_ntu: 145.0, water_level: 'LOW', aerator_on: false, mode: 'AUTO', battery_v: 3.98 }
                        }
                    ]
                },
                control: {
                    path: '/ws/control',
                    subprotocol: 'banyuwening.control.v1',
                    httpFallback: { method: 'GET', url: '/api/http/commands' },
                    presets: [
                        { label: 'ACK Relay ON', body: { type: 'control.ack', command_id: 'cmd-sim-01', applied_action: 'ON', mode: 'MANUAL' } },
                        { label: 'ACK Mode AUTO', body: { type: 'control.ack', command_id: 'cmd-sim-02', applied_action: 'AUTO', mode: 'AUTO' } }
                    ]
                },
                alerts: {
                    path: '/ws/alerts',
                    subprotocol: 'banyuwening.alerts.v1',
                    httpFallback: { method: 'GET', url: '/api/alerts/recent?limit=10' },
                    presets: [
                        { label: 'Ping Stream', body: { type: 'ping', ts: Date.now() } }
                    ]
                },
                heartbeat: {
                    path: '/ws/heartbeat',
                    subprotocol: 'banyuwening.heartbeat.v1',
                    httpFallback: { method: 'POST', url: '/api/http/heartbeat' },
                    presets: [
                        { label: 'Heartbeat Normal', body: { type: 'heartbeat', rssi: -59, uptime_s: 3600, free_heap: 204800, battery_v: 4.15 } }
                    ]
                },
                stream: {
                    path: '/ws/stream',
                    subprotocol: 'banyuwening.dashboard.v1',
                    httpFallback: { method: 'GET', url: '/api/latest' },
                    presets: [
                        { label: 'Ping Dashboard', body: { type: 'ping', ts: Date.now() } }
                    ]
                }
            };

            const elChannel = document.getElementById('sim-channel');
            const elToken = document.getElementById('sim-token');
            const elPayload = document.getElementById('sim-payload');
            const elPresets = document.getElementById('sim-presets');
            const elStatus = document.getElementById('sim-status');
            const elLog = document.getElementById('sim-log');
            const btnConnect = document.getElementById('btn-ws-connect');
            const btnDisconnect = document.getElementById('btn-ws-disconnect');
            const btnSend = document.getElementById('btn-ws-send');
            const btnAuto = document.getElementById('btn-auto-stream');
            const btnFallback = document.getElementById('btn-http-fallback');
            const btnClear = document.getElementById('btn-clear-log');

            function setStatus(text, cls) {
                elStatus.textContent = text;
                elStatus.className = 'status-pill ' + cls;
            }

            function appendLog(tag, tagClass, meta, body) {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                const now = new Date().toLocaleTimeString('id-ID', { hour12: false });
                const bodyText = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
                entry.innerHTML =
                    '<div class="log-meta"><span class="tag ' + tagClass + '">' + tag + '</span>' +
                    '<span style="color:#8cb2ad;">' + now + '</span>' +
                    '<span style="color:#a7d3cd;">' + meta + '</span></div>' +
                    '<pre class="log-body"></pre>';
                entry.querySelector('.log-body').textContent = bodyText;
                elLog.prepend(entry);
            }

            function renderPresets() {
                const cfg = channelConfigs[elChannel.value];
                elPresets.innerHTML = '';
                cfg.presets.forEach(function (preset, idx) {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'btn btn-xs';
                    b.textContent = preset.label;
                    b.addEventListener('click', function () {
                        const cloned = Object.assign({}, preset.body);
                        if ('seq' in cloned) cloned.seq = seqCounter++;
                        if ('ts' in cloned) cloned.ts = Date.now();
                        elPayload.value = JSON.stringify(cloned, null, 2);
                    });
                    elPresets.appendChild(b);
                    if (idx === 0) {
                        elPayload.value = JSON.stringify(preset.body, null, 2);
                    }
                });
            }

            function stopAutoStream() {
                if (autoStreamId) {
                    clearInterval(autoStreamId);
                    autoStreamId = null;
                    btnAuto.textContent = 'Auto-Stream (2d)';
                }
            }

            function disconnectWs() {
                stopAutoStream();
                if (ws) {
                    try { ws.close(); } catch (_) {}
                    ws = null;
                }
                btnConnect.disabled = false;
                btnDisconnect.disabled = true;
                btnSend.disabled = true;
                btnAuto.disabled = true;
            }

            async function runHttpFallback(reasonNote) {
                const ch = elChannel.value;
                const cfg = channelConfigs[ch];
                const token = elToken.value.trim();
                const headers = { 'Accept': 'application/json' };
                let body;

                if (cfg.httpFallback.method === 'POST') {
                    headers['Content-Type'] = 'application/json';
                    headers['X-Transport-Mode'] = 'http-fallback';
                    body = elPayload.value;
                }
                if (token && ch !== 'alerts' && ch !== 'stream') {
                    headers['Authorization'] = 'Bearer ' + token;
                }

                setStatus('HTTP Fallback Aktif', 'status-fb');
                appendLog('HTTP-FB', 'tag-fb', cfg.httpFallback.method + ' ' + cfg.httpFallback.url + (reasonNote ? ' · ' + reasonNote : ''), body || '(GET request)');

                const t0 = performance.now();
                try {
                    const res = await fetch(cfg.httpFallback.url, {
                        method: cfg.httpFallback.method,
                        headers: headers,
                        body: body
                    });
                    const rtt = Math.round(performance.now() - t0);
                    const json = await res.json();
                    appendLog('RX', res.ok ? 'tag-rx' : 'tag-err', 'HTTP ' + res.status + ' (' + rtt + ' ms)', json);
                } catch (err) {
                    appendLog('ERR', 'tag-err', 'HTTP Fallback gagal', err.message || String(err));
                }
            }

            btnConnect.addEventListener('click', function () {
                disconnectWs();
                const ch = elChannel.value;
                const cfg = channelConfigs[ch];
                const wsBase = realtimeConfig.ws_base_url;
                let url = wsBase + cfg.path;

                if (ch === 'stream') {
                    const ticket = realtimeConfig.dashboard_ticket || '';
                    url += '?channels=telemetry,control,alerts,heartbeat&ticket=' + encodeURIComponent(ticket);
                } else {
                    const token = elToken.value.trim();
                    url += '?token=' + encodeURIComponent(token);
                }

                setStatus('Menghubungkan WS...', 'status-idle');
                appendLog('SYS', 'tag-sys', 'Handshake ' + cfg.subprotocol, wsBase + cfg.path + ' (subprotocol: ' + cfg.subprotocol + ')');

                let opened = false;
                try {
                    ws = new WebSocket(url, [cfg.subprotocol]);
                } catch (err) {
                    appendLog('ERR', 'tag-err', 'WebSocket Error', err.message);
                    void runHttpFallback('WS gagal inisialisasi');
                    return;
                }

                const timeout = setTimeout(function () {
                    if (!opened && ws && ws.readyState !== WebSocket.OPEN) {
                        try { ws.close(); } catch (_) {}
                        appendLog('ERR', 'tag-err', 'WS Timeout (3000 ms)', 'Server php artisan ws:serve tidak merespons. Otomatis menjalankan HTTP Fallback.');
                        void runHttpFallback('auto-failover timeout');
                    }
                }, 3000);

                ws.onopen = function () {
                    opened = true;
                    clearTimeout(timeout);
                    setStatus('101 WS Connected (' + cfg.subprotocol + ')', 'status-ws');
                    btnConnect.disabled = true;
                    btnDisconnect.disabled = false;
                    btnSend.disabled = false;
                    btnAuto.disabled = false;
                    appendLog('SYS', 'tag-sys', 'Terhubung 101 Switching Protocols', { protocol: ws.protocol || cfg.subprotocol, channel: ch });
                };

                ws.onmessage = function (ev) {
                    const rtt = lastSentTs ? ' (' + Math.round(performance.now() - lastSentTs) + ' ms)' : '';
                    let parsed = ev.data;
                    try { parsed = JSON.parse(ev.data); } catch (_) {}
                    appendLog('RX', 'tag-rx', cfg.subprotocol + rtt, parsed);
                };

                ws.onerror = function () {
                    if (!opened) {
                        clearTimeout(timeout);
                        appendLog('ERR', 'tag-err', 'Koneksi WS ditolak / tidak aktif', 'Pastikan `php artisan ws:serve` aktif & token valid. Beralih ke HTTP Fallback...');
                        void runHttpFallback('auto-failover WS error');
                    }
                };

                ws.onclose = function (ev) {
                    clearTimeout(timeout);
                    stopAutoStream();
                    btnConnect.disabled = false;
                    btnDisconnect.disabled = true;
                    btnSend.disabled = true;
                    btnAuto.disabled = true;
                    if (opened) {
                        setStatus('Terputus (code ' + ev.code + ')', 'status-idle');
                        appendLog('SYS', 'tag-sys', 'Koneksi WebSocket ditutup', { code: ev.code, reason: ev.reason || 'closed' });
                    }
                };
            });

            btnDisconnect.addEventListener('click', function () {
                disconnectWs();
                setStatus('Terputus', 'status-idle');
            });

            btnSend.addEventListener('click', function () {
                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                const raw = elPayload.value.trim();
                lastSentTs = performance.now();
                ws.send(raw);
                let pretty = raw;
                try { pretty = JSON.parse(raw); } catch (_) {}
                appendLog('TX', 'tag-tx', channelConfigs[elChannel.value].subprotocol, pretty);
            });

            btnAuto.addEventListener('click', function () {
                if (autoStreamId) {
                    stopAutoStream();
                    return;
                }
                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                btnAuto.textContent = 'Hentikan Auto-Stream';
                autoStreamId = setInterval(function () {
                    if (!ws || ws.readyState !== WebSocket.OPEN) {
                        stopAutoStream();
                        return;
                    }
                    try {
                        const obj = JSON.parse(elPayload.value);
                        if ('seq' in obj) obj.seq = seqCounter++;
                        if (obj.type === 'telemetry') {
                            obj.ph = Number((7.0 + (Math.random() - 0.5) * 0.4).toFixed(2));
                            obj.temperature_c = Number((28.0 + (Math.random() - 0.5) * 1.2).toFixed(2));
                            obj.tds_ppm = Math.round(340 + (Math.random() - 0.5) * 40);
                        }
                        const out = JSON.stringify(obj);
                        lastSentTs = performance.now();
                        ws.send(out);
                        appendLog('TX', 'tag-tx', 'Auto-Stream #' + (obj.seq || seqCounter), obj);
                    } catch (err) {
                        stopAutoStream();
                    }
                }, 2000);
            });

            btnFallback.addEventListener('click', function () {
                void runHttpFallback('uji manual');
            });

            btnClear.addEventListener('click', function () {
                elLog.innerHTML = '';
            });

            elChannel.addEventListener('change', function () {
                disconnectWs();
                setStatus('Terputus', 'status-idle');
                renderPresets();
            });

            // Device switcher (Super Admin auto-login)
            const switcher = document.getElementById('bw-device-switcher');
            if (switcher && autoAuthDevices.length > 0) {
                switcher.addEventListener('change', function (e) {
                    const chosen = autoAuthDevices.find(function (d) { return d.device_code === e.target.value; });
                    if (chosen) {
                        elToken.value = chosen.token;
                        const badge = document.getElementById('bw-ws-auth-badge');
                        if (badge) badge.textContent = 'Auto-Authorized: ' + chosen.device_code;
                        appendLog('SYS', 'tag-sys', 'Token alat diganti', { device_code: chosen.device_code });
                    }
                });
            }

            // Tab switching + lazy render @asyncapi/react-component
            document.querySelectorAll('.bw-tab').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('.bw-tab').forEach(function (b) { b.classList.remove('active'); });
                    document.querySelectorAll('.bw-panel').forEach(function (p) { p.classList.remove('active'); });
                    btn.classList.add('active');
                    const target = btn.getAttribute('data-tab');
                    document.getElementById('panel-' + target).classList.add('active');

                    if (target === 'docs' && !docsRendered) {
                        docsRendered = true;
                        const root = document.getElementById('asyncapi-docs-root');
                        if (window.AsyncApiStandalone && typeof window.AsyncApiStandalone.render === 'function') {
                            root.innerHTML = '';
                            window.AsyncApiStandalone.render({
                                schema: {
                                    url: specJsonUrl,
                                    options: { method: 'GET', mode: 'cors' }
                                },
                                config: {
                                    show: { sidebar: true, info: true, servers: true, operations: true, messages: true, schemas: true }
                                }
                            }, root);
                        } else {
                            root.innerHTML = '<p style="font-size:13px;color:#92400e;">Komponen visual AsyncAPI CDN tidak terjangkau (mode offline). Gunakan tab <strong>Spesifikasi AsyncAPI (YAML / JSON)</strong> atau <strong>Simulator WebSocket</strong>.</p>';
                        }
                    }
                });
            });

            // Spec YAML / JSON toggle & copy
            const specViewer = document.getElementById('spec-viewer');
            const btnYaml = document.getElementById('btn-spec-yaml');
            const btnJson = document.getElementById('btn-spec-json');
            btnYaml.addEventListener('click', function () {
                currentSpecMode = 'yaml';
                specViewer.textContent = specYaml;
                btnYaml.classList.add('btn-primary');
                btnJson.classList.remove('btn-primary');
            });
            btnJson.addEventListener('click', function () {
                currentSpecMode = 'json';
                specViewer.textContent = specJson;
                btnJson.classList.add('btn-primary');
                btnYaml.classList.remove('btn-primary');
            });
            document.getElementById('btn-copy-spec').addEventListener('click', function () {
                const text = currentSpecMode === 'yaml' ? specYaml : specJson;
                navigator.clipboard.writeText(text);
                this.textContent = 'Tersalin ✓';
                const self = this;
                setTimeout(function () { self.textContent = 'Salin Spesifikasi'; }, 1800);
            });

            // Buka langsung di AsyncAPI Studio resmi (studio.asyncapi.com)
            document.getElementById('btn-open-external-studio').addEventListener('click', function () {
                const btn = this;
                const host = window.location.hostname;
                const isLocal = host === '127.0.0.1' || host === 'localhost' || host.startsWith('192.168.');
                if (!isLocal) {
                    window.open('https://studio.asyncapi.com/?url=' + encodeURIComponent(specYamlUrl), '_blank', 'noopener,noreferrer');
                    return;
                }
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(specYaml).catch(function () {});
                }
                btn.textContent = 'YAML Tersalin, Paste di Studio ↗';
                setTimeout(function () { btn.textContent = 'Buka di studio.asyncapi.com ↗'; }, 3500);
                window.open('https://studio.asyncapi.com/', '_blank', 'noopener,noreferrer');
            });

            renderPresets();
        })();
    </script>
</body>
</html>
