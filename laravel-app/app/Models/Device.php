<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;

class Device extends Model
{
    use HasFactory;

    public const TOKEN_PREFIX = 'bw_dev_';

    protected $fillable = [
        'device_code',
        'name',
        'pond_name',
        'tenant_code',
        'owner_user_id',
        'assigned_user_ids',
        'firmware_version',
        'hardware_profile',
        'ip_address',
        'mac_address',
        'mqtt_topic',
        'api_token_hash',
        'api_token_encrypted',
        'api_token_prefix',
        'token_active',
        'token_rotated_at',
        'token_last_used_at',
        'status',
        'transport_protocol',
        'mode',
        'aerator_on',
        'last_heartbeat_at',
        'ws_connected_at',
        'pending_command',
    ];

    protected $hidden = [
        'api_token_hash',
        'api_token_encrypted',
    ];

    protected function casts(): array
    {
        return [
            'owner_user_id' => 'integer',
            'assigned_user_ids' => 'array',
            'aerator_on' => 'boolean',
            'token_active' => 'boolean',
            'last_heartbeat_at' => 'datetime',
            'token_rotated_at' => 'datetime',
            'token_last_used_at' => 'datetime',
            'ws_connected_at' => 'datetime',
            'pending_command' => 'array',
        ];
    }

    /**
     * Terbitkan atau rotasi token autentikasi unik untuk alat ini.
     * Hash SHA-256 disimpan untuk verifikasi cepat; salinan terenkripsi AES-256 disimpan
     * khusus untuk auto-authorize Swagger UI pada sesi Super Administrator.
     */
    public function issueToken(?string $customPlainToken = null): string
    {
        $plain = $customPlainToken ?: (self::TOKEN_PREFIX . bin2hex(random_bytes(24)));

        $this->forceFill([
            'api_token_hash' => hash('sha256', $plain),
            'api_token_encrypted' => Crypt::encryptString($plain),
            'api_token_prefix' => substr($plain, 0, 15) . '...',
            'token_active' => true,
            'token_rotated_at' => now(),
        ])->save();

        return $plain;
    }

    /**
     * Dekripsi token aktif perangkat (hanya dipanggil untuk sesi Super Administrator terautentikasi).
     */
    public function decryptToken(): ?string
    {
        if (!$this->token_active || !$this->api_token_encrypted) {
            return null;
        }

        try {
            return Crypt::decryptString($this->api_token_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    public function revokeToken(): void
    {
        $this->forceFill(['token_active' => false])->save();
    }

    public function activateToken(): void
    {
        $this->forceFill(['token_active' => true])->save();
    }

    public static function findByPlainToken(string $plainToken): ?self
    {
        $trimmed = trim($plainToken);
        if ($trimmed === '') {
            return null;
        }

        $hash = hash('sha256', $trimmed);
        $device = static::where('api_token_hash', $hash)->first();

        if (!$device || !$device->token_active || !$device->api_token_hash) {
            return null;
        }

        return hash_equals($device->api_token_hash, $hash) ? $device : null;
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /**
     * Cek apakah pengguna berhak mengakses alat IoT ini berdasarkan kepemilikan/penugasan atau tenant.
     */
    public function isAccessibleBy(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if ($this->owner_user_id && (int) $this->owner_user_id === (int) $user->id) {
            return true;
        }

        $assignedIds = array_map('intval', is_array($this->assigned_user_ids) ? $this->assigned_user_ids : []);
        if (in_array((int) $user->id, $assignedIds, true)) {
            return true;
        }

        if (!empty($user->tenant_code) && !empty($this->tenant_code)) {
            return strcasecmp((string) $user->tenant_code, (string) $this->tenant_code) === 0;
        }

        // Fallback kompatibilitas bila seluruh perangkat belum dikonfigurasi tenant/kepemilikan
        if (empty($user->tenant_code)) {
            $hasAnyTenantScoping = static::whereNotNull('owner_user_id')
                ->orWhereNotNull('tenant_code')
                ->orWhereNotNull('assigned_user_ids')
                ->exists();
            if (!$hasAnyTenantScoping) {
                return true;
            }
        }

        return false;
    }

    /**
     * Daftar alat IoT yang boleh dilihat & dikelola oleh pengguna (terisolasi per tenant).
     *
     * @return Collection<int, Device>
     */
    public static function accessibleBy(?User $user): Collection
    {
        if (!$user) {
            return collect();
        }

        $all = static::orderBy('id')->get();
        if ($user->isAdmin()) {
            return $all;
        }

        return $all->filter(fn (self $device) => $device->isAccessibleBy($user))->values();
    }

    /**
     * Tetapkan pemilik & daftar akun peternak yang diberi akses ke alat IoT ini.
     *
     * @param  array<int, int|string>  $assignedUserIds
     */
    public function syncAssignedUsers(?int $ownerUserId, array $assignedUserIds = [], ?string $tenantCode = null): self
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $assignedUserIds))));
        if ($ownerUserId && !in_array($ownerUserId, $ids, true)) {
            array_unshift($ids, $ownerUserId);
        }

        $resolvedTenant = trim((string) ($tenantCode ?? ''));
        if ($resolvedTenant === '' && $ownerUserId) {
            $owner = User::find($ownerUserId);
            if ($owner && !empty($owner->tenant_code)) {
                $resolvedTenant = (string) $owner->tenant_code;
            }
        }

        $this->forceFill([
            'owner_user_id' => $ownerUserId,
            'assigned_user_ids' => $ids,
            'tenant_code' => $resolvedTenant !== '' ? strtoupper($resolvedTenant) : $this->tenant_code,
        ])->save();

        return $this->fresh();
    }

    public function sensorReadings(): HasMany
    {
        return $this->hasMany(SensorReading::class);
    }

    public function relayLogs(): HasMany
    {
        return $this->hasMany(RelayLog::class);
    }

    public function firmwareRollouts(): HasMany
    {
        return $this->hasMany(FirmwareRollout::class);
    }
}
