<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DispatchLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'channel',
        'recipient',
        'trigger_type',
        'status',
        'preview',
        'details',
    ];
}
