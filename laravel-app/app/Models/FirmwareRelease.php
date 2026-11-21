<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FirmwareRelease extends Model
{
    use HasFactory;

    protected $fillable = [
        'version',
        'channel',
        'target_hardware',
        'allowed_device_ids',
        'file_path',
        'file_name',
        'file_size_bytes',
        'sha256_checksum',
        'hmac_signature',
        'min_previous_version',
        'rollback_timeout_s',
        'changelog',
        'is_active',
        'is_mandatory',
        'uploaded_by',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'allowed_device_ids' => 'array',
            'file_size_bytes' => 'integer',
            'rollback_timeout_s' => 'integer',
            'is_active' => 'boolean',
            'is_mandatory' => 'boolean',
            'released_at' => 'datetime',
        ];
    }

    public function isDeviceAllowed(int $deviceId): bool
    {
        if (!is_array($this->allowed_device_ids) || empty($this->allowed_device_ids)) {
            return false;
        }

        return in_array($deviceId, array_map('intval', $this->allowed_device_ids), true);
    }

    /**
     * Hitung tanda tangan manifest HMAC-SHA256 agar firmware hanya diterima jika berasal dari server BanyuWening.
     */
    public static function computeSignature(string $version, string $sha256, int $size, ?string $minPrev): string
    {
        $canonical = implode('|', [
            trim($version),
            strtolower(trim($sha256)),
            $size,
            $minPrev ? trim($minPrev) : '*',
        ]);

        return hash_hmac('sha256', $canonical, (string) config('app.key', 'banyuwening-ota-signing-key'));
    }

    public function rollouts(): HasMany
    {
        return $this->hasMany(FirmwareRollout::class);
    }
}
