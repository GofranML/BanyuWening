<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\MlApiController;
use App\Http\Controllers\OtaController;
use App\Http\Controllers\SwaggerController;

/*
|--------------------------------------------------------------------------
| Web Routes BanyuWening (Laravel + Inertia.js + React)
|--------------------------------------------------------------------------
*/

// Public Pages
Route::get('/', [LandingController::class, 'index'])->name('home');
Route::get('/demo', [LandingController::class, 'demo'])->name('demo');

// Authentication Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::post('/login/2fa', [AuthController::class, 'verifyTwoFactor'])->name('login.2fa');
Route::post('/login/2fa/cancel', [AuthController::class, 'cancelTwoFactor'])->name('login.2fa.cancel');
Route::match(['get', 'post'], '/logout', [AuthController::class, 'logout'])->name('logout');

// Authenticated Dashboard Routes
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/dashboard/aerator', [DashboardController::class, 'controlAerator'])->name('dashboard.aerator');
    Route::post('/dashboard/alerts/{alert}/ack', [DashboardController::class, 'acknowledgeAlert'])->name('dashboard.alerts.ack');

    // User Profile & Security (Password & 2FA)
    Route::match(['post', 'put'], '/dashboard/profile', [DashboardController::class, 'updateProfile'])->name('dashboard.profile.update');
    Route::match(['post', 'put'], '/dashboard/profile/password', [DashboardController::class, 'updatePassword'])->name('dashboard.profile.password');
    Route::get('/dashboard/profile/2fa/qr', [DashboardController::class, 'getTwoFactorQr'])->name('dashboard.profile.2fa.qr');
    Route::post('/dashboard/profile/2fa/confirm', [DashboardController::class, 'confirmTwoFactor'])->name('dashboard.profile.2fa.confirm');
    Route::post('/dashboard/profile/2fa/disable', [DashboardController::class, 'disableTwoFactor'])->name('dashboard.profile.2fa.disable');

    // Super Admin Management Routes
    Route::post('/dashboard/users', [DashboardController::class, 'storeUser'])->name('dashboard.users.store');
    Route::match(['post', 'put'], '/dashboard/users/{id}/update', [DashboardController::class, 'updateUser'])->name('dashboard.users.update');
    Route::match(['post', 'put'], '/dashboard/users/{id}/permissions', [DashboardController::class, 'updateUserPermissions'])->name('dashboard.users.permissions');
    Route::match(['post', 'put'], '/dashboard/users/{id}', [DashboardController::class, 'updateUser']);
    Route::delete('/dashboard/users/{id}', [DashboardController::class, 'destroyUser'])->name('dashboard.users.destroy');

    // Super Admin: Manajemen Tenant & Multi-Tenancy
    Route::post('/dashboard/tenants', [DashboardController::class, 'storeTenant'])->name('dashboard.tenants.store');
    Route::match(['post', 'put'], '/dashboard/tenants/{tenant}', [DashboardController::class, 'updateTenant'])->name('dashboard.tenants.update');
    Route::delete('/dashboard/tenants/{tenant}', [DashboardController::class, 'destroyTenant'])->name('dashboard.tenants.destroy');
    Route::post('/dashboard/notifications/config', [DashboardController::class, 'saveNotificationConfig'])->name('dashboard.notifications.config');
    Route::post('/dashboard/notifications/test', [DashboardController::class, 'testNotification'])->name('dashboard.notifications.test');
    Route::post('/dashboard/notifications/logs/clear', [DashboardController::class, 'clearDispatchLogs'])->name('dashboard.notifications.logs.clear');
    Route::post('/dashboard/landing-content', [DashboardController::class, 'saveLandingContent'])->name('dashboard.landing.save');
    Route::post('/dashboard/landing-media/upload', [DashboardController::class, 'uploadLandingMedia'])->name('dashboard.landing.upload');
    Route::post('/dashboard/backups/create', [DashboardController::class, 'createBackup'])->name('dashboard.backups.create');
    Route::get('/dashboard/backups/{filename}/download', [DashboardController::class, 'downloadBackup'])->name('dashboard.backups.download');
    Route::delete('/dashboard/backups/{filename}', [DashboardController::class, 'deleteBackup'])->name('dashboard.backups.delete');

    // Super Admin: Manajemen Alat & Token Per Alat
    Route::post('/dashboard/devices', [DashboardController::class, 'storeDevice'])->name('dashboard.devices.store');
    Route::match(['post', 'put'], '/dashboard/devices/{device}', [DashboardController::class, 'updateDevice'])->name('dashboard.devices.update');
    Route::post('/dashboard/devices/{device}/assignment', [DashboardController::class, 'updateDeviceAssignment'])->name('dashboard.devices.assignment');
    Route::post('/dashboard/devices/{device}/rotate-token', [DashboardController::class, 'rotateDeviceToken'])->name('dashboard.devices.rotate-token');
    Route::post('/dashboard/devices/{device}/toggle-token', [DashboardController::class, 'toggleDeviceToken'])->name('dashboard.devices.toggle-token');
    Route::delete('/dashboard/devices/{device}', [DashboardController::class, 'destroyDevice'])->name('dashboard.devices.destroy');

    // Super Admin: Manajemen Protokol Firmware Dual-OTA ESP32 (Per Alat & Simulasi)
    Route::get('/dashboard/ota/overview', [OtaController::class, 'overview'])->name('dashboard.ota.overview');
    Route::post('/dashboard/ota/releases', [OtaController::class, 'storeRelease'])->name('dashboard.ota.releases.store');
    Route::post('/dashboard/ota/releases/sample', [OtaController::class, 'storeSampleRelease'])->name('dashboard.ota.releases.sample');
    Route::post('/dashboard/ota/releases/{release}/access', [OtaController::class, 'updateReleaseAccess'])->name('dashboard.ota.releases.access');
    Route::post('/dashboard/ota/devices/{device}/profile', [OtaController::class, 'updateDeviceOtaProfile'])->name('dashboard.ota.devices.profile');
    Route::post('/dashboard/ota/rollout', [OtaController::class, 'initiateRollout'])->name('dashboard.ota.rollout');
    Route::post('/dashboard/ota/simulate', [OtaController::class, 'simulate'])->name('dashboard.ota.simulate');
    Route::post('/dashboard/ota/releases/{release}/toggle', [OtaController::class, 'toggleRelease'])->name('dashboard.ota.releases.toggle');
    Route::delete('/dashboard/ota/releases/{release}', [OtaController::class, 'destroyRelease'])->name('dashboard.ota.releases.destroy');

    // Super Admin: Dashboard Performance Random Forest & AI Agent Self-Learning
    Route::get('/dashboard/ml/overview', [MlApiController::class, 'adminOverview'])->name('dashboard.ml.overview');
    Route::post('/dashboard/ml/evaluate', [MlApiController::class, 'triggerEvaluate'])->name('dashboard.ml.evaluate');
    Route::post('/dashboard/ml/agent/run', [MlApiController::class, 'triggerSelfLearn'])->name('dashboard.ml.agent.run');
    Route::post('/dashboard/ml/agent/config', [MlApiController::class, 'updateAgentConfig'])->name('dashboard.ml.agent.config');
    Route::post('/dashboard/ml/models/{mlModelVersion}/promote', [MlApiController::class, 'promoteModel'])->name('dashboard.ml.models.promote');
});

// Standar Dokumentasi API (Swagger UI + AsyncAPI Studio) & Penemuan Protokol Realtime (Session-Aware)
Route::get('/api/docs', [SwaggerController::class, 'ui'])->name('api.docs');
Route::get('/api/docs/asyncapi', [SwaggerController::class, 'asyncApiUi'])->name('api.docs.asyncapi');
Route::get('/api/realtime/config', [ApiController::class, 'realtimeConfig'])->name('api.realtime.config');
