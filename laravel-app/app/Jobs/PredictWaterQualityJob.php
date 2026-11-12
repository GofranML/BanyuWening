<?php

namespace App\Jobs;

use App\Models\SensorReading;
use App\Services\MachineLearningService;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PredictWaterQualityJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public function __construct(public SensorReading $reading)
    {
    }

    public function handle(MachineLearningService $mlService, NotificationService $notificationService): void
    {
        $prediction = $mlService->predict($this->reading);

        // Jika prediksi menunjukkan WASPADA atau BAHAYA, kirim notifikasi otomatis
        if (in_array($prediction->risk, ['WASPADA', 'BAHAYA'])) {
            $notificationService->checkAndDispatchAlerts($this->reading, $prediction);
        }
    }
}
