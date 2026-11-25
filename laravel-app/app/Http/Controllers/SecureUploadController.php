<?php

namespace App\Http\Controllers;

use App\Enums\UploadStatus;
use App\Models\SecureUpload;
use App\Services\Upload\Exceptions\FileValidationException;
use App\Services\Upload\SecureFileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SecureUploadController extends Controller
{
    public function __construct(
        private readonly SecureFileUploadService $uploadService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (! $user) {
            abort(401);
        }

        $validated = $request->validate([
            'file' => ['required', 'file'],
            'profile' => ['nullable', 'in:tenant_document,landing_media'],
            'tenant_code' => ['nullable', 'string', 'max:80'],
        ]);

        $profile = $validated['profile'] ?? 'tenant_document';
        if ($profile === 'landing_media' && ! $user->isAdmin()) {
            abort(403, 'Hanya Super Administrator yang dapat mengunggah media landing page.');
        }

        try {
            $upload = $this->uploadService->ingest(
                $request->file('file'),
                $profile,
                $user,
                $validated['tenant_code'] ?? null
            );
        } catch (FileValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->errorCode(),
                'message' => $e->getMessage(),
            ], $e->httpStatus());
        }

        return $this->uploadResponse($upload);
    }

    public function show(SecureUpload $upload): JsonResponse
    {
        $user = Auth::user();
        if (! $upload->isAccessibleBy($user)) {
            abort(403, 'Anda tidak memiliki izin melihat status file milik tenant lain.');
        }

        return response()->json([
            'success' => true,
            'upload' => $this->serialize($upload),
        ]);
    }

    public function download(Request $request, SecureUpload $upload): BinaryFileResponse
    {
        $user = Auth::user();
        if (! $user) {
            abort(401);
        }

        $absPath = $this->uploadService->assertDownloadAllowed($upload, $user, $request->ip());

        return response()->download($absPath, $upload->original_name_sanitized, [
            'Content-Type' => $upload->detected_mime ?: 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function replace(Request $request, SecureUpload $upload): JsonResponse
    {
        $user = Auth::user();
        if (! $user) {
            abort(401);
        }

        if (! $upload->isAccessibleBy($user)) {
            abort(403, 'Anda tidak memiliki izin mengganti file milik tenant lain.');
        }

        $request->validate([
            'file' => ['required', 'file'],
        ]);

        try {
            $replacement = $this->uploadService->ingest(
                $request->file('file'),
                $upload->profile,
                $user,
                $upload->tenant_code,
                ['replaced_uuid' => $upload->uuid],
                $upload
            );
        } catch (FileValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->errorCode(),
                'message' => $e->getMessage(),
            ], $e->httpStatus());
        }

        return $this->uploadResponse($replacement);
    }

    public function destroy(Request $request, SecureUpload $upload): JsonResponse
    {
        $user = Auth::user();
        if (! $user) {
            abort(401);
        }

        $this->uploadService->deleteUpload($upload, $user, $request->ip());

        return response()->json([
            'success' => true,
            'message' => 'File dan catatan upload berhasil dihapus.',
        ]);
    }

    private function uploadResponse(SecureUpload $upload): JsonResponse
    {
        if ($upload->status === UploadStatus::PENDING_SCAN || $upload->status === UploadStatus::SCANNING) {
            return response()->json([
                'success' => true,
                'pending' => true,
                'upload' => $this->serialize($upload),
                'status_url' => route('dashboard.uploads.show', $upload->uuid),
            ], 202);
        }

        if ($upload->status === UploadStatus::CLEAN) {
            return response()->json([
                'success' => true,
                'upload' => $this->serialize($upload),
            ], 201);
        }

        if ($upload->status === UploadStatus::SCAN_FAILED) {
            return response()->json([
                'success' => false,
                'error' => 'SCAN_FAILED',
                'message' => $upload->rejection_reason ?: 'Pemindaian keamanan gagal; file tidak dipublikasikan.',
                'upload' => $this->serialize($upload),
            ], 503);
        }

        return response()->json([
            'success' => false,
            'error' => $upload->status->value,
            'message' => $upload->rejection_reason ?: 'File ditolak oleh pemeriksaan keamanan.',
            'upload' => $this->serialize($upload),
        ], 422);
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(SecureUpload $upload): array
    {
        return [
            'id' => $upload->uuid,
            'profile' => $upload->profile,
            'tenant_code' => $upload->tenant_code,
            'status' => $upload->status->value,
            'original_name' => $upload->original_name_sanitized,
            'detected_mime' => $upload->detected_mime,
            'detected_extension' => $upload->detected_extension,
            'file_size_bytes' => $upload->file_size_bytes,
            'sha256' => $upload->sha256_hash,
            'public_url' => $upload->isApproved() ? $upload->public_url : null,
            'rejection_reason' => $upload->rejection_reason,
            'promoted_at' => $upload->promoted_at?->toIso8601String(),
        ];
    }
}
