<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ApiController;

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
    Route::match(['post', 'put'], '/dashboard/users/{id}', [DashboardController::class, 'updateUser']);
    Route::delete('/dashboard/users/{id}', [DashboardController::class, 'destroyUser'])->name('dashboard.users.destroy');
    Route::post('/dashboard/notifications/config', [DashboardController::class, 'saveNotificationConfig'])->name('dashboard.notifications.config');
    Route::post('/dashboard/notifications/test', [DashboardController::class, 'testNotification'])->name('dashboard.notifications.test');
    Route::post('/dashboard/notifications/logs/clear', [DashboardController::class, 'clearDispatchLogs'])->name('dashboard.notifications.logs.clear');
    Route::post('/dashboard/landing-content', [DashboardController::class, 'saveLandingContent'])->name('dashboard.landing.save');
    Route::post('/dashboard/landing-media/upload', [DashboardController::class, 'uploadLandingMedia'])->name('dashboard.landing.upload');
    Route::post('/dashboard/backups/create', [DashboardController::class, 'createBackup'])->name('dashboard.backups.create');
    Route::get('/dashboard/backups/{filename}/download', [DashboardController::class, 'downloadBackup'])->name('dashboard.backups.download');
    Route::delete('/dashboard/backups/{filename}', [DashboardController::class, 'deleteBackup'])->name('dashboard.backups.delete');
});

// REST API Endpoints
Route::prefix('api')->group(function () {
    Route::post('/telemetry', [ApiController::class, 'ingestTelemetry'])->name('api.telemetry');
    Route::get('/latest', [ApiController::class, 'getLatest'])->name('api.latest');
    Route::get('/history', [ApiController::class, 'getHistory'])->name('api.history');
});
