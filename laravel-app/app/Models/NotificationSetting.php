<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'telegram_config',
        'whatsapp_config',
        'email_config',
        'trigger_rules',
    ];

    protected function casts(): array
    {
        return [
            'telegram_config' => 'array',
            'whatsapp_config' => 'array',
            'email_config' => 'array',
            'trigger_rules' => 'array',
        ];
    }
}
