<?php

namespace App\Providers;

use App\Services\Upload\Contracts\MalwareScannerInterface;
use App\Services\Upload\Scanners\ClamAvScanner;
use App\Services\Upload\Scanners\FakeMalwareScanner;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(MalwareScannerInterface::class, function () {
            $driver = strtolower((string) config('uploads.scanner.driver', 'clamav'));

            return match ($driver) {
                'fake' => new FakeMalwareScanner(),
                default => new ClamAvScanner(),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (str_starts_with((string) config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }

        RateLimiter::for('upload', function (Request $request) {
            $perMinute = max(1, (int) config('uploads.rate_limit_per_minute', 30));
            $key = $request->user()?->id ? 'upload:user:' . $request->user()->id : 'upload:ip:' . $request->ip();

            return Limit::perMinute($perMinute)->by($key);
        });
    }
}
