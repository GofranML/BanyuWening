<?php

namespace App\Http\Middleware;

use App\Models\Device;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateDeviceToken
{
    /**
     * Validasi token unik per alat melalui header Authorization: Bearer <token>,
     * header X-Device-Token: <token>, atau query ?token=<token>.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $plainToken = $this->extractToken($request);

        if (!$plainToken) {
            return response()->json([
                'success' => false,
                'error' => 'UNAUTHORIZED_DEVICE_TOKEN',
                'message' => 'Token perangkat wajib disertakan melalui header Authorization: Bearer <token> atau X-Device-Token.',
            ], 401);
        }

        $device = Device::findByPlainToken($plainToken);

        if (!$device) {
            return response()->json([
                'success' => false,
                'error' => 'INVALID_OR_REVOKED_TOKEN',
                'message' => 'Token perangkat tidak valid atau telah dinonaktifkan oleh Super Administrator.',
            ], 401);
        }

        // Pastikan 1 token hanya boleh dipakai oleh alat yang terikat (mencegah spoofing antar-alat)
        $requestedDeviceCode = $request->input('device_code')
            ?? $request->input('device_id')
            ?? $request->query('device_code')
            ?? $request->query('device_id');

        if ($requestedDeviceCode && strcasecmp((string) $requestedDeviceCode, $device->device_code) !== 0) {
            return response()->json([
                'success' => false,
                'error' => 'DEVICE_TOKEN_MISMATCH',
                'message' => "Token ini terikat pada perangkat '{$device->device_code}', bukan '{$requestedDeviceCode}'.",
            ], 403);
        }

        // Catat waktu penggunaan terakhir token (maksimal 1x per menit untuk efisiensi write)
        if (!$device->token_last_used_at || $device->token_last_used_at->lt(now()->subMinute())) {
            $device->forceFill(['token_last_used_at' => now()])->saveQuietly();
        }

        $request->attributes->set('device', $device);

        return $next($request);
    }

    private function extractToken(Request $request): ?string
    {
        if ($bearer = $request->bearerToken()) {
            return trim($bearer);
        }

        if ($headerToken = $request->header('X-Device-Token')) {
            return trim($headerToken);
        }

        if ($queryToken = $request->query('token')) {
            return trim((string) $queryToken);
        }

        return null;
    }
}
