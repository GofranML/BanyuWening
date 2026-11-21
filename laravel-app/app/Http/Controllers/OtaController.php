<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\FirmwareRelease;
use App\Services\FirmwareOtaService;
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
     * Super Admin: Ringkasan rilis firmware & status rollout seluruh perangkat.
     */
    public function overview(): JsonResponse
    {
        $this->authorizeAdmin();

        return response()->json([
            'success' => true,
            'overview' => $this->otaService->getOverview(),
        ]);
    }

    /**
     * Super Admin: Unggah binary firmware .bin ESP32 baru dan buat signed manifest.
     */
    public function storeRelease(Request $request): JsonResponse
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
            'firmware_file' => ['required', 'file', 'max:16384'],
        ]);

        $file = $request->file('firmware_file');
        $ext = strtolower((string) $file->getClientOriginalExtension());
        if ($ext !== '' && $ext !== 'bin') {
            return response()->json([
                'success' => false,
                'message' => 'File firmware wajib berformat binary (.bin).',
            ], 422);
        }

        $release = $this->otaService->createRelease(
            $validated,
            $file,
            $admin->name . ' (' . $admin->role . ')'
        );

        return response()->json([
            'success' => true,
            'message' => "Rilis firmware {$release->version} berhasil diunggah dengan SHA-256 & tanda tangan HMAC.",
            'release' => $release,
            'overview' => $this->otaService->getOverview(),
        ], 201);
    }

    /**
     * Super Admin: Jadwalkan rollout ke perangkat terpilih dan siarkan ke /ws/ota.
     */
    public function initiateRollout(Request $request): JsonResponse
    {
        $admin = $this->authorizeAdmin();

        $validated = $request->validate([
            'release_id' => ['required', 'integer', 'exists:firmware_releases,id'],
            'device_ids' => ['nullable', 'array'],
            'device_ids.*' => ['integer', 'exists:devices,id'],
        ]);

        $release = FirmwareRelease::findOrFail($validated['release_id']);
        if (!$release->is_active) {
            return response()->json([
                'success' => false,
                'message' => "Rilis {$release->version} sedang dinonaktifkan.",
            ], 422);
        }

        $rollouts = $this->otaService->initiateRollout(
            $release,
            $validated['device_ids'] ?? [],
            $admin->name . ' (' . $admin->role . ')',
            $request->getSchemeAndHttpHost()
        );

        return response()->json([
            'success' => true,
            'message' => count($rollouts) . " rollout OTA untuk versi {$release->version} berhasil dijadwalkan.",
            'rollouts' => $rollouts,
            'overview' => $this->otaService->getOverview(),
        ], 201);
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
        if (!$user || (!$user->isAdmin() && !$user->hasPermission('view_docs_api'))) {
            abort(403, 'Akses terbatas untuk Super Administrator atau pengguna dengan izin Dokumentasi & API.');
        }
        return $user;
    }
}
