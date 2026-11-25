<?php

namespace App\Http\Controllers;

use App\Enums\UploadStatus;
use App\Models\Device;
use App\Models\FirmwareRelease;
use App\Services\FirmwareOtaService;
use App\Services\Upload\Exceptions\FileValidationException;
use App\Services\Upload\SecureFileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OtaController extends Controller
{
    public function __construct(
        private readonly FirmwareOtaService $otaService
    ) {
    }

    /**
     * Device API (device.token): Cek pembaruan firmware & unduh manifest bertanda tangan HMAC-SHA256.
     */
    public function check(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        return response()->json(
            $this->otaService->checkForDevice($device, $request->getSchemeAndHttpHost(), 'HTTP_FALLBACK')
        );
    }

    /**
     * Device API (device.token): Unduh file binary firmware .bin disertai header SHA-256 & HMAC signature.
     */
    public function download(Request $request, string $version): BinaryFileResponse|JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $release = FirmwareRelease::where('version', $version)
            ->where('is_active', true)
            ->first();

        if (!$release) {
            return response()->json([
                'success' => false,
                'error' => 'FIRMWARE_NOT_FOUND',
                'message' => "Rilis firmware '{$version}' tidak ditemukan atau sudah dinonaktifkan.",
            ], 404);
        }

        if (!$release->isScanApproved()) {
            return response()->json([
                'success' => false,
                'error' => 'FIRMWARE_NOT_VERIFIED',
                'message' => "Rilis firmware '{$version}' belum lolos pemindaian keamanan.",
            ], 403);
        }

        $compat = $this->otaService->evaluateCompatibility($device, $release);

        if (!$compat['authorized']) {
            return response()->json([
                'success' => false,
                'error' => 'FIRMWARE_ACCESS_DENIED_FOR_DEVICE',
                'message' => "Token alat {$device->device_code} tidak diberi hak akses untuk mengunduh firmware {$release->version}.",
            ], 403);
        }

        if (!$compat['compatible']) {
            return response()->json([
                'success' => false,
                'error' => 'FIRMWARE_INCOMPATIBLE_WITH_DEVICE',
                'message' => 'Firmware tidak kompatibel dengan perangkat ini: ' . implode(' ', $compat['reasons']),
                'reasons' => $compat['reasons'],
            ], 422);
        }

        $absPath = $this->otaService->absoluteBinaryPath($release);
        if (!is_file($absPath)) {
            return response()->json([
                'success' => false,
                'error' => 'FIRMWARE_BINARY_MISSING',
                'message' => 'File binary firmware tidak ditemukan di penyimpanan server.',
            ], 404);
        }

        // Tandai progres awal jika rollout perangkat ini masih QUEUED/NOTIFIED
        $activeRollout = $device->firmwareRollouts()
            ->where('firmware_release_id', $release->id)
            ->whereIn('status', ['QUEUED', 'NOTIFIED'])
            ->latest('id')
            ->first();

        if ($activeRollout) {
            $this->otaService->recordDeviceStatus($device, [
                'rollout_id' => $activeRollout->id,
                'status' => 'DOWNLOADING',
                'progress_pct' => 5,
            ], 'HTTP_FALLBACK');
        }

        return response()->download($absPath, $release->file_name, [
            'Content-Type' => 'application/octet-stream',
            'X-Firmware-Version' => $release->version,
            'X-Firmware-Sha256' => $release->sha256_checksum,
            'X-Firmware-Signature' => $release->hmac_signature,
        ]);
    }

    /**
     * Device API (device.token): Laporkan progres flashing, boot health check 60s, atau auto-rollback.
     */
    public function reportStatus(Request $request): JsonResponse
    {
        /** @var Device $device */
        $device = $request->attributes->get('device');

        $validated = $request->validate([
            'rollout_id' => ['nullable', 'integer'],
            'to_version' => ['nullable', 'string', 'max:64'],
            'status' => ['required', 'in:NOTIFIED,DOWNLOADING,VERIFYING,FLASHING,REBOOTING,HEALTH_CHECK,COMPLETED,FAILED,ROLLED_BACK'],
            'progress_pct' => ['nullable', 'integer', 'min:0', 'max:100'],
            'active_partition' => ['nullable', 'string', 'max:24'],
            'boot_health_ok' => ['nullable', 'boolean'],
            'error_message' => ['nullable', 'string', 'max:500'],
        ]);

        $rollout = $this->otaService->recordDeviceStatus($device, $validated, 'HTTP_FALLBACK');
        if (!$rollout) {
            return response()->json([
                'success' => false,
                'error' => 'OTA_ROLLOUT_NOT_FOUND',
                'message' => 'Tidak ditemukan rollout OTA untuk perangkat ini.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Status OTA berhasil dicatat.',
            'device_code' => $device->device_code,
            'firmware_version' => $device->fresh()->firmware_version,
            'rollout' => $rollout,
        ]);
    }

    /**
     * Super Admin / Peternak Self-OTA: Ringkasan rilis firmware & status rollout perangkat terotorisasi.
     */
    public function overview(): JsonResponse
    {
        $user = $this->authorizeOtaOperator();

        return response()->json([
            'success' => true,
            'overview' => $this->otaService->getOverview($user),
        ]);
    }

    /**
     * Super Admin: Unggah binary firmware .bin ESP32 baru melalui Secure Upload Pipeline dan buat signed manifest.
     */
    public function storeRelease(Request $request, SecureFileUploadService $uploadService): JsonResponse
    {
        $admin = $this->authorizeAdmin();

        $validated = $request->validate([
            'version' => ['required', 'string', 'max:64', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:firmware_releases,version'],
            'channel' => ['required', 'in:stable,beta,canary'],
            'target_hardware' => ['nullable', 'string', 'max:80'],
            'min_previous_version' => ['nullable', 'string', 'max:64'],
            'rollback_timeout_s' => ['nullable', 'integer', 'min:15', 'max:300'],
            'changelog' => ['nullable', 'string', 'max:2000'],
            'is_mandatory' => ['nullable', 'boolean'],
            'allowed_device_ids' => ['nullable', 'array'],
            'allowed_device_ids.*' => ['integer', 'exists:devices,id'],
            'firmware_file' => ['required', 'file', 'max:16384'],
        ]);

        try {
            $upload = $uploadService->ingest(
                $request->file('firmware_file'),
                'firmware',
                $admin,
                null,
                ['version' => $validated['version']]
            );
        } catch (FileValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->errorCode(),
                'message' => $e->getMessage(),
            ], $e->httpStatus());
        }

        if ($upload->status === UploadStatus::SCAN_FAILED) {
            return response()->json([
                'success' => false,
                'error' => 'SCAN_FAILED',
                'message' => $upload->rejection_reason ?: 'Pemindaian malware firmware gagal; rilis tidak dibuat.',
                'upload_id' => $upload->uuid,
            ], 503);
        }

        if ($upload->status === UploadStatus::QUARANTINED || $upload->status === UploadStatus::REJECTED) {
            return response()->json([
                'success' => false,
                'error' => $upload->status->value,
                'message' => $upload->rejection_reason ?: 'File firmware ditolak oleh pemeriksaan keamanan.',
                'upload_id' => $upload->uuid,
            ], 422);
        }

        $isAsyncPending = $upload->status === UploadStatus::PENDING_SCAN || $upload->status === UploadStatus::SCANNING;

        $release = $this->otaService->createReleaseFromSecureUpload(
            $validated,
            $upload,
            $admin->name . ' (' . $admin->role . ')',
            !$isAsyncPending,
            $isAsyncPending ? 'PENDING_SCAN' : 'CLEAN'
        );

        if ($isAsyncPending) {
            $meta = is_array($upload->metadata) ? $upload->metadata : [];
            $meta['firmware_release_id'] = $release->id;
            $upload->forceFill(['metadata' => $meta])->save();

            return response()->json([
                'success' => true,
                'pending' => true,
                'message' => "Firmware {$release->version} masuk karantina untuk pemindaian keamanan sebelum diaktifkan.",
                'upload_id' => $upload->uuid,
                'scan_status' => 'PENDING_SCAN',
                'release' => $release,
                'overview' => $this->otaService->getOverview(),
            ], 202);
        }

        return response()->json([
            'success' => true,
            'message' => "Rilis firmware {$release->version} berhasil diunggah dengan SHA-256 & tanda tangan HMAC.",
            'upload_id' => $upload->uuid,
            'scan_status' => 'CLEAN',
            'release' => $release,
            'overview' => $this->otaService->getOverview(),
        ], 201);
    }

    /**
     * Super Admin: Buat sampel firmware binary .bin bertanda tangan resmi langsung di server untuk pengujian OTA.
     */
    public function storeSampleRelease(Request $request): JsonResponse
    {
        $admin = $this->authorizeAdmin();

        $validated = $request->validate([
            'version' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9._-]+$/'],
            'channel' => ['nullable', 'in:stable,beta,canary'],
            'target_hardware' => ['nullable', 'string', 'max:80'],
            'min_previous_version' => ['nullable', 'string', 'max:64'],
            'allowed_device_ids' => ['nullable', 'array'],
            'allowed_device_ids.*' => ['integer', 'exists:devices,id'],
        ]);

        $release = $this->otaService->createSampleRelease(
            $validated,
            $admin->name . ' (' . $admin->role . ')'
        );

        return response()->json([
            'success' => true,
            'message' => "Sampel firmware uji {$release->version} berhasil dibuat ({$release->target_hardware}).",
            'release' => $release,
            'overview' => $this->otaService->getOverview(),
        ], 201);
    }

    /**
     * Super Admin: Atur alat IoT mana saja yang berhak mengakses rilis firmware tertentu.
     */
    public function updateReleaseAccess(Request $request, FirmwareRelease $release): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'allowed_device_ids' => ['present', 'array'],
            'allowed_device_ids.*' => ['integer', 'exists:devices,id'],
        ]);

        $updated = $this->otaService->syncDeviceAccess($release, $validated['allowed_device_ids']);

        return response()->json([
            'success' => true,
            'message' => "Hak akses perangkat untuk rilis {$updated->version} berhasil diperbarui.",
            'release' => $updated,
            'overview' => $this->otaService->getOverview(),
        ]);
    }

    /**
     * Super Admin / Peternak Self-OTA: Perbarui profil hardware & izin rilis untuk satu alat IoT tertentu.
     */
    public function updateDeviceOtaProfile(Request $request, Device $device): JsonResponse
    {
        $user = $this->authorizeOtaOperator();
        if (!$user->isAdmin() && !$device->isAccessibleBy($user)) {
            return response()->json([
                'success' => false,
                'error' => 'TENANT_DEVICE_FORBIDDEN',
                'message' => "Alat {$device->device_code} bukan milik tenant akun Anda.",
            ], 403);
        }

        $validated = $request->validate([
            'hardware_profile' => ['required', 'string', 'max:80'],
            'firmware_version' => ['nullable', 'string', 'max:64'],
            'allowed_release_ids' => ['nullable', 'array'],
            'allowed_release_ids.*' => ['integer', 'exists:firmware_releases,id'],
        ]);

        // Peternak non-admin tidak boleh memberi izin rilis baru secara sepihak lewat endpoint ini
        if (!$user->isAdmin()) {
            unset($validated['allowed_release_ids'], $validated['firmware_version']);
        }

        $updated = $this->otaService->updateDeviceProfile($device, $validated);

        return response()->json([
            'success' => true,
            'message' => "Profil OTA untuk {$updated->device_code} berhasil disimpan.",
            'overview' => $this->otaService->getOverview($user),
        ]);
    }

    /**
     * Super Admin / Peternak Self-OTA: Jadwalkan rollout ke perangkat terpilih (wajib per-alat, terisolasi tenant & kompatibel).
     */
    public function initiateRollout(Request $request): JsonResponse
    {
        $actorUser = $this->authorizeOtaOperator();

        $validated = $request->validate([
            'release_id' => ['required', 'integer', 'exists:firmware_releases,id'],
            'device_ids' => ['required', 'array', 'min:1'],
            'device_ids.*' => ['integer', 'exists:devices,id'],
        ]);

        $targetDevices = Device::whereIn('id', $validated['device_ids'])->get();
        if (!$actorUser->isAdmin()) {
            foreach ($targetDevices as $targetDev) {
                if (!$targetDev->isAccessibleBy($actorUser)) {
                    return response()->json([
                        'success' => false,
                        'error' => 'TENANT_DEVICE_FORBIDDEN',
                        'message' => "Akses ditolak: alat {$targetDev->device_code} milik tenant peternak lain.",
                    ], 403);
                }
            }
        }

        $release = FirmwareRelease::findOrFail($validated['release_id']);
        if (!$release->is_active || !$release->isScanApproved()) {
            return response()->json([
                'success' => false,
                'error' => !$release->isScanApproved() ? 'FIRMWARE_NOT_VERIFIED' : 'FIRMWARE_INACTIVE',
                'message' => "Rilis {$release->version} sedang dinonaktifkan atau belum lolos pemindaian keamanan.",
            ], 422);
        }

        if (!$actorUser->isAdmin()) {
            foreach ($targetDevices as $targetDev) {
                if (!$release->isDeviceAllowed((int) $targetDev->id)) {
                    return response()->json([
                        'success' => false,
                        'error' => 'FIRMWARE_ACCESS_DENIED_FOR_DEVICE',
                        'message' => "Alat {$targetDev->device_code} belum diberi izin akses ke versi {$release->version} oleh Super Admin.",
                    ], 403);
                }
            }
        }

        try {
            $rollouts = $this->otaService->initiateRollout(
                $release,
                $validated['device_ids'],
                $actorUser->name . ' (' . $actorUser->role . ')',
                $request->getSchemeAndHttpHost()
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error' => 'OTA_DEVICE_INCOMPATIBLE',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => count($rollouts) . " rollout OTA untuk versi {$release->version} berhasil dijadwalkan.",
            'rollouts' => $rollouts,
            'overview' => $this->otaService->getOverview($actorUser),
        ], 201);
    }

    /**
     * Super Admin / Peternak Self-OTA: Jalankan simulasi end-to-end protokol Dual-OTA untuk perangkat yang diizinkan.
     */
    public function simulate(Request $request): JsonResponse
    {
        $actorUser = $this->authorizeOtaOperator();

        $validated = $request->validate([
            'device_id' => ['required', 'integer', 'exists:devices,id'],
            'release_id' => ['required', 'integer', 'exists:firmware_releases,id'],
            'scenario' => ['required', 'in:NORMAL_SUCCESS,INCOMPATIBLE_BLOCKED,CHECKSUM_TAMPERED,WATCHDOG_ROLLBACK_60S'],
        ]);

        $device = Device::findOrFail($validated['device_id']);
        if (!$actorUser->isAdmin() && !$device->isAccessibleBy($actorUser)) {
            return response()->json([
                'success' => false,
                'error' => 'TENANT_DEVICE_FORBIDDEN',
                'message' => "Akses ditolak: alat {$device->device_code} milik tenant peternak lain.",
            ], 403);
        }

        $release = FirmwareRelease::findOrFail($validated['release_id']);

        $simulation = $this->otaService->simulateOtaFlow(
            $device,
            $release,
            $validated['scenario'],
            $actorUser->name . ' (' . $actorUser->role . ')',
            $request->getSchemeAndHttpHost()
        );

        return response()->json([
            'success' => true,
            'simulation' => $simulation,
            'overview' => $this->otaService->getOverview($actorUser),
        ]);
    }

    /**
     * Super Admin: Aktifkan / nonaktifkan rilis firmware.
     */
    public function toggleRelease(FirmwareRelease $release): JsonResponse
    {
        $this->authorizeAdmin();

        $release->update(['is_active' => !$release->is_active]);

        return response()->json([
            'success' => true,
            'message' => "Rilis {$release->version} sekarang " . ($release->is_active ? 'AKTIF' : 'NONAKTIF') . '.',
            'overview' => $this->otaService->getOverview(),
        ]);
    }

    /**
     * Super Admin: Hapus rilis firmware beserta file binary-nya.
     */
    public function destroyRelease(FirmwareRelease $release): JsonResponse
    {
        $this->authorizeAdmin();

        $absPath = $this->otaService->absoluteBinaryPath($release);
        if (is_file($absPath)) {
            @unlink($absPath);
        }

        $ver = $release->version;
        $release->delete();

        return response()->json([
            'success' => true,
            'message' => "Rilis firmware {$ver} berhasil dihapus.",
            'overview' => $this->otaService->getOverview(),
        ]);
    }

    private function authorizeAdmin()
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }
        return $user;
    }

    private function authorizeOtaOperator()
    {
        $user = Auth::user();
        if (
            !$user ||
            (!$user->isAdmin() && !$user->hasPermission('view_docs_api') && !$user->hasPermission('update_device_firmware'))
        ) {
            abort(403, 'Akun Anda tidak memiliki hak akses Update Firmware Alat IoT.');
        }
        return $user;
    }
}
