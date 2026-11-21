<?php

namespace App\Services;

use App\Models\Device;
use App\Models\FirmwareRelease;
use App\Models\FirmwareRollout;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class FirmwareOtaService
{
    public function __construct(
        private readonly RealtimeBroadcaster $broadcaster
    ) {
    }

    public function firmwareStorageDir(): string
    {
        return storage_path('app/private/firmware');
    }

    public function absoluteBinaryPath(FirmwareRelease $release): string
    {
        return storage_path('app/private/' . ltrim($release->file_path, '/'));
    }

    /**
     * Simpan file firmware .bin ESP32 dan hasilkan checksum SHA-256 + tanda tangan HMAC-SHA256.
     *
     * @param  array<string, mixed>  $data
     */
    public function createRelease(array $data, UploadedFile $binaryFile, string $actor): FirmwareRelease
    {
        $dir = $this->firmwareStorageDir();
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $version = trim((string) $data['version']);
        $safeBase = preg_replace('/[^A-Za-z0-9._-]/', '_', $version) ?: ('fw_' . time());
        $storedName = $safeBase . '.bin';
        $binaryFile->move($dir, $storedName);

        $absPath = $dir . DIRECTORY_SEPARATOR . $storedName;
        $sha256 = (string) hash_file('sha256', $absPath);
        $sizeBytes = (int) filesize($absPath);
        $minPrev = !empty($data['min_previous_version']) ? trim((string) $data['min_previous_version']) : null;
        $hmac = FirmwareRelease::computeSignature($version, $sha256, $sizeBytes, $minPrev);

        return FirmwareRelease::create([
            'version' => $version,
            'channel' => strtolower((string) ($data['channel'] ?? 'stable')),
            'target_hardware' => (string) ($data['target_hardware'] ?? 'ESP32-WROOM-CoreHub-v2'),
            'file_path' => 'firmware/' . $storedName,
            'file_name' => $binaryFile->getClientOriginalName() ?: $storedName,
            'file_size_bytes' => $sizeBytes,
            'sha256_checksum' => $sha256,
            'hmac_signature' => $hmac,
            'min_previous_version' => $minPrev,
            'rollback_timeout_s' => (int) ($data['rollback_timeout_s'] ?? 60),
            'changelog' => $data['changelog'] ?? null,
            'is_active' => true,
            'is_mandatory' => (bool) ($data['is_mandatory'] ?? false),
            'uploaded_by' => $actor,
            'released_at' => now(),
        ]);
    }

    /**
     * Buat rollout ke daftar perangkat (atau semua perangkat jika kosong) dan siarkan manifest ke /ws/ota.
     *
     * @param  array<int, int|string>  $deviceIds
     * @return array<int, FirmwareRollout>
     */
    public function initiateRollout(
        FirmwareRelease $release,
        array $deviceIds,
        string $actor,
        string $httpOrigin = ''
    ): array {
        $devices = empty($deviceIds)
            ? Device::orderBy('id')->get()
            : Device::whereIn('id', $deviceIds)->get();

        $created = [];

        DB::transaction(function () use ($devices, $release, $actor, &$created) {
            foreach ($devices as $device) {
                FirmwareRollout::where('device_id', $device->id)
                    ->whereIn('status', ['QUEUED', 'NOTIFIED'])
                    ->update([
                        'status' => 'CANCELLED',
                        'error_message' => 'Digantikan oleh rilis rollout baru ' . $release->version,
                        'completed_at' => now(),
                    ]);

                $created[] = FirmwareRollout::create([
                    'firmware_release_id' => $release->id,
                    'device_id' => $device->id,
                    'status' => 'QUEUED',
                    'progress_pct' => 0,
                    'from_version' => $device->firmware_version,
                    'to_version' => $release->version,
                    'transport' => 'QUEUED',
                    'initiated_by' => $actor,
                ]);
            }
        });

        foreach ($created as $rollout) {
            $rollout->loadMissing(['device', 'release']);
            $manifest = $this->buildManifest($release, $rollout, $httpOrigin);
            $this->broadcaster->publish('ota', 'ota.manifest', $manifest, $rollout->device?->device_code);
        }

        return $created;
    }

    /**
     * Cek apakah ada rollout OTA aktif untuk suatu node ESP32.
     *
     * @return array<string, mixed>
     */
    public function checkForDevice(Device $device, string $httpOrigin = '', string $transport = 'HTTP_FALLBACK'): array
    {
        $rollout = FirmwareRollout::with('release')
            ->where('device_id', $device->id)
            ->whereIn('status', ['QUEUED', 'NOTIFIED', 'DOWNLOADING', 'VERIFYING', 'FLASHING', 'REBOOTING', 'HEALTH_CHECK'])
            ->whereHas('release', fn ($q) => $q->where('is_active', true))
            ->latest('id')
            ->first();

        if (!$rollout || !$rollout->release) {
            return [
                'success' => true,
                'update_available' => false,
                'device_code' => $device->device_code,
                'current_version' => $device->firmware_version,
                'server_time' => now()->toIso8601String(),
            ];
        }

        if ($rollout->status === 'QUEUED') {
            $rollout->update([
                'status' => 'NOTIFIED',
                'transport' => strtoupper($transport),
                'started_at' => $rollout->started_at ?? now(),
            ]);
        }

        return [
            'success' => true,
            'update_available' => true,
            'device_code' => $device->device_code,
            'current_version' => $device->firmware_version,
            'rollout_status' => $rollout->status,
            'manifest' => $this->buildManifest($rollout->release, $rollout, $httpOrigin),
            'server_time' => now()->toIso8601String(),
        ];
    }

    /**
     * Catat laporan progres / health-check / auto-rollback dari perangkat ESP32.
     *
     * @param  array<string, mixed>  $payload
     */
    public function recordDeviceStatus(Device $device, array $payload, string $transport = 'HTTP_FALLBACK'): ?FirmwareRollout
    {
        $query = FirmwareRollout::with(['release', 'device'])->where('device_id', $device->id);

        if (!empty($payload['rollout_id'])) {
            $rollout = (clone $query)->where('id', (int) $payload['rollout_id'])->first();
        } else {
            $rollout = (clone $query)
                ->when(!empty($payload['to_version']), fn ($q) => $q->where('to_version', (string) $payload['to_version']))
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED', 'ROLLED_BACK', 'FAILED'])
                ->latest('id')
                ->first()
                ?? $query->latest('id')->first();
        }

        if (!$rollout) {
            return null;
        }

        $status = strtoupper((string) ($payload['status'] ?? $rollout->status));
        $normalizedTransport = strtoupper($transport);

        $updates = [
            'status' => $status,
            'transport' => $normalizedTransport,
            'started_at' => $rollout->started_at ?? now(),
        ];

        if (isset($payload['progress_pct'])) {
            $updates['progress_pct'] = min(100, max(0, (int) $payload['progress_pct']));
        }
        if (!empty($payload['active_partition'])) {
            $updates['active_partition'] = (string) $payload['active_partition'];
        }
        if (array_key_exists('error_message', $payload) && $payload['error_message'] !== null) {
            $updates['error_message'] = (string) $payload['error_message'];
        }
        if (array_key_exists('boot_health_ok', $payload) && $payload['boot_health_ok'] !== null) {
            $updates['boot_health_ok'] = (bool) $payload['boot_health_ok'];
        }

        if ($status === 'COMPLETED') {
            $updates['progress_pct'] = 100;
            $updates['boot_health_ok'] = true;
            $updates['completed_at'] = now();

            $device->update([
                'firmware_version' => $rollout->to_version,
                'status' => 'ONLINE',
                'transport_protocol' => $normalizedTransport,
                'last_heartbeat_at' => now(),
            ]);
        } elseif ($status === 'ROLLED_BACK') {
            $updates['boot_health_ok'] = false;
            $updates['rolled_back_at'] = now();
            $device->update([
                'status' => 'ONLINE',
                'transport_protocol' => $normalizedTransport,
                'last_heartbeat_at' => now(),
            ]);
        } elseif ($status === 'FAILED') {
            $updates['boot_health_ok'] = false;
            $updates['completed_at'] = now();
        }

        $rollout->update($updates);
        $fresh = $rollout->fresh(['release', 'device']);

        $this->broadcaster->publish('ota', 'ota.status', [
            'rollout_id' => $fresh->id,
            'device_code' => $device->device_code,
            'status' => $fresh->status,
            'progress_pct' => (int) $fresh->progress_pct,
            'from_version' => $fresh->from_version,
            'to_version' => $fresh->to_version,
            'active_partition' => $fresh->active_partition,
            'boot_health_ok' => $fresh->boot_health_ok,
            'transport' => $fresh->transport,
            'error_message' => $fresh->error_message,
        ], $device->device_code);

        return $fresh;
    }

    /**
     * @return array<string, mixed>
     */
    public function buildManifest(FirmwareRelease $release, FirmwareRollout $rollout, string $httpOrigin = ''): array
    {
        $base = rtrim($httpOrigin ?: (string) config('app.url', 'http://127.0.0.1:8000'), '/');

        return [
            'rollout_id' => $rollout->id,
            'release_id' => $release->id,
            'version' => $release->version,
            'channel' => $release->channel,
            'target_hardware' => $release->target_hardware,
            'file_name' => $release->file_name,
            'size_bytes' => (int) $release->file_size_bytes,
            'sha256' => $release->sha256_checksum,
            'signature_hmac_sha256' => $release->hmac_signature,
            'min_previous_version' => $release->min_previous_version,
            'rollback_timeout_s' => (int) $release->rollback_timeout_s,
            'mandatory' => (bool) $release->is_mandatory,
            'changelog' => $release->changelog,
            'download_url' => $base . '/api/http/ota/download/' . rawurlencode($release->version),
            'ws_protocol' => 'banyuwening.ota.v1',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getOverview(): array
    {
        $releases = FirmwareRelease::withCount('rollouts')
            ->latest('id')
            ->get()
            ->map(fn (FirmwareRelease $r) => [
                'id' => $r->id,
                'version' => $r->version,
                'channel' => $r->channel,
                'target_hardware' => $r->target_hardware,
                'file_name' => $r->file_name,
                'file_size_bytes' => (int) $r->file_size_bytes,
                'sha256_checksum' => $r->sha256_checksum,
                'hmac_signature' => $r->hmac_signature,
                'min_previous_version' => $r->min_previous_version,
                'rollback_timeout_s' => (int) $r->rollback_timeout_s,
                'changelog' => $r->changelog,
                'is_active' => (bool) $r->is_active,
                'is_mandatory' => (bool) $r->is_mandatory,
                'uploaded_by' => $r->uploaded_by,
                'rollouts_count' => (int) ($r->rollouts_count ?? 0),
                'released_at' => $r->released_at?->toIso8601String(),
            ])->values()->all();

        $rollouts = FirmwareRollout::with(['device:id,device_code,name,pond_name,firmware_version,status', 'release:id,version,channel'])
            ->latest('id')
            ->take(30)
            ->get()
            ->map(fn (FirmwareRollout $ro) => [
                'id' => $ro->id,
                'firmware_release_id' => $ro->firmware_release_id,
                'device_id' => $ro->device_id,
                'device_code' => $ro->device?->device_code,
                'device_name' => $ro->device?->name,
                'pond_name' => $ro->device?->pond_name,
                'status' => $ro->status,
                'progress_pct' => (int) $ro->progress_pct,
                'from_version' => $ro->from_version,
                'to_version' => $ro->to_version,
                'active_partition' => $ro->active_partition,
                'transport' => $ro->transport,
                'boot_health_ok' => $ro->boot_health_ok,
                'error_message' => $ro->error_message,
                'initiated_by' => $ro->initiated_by,
                'started_at' => $ro->started_at?->toIso8601String(),
                'completed_at' => $ro->completed_at?->toIso8601String(),
                'rolled_back_at' => $ro->rolled_back_at?->toIso8601String(),
            ])->values()->all();

        $devices = Device::orderBy('id')->get()->map(fn (Device $d) => [
            'id' => $d->id,
            'device_code' => $d->device_code,
            'name' => $d->name,
            'pond_name' => $d->pond_name,
            'firmware_version' => $d->firmware_version,
            'status' => $d->status,
            'transport_protocol' => $d->transport_protocol ?? 'STANDBY',
            'last_heartbeat_at' => $d->last_heartbeat_at?->toIso8601String(),
        ])->values()->all();

        return [
            'releases' => $releases,
            'rollouts' => $rollouts,
            'devices' => $devices,
            'stats' => [
                'total_releases' => FirmwareRelease::count(),
                'active_releases' => FirmwareRelease::where('is_active', true)->count(),
                'total_rollouts' => FirmwareRollout::count(),
                'in_progress_rollouts' => FirmwareRollout::whereIn('status', ['QUEUED', 'NOTIFIED', 'DOWNLOADING', 'VERIFYING', 'FLASHING', 'REBOOTING', 'HEALTH_CHECK'])->count(),
                'completed_rollouts' => FirmwareRollout::where('status', 'COMPLETED')->count(),
                'rolled_back_rollouts' => FirmwareRollout::where('status', 'ROLLED_BACK')->count(),
            ],
        ];
    }
}
