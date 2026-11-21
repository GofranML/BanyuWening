<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\SwaggerController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| REST API & HTTP Fallback Routes BanyuWening (Stateless, Tanpa CSRF)
|--------------------------------------------------------------------------
|
| - Endpoint dokumentasi OpenAPI 3.0.3 (Swagger): GET /api/docs/openapi.json
| - Endpoint perangkat IoT dilindungi middleware `device.token` (1 token = 1 alat)
| - Endpoint /api/http/* berfungsi sebagai jalur HTTP Fallback otomatis jika
|   koneksi WebSocket multi-protokol gagal tersambung.
*/

Route::get('/health', [ApiController::class, 'health'])->name('api.health');
Route::get('/docs/openapi.json', [SwaggerController::class, 'spec'])->name('api.docs.spec');
Route::get('/docs/asyncapi.json', [SwaggerController::class, 'asyncApiJson'])->name('api.docs.asyncapi.json');
Route::get('/docs/asyncapi.yaml', [SwaggerController::class, 'asyncApiYaml'])->name('api.docs.asyncapi.yaml');

// Monitoring & Dashboard HTTP Fallback Read Endpoints
Route::get('/latest', [ApiController::class, 'getLatest'])->name('api.latest');
Route::get('/history', [ApiController::class, 'getHistory'])->name('api.history');
Route::get('/alerts/recent', [ApiController::class, 'getRecentAlerts'])->name('api.alerts.recent');

// Endpoint Perangkat IoT — Wajib Token Unik Per Alat (Bearer / X-Device-Token)
Route::middleware(['device.token'])->group(function () {
    // Ingesti telemetri HTTP standar
    Route::post('/telemetry', [ApiController::class, 'ingestTelemetry'])->name('api.telemetry');

    // Jalur eksplisit HTTP Fallback ketika WebSocket gagal connect
    Route::prefix('http')->group(function () {
        Route::post('/telemetry', [ApiController::class, 'ingestHttpFallbackTelemetry'])->name('api.http.telemetry');
        Route::post('/telemetry/batch', [ApiController::class, 'ingestBatchTelemetry'])->name('api.http.telemetry.batch');
        Route::post('/heartbeat', [ApiController::class, 'httpHeartbeat'])->name('api.http.heartbeat');
        Route::get('/commands', [ApiController::class, 'getHttpCommands'])->name('api.http.commands');
        Route::post('/commands/ack', [ApiController::class, 'ackHttpCommand'])->name('api.http.commands.ack');
    });
});
