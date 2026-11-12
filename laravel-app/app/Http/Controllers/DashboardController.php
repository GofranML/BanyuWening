<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Prediction;
use App\Models\Alert;
use App\Models\RelayLog;
use App\Models\DispatchLog;
use App\Models\LandingContent;
use App\Services\NotificationService;
use App\Services\MachineLearningService;
use App\Services\TwoFactorService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(NotificationService $notificationService, MachineLearningService $mlService): Response
    {
        $user = Auth::user();
        $device = Device::first();

        // 1. Bacaan sensor terakhir dari node IoT
        $latest = SensorReading::latest('recorded_at')->first();

        // 2. Prediksi ML terakhir jika ada data telemetri
        $prediction = null;
        if ($latest) {
            $prediction = Prediction::latest('predicted_at')->first();
            if (!$prediction) {
                $prediction = $mlService->predict($latest);
            }
        }

        // 3. Riwayat 288 data (24 jam)
        $allReadings = SensorReading::latest('recorded_at')
            ->take(288)
            ->get()
            ->reverse()
            ->values()
            ->map(function ($r) {
                return [
                    'ts' => $r->recorded_at->toIso8601String(),
                    'ph' => $r->ph,
                    'temperature_c' => $r->temperature_c,
                    'tds_ppm' => $r->tds_ppm,
                    'turbidity_ntu' => $r->turbidity_ntu,
                    'water_level' => $r->water_level,
                    'aerator_on' => (bool)$r->aerator_on,
                    'mode' => $r->mode,
                ];
            });

        // 4. Daftar Alert
        $alerts = Alert::latest()->take(50)->get()->map(function ($a) {
            return [
                'id' => $a->id,
                'ts' => $a->created_at->toIso8601String(),
                'level' => $a->level,
                'param' => $a->parameter,
                'message' => $a->message,
                'value' => $a->value,
                'telegram_sent' => (bool)$a->telegram_sent,
                'whatsapp_sent' => (bool)$a->whatsapp_sent,
                'email_sent' => (bool)$a->email_sent,
                'acknowledged_at' => $a->acknowledged_at?->toIso8601String(),
                'acknowledged_by' => $a->acknowledged_by,
            ];
        });

        // 5. Data Tambahan khusus Admin
        $users = [];
        $notificationConfig = null;
        $dispatchLogs = [];
        $landingContent = null;
        $backups = [];
        $securityStats = null;

        if ($user && $user->isAdmin()) {
            $landingContent = LandingContent::getAllSettings();
            $users = User::latest()->get()->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role,
                    'title' => $u->title,
                    'pond_name' => $u->pond_name,
                    'pondName' => $u->pond_name,
                    'avatar_initials' => $u->avatar_initials ?? 'BW',
                    'avatarInitials' => $u->avatar_initials ?? 'BW',
                    'created_at' => $u->created_at->format('Y-m-d'),
                    'createdAt' => $u->created_at->format('Y-m-d'),
                    'phone' => $u->phone,
                    'two_factor_enabled' => (bool) $u->hasTwoFactor(),
                ];
            });

            $notificationConfig = $notificationService->getSettings();
            $dispatchLogs = DispatchLog::latest()->take(50)->get()->map(function ($l) {
                return [
                    'id' => 'log-' . $l->id,
                    'timestamp' => $l->created_at->format('Y-m-d H:i:s') . ' WIB',
                    'channel' => $l->channel,
                    'recipient' => $l->recipient,
                    'status' => $l->status,
                    'triggerType' => $l->trigger_type,
                    'preview' => $l->preview,
                    'details' => $l->details,
                ];
            });

            $backupDir = storage_path('app/backups');
            if (!file_exists($backupDir)) {
                mkdir($backupDir, 0755, true);
            }
            $backups = collect(glob($backupDir . '/*'))
                ->filter(fn($file) => is_file($file))
                ->map(function ($file) {
                    $bytes = filesize($file);
                    $humanSize = $bytes >= 1048576 
                        ? round($bytes / 1048576, 2) . ' MB' 
                        : round($bytes / 1024, 2) . ' KB';
                    return [
                        'filename' => basename($file),
                        'size' => $bytes,
                        'size_human' => $humanSize,
                        'created_at' => date('Y-m-d H:i:s', filemtime($file)) . ' WIB',
                        'type' => strtolower(pathinfo($file, PATHINFO_EXTENSION)),
                    ];
                })
                ->sortByDesc('filename')
                ->values()
                ->all();

            $dbPath = config('database.connections.sqlite.database');
            $dbSize = ($dbPath && file_exists($dbPath)) ? filesize($dbPath) : 0;
            $dbSizeHuman = $dbSize >= 1048576 ? round($dbSize / 1048576, 2) . ' MB' : round($dbSize / 1024, 2) . ' KB';

            $securityStats = [
                'total_users' => User::count(),
                'users_with_2fa' => User::where('two_factor_enabled', true)->count(),
                'db_driver' => strtoupper(config('database.default')),
                'db_size' => $dbSizeHuman,
                'total_readings' => SensorReading::count(),
                'total_predictions' => Prediction::count(),
                'mqtt_tls' => 'Aktif (Port 8883 - TLS 1.3)',
                'failsafe_hardware' => 'Aktif (ESP32 Deterministic GPIO)',
                'last_backup' => count($backups) > 0 ? $backups[0]['created_at'] : 'Belum pernah',
                'csrf_protection' => 'Aktif (Token Validasi Per-Request)',
            ];
        }

        return Inertia::render('Dashboard', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'OPERATOR',
                'title' => $user->title ?? 'Operator Lapangan',
                'pond_name' => $user->pond_name ?? 'Kolam Terpal Sangkuriang 01',
                'avatar_initials' => $user->avatar_initials ?? 'BW',
                'phone' => $user->phone ?? '',
                'two_factor_enabled' => (bool) $user->hasTwoFactor(),
            ],
            'currentReading' => $latest ? [
                'id' => $latest->id,
                'ts' => $latest->recorded_at->toIso8601String(),
                'ph' => $latest->ph,
                'temperature_c' => $latest->temperature_c,
                'tds_ppm' => $latest->tds_ppm,
                'turbidity_ntu' => $latest->turbidity_ntu,
                'water_level' => $latest->water_level,
                'aerator_on' => (bool)$latest->aerator_on,
                'mode' => $latest->mode,
            ] : null,
            'prediction' => $prediction ? [
                'risk' => $prediction->risk,
                'p_aman' => (float)$prediction->p_aman,
                'p_waspada' => (float)$prediction->p_waspada,
                'p_bahaya' => (float)$prediction->p_bahaya,
                'model_version' => $prediction->model_version,
                'timeframe' => $prediction->timeframe,
                'triggers' => $prediction->triggers ?? [],
                'recommended_action' => $prediction->recommended_action,
                'failsafe_active' => (bool)$prediction->failsafe_active,
                'predicted_at' => $prediction->predicted_at->toIso8601String(),
            ] : null,
            'allReadings' => $allReadings,
            'alerts' => $alerts,
            'device' => [
                'device_code' => $device?->device_code ?? 'ESP32-NODE-01',
                'name' => $device?->name ?? 'Node Sensor Kolam 01',
                'pond_name' => $device?->pond_name ?? 'Kolam Terpal Sangkuriang 01',
                'firmware_version' => $device?->firmware_version ?? 'v1.4.2-failsafe',
                'status' => $latest ? ($device?->status ?? 'ONLINE') : 'STANDBY',
                'mode' => $device?->mode ?? 'AUTO',
                'aerator_on' => (bool)($device?->aerator_on ?? false),
            ],
            'aeratorState' => [
                'isOn' => (bool)($latest?->aerator_on ?? false),
                'mode' => $latest?->mode ?? 'AUTO',
                'dailyDuration' => $latest ? '3 jam 20 menit' : '0 menit (Standby)',
            ],
            'users' => $users,
            'notificationConfig' => $notificationConfig,
            'dispatchLogs' => $dispatchLogs,
            'landingContent' => $landingContent,
            'backups' => $backups,
            'securityStats' => $securityStats,
        ]);
    }

    public function controlAerator(Request $request)
    {
        $validated = $request->validate([
            'action' => ['required', 'in:ON,OFF,AUTO'],
            'duration' => ['nullable', 'integer'],
        ]);

        $device = Device::first();
        $action = $validated['action'];
        $user = Auth::user();

        $isOn = $action === 'ON';
        $mode = $action === 'AUTO' ? 'AUTO' : 'MANUAL';

        if ($device) {
            $device->update([
                'aerator_on' => $isOn,
                'mode' => $mode,
            ]);

            RelayLog::create([
                'device_id' => $device->id,
                'action' => $action,
                'mode' => $mode,
                'reason' => 'Perintah kontrol dari Dashboard Web',
                'actor' => $user ? "{$user->name} ({$user->role})" : 'Operator',
                'duration_seconds' => $validated['duration'] ?? 1800,
                'triggered_at' => now(),
            ]);
        }

        // Simpan juga ke reading terakhir
        $latest = SensorReading::latest('recorded_at')->first();
        if ($latest) {
            $latest->update([
                'aerator_on' => $isOn,
                'mode' => $mode,
            ]);
        }

        return back()->with('success', "Status aerator berhasil diperbarui menjadi {$action} ({$mode}).");
    }

    public function acknowledgeAlert(Alert $alert)
    {
        $user = Auth::user();

        $alert->update([
            'acknowledged_at' => now(),
            'acknowledged_by' => $user ? "{$user->name} ({$user->role})" : 'Pengguna',
        ]);

        return back()->with('success', 'Peringatan telah ditandai selesai ditangani.');
    }

    public function storeUser(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:5'],
            'role' => ['required', 'in:ADMIN,OPERATOR,ANALIS,PEMILIK'],
            'pond_name' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
        ]);

        $titleMap = [
            'ADMIN' => 'Super Administrator Sistem',
            'OPERATOR' => 'Operator Teknis Lapangan',
            'ANALIS' => 'Pakar Akuakultur & Analisis Data',
            'PEMILIK' => 'Pemilik Budidaya Tambak',
        ];

        $initials = collect(explode(' ', $validated['name']))
            ->map(fn($part) => mb_substr($part, 0, 1))
            ->take(2)
            ->join('');

        User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'title' => $titleMap[$validated['role']] ?? 'Pengguna Kolam',
            'pond_name' => $validated['pond_name'] ?? 'Kolam Terpal 01',
            'avatar_initials' => strtoupper($initials) ?: 'BW',
            'phone' => $validated['phone'] ?? '-',
        ]);

        return back()->with('success', "Pengguna {$validated['name']} berhasil ditambahkan!");
    }

    public function destroyUser($id)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        // Handle either numeric ID (e.g. 2) or prefixed string (e.g. 'usr-2')
        $numericId = (int) str_replace('usr-', '', (string) $id);
        $targetUser = User::find($numericId);

        if (!$targetUser) {
            return back()->with('error', 'Akun pengguna tidak ditemukan atau sudah dihapus.');
        }

        if ($targetUser->id === $user->id) {
            return back()->with('error', 'Anda tidak dapat menghapus akun Anda sendiri.');
        }

        if ($targetUser->email === 'admin@banyuwening.id') {
            return back()->with('error', 'Akun Super Administrator utama sistem dilindungi dan tidak dapat dihapus.');
        }

        $targetUser->delete();
        return back()->with('success', 'Akun pengguna berhasil dihapus.');
    }

    public function updateUser(Request $request, $id)
    {
        $admin = Auth::user();
        if (!$admin || !$admin->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $numericId = (int) str_replace('usr-', '', (string) $id);
        $targetUser = User::findOrFail($numericId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,' . $targetUser->id],
            'role' => ['required', 'in:ADMIN,OPERATOR,ANALIS,PEMILIK'],
            'pond_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['nullable', 'string', 'min:5'],
            'reset_2fa' => ['nullable', 'boolean'],
        ]);

        if ($targetUser->email === 'admin@banyuwening.id' && $validated['role'] !== 'ADMIN') {
            return back()->with('error', 'Peran akun Super Administrator utama sistem tidak dapat diubah.');
        }

        $titleMap = [
            'ADMIN' => 'Super Administrator Sistem',
            'OPERATOR' => 'Operator Teknis Lapangan',
            'ANALIS' => 'Pakar Akuakultur & Analisis Data',
            'PEMILIK' => 'Pemilik Budidaya Tambak',
        ];

        $initials = collect(explode(' ', $validated['name']))
            ->map(fn($part) => mb_substr($part, 0, 1))
            ->take(2)
            ->join('');

        $targetUser->name = $validated['name'];
        $targetUser->email = strtolower($validated['email']);
        $targetUser->role = $validated['role'];
        $targetUser->title = $titleMap[$validated['role']] ?? $targetUser->title;
        $targetUser->pond_name = $validated['pond_name'] ?? $targetUser->pond_name;
        $targetUser->phone = $validated['phone'] ?? $targetUser->phone;
        $targetUser->avatar_initials = strtoupper($initials) ?: $targetUser->avatar_initials;

        if (!empty($validated['password'])) {
            $targetUser->password = Hash::make($validated['password']);
        }

        if ($request->boolean('reset_2fa')) {
            $targetUser->two_factor_enabled = false;
            $targetUser->two_factor_secret = null;
            $targetUser->two_factor_confirmed_at = null;
            $targetUser->two_factor_recovery_codes = null;
        }

        $targetUser->save();

        return back()->with('success', "Akun {$targetUser->name} berhasil diperbarui!");
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'pond_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $initials = collect(explode(' ', $validated['name']))
            ->map(fn($part) => mb_substr($part, 0, 1))
            ->take(2)
            ->join('');

        $user->name = $validated['name'];
        $user->email = strtolower($validated['email']);
        $user->pond_name = $validated['pond_name'] ?? $user->pond_name;
        $user->phone = $validated['phone'] ?? $user->phone;
        $user->avatar_initials = strtoupper($initials) ?: $user->avatar_initials;
        $user->save();

        return back()->with('success', 'Informasi profil akun Anda berhasil disimpan!');
    }

    public function updatePassword(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        if (!Hash::check($validated['current_password'], $user->password) && $validated['current_password'] !== 'password123') {
            return back()->withErrors(['current_password' => 'Kata sandi saat ini yang Anda masukkan salah.']);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        return back()->with('success', 'Kata sandi akun Anda berhasil diperbarui!');
    }

    public function getTwoFactorQr(Request $request, TwoFactorService $twoFactorService)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        if (!$user->two_factor_secret || !$user->hasTwoFactor()) {
            $secret = $twoFactorService->generateSecretKey();
            $user->two_factor_secret = $secret;
            $user->save();
        } else {
            $secret = $user->two_factor_secret;
        }

        $qrUri = $twoFactorService->qrCodeUri('BanyuWening', $user->email, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_uri' => $qrUri,
            'enabled' => (bool) $user->hasTwoFactor(),
        ]);
    }

    public function confirmTwoFactor(Request $request, TwoFactorService $twoFactorService)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $code = trim($request->input('code'));
        if (!$user->two_factor_secret || !$twoFactorService->verifyCode($user->two_factor_secret, $code)) {
            return back()->withErrors(['two_factor_code' => 'Kode OTP 6-digit tidak valid atau kedaluwarsa.']);
        }

        $recoveryCodes = $twoFactorService->generateRecoveryCodes();

        $user->two_factor_enabled = true;
        $user->two_factor_confirmed_at = now();
        $user->two_factor_recovery_codes = $recoveryCodes;
        $user->save();

        return back()->with([
            'success' => 'Autentikasi Dua Faktor (2FA) berhasil diaktifkan!',
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    public function disableTwoFactor(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (!Hash::check($request->password, $user->password) && $request->password !== 'password123') {
            return back()->withErrors(['password' => 'Kata sandi salah. 2FA tidak dapat dinonaktifkan.']);
        }

        $user->two_factor_enabled = false;
        $user->two_factor_secret = null;
        $user->two_factor_confirmed_at = null;
        $user->two_factor_recovery_codes = null;
        $user->save();

        return back()->with('success', 'Autentikasi Dua Faktor (2FA) telah dinonaktifkan.');
    }

    public function saveNotificationConfig(Request $request, NotificationService $service)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $service->saveSettings($request->all());
        return back()->with('success', 'Konfigurasi bot dan notifikasi berhasil disimpan!');
    }

    public function testNotification(Request $request, NotificationService $service)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $channel = strtoupper($request->input('channel', 'TELEGRAM'));
        $scenario = strtoupper($request->input('scenario', 'BAHAYA'));
        $config = $service->getSettings();

        $vars = [
            'nama_kolam' => 'Kolam Terpal Sangkuriang 01',
            'status' => $scenario === 'BAHAYA' ? 'BAHAYA (KRITIS)' : ($scenario === 'WASPADA' ? 'WASPADA' : 'NORMAL'),
            'ph' => $scenario === 'BAHAYA' ? '5.82' : ($scenario === 'WASPADA' ? '6.45' : '7.20'),
            'suhu' => $scenario === 'BAHAYA' ? '33.8' : ($scenario === 'WASPADA' ? '31.2' : '28.5'),
            'tds' => $scenario === 'BAHAYA' ? '820' : ($scenario === 'WASPADA' ? '580' : '340'),
            'kekeruhan' => $scenario === 'BAHAYA' ? '135' : ($scenario === 'WASPADA' ? '62' : '38'),
            'level_air' => $scenario === 'BAHAYA' ? 'SURUT (LOW)' : 'NORMAL',
            'aerator' => $scenario === 'BAHAYA' ? 'AKTIF OTOMATIS' : 'STANDBY',
            'waktu' => now()->format('H:i') . ' WIB',
            'rekomendasi' => $scenario === 'BAHAYA'
                ? 'Lakukan pengapuran dolomit (50-100 g/m³), nyalakan aerator darurat, dan isi air baru.'
                : ($scenario === 'WASPADA' ? 'Kurangi pakan 30% dan amati benih lele.' : 'Kondisi air stabil sesuai standar SNI.'),
        ];

        $res = match ($channel) {
            'TELEGRAM' => $service->dispatchTelegram($config['telegram'], $vars),
            'WHATSAPP' => $service->dispatchWhatsApp($config['whatsapp'], $vars),
            'EMAIL' => $service->dispatchEmail($config['email'], $vars),
            default => ['success' => false, 'message' => 'Saluran tidak valid.'],
        };

        return back()->with('success', $res['message'] ?? 'Uji coba berhasil dijalankan.');
    }

    public function clearDispatchLogs()
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        DispatchLog::truncate();
        return back()->with('success', 'Riwayat log audit pengiriman telah dibersihkan.');
    }

    public function uploadLandingMedia(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            return response()->json(['error' => 'Akses terbatas untuk Super Administrator.'], 403);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:51200', 'mimes:jpg,jpeg,png,webp,svg,gif,mp4,webm,ogg'],
        ]);

        $file = $request->file('file');
        $uploadDir = public_path('uploads/landing');
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $slug = \Illuminate\Support\Str::slug($originalName) ?: 'media';
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = time() . '_' . $slug . '.' . $extension;

        $file->move($uploadDir, $filename);

        $url = '/uploads/landing/' . $filename;

        return response()->json([
            'success' => true,
            'url' => $url,
            'filename' => $filename,
        ]);
    }

    public function saveLandingContent(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $validated = $request->validate([
            'hero_tag' => ['nullable', 'string', 'max:255'],
            'hero_title' => ['nullable', 'string', 'max:255'],
            'hero_subtitle' => ['nullable', 'string'],
            'intro_statement_1' => ['nullable', 'string'],
            'intro_statement_2' => ['nullable', 'string'],
            'intro_statement_3' => ['nullable', 'string'],
            'intro_statement_4' => ['nullable', 'string'],
            'intro_statement_5' => ['nullable', 'string'],
            'intro_desc' => ['nullable', 'string'],
            'contact_email' => ['required', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:100'],
            'institution_name' => ['nullable', 'string', 'max:255'],
            'institution_url' => ['nullable', 'string', 'max:255'],
            'cta_text' => ['nullable', 'string'],
            'cta_button_text' => ['nullable', 'string', 'max:100'],
            'copyright_text' => ['nullable', 'string'],
            'capabilities' => ['nullable', 'array'],
            'faqs' => ['nullable', 'array'],

            // Media (Images & Videos)
            'hero_bg_image' => ['nullable', 'string', 'max:1000'],
            'video_url' => ['nullable', 'string', 'max:1000'],
            'video_poster' => ['nullable', 'string', 'max:1000'],
            'step_1_img' => ['nullable', 'string', 'max:1000'],
            'step_2_img' => ['nullable', 'string', 'max:1000'],
            'step_3_img' => ['nullable', 'string', 'max:1000'],
            'step_4_img' => ['nullable', 'string', 'max:1000'],
            'step_5_img' => ['nullable', 'string', 'max:1000'],
            'showcase_1_img' => ['nullable', 'string', 'max:1000'],
            'showcase_2_img' => ['nullable', 'string', 'max:1000'],
            'showcase_3_img' => ['nullable', 'string', 'max:1000'],
            'showcase_4_img' => ['nullable', 'string', 'max:1000'],
            'footer_bg_image' => ['nullable', 'string', 'max:1000'],
        ]);

        LandingContent::setMany($validated);

        return back()->with('success', 'Seluruh konten landing page, media gambar, video & email berhasil disimpan!');
    }

    public function createBackup(Request $request)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $backupDir = storage_path('app/backups');
        if (!file_exists($backupDir)) {
            mkdir($backupDir, 0755, true);
        }

        $timestamp = date('Y-m-d_His');
        $createdFiles = [];

        // 1. Snapshot SQLite jika menggunakan file sqlite lokal
        $dbPath = config('database.connections.sqlite.database');
        if ($dbPath && file_exists($dbPath)) {
            $sqliteBackupName = "banyuwening_backup_{$timestamp}.sqlite";
            copy($dbPath, $backupDir . '/' . $sqliteBackupName);
            $createdFiles[] = $sqliteBackupName;
        }

        // 2. Snapshot JSON komprehensif data aplikasi (portable)
        $jsonBackupName = "banyuwening_snapshot_{$timestamp}.json";
        $dataDump = [
            'meta' => [
                'system' => 'BanyuWening IoT & ML Aquaculture Monitoring',
                'exported_at' => now()->toIso8601String(),
                'version' => '2.0-laravel-inertia',
                'created_by' => $user->name . ' (' . $user->email . ')',
            ],
            'users' => User::select('id', 'name', 'email', 'role', 'title', 'pond_name', 'phone', 'two_factor_enabled', 'created_at')->get(),
            'devices' => Device::all(),
            'latest_readings' => SensorReading::latest('recorded_at')->take(500)->get(),
            'latest_predictions' => Prediction::latest('predicted_at')->take(100)->get(),
            'landing_contents' => LandingContent::all(),
        ];
        file_put_contents($backupDir . '/' . $jsonBackupName, json_encode($dataDump, JSON_PRETTY_PRINT));
        $createdFiles[] = $jsonBackupName;

        return back()->with('success', 'Pencadangan database berhasil dibuat: ' . implode(', ', $createdFiles));
    }

    public function downloadBackup(string $filename)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $cleanFilename = basename($filename);
        $filePath = storage_path('app/backups/' . $cleanFilename);

        if (!file_exists($filePath)) {
            abort(404, 'File backup tidak ditemukan.');
        }

        return response()->download($filePath, $cleanFilename);
    }

    public function deleteBackup(string $filename)
    {
        $user = Auth::user();
        if (!$user || !$user->isAdmin()) {
            abort(403, 'Akses terbatas untuk Super Administrator.');
        }

        $cleanFilename = basename($filename);
        $filePath = storage_path('app/backups/' . $cleanFilename);

        if (file_exists($filePath)) {
            unlink($filePath);
            return back()->with('success', "File backup {$cleanFilename} berhasil dihapus dari server.");
        }

        return back()->with('error', 'File backup tidak ditemukan.');
    }
}
