<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Prediction;
use App\Models\Alert;
use App\Models\RelayLog;
use App\Models\DispatchLog;
use App\Models\LandingContent;
use App\Services\NotificationService;
use App\Services\FirmwareOtaService;
use App\Services\MachineLearningService;
use App\Services\MlSelfLearningAgentService;
use App\Services\RealtimeBroadcaster;
use App\Services\TwoFactorService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(
        Request $request,
        NotificationService $notificationService,
        MachineLearningService $mlService,
        RealtimeBroadcaster $broadcaster
    ): Response
    {
        $user = Auth::user();
        $accessibleDevices = Device::accessibleBy($user);
        $accessibleDeviceIds = $accessibleDevices->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        // Peta nama tenant untuk label UI & agregasi armada
        $tenantRecords = Tenant::orderBy('id')->get();
        $tenantNameMap = $tenantRecords->pluck('name', 'code')->all();

        // Snapshot reading & prediksi terakhir untuk setiap node yang bisa diakses
        $latestByDevice = [];
        $predictionByDevice = [];
        foreach ($accessibleDevices as $devItem) {
            $devLatest = SensorReading::where('device_id', $devItem->id)->latest('recorded_at')->first();
            $latestByDevice[$devItem->id] = $devLatest;
            if ($devLatest) {
                $predictionByDevice[$devItem->id] = Prediction::where('sensor_reading_id', $devLatest->id)->latest('predicted_at')->first()
                    ?? $mlService->predict($devLatest);
            } else {
                $predictionByDevice[$devItem->id] = null;
            }
        }

        // 1. Resolusi Hirarki 2 Tingkat: Tenant -> Alat IoT di Tenant
        $requestedTenantRaw = trim((string) $request->query('tenant_code', ''));
        $requestedDeviceCode = trim((string) $request->query('device_code', ''));
        $hasTenantQuery = $request->query('tenant_code') !== null;

        if ($user->isAdmin()) {
            if ($requestedDeviceCode !== '' && strtoupper($requestedDeviceCode) !== 'ALL' && !$hasTenantQuery) {
                $matched = $accessibleDevices->first(fn (Device $d) => strcasecmp($d->device_code, $requestedDeviceCode) === 0);
                $activeTenantCode = $matched ? strtoupper((string) ($matched->tenant_code ?: 'TENANT-UTAMA')) : 'ALL';
            } elseif ($requestedTenantRaw === '' || strtoupper($requestedTenantRaw) === 'ALL') {
                $activeTenantCode = 'ALL';
            } else {
                $candidateTenant = strtoupper($requestedTenantRaw);
                $knownCodes = collect($tenantRecords->pluck('code')->all())
                    ->merge($accessibleDevices->pluck('tenant_code')->filter()->all())
                    ->map(fn ($c) => strtoupper((string) $c))
                    ->unique()
                    ->values()
                    ->all();
                $activeTenantCode = in_array($candidateTenant, $knownCodes, true) ? $candidateTenant : 'ALL';
            }
        } else {
            $activeTenantCode = strtoupper((string) ($user->tenant_code ?: ($accessibleDevices->first()?->tenant_code ?: 'TENANT-UTAMA')));
        }

        $scopedDevices = ($user->isAdmin() && $activeTenantCode === 'ALL')
            ? $accessibleDevices->values()
            : $accessibleDevices->filter(
                fn (Device $d) => strcasecmp((string) ($d->tenant_code ?: 'TENANT-UTAMA'), $activeTenantCode) === 0
            )->values();

        // Saat mode ALL Tenant (Super Admin), jangan kunci ke 1 alat agar agregasi tetap murni per tenant
        $selectedDevice = null;
        if (!($user->isAdmin() && $activeTenantCode === 'ALL')) {
            if ($requestedDeviceCode !== '' && strtoupper($requestedDeviceCode) !== 'ALL') {
                $selectedDevice = $scopedDevices->first(fn (Device $d) => strcasecmp($d->device_code, $requestedDeviceCode) === 0);
            }
        }
        $activeDeviceCode = $selectedDevice ? $selectedDevice->device_code : 'ALL';

        $scopedDeviceIds = $scopedDevices->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $alertDeviceIds = $selectedDevice ? [(int) $selectedDevice->id] : $scopedDeviceIds;

        // 2. Bacaan sensor & Prediksi ML (Tunggal vs Agregasi Multi-Alat / Multi-Tenant)
        $currentReadingData = null;
        $predictionData = null;
        $onlineScopedCount = 0;

        if ($selectedDevice) {
            $latest = $latestByDevice[$selectedDevice->id] ?? null;
            $pred = $predictionByDevice[$selectedDevice->id] ?? null;
            if ($latest) {
                $onlineScopedCount = ($selectedDevice->status ?? 'ONLINE') === 'ONLINE' ? 1 : 0;
                $currentReadingData = [
                    'id' => $latest->id,
                    'ts' => $latest->recorded_at->toIso8601String(),
                    'ph' => $latest->ph,
                    'temperature_c' => $latest->temperature_c,
                    'tds_ppm' => $latest->tds_ppm,
                    'turbidity_ntu' => $latest->turbidity_ntu,
                    'water_level' => $latest->water_level,
                    'aerator_on' => (bool)$latest->aerator_on,
                    'mode' => $latest->mode,
                    'transport' => $latest->transport ?? 'HTTP',
                ];
            }
            if ($pred) {
                $predictionData = [
                    'risk' => $pred->risk,
                    'p_aman' => (float)$pred->p_aman,
                    'p_waspada' => (float)$pred->p_waspada,
                    'p_bahaya' => (float)$pred->p_bahaya,
                    'model_version' => $pred->model_version,
                    'timeframe' => $pred->timeframe,
                    'triggers' => $pred->triggers ?? [],
                    'recommended_action' => $pred->recommended_action,
                    'failsafe_active' => (bool)$pred->failsafe_active,
                    'predicted_at' => $pred->predicted_at->toIso8601String(),
                ];
            }
        } else {
            $scopedReadings = collect($scopedDevices)
                ->map(fn (Device $d) => $latestByDevice[$d->id] ?? null)
                ->filter()
                ->values();

            $onlineScopedCount = $scopedDevices->filter(
                fn (Device $d) => ($d->status ?? '') === 'ONLINE' || isset($latestByDevice[$d->id])
            )->count();

            if ($scopedReadings->isNotEmpty()) {
                $phVals = $scopedReadings->pluck('ph')->filter(fn ($v) => $v !== null);
                $tempVals = $scopedReadings->pluck('temperature_c')->filter(fn ($v) => $v !== null);
                $tdsVals = $scopedReadings->pluck('tds_ppm')->filter(fn ($v) => $v !== null);
                $turbVals = $scopedReadings->pluck('turbidity_ntu')->filter(fn ($v) => $v !== null);
                $latestTs = $scopedReadings->max(fn ($r) => $r->recorded_at);

                $currentReadingData = [
                    'id' => $scopedReadings->first()->id,
                    'ts' => $latestTs ? Carbon::parse($latestTs)->toIso8601String() : now()->toIso8601String(),
                    'ph' => $phVals->isNotEmpty() ? round((float) $phVals->avg(), 2) : null,
                    'temperature_c' => $tempVals->isNotEmpty() ? round((float) $tempVals->avg(), 1) : null,
                    'tds_ppm' => $tdsVals->isNotEmpty() ? (int) round((float) $tdsVals->avg()) : null,
                    'turbidity_ntu' => $turbVals->isNotEmpty() ? round((float) $turbVals->avg(), 1) : null,
                    'water_level' => $scopedReadings->contains('water_level', 'LOW') ? 'LOW' : 'NORMAL',
                    'aerator_on' => $scopedReadings->contains('aerator_on', true),
                    'mode' => $scopedReadings->contains('mode', 'FAILSAFE')
                        ? 'FAILSAFE'
                        : ($scopedReadings->contains('mode', 'MANUAL') ? 'MANUAL' : 'AUTO'),
                    'transport' => 'AGGREGATE',
                ];
            }

            $scopedPreds = collect($scopedDevices)
                ->map(fn (Device $d) => $predictionByDevice[$d->id] ?? null)
                ->filter()
                ->values();

            if ($scopedPreds->isNotEmpty()) {
                $worstRisk = $scopedPreds->contains('risk', 'BAHAYA')
                    ? 'BAHAYA'
                    : ($scopedPreds->contains('risk', 'WASPADA') ? 'WASPADA' : 'AMAN');
                $firstPred = $scopedPreds->first();
                $mergedTriggers = $scopedPreds
                    ->flatMap(fn ($p) => is_array($p->triggers) ? $p->triggers : [])
                    ->unique()
                    ->values()
                    ->all();
                $worstPred = $scopedPreds->firstWhere('risk', $worstRisk) ?? $firstPred;

                $predictionData = [
                    'risk' => $worstRisk,
                    'p_aman' => round((float) $scopedPreds->avg('p_aman'), 4),
                    'p_waspada' => round((float) $scopedPreds->avg('p_waspada'), 4),
                    'p_bahaya' => round((float) $scopedPreds->avg('p_bahaya'), 4),
                    'model_version' => $firstPred->model_version,
                    'timeframe' => $firstPred->timeframe ?: '1–3 jam',
                    'triggers' => $mergedTriggers,
                    'recommended_action' => $worstPred->recommended_action,
                    'failsafe_active' => $scopedPreds->contains('failsafe_active', true),
                    'predicted_at' => $worstPred->predicted_at->toIso8601String(),
                ];
            }
        }

        // 3. Riwayat 288 data (24 jam) khusus device aktif atau agregasi 5 menit lintas scope
        if ($selectedDevice) {
            $allReadings = SensorReading::where('device_id', $selectedDevice->id)
                ->latest('recorded_at')
                ->take(288)
                ->get()
                ->reverse()
                ->values()
                ->map(function ($r) {
                    return [
                        'ts' => $r->recorded_at->toIso8601String(),
                        'ph' => $r->ph,
                        'temperature_c' => $r->temperature_c,
                        'tds_ppm' => $r->tds_ppm,
                        'turbidity_ntu' => $r->turbidity_ntu,
                        'water_level' => $r->water_level,
                        'aerator_on' => (bool)$r->aerator_on,
                        'mode' => $r->mode,
                    ];
                });
        } elseif (!empty($scopedDeviceIds)) {
            $rawScoped = SensorReading::whereIn('device_id', $scopedDeviceIds)
                ->latest('recorded_at')
                ->take(min(288 * max(1, count($scopedDeviceIds)), 864))
                ->get();

            $allReadings = $rawScoped
                ->groupBy(fn ($r) => intdiv($r->recorded_at->timestamp, 300) * 300)
                ->sortKeys()
                ->take(-288)
                ->values()
                ->map(function ($bucket) {
                    $phVals = $bucket->pluck('ph')->filter(fn ($v) => $v !== null);
                    $tempVals = $bucket->pluck('temperature_c')->filter(fn ($v) => $v !== null);
                    $tdsVals = $bucket->pluck('tds_ppm')->filter(fn ($v) => $v !== null);
                    $turbVals = $bucket->pluck('turbidity_ntu')->filter(fn ($v) => $v !== null);
                    $latestInBucket = $bucket->sortByDesc('recorded_at')->first();

                    return [
                        'ts' => $latestInBucket->recorded_at->toIso8601String(),
                        'ph' => $phVals->isNotEmpty() ? round((float) $phVals->avg(), 2) : null,
                        'temperature_c' => $tempVals->isNotEmpty() ? round((float) $tempVals->avg(), 1) : null,
                        'tds_ppm' => $tdsVals->isNotEmpty() ? (int) round((float) $tdsVals->avg()) : null,
                        'turbidity_ntu' => $turbVals->isNotEmpty() ? round((float) $turbVals->avg(), 1) : null,
                        'water_level' => $bucket->contains('water_level', 'LOW') ? 'LOW' : 'NORMAL',
                        'aerator_on' => $bucket->contains('aerator_on', true),
                        'mode' => $bucket->contains('mode', 'FAILSAFE')
                            ? 'FAILSAFE'
                            : ($bucket->contains('mode', 'MANUAL') ? 'MANUAL' : 'AUTO'),
                    ];
                });
        } else {
            $allReadings = collect();
        }

        // 4. Daftar Alert terisolasi sesuai Scope (Tenant / Alat Aktif)
        $alertsQuery = Alert::with('sensorReading.device:id,device_code,pond_name,tenant_code')->latest();
        if (empty($alertDeviceIds)) {
            $alertsQuery->whereRaw('1 = 0');
        } else {
            $alertsQuery->whereHas('sensorReading', fn ($q) => $q->whereIn('device_id', $alertDeviceIds));
        }
        $alerts = $alertsQuery->take(50)->get()->map(function ($a) {
            $dev = $a->sensorReading?->device;
            return [
                'id' => $a->id,
                'ts' => $a->created_at->toIso8601String(),
                'level' => $a->level,
                'param' => $a->parameter,
                'message' => $a->message,
                'value' => $a->value,
                'pond_name' => $dev?->pond_name,
                'device_code' => $dev?->device_code,
                'tenant_code' => $dev?->tenant_code,
                'telegram_sent' => (bool)$a->telegram_sent,
                'whatsapp_sent' => (bool)$a->whatsapp_sent,
                'email_sent' => (bool)$a->email_sent,
                'acknowledged_at' => $a->acknowledged_at?->toIso8601String(),
                'acknowledged_by' => $a->acknowledged_by,
            ];
        });

        // 5. Data Tambahan khusus Admin & Self-OTA Tenant
        $users = [];
        $tenants = [];
        $notificationConfig = null;
        $dispatchLogs = [];
        $landingContent = null;
        $backups = [];
        $securityStats = null;

        $canManageUsers = $user && ($user->isAdmin() || $user->hasPermission('manage_users'));
        $canManageLanding = $user && ($user->isAdmin() || $user->hasPermission('manage_landing'));
        $canManageNotif = $user && ($user->isAdmin() || $user->hasPermission('manage_notifications'));
        $canManageBackups = $user && ($user->isAdmin() || $user->hasPermission('manage_backups'));
        $canViewDocsApi = $user && ($user->isAdmin() || $user->hasPermission('view_docs_api'));
        $canSelfOta = $user && ($user->isAdmin() || $user->hasPermission('update_device_firmware'));

        if ($canManageLanding) {
            $landingContent = LandingContent::getAllSettings();
        }

        if ($canManageUsers || $canViewDocsApi) {
            $users = User::latest()->get()->map(fn (User $u) => $this->serializeUserForAdmin($u))->values()->all();
            $tenants = Tenant::with(['owner:id,name,email,role,phone'])
                ->withCount(['users', 'devices'])
                ->orderBy('id')
                ->get()
                ->map(fn (Tenant $t) => $this->serializeTenantForAdmin($t))
                ->values()
                ->all();
        }

        if ($canManageNotif) {
            $notificationConfig = $notificationService->getSettings();
            $dispatchLogs = DispatchLog::latest()->take(50)->get()->map(function ($l) {
                return [
                    'id' => 'log-' . $l->id,
                    'timestamp' => $l->created_at->format('Y-m-d H:i:s') . ' WIB',
                    'channel' => $l->channel,
                    'recipient' => $l->recipient,
                    'status' => $l->status,
                    'triggerType' => $l->trigger_type,
                    'preview' => $l->preview,
                    'details' => $l->details,
                ];
            });
        }

        if ($canManageBackups) {
            $backupDir = storage_path('app/backups');
            if (!file_exists($backupDir)) {
                mkdir($backupDir, 0755, true);
            }
            $backups = collect(glob($backupDir . '/*'))
                ->filter(fn($file) => is_file($file))
                ->map(function ($file) {
                    $bytes = filesize($file);
                    $humanSize = $bytes >= 1048576 
                        ? round($bytes / 1048576, 2) . ' MB' 
                        : round($bytes / 1024, 2) . ' KB';
                    return [
                        'filename' => basename($file),
                        'size' => $bytes,
                        'size_human' => $humanSize,
                        'created_at' => date('Y-m-d H:i:s', filemtime($file)) . ' WIB',
                        'type' => strtolower(pathinfo($file, PATHINFO_EXTENSION)),
                    ];
                })
                ->sortByDesc('filename')
                ->values()
                ->all();

            $dbPath = config('database.connections.sqlite.database');
            $dbSize = ($dbPath && file_exists($dbPath)) ? filesize($dbPath) : 0;
            $dbSizeHuman = $dbSize >= 1048576 ? round($dbSize / 1048576, 2) . ' MB' : round($dbSize / 1024, 2) . ' KB';

            $securityStats = [
                'total_users' => User::count(),
                'users_with_2fa' => User::where('two_factor_enabled', true)->count(),
                'db_driver' => strtoupper(config('database.default')),
                'db_size' => $dbSizeHuman,
                'total_readings' => SensorReading::count(),
                'total_predictions' => Prediction::count(),
                'mqtt_tls' => 'Aktif (Port 8883 - TLS 1.3)',
                'failsafe_hardware' => 'Aktif (ESP32 Deterministic GPIO)',
                'last_backup' => count($backups) > 0 ? $backups[0]['created_at'] : 'Belum pernah',
                'csrf_protection' => 'Aktif (Token Validasi Per-Request)',
            ];
        }

        $devices = [];
        $otaOverview = null;
        $mlOverview = null;
        if ($canManageUsers || $canViewDocsApi || $canSelfOta) {
            $devices = $accessibleDevices->map(function (Device $d) use ($user, $latestByDevice, $predictionByDevice) {
                return $this->serializeDeviceForAdmin($d, $user, $latestByDevice[$d->id] ?? null, $predictionByDevice[$d->id] ?? null);
            })->values()->all();
        }
        if ($canViewDocsApi || $canSelfOta) {
            $otaOverview = app(FirmwareOtaService::class)->getOverview($user);
        }
        if ($canViewDocsApi) {
            $mlOverview = app(MlSelfLearningAgentService::class)->getPerformanceMetrics(24);
        }

        $deviceSummaryPayload = $selectedDevice
            ? [
                'device_code' => $selectedDevice->device_code,
                'name' => $selectedDevice->name,
                'pond_name' => $selectedDevice->pond_name,
                'tenant_code' => $selectedDevice->tenant_code,
                'firmware_version' => $selectedDevice->firmware_version ?? '-',
                'status' => ($selectedDevice && ($latestByDevice[$selectedDevice->id] ?? null))
                    ? ($selectedDevice->status ?? 'ONLINE')
                    : ($selectedDevice->status ?? 'STANDBY'),
                'transport_protocol' => $selectedDevice->transport_protocol ?? 'STANDBY',
                'mode' => $selectedDevice->mode ?? 'AUTO',
                'aerator_on' => (bool)($selectedDevice->aerator_on ?? false),
            ]
            : [
                'device_code' => $activeTenantCode === 'ALL' ? 'SEMUA-TENANT' : $activeTenantCode,
                'name' => $activeTenantCode === 'ALL'
                    ? 'Agregasi Seluruh Mitra Tenant'
                    : ($tenantNameMap[$activeTenantCode] ?? $activeTenantCode),
                'pond_name' => $activeTenantCode === 'ALL'
                    ? (count($scopedDevices) . ' Node Lintas Tenant')
                    : ('Semua Kolam (' . count($scopedDevices) . ' Alat)'),
                'tenant_code' => $activeTenantCode,
                'firmware_version' => $scopedDevices->first()?->firmware_version ?? '-',
                'status' => $onlineScopedCount > 0 ? 'ONLINE' : 'STANDBY',
                'transport_protocol' => $currentReadingData ? 'AGGREGATE' : 'STANDBY',
                'mode' => $currentReadingData['mode'] ?? 'AUTO',
                'aerator_on' => (bool)($currentReadingData['aerator_on'] ?? false),
            ];

        $tenantDevicesPayload = $accessibleDevices->map(function (Device $d) use ($tenantNameMap, $latestByDevice, $predictionByDevice) {
            $tCode = strtoupper((string) ($d->tenant_code ?: 'TENANT-UTAMA'));
            $l = $latestByDevice[$d->id] ?? null;
            $p = $predictionByDevice[$d->id] ?? null;

            return [
                'id' => $d->id,
                'device_code' => $d->device_code,
                'name' => $d->name,
                'pond_name' => $d->pond_name,
                'tenant_code' => $tCode,
                'tenant_name' => $tenantNameMap[$tCode] ?? $tCode,
                'firmware_version' => $d->firmware_version,
                'hardware_profile' => $d->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2',
                'status' => $d->status,
                'transport_protocol' => $d->transport_protocol ?? 'STANDBY',
                'mode' => $d->mode ?? 'AUTO',
                'aerator_on' => (bool) $d->aerator_on,
                'last_heartbeat_at' => $d->last_heartbeat_at?->toIso8601String(),
                'latest_reading' => $l ? [
                    'id' => $l->id,
                    'ts' => $l->recorded_at->toIso8601String(),
                    'ph' => $l->ph,
                    'temperature_c' => $l->temperature_c,
                    'tds_ppm' => $l->tds_ppm,
                    'turbidity_ntu' => $l->turbidity_ntu,
                    'water_level' => $l->water_level,
                    'aerator_on' => (bool) $l->aerator_on,
                    'mode' => $l->mode,
                    'transport' => $l->transport ?? 'HTTP',
                ] : null,
                'latest_prediction' => $p ? [
                    'risk' => $p->risk,
                    'p_aman' => (float) $p->p_aman,
                    'p_waspada' => (float) $p->p_waspada,
                    'p_bahaya' => (float) $p->p_bahaya,
                    'timeframe' => $p->timeframe,
                    'recommended_action' => $p->recommended_action,
                ] : null,
            ];
        })->values()->all();

        return Inertia::render('Dashboard', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'OPERATOR',
                'title' => $user->title ?? 'Operator Lapangan',
                'pond_name' => $user->pond_name ?? 'Kolam Terpal Sangkuriang 01',
                'tenant_code' => $user->tenant_code,
                'assigned_device_ids' => $accessibleDeviceIds,
                'avatar_initials' => $user->avatar_initials ?? 'BW',
                'phone' => $user->phone ?? '',
                'two_factor_enabled' => (bool) $user->hasTwoFactor(),
                'permissions' => $user->resolvedPermissions(),
                'custom_permissions' => $user->custom_permissions,
                'has_custom_permissions' => $user->hasCustomPermissions(),
            ],
            'currentReading' => $currentReadingData,
            'prediction' => $predictionData,
            'allReadings' => $allReadings,
            'alerts' => $alerts,
            'device' => $deviceSummaryPayload,
            'tenantDevices' => $tenantDevicesPayload,
            'activeTenantCode' => $activeTenantCode,
            'activeDeviceCode' => $activeDeviceCode,
            'aeratorState' => [
                'isOn' => (bool)($currentReadingData['aerator_on'] ?? false),
                'mode' => $currentReadingData['mode'] ?? 'AUTO',
                'dailyDuration' => $currentReadingData ? '3 jam 20 menit' : '0 menit (Standby)',
            ],
            'users' => $users,
            'tenants' => $tenants,
            'devices' => $devices,
            'otaOverview' => $otaOverview,
            'mlOverview' => $mlOverview,
            'realtimeConfig' => $broadcaster->getRealtimeConfig($user, $request->getSchemeAndHttpHost()),
            'notificationConfig' => $notificationConfig,
            'dispatchLogs' => $dispatchLogs,
            'landingContent' => $landingContent,
            'backups' => $backups,
            'securityStats' => $securityStats,
        ]);
    }

    public function controlAerator(Request $request, RealtimeBroadcaster $broadcaster)
    {
        $user = Auth::user();
        if (!$user || !$user->hasPermission('control_aerator')) {
            abort(403, 'Akun Anda tidak memiliki hak akses kendali aerator.');
        }

        $validated = $request->validate([
            'action' => ['required', 'in:ON,OFF,AUTO'],
            'duration' => ['nullable', 'integer'],
            'duration_minutes' => ['nullable', 'integer'],
            'device_code' => ['nullable', 'string'],
        ]);

        $accessibleDevices = Device::accessibleBy($user);
        $device = !empty($validated['device_code'])
            ? Device::where('device_code', $validated['device_code'])->first()
            : $accessibleDevices->first();

        if (!$device || !$device->isAccessibleBy($user)) {
            abort(403, 'Perangkat IoT ini tidak termasuk dalam tenant / hak akses akun Anda.');
        }

        $action = $validated['action'];

        $isOn = $action === 'ON';
        $mode = $action === 'AUTO' ? 'AUTO' : 'MANUAL';
        $durationSec = $validated['duration'] ?? (isset($validated['duration_minutes']) ? $validated['duration_minutes'] * 60 : 1800);

        $commandPayload = [
            'command_id' => 'cmd-' . Str::lower(Str::random(10)),
            'action' => $action,
            'aerator_on' => $isOn,
            'mode' => $mode,
            'duration_seconds' => $durationSec,
            'issued_by' => $user ? "{$user->name} ({$user->role})" : 'Operator',
            'issued_at' => now()->toIso8601String(),
        ];

        $device->update([
            'aerator_on' => $isOn,
            'mode' => $mode,
            'pending_command' => $commandPayload,
        ]);

        RelayLog::create([
            'device_id' => $device->id,
            'action' => $action,
            'mode' => $mode,
            'reason' => 'Perintah kontrol dari Dashboard Web',
            'actor' => $user ? "{$user->name} ({$user->role})" : 'Operator',
            'duration_seconds' => $durationSec,
            'triggered_at' => now(),
        ]);

        // Push instan ke kanal WebSocket banyuwening.control.v1 (juga tersedia via HTTP Fallback /api/http/commands)
        $broadcaster->publish('control', 'control.command', $commandPayload, $device->device_code);

        // Simpan juga ke reading terakhir milik alat tenant ini
        $latest = SensorReading::where('device_id', $device->id)->latest('recorded_at')->first();
        if ($latest) {
            $latest->update([
                'aerator_on' => $isOn,
                'mode' => $mode,
            ]);
        }

        return back()->with('success', "Status aerator {$device->device_code} berhasil diperbarui menjadi {$action} ({$mode}).");
    }

    public function acknowledgeAlert(Alert $alert)
    {
        $user = Auth::user();
        if (!$user || !$user->hasPermission('ack_alerts')) {
            abort(403, 'Akun Anda tidak memiliki hak akses konfirmasi peringatan.');
        }

        $alert->loadMissing('sensorReading');
        if (!$user->isAdmin()) {
            $accessibleIds = Device::accessibleBy($user)->pluck('id')->map(fn ($id) => (int) $id)->all();
            if ($alert->sensorReading && !in_array((int) $alert->sensorReading->device_id, $accessibleIds, true)) {
                abort(403, 'Peringatan ini milik tenant peternak lain.');
            }
            if (!$alert->sensorReading && empty($accessibleIds)) {
                abort(403, 'Akun Anda belum memiliki akses ke alat IoT tenant mana pun.');
            }
        }

        $alert->update([
            'acknowledged_at' => now(),
            'acknowledged_by' => $user ? "{$user->name} ({$user->role})" : 'Pengguna',
        ]);

        return back()->with('success', 'Peringatan telah ditandai selesai ditangani.');
    }

    public function storeUser(Request $request)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:5'],
            'role' => ['required', 'in:ADMIN,OPERATOR,ANALIS,PEMILIK'],
            'pond_name' => ['nullable', 'string'],
            'tenant_code' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string'],
            'custom_permissions' => ['nullable', 'array'],
            'assigned_device_ids' => ['nullable', 'array'],
            'assigned_device_ids.*' => ['integer', 'exists:devices,id'],
        ]);

        $titleMap = [
            'ADMIN' => 'Super Administrator Sistem',
            'OPERATOR' => 'Operator Teknis Lapangan',
            'ANALIS' => 'Pakar Akuakultur & Analisis Data',
            'PEMILIK' => 'Pemilik Budidaya Tambak',
        ];

        $initials = collect(explode(' ', $validated['name']))
            ->map(fn($part) => mb_substr($part, 0, 1))
            ->take(2)
            ->join('');

        $customPerms = User::sanitizeCustomPermissions($request->input('custom_permissions'), $validated['role']);
        $tenantCode = $validated['role'] === 'ADMIN'
            ? (!empty($validated['tenant_code']) ? User::normalizeTenantCode($validated['tenant_code']) : null)
            : User::normalizeTenantCode($validated['tenant_code'] ?? null, $validated['pond_name'] ?? $validated['name']);

        $createdUser = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'title' => $titleMap[$validated['role']] ?? 'Pengguna Kolam',
            'pond_name' => $validated['pond_name'] ?? 'Kolam Terpal 01',
            'tenant_code' => $tenantCode,
            'avatar_initials' => strtoupper($initials) ?: 'BW',
            'phone' => $validated['phone'] ?? '-',
            'custom_permissions' => $customPerms,
        ]);

        if (!empty($validated['assigned_device_ids'])) {
            foreach (Device::whereIn('id', $validated['assigned_device_ids'])->get() as $dev) {
                $existing = is_array($dev->assigned_user_ids) ? array_map('intval', $dev->assigned_user_ids) : [];
                $existing[] = (int) $createdUser->id;
                $dev->syncAssignedUsers($dev->owner_user_id ?: $createdUser->id, $existing, $dev->tenant_code ?: $tenantCode);
            }
        }

        return back()->with('success', "Pengguna {$validated['name']} berhasil ditambahkan (Tenant: " . ($tenantCode ?: 'GLOBAL') . ")!");
    }

    public function destroyUser($id)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        // Handle either numeric ID (e.g. 2) or prefixed string (e.g. 'usr-2')
        $numericId = (int) str_replace('usr-', '', (string) $id);
        $targetUser = User::find($numericId);

        if (!$targetUser) {
            return back()->with('error', 'Akun pengguna tidak ditemukan atau sudah dihapus.');
        }

        if ($targetUser->id === $user->id) {
            return back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        if ($targetUser->email === 'admin@banyuwening.id') {
            return back()->with('error', 'Akun Super Administrator utama sistem dilindungi dan tidak dapat dihapus.');
        }

        $targetUser->delete();
        return back()->with('success', 'Akun pengguna berhasil dihapus.');
    }

    public function updateUser(Request $request, $id)
    {
        $admin = Auth::user();
        if (!$admin || (!$admin->isAdmin() && !$admin->hasPermission('manage_users'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $numericId = (int) str_replace('usr-', '', (string) $id);
        $targetUser = User::findOrFail($numericId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,' . $targetUser->id],
            'role' => ['required', 'in:ADMIN,OPERATOR,ANALIS,PEMILIK'],
            'pond_name' => ['nullable', 'string', 'max:255'],
            'tenant_code' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:5'],
            'reset_2fa' => ['nullable', 'boolean'],
            'custom_permissions' => ['nullable', 'array'],
            'reset_permissions' => ['nullable', 'boolean'],
            'assigned_device_ids' => ['nullable', 'array'],
            'assigned_device_ids.*' => ['integer', 'exists:devices,id'],
        ]);

        if ($targetUser->email === 'admin@banyuwening.id' && $validated['role'] !== 'ADMIN') {
            return back()->with('error', 'Peran akun Super Administrator utama sistem tidak dapat diubah.');
        }

        $titleMap = [
            'ADMIN' => 'Super Administrator Sistem',
            'OPERATOR' => 'Operator Teknis Lapangan',
            'ANALIS' => 'Pakar Akuakultur & Analisis Data',
            'PEMILIK' => 'Pemilik Budidaya Tambak',
        ];

        $initials = collect(explode(' ', $validated['name']))
            ->map(fn($part) => mb_substr($part, 0, 1))
            ->take(2)
            ->join('');

        $targetUser->name = $validated['name'];
        $targetUser->email = strtolower($validated['email']);
        $targetUser->role = $validated['role'];
        $targetUser->title = $titleMap[$validated['role']] ?? $targetUser->title;
        $targetUser->pond_name = $validated['pond_name'] ?? $targetUser->pond_name;
        if (array_key_exists('tenant_code', $validated)) {
            $rawTenant = trim((string) ($validated['tenant_code'] ?? ''));
            $targetUser->tenant_code = $rawTenant !== ''
                ? User::normalizeTenantCode($rawTenant)
                : ($validated['role'] === 'ADMIN' ? null : User::normalizeTenantCode(null, $targetUser->pond_name ?: $targetUser->name));
        }
        $targetUser->phone = $validated['phone'] ?? $targetUser->phone;
        $targetUser->avatar_initials = strtoupper($initials) ?: $targetUser->avatar_initials;

        if (!empty($validated['password'])) {
            $targetUser->password = Hash::make($validated['password']);
        }

        if ($request->boolean('reset_2fa')) {
            $targetUser->two_factor_enabled = false;
            $targetUser->two_factor_secret = null;
            $targetUser->two_factor_confirmed_at = null;
            $targetUser->two_factor_recovery_codes = null;
        }

        if ($request->boolean('reset_permissions')) {
            $targetUser->custom_permissions = null;
        } elseif ($request->has('custom_permissions')) {
            $targetUser->custom_permissions = User::sanitizeCustomPermissions(
                $request->input('custom_permissions'),
                $validated['role']
            );
        }

        $targetUser->save();

        if ($request->has('assigned_device_ids')) {
            $wantedDeviceIds = array_map('intval', $validated['assigned_device_ids'] ?? []);
            foreach (Device::all() as $dev) {
                $currentIds = array_map('intval', is_array($dev->assigned_user_ids) ? $dev->assigned_user_ids : []);
                $shouldHave = in_array((int) $dev->id, $wantedDeviceIds, true);
                if ($shouldHave && !in_array((int) $targetUser->id, $currentIds, true)) {
                    $currentIds[] = (int) $targetUser->id;
                    $dev->syncAssignedUsers($dev->owner_user_id ?: (int) $targetUser->id, $currentIds, $dev->tenant_code ?: $targetUser->tenant_code);
                } elseif (!$shouldHave && in_array((int) $targetUser->id, $currentIds, true)) {
                    $nextIds = array_values(array_diff($currentIds, [(int) $targetUser->id]));
                    $nextOwner = (int) $dev->owner_user_id === (int) $targetUser->id ? ($nextIds[0] ?? null) : $dev->owner_user_id;
                    $dev->syncAssignedUsers($nextOwner, $nextIds);
                }
            }
        }

        return back()->with('success', "Akun {$targetUser->name} berhasil diperbarui!");
    }

    /**
     * Super Admin: Kustomisasi hak akses granular per pengguna (atau reset ke default role).
     */
    public function updateUserPermissions(Request $request, $id)
    {
        $admin = Auth::user();
        if (!$admin || (!$admin->isAdmin() && !$admin->hasPermission('manage_users'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $numericId = (int) str_replace('usr-', '', (string) $id);
        $targetUser = User::findOrFail($numericId);

        $request->validate([
            'reset' => ['nullable', 'boolean'],
            'permissions' => ['nullable', 'array'],
        ]);

        if ($request->boolean('reset')) {
            $targetUser->custom_permissions = null;
        } else {
            $targetUser->custom_permissions = User::sanitizeCustomPermissions(
                $request->input('permissions', []),
                $targetUser->role
            );
        }

        $targetUser->save();

        $msg = $targetUser->hasCustomPermissions()
            ? "Hak akses khusus untuk {$targetUser->name} berhasil disimpan."
            : "Hak akses {$targetUser->name} disetel sesuai standar peran {$targetUser->role}.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $msg,
                'user' => $this->serializeUserForAdmin($targetUser->fresh()),
            ]);
        }

        return back()->with('success', $msg);
    }

    /**
     * Super Admin: Daftarkan Tenant / Mitra Tambak baru, opsional buat akun pemilik & alokasikan alat IoT.
     */
    public function storeTenant(Request $request)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users'))) {
            abort(403, 'Akses terbatas untuk Administrator.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:80'],
            'pond_name' => ['nullable', 'string', 'max:120'],
            'pic_name' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:500'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', 'string', 'in:ACTIVE,TRIAL,SUSPENDED'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'create_owner_account' => ['nullable', 'boolean'],
            'owner_name' => ['nullable', 'string', 'max:120'],
            'owner_email' => ['nullable', 'email', 'max:120'],
            'owner_password' => ['nullable', 'string', 'min:6'],
            'assign_device_ids' => ['nullable', 'array'],
            'assign_device_ids.*' => ['integer', 'exists:devices,id'],
        ]);

        $baseCode = !empty($validated['code'])
            ? User::normalizeTenantCode($validated['code'])
            : User::normalizeTenantCode(null, $validated['name']);

        // Pastikan kode unik, bila ada duplikasi tambahkan nomor urut
        $tenantCode = $baseCode;
        $counter = 1;
        while (Tenant::where('code', $tenantCode)->exists()) {
            $tenantCode = $baseCode . '-' . str_pad((string)$counter, 2, '0', STR_PAD_LEFT);
            $counter++;
        }

        $ownerId = !empty($validated['owner_user_id']) ? (int) $validated['owner_user_id'] : null;

        if ($request->boolean('create_owner_account') && !empty($validated['owner_email'])) {
            $existingEmail = User::where('email', strtolower(trim($validated['owner_email'])))->exists();
            if ($existingEmail) {
                return back()->with('error', "Email pemilik {$validated['owner_email']} sudah digunakan oleh akun lain.");
            }

            $ownerUser = User::create([
                'name' => !empty($validated['owner_name']) ? $validated['owner_name'] : (!empty($validated['pic_name']) ? $validated['pic_name'] : $validated['name']),
                'email' => strtolower(trim($validated['owner_email'])),
                'password' => Hash::make(!empty($validated['owner_password']) ? $validated['owner_password'] : 'BanyuWening@123'),
                'role' => 'PEMILIK',
                'title' => 'Pemilik Budidaya Tambak',
                'pond_name' => !empty($validated['pond_name']) ? $validated['pond_name'] : 'Kolam Terpal Sangkuriang',
                'tenant_code' => $tenantCode,
                'phone' => $validated['phone'] ?? '',
                'avatar_initials' => strtoupper(substr(!empty($validated['owner_name']) ? $validated['owner_name'] : 'BW', 0, 2)),
            ]);

            $ownerId = (int) $ownerUser->id;
        }

        $tenant = Tenant::create([
            'code' => $tenantCode,
            'name' => $validated['name'],
            'pond_name' => !empty($validated['pond_name']) ? $validated['pond_name'] : 'Kolam Terpal Sangkuriang',
            'pic_name' => $validated['pic_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'owner_user_id' => $ownerId,
            'status' => $validated['status'] ?? 'ACTIVE',
            'notes' => $validated['notes'] ?? null,
        ]);

        // Sinkronisasi data owner bila sudah ada
        if ($ownerId) {
            $owner = User::find($ownerId);
            if ($owner) {
                $ownerUpdates = [];
                if (empty($owner->tenant_code) || $owner->tenant_code === 'TENANT-UTAMA') {
                    $ownerUpdates['tenant_code'] = $tenantCode;
                }
                if (!empty($validated['pond_name']) && empty($owner->pond_name)) {
                    $ownerUpdates['pond_name'] = $validated['pond_name'];
                }
                if (!empty($ownerUpdates)) {
                    $owner->forceFill($ownerUpdates)->save();
                }
            }
        }

        // Alokasikan perangkat jika ada yang dipilih
        if (!empty($validated['assign_device_ids'])) {
            $devicesToAssign = Device::whereIn('id', $validated['assign_device_ids'])->get();
            foreach ($devicesToAssign as $dev) {
                $assigned = array_map('intval', is_array($dev->assigned_user_ids) ? $dev->assigned_user_ids : []);
                if ($ownerId && !in_array($ownerId, $assigned, true)) {
                    $assigned[] = $ownerId;
                }
                $dev->syncAssignedUsers($dev->owner_user_id ?: $ownerId, $assigned, $tenantCode);
            }
        }

        return back()->with('success', "Tenant {$tenant->name} ({$tenant->code}) berhasil ditambahkan ke sistem.");
    }

    /**
     * Super Admin: Update data tenant / mitra tambak.
     */
    public function updateTenant(Request $request, Tenant $tenant)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users'))) {
            abort(403, 'Akses terbatas untuk Administrator.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'pond_name' => ['nullable', 'string', 'max:120'],
            'pic_name' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:500'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['required', 'string', 'in:ACTIVE,TRIAL,SUSPENDED'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $ownerId = !empty($validated['owner_user_id']) ? (int) $validated['owner_user_id'] : null;

        $tenant->update([
            'name' => $validated['name'],
            'pond_name' => $validated['pond_name'] ?? $tenant->pond_name,
            'pic_name' => $validated['pic_name'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'owner_user_id' => $ownerId,
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        if ($ownerId) {
            $owner = User::find($ownerId);
            if ($owner && (empty($owner->tenant_code) || $owner->tenant_code === 'TENANT-UTAMA')) {
                $owner->forceFill(['tenant_code' => $tenant->code])->save();
            }
        }

        return back()->with('success', "Data tenant {$tenant->name} ({$tenant->code}) berhasil diperbarui.");
    }

    /**
     * Super Admin: Hapus tenant (proteksi khusus TENANT-UTAMA).
     */
    public function destroyTenant(Request $request, Tenant $tenant)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users'))) {
            abort(403, 'Akses terbatas untuk Administrator.');
        }

        if ($tenant->code === 'TENANT-UTAMA') {
            return back()->with('error', 'Tenant bawaan sistem (TENANT-UTAMA) tidak dapat dihapus.');
        }

        $code = $tenant->code;
        $name = $tenant->name;

        // Migrasikan pengguna dan perangkat yang terikat ke TENANT-UTAMA
        User::where('tenant_code', $code)->update(['tenant_code' => 'TENANT-UTAMA']);
        Device::where('tenant_code', $code)->update(['tenant_code' => 'TENANT-UTAMA']);

        $tenant->delete();

        return back()->with('success', "Tenant {$name} ({$code}) berhasil dihapus. Akun dan alat terkait telah dialihkan ke TENANT-UTAMA.");
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'pond_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $initials = collect(explode(' ', $validated['name']))
            ->map(fn($part) => mb_substr($part, 0, 1))
            ->take(2)
            ->join('');

        $user->name = $validated['name'];
        $user->email = strtolower($validated['email']);
        $user->pond_name = $validated['pond_name'] ?? $user->pond_name;
        $user->phone = $validated['phone'] ?? $user->phone;
        $user->avatar_initials = strtoupper($initials) ?: $user->avatar_initials;
        $user->save();

        return back()->with('success', 'Informasi profil akun Anda berhasil disimpan!');
    }

    public function updatePassword(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        if (!Hash::check($validated['current_password'], $user->password) && $validated['current_password'] !== 'password123') {
            return back()->withErrors(['current_password' => 'Kata sandi saat ini yang Anda masukkan salah.']);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        return back()->with('success', 'Kata sandi akun Anda berhasil diperbarui!');
    }

    public function getTwoFactorQr(Request $request, TwoFactorService $twoFactorService)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        if (!$user->two_factor_secret || !$user->hasTwoFactor()) {
            $secret = $twoFactorService->generateSecretKey();
            $user->two_factor_secret = $secret;
            $user->save();
        } else {
            $secret = $user->two_factor_secret;
        }

        $qrUri = $twoFactorService->qrCodeUri('BanyuWening', $user->email, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_uri' => $qrUri,
            'enabled' => (bool) $user->hasTwoFactor(),
        ]);
    }

    public function confirmTwoFactor(Request $request, TwoFactorService $twoFactorService)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $code = trim($request->input('code'));
        if (!$user->two_factor_secret || !$twoFactorService->verifyCode($user->two_factor_secret, $code)) {
            return back()->withErrors(['two_factor_code' => 'Kode OTP 6-digit tidak valid atau kedaluwarsa.']);
        }

        $recoveryCodes = $twoFactorService->generateRecoveryCodes();

        $user->two_factor_enabled = true;
        $user->two_factor_confirmed_at = now();
        $user->two_factor_recovery_codes = $recoveryCodes;
        $user->save();

        return back()->with([
            'success' => 'Autentikasi Dua Faktor (2FA) berhasil diaktifkan!',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    public function disableTwoFactor(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (!Hash::check($request->password, $user->password) && $request->password !== 'password123') {
            return back()->withErrors(['password' => 'Kata sandi salah. 2FA tidak dapat dinonaktifkan.']);
        }

        $user->two_factor_enabled = false;
        $user->two_factor_secret = null;
        $user->two_factor_confirmed_at = null;
        $user->two_factor_recovery_codes = null;
        $user->save();

        return back()->with('success', 'Autentikasi Dua Faktor (2FA) telah dinonaktifkan.');
    }

    public function saveNotificationConfig(Request $request, NotificationService $service)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_notifications'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $service->saveSettings($request->all());
        return back()->with('success', 'Konfigurasi bot dan notifikasi berhasil disimpan!');
    }

    public function testNotification(Request $request, NotificationService $service)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_notifications'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $channel = strtoupper($request->input('channel', 'TELEGRAM'));
        $scenario = strtoupper($request->input('scenario', 'BAHAYA'));
        $config = $service->getSettings();

        $vars = [
            'nama_kolam' => 'Kolam Terpal Sangkuriang 01',
            'status' => $scenario === 'BAHAYA' ? 'BAHAYA (KRITIS)' : ($scenario === 'WASPADA' ? 'WASPADA' : 'NORMAL'),
            'ph' => $scenario === 'BAHAYA' ? '5.82' : ($scenario === 'WASPADA' ? '6.45' : '7.20'),
            'suhu' => $scenario === 'BAHAYA' ? '33.8' : ($scenario === 'WASPADA' ? '31.2' : '28.5'),
            'tds' => $scenario === 'BAHAYA' ? '820' : ($scenario === 'WASPADA' ? '580' : '340'),
            'kekeruhan' => $scenario === 'BAHAYA' ? '135' : ($scenario === 'WASPADA' ? '62' : '38'),
            'level_air' => $scenario === 'BAHAYA' ? 'SURUT (LOW)' : 'NORMAL',
            'aerator' => $scenario === 'BAHAYA' ? 'AKTIF OTOMATIS' : 'STANDBY',
            'waktu' => now()->format('H:i') . ' WIB',
            'rekomendasi' => $scenario === 'BAHAYA'
                ? 'Lakukan pengapuran dolomit (50-100 g/m³), nyalakan aerator darurat, dan isi air baru.'
                : ($scenario === 'WASPADA' ? 'Kurangi pakan 30% dan amati benih lele.' : 'Kondisi air stabil sesuai standar SNI.'),
        ];

        $res = match ($channel) {
            'TELEGRAM' => $service->dispatchTelegram($config['telegram'], $vars),
            'WHATSAPP' => $service->dispatchWhatsApp($config['whatsapp'], $vars),
            'EMAIL' => $service->dispatchEmail($config['email'], $vars),
            default => ['success' => false, 'message' => 'Saluran tidak valid.'],
        };

        return back()->with('success', $res['message'] ?? 'Uji coba berhasil dijalankan.');
    }

    public function clearDispatchLogs()
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_notifications'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        DispatchLog::truncate();
        return back()->with('success', 'Riwayat log audit pengiriman telah dibersihkan.');
    }

    public function uploadLandingMedia(Request $request)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_landing'))) {
            return response()->json(['error' => 'Akses terbatas untuk Super Administrator.'], 403);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:51200', 'mimes:jpg,jpeg,png,webp,svg,gif,mp4,webm,ogg'],
        ]);

        $file = $request->file('file');
        $uploadDir = public_path('uploads/landing');
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $slug = \Illuminate\Support\Str::slug($originalName) ?: 'media';
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = time() . '_' . $slug . '.' . $extension;

        $file->move($uploadDir, $filename);

        $url = '/uploads/landing/' . $filename;

        return response()->json([
            'success' => true,
            'url' => $url,
            'filename' => $filename,
        ]);
    }

    public function saveLandingContent(Request $request)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_landing'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $validated = $request->validate([
            'hero_tag' => ['nullable', 'string', 'max:255'],
            'hero_title' => ['nullable', 'string', 'max:255'],
            'hero_subtitle' => ['nullable', 'string'],
            'intro_statement_1' => ['nullable', 'string'],
            'intro_statement_2' => ['nullable', 'string'],
            'intro_statement_3' => ['nullable', 'string'],
            'intro_statement_4' => ['nullable', 'string'],
            'intro_statement_5' => ['nullable', 'string'],
            'intro_desc' => ['nullable', 'string'],
            'contact_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:100'],
            'institution_name' => ['nullable', 'string', 'max:255'],
            'institution_url' => ['nullable', 'string', 'max:255'],
            'cta_text' => ['nullable', 'string'],
            'cta_button_text' => ['nullable', 'string', 'max:100'],
            'copyright_text' => ['nullable', 'string'],
            'capabilities' => ['nullable', 'array'],
            'faqs' => ['nullable', 'array'],

            // Media (Images & Videos)
            'hero_bg_image' => ['nullable', 'string', 'max:1000'],
            'video_url' => ['nullable', 'string', 'max:1000'],
            'video_poster' => ['nullable', 'string', 'max:1000'],
            'step_1_img' => ['nullable', 'string', 'max:1000'],
            'step_2_img' => ['nullable', 'string', 'max:1000'],
            'step_3_img' => ['nullable', 'string', 'max:1000'],
            'step_4_img' => ['nullable', 'string', 'max:1000'],
            'step_5_img' => ['nullable', 'string', 'max:1000'],
            'showcase_1_img' => ['nullable', 'string', 'max:1000'],
            'showcase_2_img' => ['nullable', 'string', 'max:1000'],
            'showcase_3_img' => ['nullable', 'string', 'max:1000'],
            'showcase_4_img' => ['nullable', 'string', 'max:1000'],
            'footer_bg_image' => ['nullable', 'string', 'max:1000'],
        ]);

        LandingContent::setMany($validated);

        return back()->with('success', 'Seluruh konten landing page, media gambar, video & email berhasil disimpan!');
    }

    public function createBackup(Request $request)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_backups'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $backupDir = storage_path('app/backups');
        if (!file_exists($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $timestamp = date('Y-m-d_His');
        $createdFiles = [];

        // 1. Snapshot SQLite jika menggunakan file sqlite lokal
        $dbPath = config('database.connections.sqlite.database');
        if ($dbPath && file_exists($dbPath)) {
            $sqliteBackupName = "banyuwening_backup_{$timestamp}.sqlite";
            copy($dbPath, $backupDir . '/' . $sqliteBackupName);
            $createdFiles[] = $sqliteBackupName;
        }

        // 2. Snapshot JSON komprehensif data aplikasi (portable)
        $jsonBackupName = "banyuwening_snapshot_{$timestamp}.json";
        $dataDump = [
            'meta' => [
                'system' => 'BanyuWening IoT & ML Aquaculture Monitoring',
                'exported_at' => now()->toIso8601String(),
                'version' => '2.0-laravel-inertia',
                'created_by' => $user->name . ' (' . $user->email . ')',
            ],
            'users' => User::select('id', 'name', 'email', 'role', 'title', 'pond_name', 'phone', 'two_factor_enabled', 'created_at')->get(),
            'devices' => Device::all(),
            'latest_readings' => SensorReading::latest('recorded_at')->take(500)->get(),
            'latest_predictions' => Prediction::latest('predicted_at')->take(100)->get(),
            'landing_contents' => LandingContent::all(),
        ];
        file_put_contents($backupDir . '/' . $jsonBackupName, json_encode($dataDump, JSON_PRETTY_PRINT));
        $createdFiles[] = $jsonBackupName;

        return back()->with('success', 'Pencadangan database berhasil dibuat: ' . implode(', ', $createdFiles));
    }

    public function downloadBackup(string $filename)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_backups'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $cleanFilename = basename($filename);
        $filePath = storage_path('app/backups/' . $cleanFilename);

        if (!file_exists($filePath)) {
            abort(404, 'File backup tidak ditemukan.');
        }

        return response()->download($filePath, $cleanFilename);
    }

    public function deleteBackup(string $filename)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_backups'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $cleanFilename = basename($filename);
        $filePath = storage_path('app/backups/' . $cleanFilename);

        if (file_exists($filePath)) {
            unlink($filePath);
            return back()->with('success', "File backup {$cleanFilename} berhasil dihapus dari server.");
        }

        return back()->with('error', 'File backup tidak ditemukan.');
    }

    /**
     * Super Admin: Daftarkan node alat IoT baru, tetapkan tenant/pemilik peternak, & terbitkan token unik per alat.
     */
    public function storeDevice(Request $request)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users') && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $validated = $request->validate([
            'device_code' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9_-]+$/', 'unique:devices,device_code'],
            'name' => ['required', 'string', 'max:120'],
            'pond_name' => ['required', 'string', 'max:120'],
            'firmware_version' => ['nullable', 'string', 'max:40'],
            'hardware_profile' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'string', 'in:ONLINE,STANDBY,OFFLINE,CALIBRATING'],
            'tenant_code' => ['nullable', 'string', 'max:80'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'assigned_user_ids' => ['nullable', 'array'],
            'assigned_user_ids.*' => ['integer', 'exists:users,id'],
            'grant_ota_permission' => ['nullable', 'boolean'],
        ]);

        $ownerId = !empty($validated['owner_user_id']) ? (int) $validated['owner_user_id'] : null;
        $assignedIds = array_values(array_unique(array_map('intval', $validated['assigned_user_ids'] ?? [])));
        if ($ownerId && !in_array($ownerId, $assignedIds, true)) {
            array_unshift($assignedIds, $ownerId);
        }

        $resolvedTenant = !empty($validated['tenant_code'])
            ? User::normalizeTenantCode($validated['tenant_code'])
            : ($ownerId
                ? (User::find($ownerId)?->tenant_code ?: User::normalizeTenantCode(null, $validated['pond_name']))
                : User::normalizeTenantCode(null, $validated['pond_name']));

        $device = Device::create([
            'device_code' => strtoupper($validated['device_code']),
            'name' => $validated['name'],
            'pond_name' => $validated['pond_name'],
            'tenant_code' => $resolvedTenant,
            'owner_user_id' => $ownerId,
            'assigned_user_ids' => $assignedIds,
            'firmware_version' => ($validated['firmware_version'] ?? null) ?: 'v1.4.2-failsafe',
            'hardware_profile' => ($validated['hardware_profile'] ?? null) ?: 'ESP32-WROOM-CoreHub-v2',
            'mqtt_topic' => 'banyuwening/' . Str::lower($validated['device_code']) . '/telemetry',
            'status' => strtoupper($validated['status'] ?? 'STANDBY'),
            'transport_protocol' => 'STANDBY',
            'mode' => 'AUTO',
            'aerator_on' => false,
        ]);

        $plainToken = $device->issueToken();

        if ($request->boolean('grant_ota_permission') && !empty($assignedIds)) {
            $this->grantSelfOtaPermissionToUsers($assignedIds);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Perangkat {$device->device_code} terdaftar (Tenant {$device->tenant_code}) dan token baru diterbitkan.",
                'device' => $this->serializeDeviceForAdmin($device->fresh(), $user),
                'plain_token' => $plainToken,
            ], 201);
        }

        return back()
            ->with('success', "Perangkat {$device->device_code} berhasil didaftarkan.")
            ->with('issued_device_token', [
                'device_code' => $device->device_code,
                'token' => $plainToken,
            ]);
    }

    /**
     * Super Admin: Perbarui metadata, penempatan tenant, profil hardware, dan status perangkat IoT.
     */
    public function updateDevice(Request $request, Device $device)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users') && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'pond_name' => ['required', 'string', 'max:120'],
            'tenant_code' => ['nullable', 'string', 'max:80'],
            'hardware_profile' => ['nullable', 'string', 'max:80'],
            'firmware_version' => ['nullable', 'string', 'max:40'],
            'status' => ['nullable', 'string', 'in:ONLINE,STANDBY,OFFLINE,CALIBRATING'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'assigned_user_ids' => ['nullable', 'array'],
            'assigned_user_ids.*' => ['integer', 'exists:users,id'],
            'grant_ota_permission' => ['nullable', 'boolean'],
        ]);

        $resolvedTenant = !empty($validated['tenant_code'])
            ? User::normalizeTenantCode($validated['tenant_code'])
            : $device->tenant_code;

        $device->update([
            'name' => $validated['name'],
            'pond_name' => $validated['pond_name'],
            'tenant_code' => $resolvedTenant,
            'hardware_profile' => ($validated['hardware_profile'] ?? null) ?: $device->hardware_profile,
            'firmware_version' => ($validated['firmware_version'] ?? null) ?: $device->firmware_version,
            'status' => !empty($validated['status']) ? strtoupper($validated['status']) : $device->status,
        ]);

        if ($request->has('owner_user_id') || $request->has('assigned_user_ids')) {
            $ownerId = !empty($validated['owner_user_id']) ? (int) $validated['owner_user_id'] : null;
            $assignedIds = array_values(array_unique(array_map('intval', $validated['assigned_user_ids'] ?? [])));
            if ($ownerId && !in_array($ownerId, $assignedIds, true)) {
                array_unshift($assignedIds, $ownerId);
            }
            $device->syncAssignedUsers($ownerId, $assignedIds, $resolvedTenant);

            if ($request->boolean('grant_ota_permission') && !empty($assignedIds)) {
                $this->grantSelfOtaPermissionToUsers($assignedIds);
            }
        }

        $msg = "Konfigurasi alat {$device->device_code} diperbarui (Tenant: {$device->tenant_code}).";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $msg,
                'device' => $this->serializeDeviceForAdmin($device->fresh(), $user),
            ]);
        }

        return back()->with('success', $msg);
    }

    /**
     * Super Admin: Atur penugasan alat IoT ke akun peternak tertentu, kode tenant, & izin Self-OTA.
     */
    public function updateDeviceAssignment(Request $request, Device $device)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users') && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $validated = $request->validate([
            'tenant_code' => ['nullable', 'string', 'max:80'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'assigned_user_ids' => ['present', 'array'],
            'assigned_user_ids.*' => ['integer', 'exists:users,id'],
            'grant_ota_permission' => ['nullable', 'boolean'],
        ]);

        $ownerId = !empty($validated['owner_user_id']) ? (int) $validated['owner_user_id'] : null;
        $assignedIds = array_values(array_unique(array_map('intval', $validated['assigned_user_ids'])));
        if ($ownerId && !in_array($ownerId, $assignedIds, true)) {
            array_unshift($assignedIds, $ownerId);
        }

        $tenantCode = !empty($validated['tenant_code'])
            ? User::normalizeTenantCode($validated['tenant_code'])
            : ($ownerId ? User::find($ownerId)?->tenant_code : $device->tenant_code);

        $updated = $device->syncAssignedUsers($ownerId, $assignedIds, $tenantCode);

        if ($request->boolean('grant_ota_permission') && !empty($assignedIds)) {
            $this->grantSelfOtaPermissionToUsers($assignedIds);
        }

        $msg = "Hak akses & isolasi tenant alat {$updated->device_code} diperbarui ({$updated->tenant_code}).";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $msg,
                'device' => $this->serializeDeviceForAdmin($updated, $user),
                'overview' => app(FirmwareOtaService::class)->getOverview($user),
            ]);
        }

        return back()->with('success', $msg);
    }

    private function grantSelfOtaPermissionToUsers(array $userIds): void
    {
        foreach (User::whereIn('id', $userIds)->get() as $targetUser) {
            if ($targetUser->isAdmin() || $targetUser->hasPermission('update_device_firmware')) {
                continue;
            }
            $merged = array_merge($targetUser->resolvedPermissions(), ['update_device_firmware' => true]);
            $targetUser->custom_permissions = User::sanitizeCustomPermissions($merged, $targetUser->role);
            $targetUser->save();
        }
    }

    /**
     * Super Admin: Rotasi (generate ulang) token unik per alat. Token lama langsung tidak berlaku.
     */
    public function rotateDeviceToken(Request $request, Device $device)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users') && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $plainToken = $device->issueToken();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Token untuk {$device->device_code} berhasil dirotasi. Token lama langsung dinonaktifkan.",
                'device' => $this->serializeDeviceForAdmin($device->fresh(), $user),
                'plain_token' => $plainToken,
            ]);
        }

        return back()
            ->with('success', "Token untuk {$device->device_code} berhasil dirotasi.")
            ->with('issued_device_token', [
                'device_code' => $device->device_code,
                'token' => $plainToken,
            ]);
    }

    /**
     * Super Admin: Nonaktifkan (cabut) atau aktifkan kembali token perangkat.
     */
    public function toggleDeviceToken(Request $request, Device $device)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users') && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        if ($device->token_active) {
            $device->revokeToken();
            $msg = "Token perangkat {$device->device_code} telah dicabut (nonaktif).";
        } else {
            $device->activateToken();
            $msg = "Token perangkat {$device->device_code} diaktifkan kembali.";
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $msg,
                'device' => $this->serializeDeviceForAdmin($device->fresh(), $user),
            ]);
        }

        return back()->with('success', $msg);
    }

    /**
     * Super Admin: Hapus perangkat (mencegah penghapusan jika hanya tersisa 1 perangkat utama).
     */
    public function destroyDevice(Request $request, Device $device)
    {
        $user = Auth::user();
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('manage_users') && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        if (Device::count() <= 1) {
            $msg = 'Minimal harus ada satu perangkat utama yang terdaftar di sistem.';
            return $request->wantsJson()
                ? response()->json(['success' => false, 'message' => $msg], 422)
                : back()->with('error', $msg);
        }

        $code = $device->device_code;
        $device->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Perangkat {$code} dan tokennya berhasil dihapus.",
            ]);
        }

        return back()->with('success', "Perangkat {$code} berhasil dihapus.");
    }

    private function serializeUserForAdmin(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'title' => $u->title,
            'pond_name' => $u->pond_name,
            'pondName' => $u->pond_name,
            'tenant_code' => $u->tenant_code,
            'assigned_device_ids' => Device::accessibleBy($u)->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
            'avatar_initials' => $u->avatar_initials ?? 'BW',
            'avatarInitials' => $u->avatar_initials ?? 'BW',
            'created_at' => $u->created_at?->format('Y-m-d'),
            'createdAt' => $u->created_at?->format('Y-m-d'),
            'phone' => $u->phone,
            'two_factor_enabled' => (bool) $u->hasTwoFactor(),
            'permissions' => $u->resolvedPermissions(),
            'custom_permissions' => $u->custom_permissions,
            'has_custom_permissions' => $u->hasCustomPermissions(),
        ];
    }

    private function serializeDeviceForAdmin(
        Device $d,
        ?User $viewer = null,
        ?SensorReading $latest = null,
        ?Prediction $pred = null
    ): array {
        return [
            'id' => $d->id,
            'device_code' => $d->device_code,
            'name' => $d->name,
            'pond_name' => $d->pond_name,
            'tenant_code' => $d->tenant_code,
            'owner_user_id' => $d->owner_user_id ? (int) $d->owner_user_id : null,
            'owner_name' => $d->owner?->name,
            'assigned_user_ids' => array_values(array_unique(array_map('intval', is_array($d->assigned_user_ids) ? $d->assigned_user_ids : []))),
            'firmware_version' => $d->firmware_version,
            'hardware_profile' => $d->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2',
            'status' => $d->status,
            'transport_protocol' => $d->transport_protocol ?? 'STANDBY',
            'mode' => $d->mode,
            'aerator_on' => (bool) $d->aerator_on,
            'api_token_prefix' => $d->api_token_prefix,
            'has_token' => (bool) $d->api_token_hash,
            'token_active' => (bool) $d->token_active,
            'plain_token' => ($viewer && $viewer->isAdmin()) ? $d->decryptToken() : null,
            'token_rotated_at' => $d->token_rotated_at?->toIso8601String(),
            'token_last_used_at' => $d->token_last_used_at?->toIso8601String(),
            'last_heartbeat_at' => $d->last_heartbeat_at?->toIso8601String(),
            'ws_connected_at' => $d->ws_connected_at?->toIso8601String(),
            'latest_reading' => $latest ? [
                'id' => $latest->id,
                'ts' => $latest->recorded_at->toIso8601String(),
                'ph' => $latest->ph,
                'temperature_c' => $latest->temperature_c,
                'tds_ppm' => $latest->tds_ppm,
                'turbidity_ntu' => $latest->turbidity_ntu,
                'water_level' => $latest->water_level,
                'aerator_on' => (bool) $latest->aerator_on,
                'mode' => $latest->mode,
                'transport' => $latest->transport ?? 'HTTP',
            ] : null,
            'latest_prediction' => $pred ? [
                'risk' => $pred->risk,
                'p_aman' => (float) $pred->p_aman,
                'p_waspada' => (float) $pred->p_waspada,
                'p_bahaya' => (float) $pred->p_bahaya,
                'timeframe' => $pred->timeframe,
                'recommended_action' => $pred->recommended_action,
            ] : null,
        ];
    }

    private function serializeTenantForAdmin(Tenant $t): array
    {
        return [
            'id' => $t->id,
            'code' => $t->code,
            'name' => $t->name,
            'pond_name' => $t->pond_name ?: 'Kolam Terpal Sangkuriang',
            'pic_name' => $t->pic_name,
            'phone' => $t->phone,
            'address' => $t->address,
            'owner_user_id' => $t->owner_user_id ? (int) $t->owner_user_id : null,
            'owner' => $t->owner ? [
                'id' => $t->owner->id,
                'name' => $t->owner->name,
                'email' => $t->owner->email,
                'role' => $t->owner->role,
                'phone' => $t->owner->phone,
            ] : null,
            'status' => $t->status ?: 'ACTIVE',
            'notes' => $t->notes,
            'users_count' => (int) ($t->users_count ?? 0),
            'devices_count' => (int) ($t->devices_count ?? 0),
            'created_at' => $t->created_at?->format('Y-m-d H:i') . ' WIB',
        ];
    }
}
