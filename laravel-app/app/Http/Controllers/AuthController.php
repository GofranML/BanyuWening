<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function showLogin(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        $twoFactorUserId = $request->session()->get('login.2fa.user_id');
        $twoFactorUser = $twoFactorUserId ? User::find($twoFactorUserId) : null;

        return Inertia::render('Login', [
            'twoFactorRequired' => $twoFactorUser !== null,
            'twoFactorEmail' => $twoFactorUser?->email,
            'twoFactorName' => $twoFactorUser?->name,
        ]);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $remember = $request->boolean('remember', true);
        $email = strtolower(trim($credentials['email']));
        $rateKey = 'login:' . $email . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            $seconds = max(1, RateLimiter::availableIn($rateKey));
            $msg = "Terlalu banyak percobaan login. Coba lagi dalam {$seconds} detik.";

            if ($request->expectsJson()) {
                return response()->json(['message' => $msg], 429);
            }

            return back()->withErrors(['email' => $msg])->setStatusCode(429);
        }

        $user = User::where('email', $email)->first();

        if ($user && Hash::check($credentials['password'], $user->password)) {
            RateLimiter::clear($rateKey);

            // Jika akun ini telah mengaktifkan 2FA, arahkan ke tantangan 2FA
            if ($user->hasTwoFactor()) {
                $request->session()->regenerate();
                $request->session()->put('login.2fa.user_id', $user->id);
                $request->session()->put('login.2fa.remember', $remember);
                return back()->with('info', 'Silakan masukkan kode OTP 2FA untuk menyelesaikan login.');
            }

            Auth::login($user, $remember);
            $request->session()->regenerate();
            return redirect()->intended(route('dashboard'));
        }

        RateLimiter::hit($rateKey, 60);

        return back()->withErrors([
            'email' => 'Email atau kata sandi yang Anda masukkan tidak sesuai.',
        ]);
    }

    public function verifyTwoFactor(Request $request, TwoFactorService $twoFactorService)
    {
        $userId = $request->session()->get('login.2fa.user_id');
        if (!$userId) {
            return redirect()->route('login')->withErrors(['email' => 'Sesi verifikasi 2FA telah berakhir. Silakan masuk kembali.']);
        }

        $rateKey = '2fa:' . $userId . '|' . $request->ip();
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            $request->session()->forget(['login.2fa.user_id', 'login.2fa.remember']);
            return redirect()->route('login')->withErrors([
                'email' => 'Terlalu banyak percobaan OTP gagal. Silakan login ulang.',
            ]);
        }

        $user = User::find($userId);
        if (!$user) {
            return redirect()->route('login');
        }

        $code = trim((string) $request->input('code', ''));
        $isRecovery = $request->boolean('is_recovery', false);

        $isValid = false;
        if ($isRecovery) {
            $isValid = $user->verifyRecoveryCode($code);
        } else {
            $isValid = $twoFactorService->verifyCode((string) $user->two_factor_secret, $code);
        }

        if (!$isValid) {
            RateLimiter::hit($rateKey, 60);
            if (RateLimiter::tooManyAttempts($rateKey, 5)) {
                $request->session()->forget(['login.2fa.user_id', 'login.2fa.remember']);
                return redirect()->route('login')->withErrors([
                    'email' => 'Terlalu banyak percobaan OTP gagal. Silakan login ulang.',
                ]);
            }

            return back()->withErrors([
                'two_factor_code' => $isRecovery
                    ? 'Kode pemulihan cadangan salah atau sudah pernah digunakan.'
                    : 'Kode 2FA 6-digit tidak valid atau kedaluwarsa. Periksa aplikasi authenticator Anda.',
            ]);
        }

        RateLimiter::clear($rateKey);
        $remember = $request->session()->get('login.2fa.remember', true);
        $request->session()->forget(['login.2fa.user_id', 'login.2fa.remember']);

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard'))->with('success', "Autentikasi dua faktor berhasil. Selamat datang kembali, {$user->name}!");
    }

    public function cancelTwoFactor(Request $request)
    {
        $request->session()->forget(['login.2fa.user_id', 'login.2fa.remember']);
        return redirect()->route('login');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
