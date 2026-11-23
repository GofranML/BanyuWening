<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    public const PERMISSION_KEYS = [
        'view_summary',
        'view_charts',
        'view_alerts',
        'ack_alerts',
        'control_aerator',
        'view_predictions',
        'export_csv',
        'view_tutorial',
        'view_analis_data',
        'view_owner_report',
        'update_device_firmware',
        'manage_users',
        'manage_landing',
        'manage_notifications',
        'manage_backups',
        'view_docs_api',
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'title',
        'pond_name',
        'tenant_code',
        'avatar_initials',
        'phone',
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_confirmed_at',
        'two_factor_recovery_codes',
        'custom_permissions',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_enabled' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_recovery_codes' => 'array',
            'custom_permissions' => 'array',
        ];
    }

    public function hasTwoFactor(): bool
    {
        return (bool) $this->two_factor_enabled && $this->two_factor_confirmed_at !== null;
    }

    public function verifyRecoveryCode(string $code): bool
    {
        $code = strtoupper(trim($code));
        $codes = $this->two_factor_recovery_codes ?: [];

        if (in_array($code, $codes, true)) {
            // Hapus kode yang sudah terpakai
            $this->two_factor_recovery_codes = array_values(array_diff($codes, [$code]));
            $this->save();
            return true;
        }

        return false;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN';
    }

    public function isOperator(): bool
    {
        return $this->role === 'OPERATOR';
    }

    public function isAnalis(): bool
    {
        return $this->role === 'ANALIS';
    }

    public function isPemilik(): bool
    {
        return $this->role === 'PEMILIK';
    }

    /**
     * Matriks hak akses bawaan untuk tiap role standar sistem.
     *
     * @return array<string, bool>
     */
    public static function defaultPermissionsForRole(?string $role): array
    {
        $normalized = strtoupper((string) ($role ?? 'OPERATOR'));

        return match ($normalized) {
            'ADMIN' => [
                'view_summary' => true,
                'view_charts' => true,
                'view_alerts' => true,
                'ack_alerts' => true,
                'control_aerator' => true,
                'view_predictions' => true,
                'export_csv' => true,
                'view_tutorial' => false,
                'view_analis_data' => false,
                'view_owner_report' => false,
                'update_device_firmware' => true,
                'manage_users' => true,
                'manage_landing' => true,
                'manage_notifications' => true,
                'manage_backups' => true,
                'view_docs_api' => true,
            ],
            'OPERATOR' => [
                'view_summary' => true,
                'view_charts' => true,
                'view_alerts' => true,
                'ack_alerts' => true,
                'control_aerator' => true,
                'view_predictions' => false,
                'export_csv' => false,
                'view_tutorial' => true,
                'view_analis_data' => false,
                'view_owner_report' => false,
                'update_device_firmware' => false,
                'manage_users' => false,
                'manage_landing' => false,
                'manage_notifications' => false,
                'manage_backups' => false,
                'view_docs_api' => false,
            ],
            'ANALIS' => [
                'view_summary' => true,
                'view_charts' => true,
                'view_alerts' => true,
                'ack_alerts' => true,
                'control_aerator' => false,
                'view_predictions' => true,
                'export_csv' => true,
                'view_tutorial' => false,
                'view_analis_data' => true,
                'view_owner_report' => false,
                'update_device_firmware' => false,
                'manage_users' => false,
                'manage_landing' => false,
                'manage_notifications' => false,
                'manage_backups' => false,
                'view_docs_api' => false,
            ],
            'PEMILIK' => [
                'view_summary' => true,
                'view_charts' => false,
                'view_alerts' => true,
                'ack_alerts' => false,
                'control_aerator' => false,
                'view_predictions' => false,
                'export_csv' => false,
                'view_tutorial' => false,
                'view_analis_data' => false,
                'view_owner_report' => true,
                'update_device_firmware' => false,
                'manage_users' => false,
                'manage_landing' => false,
                'manage_notifications' => false,
                'manage_backups' => false,
                'view_docs_api' => false,
            ],
            default => self::defaultPermissionsForRole('OPERATOR'),
        };
    }

    /**
     * Normalisasi kode tenant agar seragam (contoh: TENANT-KOLAM-01).
     */
    public static function normalizeTenantCode(?string $code, ?string $fallbackName = null): string
    {
        $raw = trim((string) $code);
        if ($raw !== '') {
            $slug = strtoupper(Str::slug($raw, '-'));
            return $slug !== '' ? $slug : 'TENANT-UTAMA';
        }

        $fallbackSlug = strtoupper(Str::slug((string) ($fallbackName ?: 'KOLAM'), '-'));
        return 'TENANT-' . ($fallbackSlug !== '' ? $fallbackSlug : 'UTAMA');
    }

    /**
     * Normalisasi custom permission agar hanya menyimpan kunci valid yang berbeda dari default role.
     *
     * @param  array<string, mixed>|null  $input
     * @return array<string, bool>|null
     */
    public static function sanitizeCustomPermissions(?array $input, ?string $role): ?array
    {
        if (empty($input) || !is_array($input)) {
            return null;
        }

        $defaults = self::defaultPermissionsForRole($role);
        $overrides = [];

        foreach (self::PERMISSION_KEYS as $key) {
            if (!array_key_exists($key, $input)) {
                continue;
            }
            $boolVal = filter_var($input[$key], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $boolVal = $boolVal ?? (bool) $input[$key];
            if (($defaults[$key] ?? false) !== $boolVal) {
                $overrides[$key] = $boolVal;
            }
        }

        return empty($overrides) ? null : $overrides;
    }

    /**
     * Hak akses final user hasil penggabungan default role + custom override.
     *
     * @return array<string, bool>
     */
    public function resolvedPermissions(): array
    {
        $resolved = self::defaultPermissionsForRole($this->role ?? 'OPERATOR');

        if (is_array($this->custom_permissions)) {
            foreach (self::PERMISSION_KEYS as $key) {
                if (array_key_exists($key, $this->custom_permissions)) {
                    $resolved[$key] = (bool) $this->custom_permissions[$key];
                }
            }
        }

        // Proteksi Zero-Lockout untuk akun Super Administrator utama
        if ($this->email === 'admin@banyuwening.id') {
            $resolved['view_summary'] = true;
            $resolved['manage_users'] = true;
            $resolved['manage_backups'] = true;
            $resolved['view_docs_api'] = true;
        }

        return $resolved;
    }

    public function hasPermission(string $permission): bool
    {
        $perms = $this->resolvedPermissions();

        return (bool) ($perms[$permission] ?? false);
    }

    public function hasCustomPermissions(): bool
    {
        return is_array($this->custom_permissions) && count($this->custom_permissions) > 0;
    }

    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_code', 'code');
    }
}
