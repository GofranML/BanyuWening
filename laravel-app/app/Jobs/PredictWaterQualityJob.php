<?php

namespace App\Jobs;

use App\Models\Alert;
use App\Models\SensorReading;
use App\Services\MachineLearningService;
use App\Services\NotificationService;
use App\Services\RealtimeBroadcaster;
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

    public function handle(
        MachineLearningService $mlService,
        NotificationService $notificationService,
        RealtimeBroadcaster $broadcaster
    ): void {
        $prediction = $mlService->predict($this->reading);

        // Jika prediksi menunjukkan WASPADA atau BAHAYA, kirim notifikasi otomatis
        if (in_array($prediction->risk, ['WASPADA', 'BAHAYA'])) {
            $notificationService->checkAndDispatchAlerts($this->reading, $prediction);
        }

        $latestAlert = Alert::where('sensor_reading_id', $this->reading->id)->latest()->first();

        // Siarkan pembaruan prediksi ML & alert ke kanal WebSocket banyuwening.alerts.v1
        $broadcaster->publish('alerts', 'prediction.update', [
            'prediction' => [
                'risk' => $prediction->risk,
                'p_aman' => (float) $prediction->p_aman,
                'p_waspada' => (float) $prediction->p_waspada,
                'p_bahaya' => (float) $prediction->p_bahaya,
                'model_version' => $prediction->model_version,
                'timeframe' => $prediction->timeframe,
                'triggers' => $prediction->triggers ?? [],
                'recommended_action' => $prediction->recommended_action,
                'failsafe_active' => (bool) $prediction->failsafe_active,
                'predicted_at' => $prediction->predicted_at?->toIso8601String() ?? now()->toIso8601String(),
            ],
            'alert' => $latestAlert ? [
                'id' => $latestAlert->id,
                'ts' => $latestAlert->created_at->toIso8601String(),
                'level' => $latestAlert->level,
                'param' => $latestAlert->parameter,
                'message' => $latestAlert->message,
                'value' => $latestAlert->value,
                'telegram_sent' => (bool) $latestAlert->telegram_sent,
                'whatsapp_sent' => (bool) $latestAlert->whatsapp_sent,
                'email_sent' => (bool) $latestAlert->email_sent,
                'acknowledged_at' => null,
                'acknowledged_by' => null,
            ] : null,
        ], $this->reading->device?->device_code);
    }
}
