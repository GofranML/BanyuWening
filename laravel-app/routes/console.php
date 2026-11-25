<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('ml:self-learn --trigger=SCHEDULER')
    ->hourly()
    ->withoutOverlapping();

Schedule::command('uploads:cleanup-quarantine')
    ->hourly()
    ->withoutOverlapping();
