<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'pond_name',
        'pic_name',
        'phone',
        'address',
        'owner_user_id',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'owner_user_id' => 'integer',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function (self $tenant) {
            if (!empty($tenant->code)) {
                $tenant->code = User::normalizeTenantCode($tenant->code, $tenant->name ?: $tenant->pond_name);
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_code', 'code');
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class, 'tenant_code', 'code');
    }
}
