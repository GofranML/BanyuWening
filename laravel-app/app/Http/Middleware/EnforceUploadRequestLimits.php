<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceUploadRequestLimits
{
    public function handle(Request $request, Closure $next): Response
    {
        $maxBytes = (int) config('uploads.max_request_bytes', 57671680);
        $contentLength = $request->header('Content-Length') ?? $request->server('CONTENT_LENGTH');

        if ($contentLength !== null && is_numeric($contentLength) && (int) $contentLength > $maxBytes) {
            $maxMb = round($maxBytes / 1048576, 1);

            return response()->json([
                'success' => false,
                'error' => 'PAYLOAD_TOO_LARGE',
                'message' => "Ukuran total permintaan unggah melebihi batas server ({$maxMb} MB).",
            ], 413);
        }

        return $next($request);
    }
}
