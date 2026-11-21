<?php

namespace App\Http\Controllers;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Prediction;
use App\Models\RelayLog;
use App\Models\SensorReading;
use App\Models\User;
use App\Services\RealtimeBroadcaster;
use App\Services\TelemetryIngestionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApiController extends Controller
{
    public function __construct(
        private readonly TelemetryIngestionService $ingestionService,
        private readonly RealtimeBroadcaster $broadcaster
    ) {
    }

    /**
     * Endpoint cek kesehatan API & daftar protokol aktif (GET /api/health)
     */
    public function health(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'service' => 'BanyuWening IoT & Realtime API',
            'version' => '2.3.0',
            'server_time' => now()->toIso8601String(),
            'swagger_ui' => url('/api/docs'),
            'openapi_spec' => url('/api/docs/openapi.json'),
            'websocket_protocols' => array_values(array_map(
                fn ($p) => $p['subprotocol'],
                RealtimeBroadcaster::PROTOCOLS
            )),
            'http_fallback_ready' => true,
        ]);
    }

    /**
     * Penemuan konfigurasi WebSocket multi-protokol & HTTP Fallback (GET /api/realtime/config)
     */
    public function realtimeConfig(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'realtime' => $this->broadcaster->getRealtimeConfig(
                Auth::user(),
                $request->getSchemeAndHttpHost()
            ),
        ]);
    }

    /**
     * Endpoint Ingestion HTTP standar untuk node ESP32 (POST /api/telemetry)
     * Dilindungi middleware `device.token` (1 token = 1 alat).
     */
    public function ingestTelemetry(Request $request): JsonResponse
    {
        $transport = strtolower((string) $request->header('X-Transport-Mode', '')) === 'http-fallback'
            ? 'HTTP_FALLBACK'
            : 'HTTP';

        return $this->handleSingleIngestion($request, $transport);
    }

    /**
     * Endpoint eksplisit HTTP Fallback saat WebSocket banyuwening.telemetry.v1 gagal connect (POST /api/http/telemetry)
     */
    public function ingestHttpFallbackTelemetry(Request $request): JsonResponse
    {
        return $this->handleSingleIngestion($request, 'HTTP_FALLBACK');
    }

    /**
     * Endpoint unggah batch buffer telemetri pasca-offline (POST /api/http/telemetry/batch)
     */
    public function ingestBatchTelemetry(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $validated = $request->validate([
            'readings' => ['required', 'array', 'min:1', 'max:100'],
            'readings.*.ph' => ['nullable', 'numeric', 'between:0,14'],
            'readings.*.temperature_c' => ['nullable', 'numeric', 'between:0,50'],
            'readings.*.tds_ppm' => ['nullable', 'numeric', 'between:0,10000'],
            'readings.*.turbidity_ntu' => ['nullable', 'numeric', 'between:0,1000'],
            'readings.*.water_level' => ['nullable', 'string', 'max:20'],
            'readings.*.aerator_on' => ['nullable', 'boolean'],
            'readings.*.mode' => ['nullable', 'string', 'max:20'],
            'readings.*.battery_v' => ['nullable', 'numeric', 'between:0,24'],
            'readings.*.recorded_at' => ['nullable', 'date'],
        ]);

        $readingIds = [];
        $lastResult = null;

        foreach ($validated['readings'] as $entry) {
            $lastResult = $this->ingestionService->ingest($device, $entry, 'HTTP_FALLBACK');
            $readingIds[] = $lastResult['reading']->id;
        }

        return response()->json([
            'success' => true,
            'message' => count($readingIds) . ' paket telemetri batch tersimpan melalui HTTP Fallback.',
            'transport' => 'HTTP_FALLBACK',
            'device_code' => $device->device_code,
            'ingested_count' => count($readingIds),
            'reading_ids' => $readingIds,
            'aerator_command' => $lastResult['aerator_command'] ?? ($device->aerator_on ? 'ON' : 'OFF'),
            'failsafe_triggered' => $lastResult['failsafe_triggered'] ?? false,
        ], 201);
    }

    /**
     * HTTP Fallback untuk WebSocket banyuwening.heartbeat.v1 (POST /api/http/heartbeat)
     */
    public function httpHeartbeat(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $validated = $request->validate([
            'rssi' => ['nullable', 'integer'],
            'uptime_s' => ['nullable', 'integer', 'min:0'],
            'free_heap' => ['nullable', 'integer', 'min:0'],
            'battery_v' => ['nullable', 'numeric', 'between:0,24'],
            'fallback_reason' => ['nullable', 'string', 'max:120'],
        ]);

        $device->update([
            'status' => 'ONLINE',
            'transport_protocol' => 'HTTP_FALLBACK',
            'last_heartbeat_at' => Carbon::now(),
        ]);

        $this->broadcaster->publish('heartbeat', 'device.heartbeat', [
            'device_code' => $device->device_code,
            'status' => 'ONLINE',
            'transport_protocol' => 'HTTP_FALLBACK',
            'rssi' => $validated['rssi'] ?? null,
            'uptime_s' => $validated['uptime_s'] ?? null,
            'free_heap' => $validated['free_heap'] ?? null,
            'battery_v' => $validated['battery_v'] ?? null,
            'fallback_reason' => $validated['fallback_reason'] ?? 'ws_unavailable',
        ], $device->device_code);

        return response()->json([
            'success' => true,
            'transport' => 'HTTP_FALLBACK',
            'device_code' => $device->device_code,
            'server_time' => now()->toIso8601String(),
            'has_pending_command' => is_array($device->pending_command),
        ]);
    }

    /**
     * HTTP Fallback polling perintah aktuator untuk banyuwening.control.v1 (GET /api/http/commands)
     */
    public function getHttpCommands(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        return response()->json([
            'success' => true,
            'transport' => 'HTTP_FALLBACK',
            'device_code' => $device->device_code,
            'aerator_command' => $device->aerator_on ? 'ON' : 'OFF',
            'mode' => $device->mode,
            'pending_command' => $device->pending_command,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Konfirmasi eksekusi perintah relay melalui HTTP Fallback (POST /api/http/commands/ack)
     */
    public function ackHttpCommand(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $validated = $request->validate([
            'command_id' => ['nullable', 'string', 'max:80'],
            'applied_action' => ['required', 'in:ON,OFF,AUTO'],
            'mode' => ['nullable', 'in:AUTO,MANUAL,FAILSAFE'],
        ]);

        $applied = $validated['applied_action'];
        $mode = $validated['mode'] ?? ($applied === 'AUTO' ? 'AUTO' : 'MANUAL');
        $isOn = $applied === 'ON' ? true : ($applied === 'OFF' ? false : (bool) $device->aerator_on);

        $device->update([
            'aerator_on' => $isOn,
            'mode' => $mode,
            'transport_protocol' => 'HTTP_FALLBACK',
            'pending_command' => null,
            'last_heartbeat_at' => Carbon::now(),
        ]);

        RelayLog::create([
            'device_id' => $device->id,
            'action' => $applied,
            'mode' => $mode,
            'reason' => 'Konfirmasi eksekusi relay via HTTP Fallback (/api/http/commands/ack)',
            'actor' => $device->device_code,
            'triggered_at' => Carbon::now(),
        ]);

        $this->broadcaster->publish('control', 'control.ack', [
            'device_code' => $device->device_code,
            'command_id' => $validated['command_id'] ?? null,
            'applied_action' => $applied,
            'aerator_on' => (bool) $device->aerator_on,
            'mode' => $device->mode,
            'transport' => 'HTTP_FALLBACK',
        ], $device->device_code);

        return response()->json([
            'success' => true,
            'message' => 'Konfirmasi eksekusi perintah relay berhasil dicatat.',
            'device_code' => $device->device_code,
            'aerator_on' => (bool) $device->aerator_on,
            'mode' => $device->mode,
        ]);
    }

    /**
     * Endpoint status terkini (GET /api/latest) — juga dipakai sebagai HTTP Fallback Dashboard (terisolasi per tenant)
     */
    public function getLatest(Request $request): JsonResponse
    {
        $user = Auth::user();
        $requestedCode = $request->query('device_code') ?? $request->query('device_id');
        $device = $this->resolveOptionalDevice($request);

        if ($user instanceof User && !$user->isAdmin()) {
            $accessible = Device::accessibleBy($user);
            $accessibleIds = $accessible->pluck('id')->all();

            if ($requestedCode && (!$device || !$device->isAccessibleBy($user))) {
                return response()->json([
                    'success' => false,
                    'error' => 'TENANT_ACCESS_DENIED',
                    'message' => 'Alat IoT ini bukan milik tenant akun Anda.',
                ], 403);
            }

            if (!$device || !$device->isAccessibleBy($user)) {
                $device = $accessible->first();
            }

            if (!$device) {
                return response()->json([
                    'success' => true,
                    'transport_mode' => 'HTTP_FALLBACK',
                    'reading' => null,
                    'prediction' => null,
                    'device' => null,
                    'server_time' => now()->toIso8601String(),
                ]);
            }

            $latest = SensorReading::where('device_id', $device->id)
                ->latest('recorded_at')
                ->first();
            $prediction = $latest
                ? Prediction::where('sensor_reading_id', $latest->id)->latest('predicted_at')->first()
                : Prediction::whereHas('sensorReading', fn ($q) => $q->whereIn('device_id', $accessibleIds))
                    ->latest('predicted_at')
                    ->first();

            return response()->json([
                'success' => true,
                'transport_mode' => 'HTTP_FALLBACK',
                'reading' => $latest,
                'prediction' => $prediction,
                'device' => $device,
                'server_time' => now()->toIso8601String(),
            ]);
        }

        $latestQuery = SensorReading::latest('recorded_at');
        if ($device) {
            $latestQuery->where('device_id', $device->id);
        }
        $latest = $latestQuery->first();

        $prediction = $latest
            ? (Prediction::where('sensor_reading_id', $latest->id)->latest('predicted_at')->first()
                ?? Prediction::latest('predicted_at')->first())
            : Prediction::latest('predicted_at')->first();

        $device ??= Device::first();

        return response()->json([
            'success' => true,
            'transport_mode' => 'HTTP_FALLBACK',
            'reading' => $latest,
            'prediction' => $prediction,
            'device' => $device,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Endpoint riwayat data sensor (GET /api/history) — terisolasi per tenant untuk akun peternak
     */
    public function getHistory(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->input('limit', 72), 1), 288);
        $user = Auth::user();
        $requestedCode = $request->query('device_code') ?? $request->query('device_id');
        $device = $this->resolveOptionalDevice($request);

        if ($user instanceof User && !$user->isAdmin()) {
            $accessible = Device::accessibleBy($user);
            $accessibleIds = $accessible->pluck('id')->all();

            if ($requestedCode && (!$device || !$device->isAccessibleBy($user))) {
                return response()->json([
                    'success' => false,
                    'error' => 'TENANT_ACCESS_DENIED',
                    'message' => 'Alat IoT ini bukan milik tenant akun Anda.',
                ], 403);
            }

            if (empty($accessibleIds)) {
                return response()->json([
                    'success' => true,
                    'count' => 0,
                    'device_code' => null,
                    'data' => [],
                ]);
            }

            $query = SensorReading::latest('recorded_at');
            if ($device && $device->isAccessibleBy($user)) {
                $query->where('device_id', $device->id);
            } else {
                $query->whereIn('device_id', $accessibleIds);
            }
            $readings = $query->take($limit)->get()->reverse()->values();

            return response()->json([
                'success' => true,
                'count' => $readings->count(),
                'device_code' => $device?->device_code ?? $accessible->first()?->device_code,
                'data' => $readings,
            ]);
        }

        $query = SensorReading::latest('recorded_at');
        if ($device) {
            $query->where('device_id', $device->id);
        }
        $readings = $query->take($limit)->get()->reverse()->values();

        return response()->json([
            'success' => true,
            'count' => $readings->count(),
            'device_code' => $device?->device_code,
            'data' => $readings,
        ]);
    }

    /**
     * HTTP Fallback untuk WebSocket banyuwening.alerts.v1 (GET /api/alerts/recent)
     */
    public function getRecentAlerts(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->input('limit', 25), 1), 100);
        $user = Auth::user();
        $requestedCode = $request->query('device_code') ?? $request->query('device_id');
        $device = $this->resolveOptionalDevice($request);

        $alertsQuery = Alert::latest();
        $predictionQuery = Prediction::latest('predicted_at');

        if ($user instanceof User && !$user->isAdmin()) {
            $accessible = Device::accessibleBy($user);
            $accessibleIds = $accessible->pluck('id')->all();

            if ($requestedCode && (!$device || !$device->isAccessibleBy($user))) {
                return response()->json([
                    'success' => false,
                    'error' => 'TENANT_ACCESS_DENIED',
                    'message' => 'Alat IoT ini bukan milik tenant akun Anda.',
                ], 403);
            }

            $targetIds = ($device && $device->isAccessibleBy($user)) ? [$device->id] : $accessibleIds;
            if (empty($targetIds)) {
                return response()->json([
                    'success' => true,
                    'transport_mode' => 'HTTP_FALLBACK',
                    'count' => 0,
                    'alerts' => [],
                    'prediction' => null,
                    'server_time' => now()->toIso8601String(),
                ]);
            }

            $alertsQuery->whereHas('sensorReading', fn ($q) => $q->whereIn('device_id', $targetIds));
            $predictionQuery->whereHas('sensorReading', fn ($q) => $q->whereIn('device_id', $targetIds));
        }

        $alerts = $alertsQuery->take($limit)->get()->map(function ($a) {
            return [
                'id' => $a->id,
                'ts' => $a->created_at->toIso8601String(),
                'level' => $a->level,
                'param' => $a->parameter,
                'message' => $a->message,
                'value' => $a->value,
                'telegram_sent' => (bool) $a->telegram_sent,
                'whatsapp_sent' => (bool) $a->whatsapp_sent,
                'email_sent' => (bool) $a->email_sent,
                'acknowledged_at' => $a->acknowledged_at?->toIso8601String(),
                'acknowledged_by' => $a->acknowledged_by,
            ];
        });

        $prediction = $predictionQuery->first();

        return response()->json([
            'success' => true,
            'transport_mode' => 'HTTP_FALLBACK',
            'count' => $alerts->count(),
            'alerts' => $alerts,
            'prediction' => $prediction,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    private function handleSingleIngestion(Request $request, string $transport): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $validated = $request->validate([
            'device_code' => ['nullable', 'string'],
            'device_id' => ['nullable', 'string'],
            'ph' => ['nullable', 'numeric', 'between:0,14'],
            'temperature_c' => ['nullable', 'numeric', 'between:0,50'],
            'tds_ppm' => ['nullable', 'numeric', 'between:0,10000'],
            'turbidity_ntu' => ['nullable', 'numeric', 'between:0,1000'],
            'water_level' => ['nullable', 'string', 'max:20'],
            'aerator_on' => ['nullable', 'boolean'],
            'mode' => ['nullable', 'string', 'max:20'],
            'battery_v' => ['nullable', 'numeric', 'between:0,24'],
            'recorded_at' => ['nullable', 'date'],
        ]);

        $result = $this->ingestionService->ingest($device, $validated, $transport);

        return response()->json([
            'success' => true,
            'message' => 'Telemetri tersimpan.',
            'transport' => $result['transport'],
            'device_code' => $device->device_code,
            'reading_id' => $result['reading']->id,
            'aerator_command' => $result['aerator_command'],
            'failsafe_triggered' => $result['failsafe_triggered'],
        ], 201);
    }

    private function resolveOptionalDevice(Request $request): ?Device
    {
        if ($bearer = $request->bearerToken()) {
            if ($byToken = Device::findByPlainToken($bearer)) {
                return $byToken;
            }
        }

        if ($headerToken = $request->header('X-Device-Token')) {
            if ($byToken = Device::findByPlainToken($headerToken)) {
                return $byToken;
            }
        }

        $code = $request->query('device_code') ?? $request->query('device_id');
        if ($code) {
            return Device::where('device_code', $code)->first();
        }

        return null;
    }
}
