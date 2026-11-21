<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class Device extends Model
{
    use HasFactory;

    public const TOKEN_PREFIX = 'bw_dev_';

    protected $fillable = [
        'device_code',
        'name',
        'pond_name',
        'firmware_version',
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
