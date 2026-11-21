<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\MlApiController;
use App\Http\Controllers\OtaController;
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

// Random Forest ML Public Status, History & Performance Endpoints
Route::prefix('ml')->group(function () {
    Route::get('/status', [MlApiController::class, 'status'])->name('api.ml.status');
    Route::get('/predictions', [MlApiController::class, 'predictions'])->name('api.ml.predictions');
    Route::get('/predictions/latest', [MlApiController::class, 'latestPrediction'])->name('api.ml.predictions.latest');
    Route::get('/performance', [MlApiController::class, 'performance'])->name('api.ml.performance');
});

// Endpoint Perangkat IoT — Wajib Token Unik Per Alat (Bearer / X-Device-Token)
Route::middleware(['device.token'])->group(function () {
    // Ingesti telemetri HTTP standar
    Route::post('/telemetry', [ApiController::class, 'ingestTelemetry'])->name('api.telemetry');

    // Inferensi On-Demand & Batch Random Forest
    Route::post('/ml/predict', [MlApiController::class, 'predict'])->name('api.ml.predict');
    Route::post('/ml/predict/batch', [MlApiController::class, 'predictBatch'])->name('api.ml.predict.batch');

    // Jalur eksplisit HTTP Fallback ketika WebSocket gagal connect
    Route::prefix('http')->group(function () {
        Route::post('/telemetry', [ApiController::class, 'ingestHttpFallbackTelemetry'])->name('api.http.telemetry');
        Route::post('/telemetry/batch', [ApiController::class, 'ingestBatchTelemetry'])->name('api.http.telemetry.batch');
        Route::post('/heartbeat', [ApiController::class, 'httpHeartbeat'])->name('api.http.heartbeat');
        Route::get('/commands', [ApiController::class, 'getHttpCommands'])->name('api.http.commands');
        Route::post('/commands/ack', [ApiController::class, 'ackHttpCommand'])->name('api.http.commands.ack');

        // Jalur HTTP Fallback Protokol Dual-OTA Firmware ESP32 (banyuwening.ota.v1)
        Route::prefix('ota')->group(function () {
            Route::get('/check', [OtaController::class, 'check'])->name('api.http.ota.check');
            Route::get('/download/{version}', [OtaController::class, 'download'])->name('api.http.ota.download');
            Route::post('/status', [OtaController::class, 'reportStatus'])->name('api.http.ota.status');
        });
    });
});
