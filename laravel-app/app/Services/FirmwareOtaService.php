<?php

namespace App\Services;

use App\Models\Device;
use App\Models\FirmwareRelease;
use App\Models\FirmwareRollout;
use App\Models\SecureUpload;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class FirmwareOtaService
{
    public function __construct(
        private readonly RealtimeBroadcaster $broadcaster
    ) {
    }

    public function firmwareStorageDir(): string
    {
        return Storage::disk('firmware_private')->path('');
    }

    public function absoluteBinaryPath(FirmwareRelease $release): string
    {
        $relative = preg_replace('/^firmware\//', '', ltrim((string) $release->file_path, '/')) ?: '';

        return Storage::disk('firmware_private')->path($relative);
    }

    /**
     * Buat rilis firmware dari hasil Secure Upload Pipeline (karantina + validasi + malware scan).
     *
     * @param  array<string, mixed>  $data
     */
    public function createReleaseFromSecureUpload(
        array $data,
        SecureUpload $upload,
        string $actor,
        bool $isActive = true,
        string $scanStatus = 'CLEAN',
        ?array $compileResult = null,
    ): FirmwareRelease {
        $version = trim((string) $data['version']);
        $minPrev = !empty($data['min_previous_version']) ? trim((string) $data['min_previous_version']) : null;
        $targetHw = (string) ($data['target_hardware'] ?? 'ESP32-WROOM-CoreHub-v2');

        $safeBase = preg_replace('/[^A-Za-z0-9._-]/', '_', $version) ?: ('fw_' . time());

        if ($compileResult !== null) {
            $storedRel = 'firmware/' . ltrim((string) $compileResult['binary_rel_path'], '/');
            $sourceRel = 'firmware/' . ltrim((string) $compileResult['source_rel_path'], '/');
            $sha256 = strtolower((string) $compileResult['sha256']);
            $sizeBytes = (int) $compileResult['size_bytes'];
            $fileName = (string) ($compileResult['binary_file_name'] ?? ($safeBase . '.bin'));
            $sourceType = 'ino';
            $compileStatus = (string) ($compileResult['compile_status'] ?? 'COMPILED');
            $compileLog = $compileResult['compile_log'] ?? null;
        } else {
            $storedRel = $upload->permanent_path
                ? 'firmware/' . ltrim((string) $upload->permanent_path, '/')
                : 'quarantine/' . ltrim((string) ($upload->quarantine_path ?? $upload->uuid . '.bin'), '/');
            $sourceRel = null;
            $sha256 = strtolower((string) $upload->sha256_hash);
            $sizeBytes = (int) $upload->file_size_bytes;
            $fileName = $safeBase . '.bin';
            $sourceType = strtolower((string) ($upload->detected_extension ?: 'bin'));
            $compileStatus = $sourceType === 'ino' ? 'PENDING_COMPILE' : 'PRECOMPILED';
            $compileLog = null;
        }

        $hmac = FirmwareRelease::computeSignature($version, $sha256, $sizeBytes, $minPrev);

        $allowedIds = $this->resolveInitialAllowedDeviceIds(
            $data['allowed_device_ids'] ?? null,
            $targetHw,
            $minPrev
        );

        return FirmwareRelease::create([
            'secure_upload_id' => $upload->id,
            'version' => $version,
            'channel' => strtolower((string) ($data['channel'] ?? 'stable')),
            'source_type' => $sourceType,
            'target_hardware' => $targetHw,
            'allowed_device_ids' => $allowedIds,
            'file_path' => $storedRel,
            'source_file_path' => $sourceRel,
            'file_name' => $fileName,
            'file_size_bytes' => $sizeBytes,
            'sha256_checksum' => $sha256,
            'hmac_signature' => $hmac,
            'min_previous_version' => $minPrev,
            'rollback_timeout_s' => (int) ($data['rollback_timeout_s'] ?? 60),
            'changelog' => $data['changelog'] ?? null,
            'is_active' => $isActive,
            'scan_status' => $scanStatus,
            'compile_status' => $compileStatus,
            'compile_log' => $compileLog,
            'is_mandatory' => (bool) ($data['is_mandatory'] ?? false),
            'uploaded_by' => $actor,
            'released_at' => now(),
        ]);
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
        $targetHw = (string) ($data['target_hardware'] ?? 'ESP32-WROOM-CoreHub-v2');
        $hmac = FirmwareRelease::computeSignature($version, $sha256, $sizeBytes, $minPrev);

        $allowedIds = $this->resolveInitialAllowedDeviceIds(
            $data['allowed_device_ids'] ?? null,
            $targetHw,
            $minPrev
        );

        return FirmwareRelease::create([
            'version' => $version,
            'channel' => strtolower((string) ($data['channel'] ?? 'stable')),
            'target_hardware' => $targetHw,
            'allowed_device_ids' => $allowedIds,
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
     * Buat rilis binary firmware uji (.bin) yang bertanda tangan resmi langsung di server untuk pengujian OTA.
     *
     * @param  array<string, mixed>  $data
     */
    public function createSampleRelease(array $data, string $actor): FirmwareRelease
    {
        $dir = $this->firmwareStorageDir();
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }

        $requestedVersion = trim((string) ($data['version'] ?? ''));
        $version = $requestedVersion !== '' ? $requestedVersion : ('v1.5.' . now()->format('His') . '-sim');
        while (FirmwareRelease::where('version', $version)->exists()) {
            $version = preg_replace('/-r\d+$/', '', $version) . '-r' . random_int(10, 99);
        }

        $targetHw = (string) ($data['target_hardware'] ?? 'ESP32-WROOM-CoreHub-v2');
        $minPrev = !empty($data['min_previous_version']) ? trim((string) $data['min_previous_version']) : null;
        $safeBase = preg_replace('/[^A-Za-z0-9._-]/', '_', $version) ?: ('fw_sample_' . time());
        $storedName = $safeBase . '.bin';
        $absPath = $dir . DIRECTORY_SEPARATOR . $storedName;

        // Susun header ESP32 app image (magic byte 0xE9) + payload deterministik 48 KB untuk simulasi flashing
        $header = "\xE9\x04\x02\x20" . str_pad("BANYUWENING_OTA|{$version}|{$targetHw}|", 60, "\x00");
        $body = str_repeat("BW_ESP32_FRAME_{$version}_SENSOR_ADC_FUZZY_", 1100);
        file_put_contents($absPath, $header . $body);

        $sha256 = (string) hash_file('sha256', $absPath);
        $sizeBytes = (int) filesize($absPath);
        $hmac = FirmwareRelease::computeSignature($version, $sha256, $sizeBytes, $minPrev);

        $allowedIds = $this->resolveInitialAllowedDeviceIds(
            $data['allowed_device_ids'] ?? null,
            $targetHw,
            $minPrev
        );

        return FirmwareRelease::create([
            'version' => $version,
            'channel' => strtolower((string) ($data['channel'] ?? 'beta')),
            'target_hardware' => $targetHw,
            'allowed_device_ids' => $allowedIds,
            'file_path' => 'firmware/' . $storedName,
            'file_name' => $storedName,
            'file_size_bytes' => $sizeBytes,
            'sha256_checksum' => $sha256,
            'hmac_signature' => $hmac,
            'min_previous_version' => $minPrev,
            'rollback_timeout_s' => (int) ($data['rollback_timeout_s'] ?? 60),
            'changelog' => (string) ($data['changelog'] ?? "Sampel firmware uji OTA untuk {$targetHw}"),
            'is_active' => true,
            'is_mandatory' => false,
            'uploaded_by' => $actor,
            'released_at' => now(),
        ]);
    }

    /**
     * Normalisasi string versi semantik seperti 'v1.4.2-failsafe' -> '1.4.2'.
     */
    public function normalizeSemver(?string $ver): string
    {
        if (!$ver) {
            return '0.0.0';
        }
        if (preg_match('/(\d+)\.(\d+)(?:\.(\d+))?/', $ver, $m)) {
            return sprintf('%d.%d.%d', (int) $m[1], (int) $m[2], (int) ($m[3] ?? 0));
        }

        return '0.0.0';
    }

    /**
     * Evaluasi apakah perangkat IoT kompatibel secara hardware & versi minimum, serta diberi akses token ke rilis ini.
     *
     * @return array<string, mixed>
     */
    public function evaluateCompatibility(Device $device, FirmwareRelease $release): array
    {
        $deviceHw = trim((string) ($device->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2'));
        $targetHw = trim((string) ($release->target_hardware ?: '*'));
        $hwMatch = ($targetHw === '*' || strcasecmp($targetHw, 'ALL') === 0 || strcasecmp($deviceHw, $targetHw) === 0);

        $minPrev = $release->min_previous_version ? trim($release->min_previous_version) : null;
        $verOk = !$minPrev || version_compare(
            $this->normalizeSemver($device->firmware_version),
            $this->normalizeSemver($minPrev),
            '>='
        );

        $isAuthorized = $release->isDeviceAllowed((int) $device->id);
        $reasons = [];

        if (!$hwMatch) {
            $reasons[] = "Hardware alat ({$deviceHw}) tidak didukung oleh target firmware ({$targetHw}).";
        }
        if (!$verOk) {
            $reasons[] = "Versi firmware saat ini ({$device->firmware_version}) di bawah syarat minimum ({$minPrev}).";
        }
        if (!$isAuthorized) {
            $reasons[] = "Token alat {$device->device_code} belum diberi izin akses ke rilis {$release->version}.";
        }

        return [
            'compatible' => $hwMatch && $verOk,
            'authorized' => $isAuthorized,
            'can_install' => $hwMatch && $verOk && $isAuthorized,
            'hardware_match' => $hwMatch,
            'version_ok' => $verOk,
            'reasons' => $reasons,
        ];
    }

    /**
     * Tentukan daftar ID perangkat yang diberi akses saat rilis dibuat.
     * Jika tidak dipilih eksplisit, hanya alat yang kompatibel yang diizinkan (atau [] jika diminta ketat).
     *
     * @return array<int, int>
     */
    private function resolveInitialAllowedDeviceIds(mixed $inputIds, string $targetHw, ?string $minPrev): array
    {
        if (is_array($inputIds)) {
            $ids = array_values(array_unique(array_map('intval', $inputIds)));
            return Device::whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->all();
        }

        // Default: hanya izinkan perangkat yang kompatibel jika tidak dispesifikasikan
        return Device::orderBy('id')->get()
            ->filter(function (Device $d) use ($targetHw, $minPrev) {
                $hw = trim((string) ($d->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2'));
                $hwMatch = ($targetHw === '*' || strcasecmp($targetHw, 'ALL') === 0 || strcasecmp($hw, trim($targetHw)) === 0);
                $verOk = !$minPrev || version_compare(
                    $this->normalizeSemver($d->firmware_version),
                    $this->normalizeSemver($minPrev),
                    '>='
                );
                return $hwMatch && $verOk;
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * Perbarui daftar perangkat yang diberi izin akses token untuk sebuah rilis firmware.
     *
     * @param  array<int, int|string>  $deviceIds
     */
    public function syncDeviceAccess(FirmwareRelease $release, array $deviceIds): FirmwareRelease
    {
        $validIds = empty($deviceIds)
            ? []
            : Device::whereIn('id', array_map('intval', $deviceIds))
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

        $release->update(['allowed_device_ids' => $validIds]);

        return $release->fresh();
    }

    /**
     * Perbarui profil hardware & izin rilis untuk satu alat IoT tertentu.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateDeviceProfile(Device $device, array $data): Device
    {
        $updates = [];
        if (!empty($data['hardware_profile'])) {
            $updates['hardware_profile'] = trim((string) $data['hardware_profile']);
        }
        if (!empty($data['firmware_version'])) {
            $updates['firmware_version'] = trim((string) $data['firmware_version']);
        }
        if (!empty($updates)) {
            $device->update($updates);
        }

        if (isset($data['allowed_release_ids']) && is_array($data['allowed_release_ids'])) {
            $targetReleaseIds = array_map('intval', $data['allowed_release_ids']);
            foreach (FirmwareRelease::all() as $release) {
                $current = is_array($release->allowed_device_ids)
                    ? array_map('intval', $release->allowed_device_ids)
                    : [];
                $shouldAllow = in_array((int) $release->id, $targetReleaseIds, true);
                if ($shouldAllow && !in_array((int) $device->id, $current, true)) {
                    $current[] = (int) $device->id;
                    $release->update(['allowed_device_ids' => array_values(array_unique($current))]);
                } elseif (!$shouldAllow && in_array((int) $device->id, $current, true)) {
                    $release->update(['allowed_device_ids' => array_values(array_diff($current, [(int) $device->id]))]);
                }
            }
        }

        return $device->fresh();
    }

    /**
     * Buat rollout ke perangkat terpilih (wajib dipilih eksplisit per alat & harus kompatibel),
     * lalu siarkan manifest ke /ws/ota.
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
        $ids = array_values(array_unique(array_map('intval', $deviceIds)));
        if (empty($ids)) {
            throw new \InvalidArgumentException('Pilih minimal 1 alat IoT target untuk rollout firmware.');
        }

        $devices = Device::whereIn('id', $ids)->orderBy('id')->get();
        if ($devices->isEmpty()) {
            throw new \InvalidArgumentException('Perangkat target tidak ditemukan.');
        }

        // Validasi kompatibilitas hardware & versi minimum sebelum rollout dijadwalkan
        $incompatErrors = [];
        foreach ($devices as $device) {
            $compat = $this->evaluateCompatibility($device, $release);
            if (!$compat['compatible']) {
                $hwAndVerReasons = array_values(array_filter(
                    $compat['reasons'],
                    fn ($r) => !str_contains($r, 'belum diberi izin akses')
                ));
                $incompatErrors[] = "{$device->device_code}: " . implode(' ', $hwAndVerReasons);
            }
        }
        if (!empty($incompatErrors)) {
            throw new \InvalidArgumentException(
                'Rollout diblokir karena ketidakcocokan perangkat: ' . implode(' | ', $incompatErrors)
            );
        }

        // Pastikan seluruh perangkat target yang dipilih memiliki izin token pada rilis ini
        $existingAllowed = is_array($release->allowed_device_ids)
            ? array_map('intval', $release->allowed_device_ids)
            : [];
        $mergedAllowed = array_values(array_unique(array_merge($existingAllowed, $ids)));
        $release->update(['allowed_device_ids' => $mergedAllowed]);

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
     * Cek apakah ada rollout OTA aktif atau rilis terotorisasi yang kompatibel untuk suatu node ESP32.
     *
     * @return array<string, mixed>
     */
    public function checkForDevice(Device $device, string $httpOrigin = '', string $transport = 'HTTP_FALLBACK'): array
    {
        $rollout = FirmwareRollout::with('release')
            ->where('device_id', $device->id)
            ->whereIn('status', ['QUEUED', 'NOTIFIED', 'DOWNLOADING', 'VERIFYING', 'FLASHING', 'REBOOTING', 'HEALTH_CHECK'])
            ->whereHas('release', fn ($q) => $q->where('is_active', true)->where('scan_status', 'CLEAN'))
            ->latest('id')
            ->first();

        if ($rollout && $rollout->release) {
            $compat = $this->evaluateCompatibility($device, $rollout->release);
            if (!$compat['compatible'] || !$compat['authorized']) {
                return [
                    'success' => true,
                    'update_available' => false,
                    'blocked_reason' => implode(' ', $compat['reasons']),
                    'device_code' => $device->device_code,
                    'hardware_profile' => $device->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2',
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
                'hardware_profile' => $device->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2',
                'current_version' => $device->firmware_version,
                'rollout_status' => $rollout->status,
                'manifest' => $this->buildManifest($rollout->release, $rollout, $httpOrigin),
                'server_time' => now()->toIso8601String(),
            ];
        }

        // Jika belum ada rollout manual, cek rilis aktif terbaru yang memang mengizinkan token alat & kompatibel
        $authorizedRelease = FirmwareRelease::where('is_active', true)
            ->where('scan_status', 'CLEAN')
            ->latest('id')
            ->get()
            ->first(function (FirmwareRelease $r) use ($device) {
                if ($r->version === $device->firmware_version) {
                    return false;
                }
                $compat = $this->evaluateCompatibility($device, $r);
                return $compat['can_install'];
            });

        if ($authorizedRelease) {
            $rollout = FirmwareRollout::create([
                'firmware_release_id' => $authorizedRelease->id,
                'device_id' => $device->id,
                'status' => 'NOTIFIED',
                'progress_pct' => 0,
                'from_version' => $device->firmware_version,
                'to_version' => $authorizedRelease->version,
                'transport' => strtoupper($transport),
                'initiated_by' => 'Device Pull (Token Authorized)',
                'started_at' => now(),
            ]);

            return [
                'success' => true,
                'update_available' => true,
                'device_code' => $device->device_code,
                'hardware_profile' => $device->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2',
                'current_version' => $device->firmware_version,
                'rollout_status' => $rollout->status,
                'manifest' => $this->buildManifest($authorizedRelease, $rollout, $httpOrigin),
                'server_time' => now()->toIso8601String(),
            ];
        }

        return [
            'success' => true,
            'update_available' => false,
            'device_code' => $device->device_code,
            'hardware_profile' => $device->hardware_profile ?: 'ESP32-WROOM-CoreHub-v2',
            'current_version' => $device->firmware_version,
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
     * Simulasikan end-to-end proses update firmware Dual-OTA ESP32 beserta pengujian bug/error gate.
     *
     * @return array<string, mixed>
     */
    public function simulateOtaFlow(
        Device $device,
        FirmwareRelease $release,
        string $scenario,
        string $actor,
        string $httpOrigin = ''
    ): array {
        $steps = [];
        $previousVersion = (string) ($device->firmware_version ?: 'v1.4.2-failsafe');
        $compat = $this->evaluateCompatibility($device, $release);
        $tokenPrefix = $device->api_token_prefix ?: '(belum ada token)';

        // Langkah 1: Verifikasi Token Alat
        if (!$device->token_active || !$device->api_token_hash) {
            $steps[] = [
                'step' => '1. TOKEN_AUTH',
                'status' => 'BLOCKED',
                'detail' => "Token alat {$device->device_code} nonaktif atau belum diterbitkan (HTTP 401 UNAUTHORIZED_DEVICE_TOKEN).",
            ];
            return [
                'scenario' => $scenario,
                'passed' => false,
                'http_status' => 401,
                'device_code' => $device->device_code,
                'target_version' => $release->version,
                'final_device_version' => $previousVersion,
                'active_partition' => 'ota_0',
                'summary' => "Simulasi berhenti di tahap autentikasi: token alat {$device->device_code} tidak aktif.",
                'steps' => $steps,
            ];
        }

        $steps[] = [
            'step' => '1. TOKEN_AUTH',
            'status' => 'OK',
            'detail' => "Token alat {$device->device_code} ({$tokenPrefix}) terverifikasi SHA-256.",
        ];

        // Skenario uji khusus proteksi akses & kompatibilitas perangkat
        if ($scenario === 'INCOMPATIBLE_BLOCKED') {
            $blockedByRealCompat = !$compat['can_install'];
            $expectedHttp = !$compat['authorized'] ? 403 : 422;
            $reasonText = $blockedByRealCompat
                ? implode(' ', $compat['reasons'])
                : "Simulasi penolakan: jika rilis {$release->version} mensyaratkan hardware lain / token tidak diberi izin, gerbang OTA mengembalikan HTTP 403/422 sebelum mengirim binary.";

            $steps[] = [
                'step' => '2. COMPAT_AND_ACL_GATE',
                'status' => 'BLOCKED',
                'detail' => $reasonText,
            ];
            $steps[] = [
                'step' => '3. SAFE_ABORT',
                'status' => 'OK',
                'detail' => "Endpoint /api/http/ota/download/{$release->version} menolak pengiriman byte. Partisi ota_0 ({$previousVersion}) tetap utuh tanpa bricking.",
            ];

            return [
                'scenario' => $scenario,
                'passed' => true,
                'http_status' => $expectedHttp,
                'device_code' => $device->device_code,
                'target_version' => $release->version,
                'final_device_version' => $previousVersion,
                'active_partition' => 'ota_0',
                'summary' => $blockedByRealCompat
                    ? "Proteksi aktif (HTTP {$expectedHttp}): {$device->device_code} berhasil diblokir dari firmware {$release->version}."
                    : "Uji proteksi berhasil: gerbang OTA mencegah perangkat mengunduh firmware di luar profil hardware / izin token.",
                'steps' => $steps,
            ];
        }

        // Pada skenario normal/checksum/rollback, cek kompatibilitas hardware & izin token alat sebenarnya
        if (!$compat['can_install']) {
            $httpErr = !$compat['authorized'] ? 403 : 422;
            $steps[] = [
                'step' => '2. COMPAT_AND_ACL_GATE',
                'status' => 'BLOCKED',
                'detail' => implode(' ', $compat['reasons']),
            ];

            return [
                'scenario' => $scenario,
                'passed' => false,
                'http_status' => $httpErr,
                'device_code' => $device->device_code,
                'target_version' => $release->version,
                'final_device_version' => $previousVersion,
                'active_partition' => 'ota_0',
                'summary' => "Simulasi diblokir gerbang keamanan (HTTP {$httpErr}): " . implode(' ', $compat['reasons']),
                'steps' => $steps,
            ];
        }

        $steps[] = [
            'step' => '2. COMPAT_AND_ACL_GATE',
            'status' => 'OK',
            'detail' => "Profil hardware ({$device->hardware_profile}) cocok, versi minimum terpenuhi, & token diizinkan.",
        ];

        $absPath = $this->absoluteBinaryPath($release);
        if (!is_file($absPath)) {
            $steps[] = [
                'step' => '3. BINARY_CHECK',
                'status' => 'FAILED',
                'detail' => "File binary {$release->file_name} tidak ditemukan di penyimpanan server (HTTP 404).",
            ];
            return [
                'scenario' => $scenario,
                'passed' => false,
                'http_status' => 404,
                'device_code' => $device->device_code,
                'target_version' => $release->version,
                'final_device_version' => $previousVersion,
                'active_partition' => 'ota_0',
                'summary' => 'File binary firmware hilang di server (HTTP 404).',
                'steps' => $steps,
            ];
        }

        // Catat rollout simulasi nyata di database
        $rollout = FirmwareRollout::create([
            'firmware_release_id' => $release->id,
            'device_id' => $device->id,
            'status' => 'NOTIFIED',
            'progress_pct' => 5,
            'from_version' => $previousVersion,
            'to_version' => $release->version,
            'active_partition' => 'ota_0',
            'transport' => 'HTTP_SIMULATOR',
            'initiated_by' => $actor . ' (Simulasi)',
            'started_at' => now(),
        ]);

        $manifest = $this->buildManifest($release, $rollout, $httpOrigin);
        $expectedHmac = FirmwareRelease::computeSignature(
            $release->version,
            $release->sha256_checksum,
            (int) $release->file_size_bytes,
            $release->min_previous_version
        );
        $actualSha = (string) hash_file('sha256', $absPath);

        $steps[] = [
            'step' => '3. DOWNLOAD_STREAM',
            'status' => 'OK',
            'detail' => "Mengunduh {$release->file_name} (" . number_format($release->file_size_bytes) . " bytes) ke partisi cadangan ota_1.",
        ];

        // Skenario Checksum Mismatch
        if ($scenario === 'CHECKSUM_TAMPERED') {
            $corruptSha = substr($actualSha, 0, -4) . 'dead';
            $this->recordDeviceStatus($device, [
                'rollout_id' => $rollout->id,
                'status' => 'FAILED',
                'progress_pct' => 72,
                'active_partition' => 'ota_0',
                'boot_health_ok' => false,
                'error_message' => "Simulasi Checksum Mismatch: manifest={$manifest['sha256']} vs stream={$corruptSha}",
            ], 'HTTP_SIMULATOR');

            $steps[] = [
                'step' => '4. VERIFY_SHA256_HMAC',
                'status' => 'FAILED',
                'detail' => "SHA-256 stream tidak cocok ({$corruptSha} != " . substr($manifest['sha256'], 0, 16) . "...). Penulisan partisi dibatalkan sebelum reboot!",
            ];

            return [
                'scenario' => $scenario,
                'passed' => true,
                'http_status' => 422,
                'device_code' => $device->device_code,
                'target_version' => $release->version,
                'final_device_version' => $previousVersion,
                'active_partition' => 'ota_0',
                'summary' => "Uji integritas sukses: corrupt binary dibatalkan sebelum reboot; alat tetap di {$previousVersion} (ota_0).",
                'steps' => $steps,
            ];
        }

        // Verifikasi SHA-256 & HMAC nyata pada binary
        if (!hash_equals(strtolower($manifest['sha256']), strtolower($actualSha)) || !hash_equals($expectedHmac, $release->hmac_signature)) {
            $this->recordDeviceStatus($device, [
                'rollout_id' => $rollout->id,
                'status' => 'FAILED',
                'progress_pct' => 70,
                'active_partition' => 'ota_0',
                'boot_health_ok' => false,
                'error_message' => 'Real SHA-256 / HMAC mismatch pada file binary server.',
            ], 'HTTP_SIMULATOR');

            $steps[] = [
                'step' => '4. VERIFY_SHA256_HMAC',
                'status' => 'FAILED',
                'detail' => 'Hash SHA-256 atau HMAC-SHA256 file server tidak cocok dengan manifest.',
            ];

            return [
                'scenario' => $scenario,
                'passed' => false,
                'http_status' => 500,
                'device_code' => $device->device_code,
                'target_version' => $release->version,
                'final_device_version' => $previousVersion,
                'active_partition' => 'ota_0',
                'summary' => 'Verifikasi integritas binary gagal.',
                'steps' => $steps,
            ];
        }

        $steps[] = [
            'step' => '4. VERIFY_SHA256_HMAC',
            'status' => 'OK',
            'detail' => 'SHA-256 (' . substr($actualSha, 0, 14) . '...) & HMAC-SHA256 cocok 100%.',
        ];

        $this->recordDeviceStatus($device, [
            'rollout_id' => $rollout->id,
            'status' => 'FLASHING',
            'progress_pct' => 85,
            'active_partition' => 'ota_1',
        ], 'HTTP_SIMULATOR');

        $steps[] = [
            'step' => '5. FLASH_AND_TRIAL_BOOT',
            'status' => 'OK',
            'detail' => "esp_ota_set_boot_partition(ota_1) selesai. ESP32 restart menuju window health-check {$release->rollback_timeout_s}s.",
        ];

        // Skenario Auto-Rollback 60 Detik
        if ($scenario === 'WATCHDOG_ROLLBACK_60S') {
            $this->recordDeviceStatus($device, [
                'rollout_id' => $rollout->id,
                'status' => 'ROLLED_BACK',
                'progress_pct' => 92,
                'active_partition' => 'ota_0',
                'boot_health_ok' => false,
                'error_message' => 'Simulasi Watchdog Fault pada t=42s: ADS1115 I2C timeout -> Bootloader auto-rollback ke ota_0.',
            ], 'HTTP_SIMULATOR');

            $steps[] = [
                'step' => '6. HEALTH_CHECK_60S',
                'status' => 'ROLLED_BACK',
                'detail' => "Watchdog mendeteksi I2C ADS1115 timeout pada detik ke-42 (< {$release->rollback_timeout_s}s). Bootloader otomatis rollback ke partisi ota_0 ({$previousVersion}).",
            ];

            return [
                'scenario' => $scenario,
                'passed' => true,
                'http_status' => 200,
                'device_code' => $device->device_code,
                'target_version' => $release->version,
                'final_device_version' => $previousVersion,
                'active_partition' => 'ota_0',
                'summary' => "Uji Auto-Rollback 60s sukses: {$device->device_code} kembali aman ke {$previousVersion} di partisi ota_0.",
                'steps' => $steps,
            ];
        }

        // Skenario Normal Sukses
        $this->recordDeviceStatus($device, [
            'rollout_id' => $rollout->id,
            'status' => 'COMPLETED',
            'progress_pct' => 100,
            'active_partition' => 'ota_1',
            'boot_health_ok' => true,
        ], 'HTTP_SIMULATOR');

        $steps[] = [
            'step' => '6. HEALTH_CHECK_60S',
            'status' => 'OK',
            'detail' => "Sensor, WiFi, & Free Heap sehat selama {$release->rollback_timeout_s}s -> esp_ota_mark_app_valid_cancel_rollback(). Versi alat kini {$release->version}.",
        ];

        return [
            'scenario' => $scenario,
            'passed' => true,
            'http_status' => 200,
            'device_code' => $device->device_code,
            'target_version' => $release->version,
            'final_device_version' => $release->version,
            'active_partition' => 'ota_1',
            'summary' => "Update OTA simulasi berhasil penuh! {$device->device_code} diperbarui {$previousVersion} → {$release->version} (ota_1).",
            'steps' => $steps,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getOverview(?User $viewer = null): array
    {
        $allDevices = $viewer ? Device::accessibleBy($viewer) : Device::orderBy('id')->get();
        $accessibleDeviceIds = $allDevices->pluck('id')->map(fn ($id) => (int) $id)->all();
        $allReleases = FirmwareRelease::withCount('rollouts')->latest('id')->get();

        $releases = $allReleases
            ->map(function (FirmwareRelease $r) use ($viewer, $accessibleDeviceIds) {
                $allowed = is_array($r->allowed_device_ids)
                    ? array_values(array_unique(array_map('intval', $r->allowed_device_ids)))
                    : [];

                if ($viewer && !$viewer->isAdmin()) {
                    $allowed = array_values(array_intersect($allowed, $accessibleDeviceIds));
                }

                return [
                    'id' => $r->id,
                    'version' => $r->version,
                    'channel' => $r->channel,
                    'source_type' => $r->source_type ?: 'bin',
                    'compile_status' => $r->compile_status ?: 'PRECOMPILED',
                    'compile_log' => $r->compile_log,
                    'target_hardware' => $r->target_hardware,
                    'allowed_device_ids' => $allowed,
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
                ];
            })->values()->all();

        $rolloutQuery = FirmwareRollout::with(['device:id,device_code,name,pond_name,tenant_code,firmware_version,status', 'release:id,version,channel'])
            ->latest('id');
        if ($viewer && !$viewer->isAdmin()) {
            if (empty($accessibleDeviceIds)) {
                $rolloutQuery->whereRaw('1 = 0');
            } else {
                $rolloutQuery->whereIn('device_id', $accessibleDeviceIds);
            }
        }

        $rollouts = $rolloutQuery
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

        $devices = $allDevices->map(function (Device $d) use ($allReleases) {
            $allowedReleaseIds = $allReleases
                ->filter(fn (FirmwareRelease $r) => $r->isDeviceAllowed((int) $d->id))
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

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
                'api_token_prefix' => $d->api_token_prefix,
                'has_token' => (bool) $d->api_token_hash,
                'token_active' => (bool) $d->token_active,
                'plain_token' => $d->decryptToken(),
                'allowed_release_ids' => $allowedReleaseIds,
                'last_heartbeat_at' => $d->last_heartbeat_at?->toIso8601String(),
            ];
        })->values()->all();

        $statsRolloutBase = FirmwareRollout::query();
        if ($viewer && !$viewer->isAdmin()) {
            if (empty($accessibleDeviceIds)) {
                $statsRolloutBase->whereRaw('1 = 0');
            } else {
                $statsRolloutBase->whereIn('device_id', $accessibleDeviceIds);
            }
        }

        return [
            'releases' => $releases,
            'rollouts' => $rollouts,
            'devices' => $devices,
            'stats' => [
                'total_releases' => FirmwareRelease::count(),
                'active_releases' => FirmwareRelease::where('is_active', true)->count(),
                'total_rollouts' => (clone $statsRolloutBase)->count(),
                'in_progress_rollouts' => (clone $statsRolloutBase)->whereIn('status', ['QUEUED', 'NOTIFIED', 'DOWNLOADING', 'VERIFYING', 'FLASHING', 'REBOOTING', 'HEALTH_CHECK'])->count(),
                'completed_rollouts' => (clone $statsRolloutBase)->where('status', 'COMPLETED')->count(),
                'rolled_back_rollouts' => (clone $statsRolloutBase)->where('status', 'ROLLED_BACK')->count(),
            ],
        ];
    }
}
