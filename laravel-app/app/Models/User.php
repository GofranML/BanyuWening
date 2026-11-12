<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'title',
        'pond_name',
        'avatar_initials',
        'phone',
        'two_factor_enabled',
        'two_factor_secret',
        'two_factor_confirmed_at',
        'two_factor_recovery_codes',
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
}
