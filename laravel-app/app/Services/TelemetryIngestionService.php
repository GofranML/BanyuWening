<?php

namespace App\Services;

use App\Jobs\PredictWaterQualityJob;
use App\Models\Device;
use App\Models\RelayLog;
use App\Models\SensorReading;
use Carbon\Carbon;

class TelemetryIngestionService
{
    public function __construct(
        private readonly RealtimeBroadcaster $broadcaster
    ) {
    }

    /**
     * Proses satu paket telemetri dari WebSocket, HTTP Fallback, atau MQTT secara konsisten.
     */
    public function ingest(Device $device, array $data, string $transport = 'HTTP'): array
    {
        $ph = isset($data['ph']) && $data['ph'] !== '' ? (float) $data['ph'] : null;
        $temp = isset($data['temperature_c']) && $data['temperature_c'] !== ''
            ? (float) $data['temperature_c']
            : (isset($data['temperature']) && $data['temperature'] !== '' ? (float) $data['temperature'] : null);
        $tds = isset($data['tds_ppm']) && $data['tds_ppm'] !== ''
            ? (float) $data['tds_ppm']
            : (isset($data['tds']) && $data['tds'] !== '' ? (float) $data['tds'] : null);
        $turb = isset($data['turbidity_ntu']) && $data['turbidity_ntu'] !== ''
            ? (float) $data['turbidity_ntu']
            : (isset($data['turbidity']) && $data['turbidity'] !== '' ? (float) $data['turbidity'] : null);

        $waterLevel = strtoupper((string) ($data['water_level'] ?? 'NORMAL'));
        $batteryV = isset($data['battery_v']) && $data['battery_v'] !== '' ? (float) $data['battery_v'] : null;

        // Aturan Failsafe Deterministik mengacu SNI 8228.4:2015 (pH <6.0/>8.8 atau suhu <22/>33 C)
        $failsafeAerator = false;
        if (($ph !== null && ($ph < 6.0 || $ph > 8.8)) || ($temp !== null && ($temp > 33.0 || $temp < 22.0))) {
            $failsafeAerator = true;
        }

        $recordedAt = isset($data['recorded_at'])
            ? Carbon::parse($data['recorded_at'])
            : Carbon::now();

        $normalizedTransport = strtoupper($transport);
        $aeratorOn = $failsafeAerator || (bool) ($data['aerator_on'] ?? false);
        $mode = $failsafeAerator ? 'FAILSAFE' : strtoupper((string) ($data['mode'] ?? 'AUTO'));

        $reading = SensorReading::create([
            'device_id' => $device->id,
            'recorded_at' => $recordedAt,
            'ph' => $ph,
            'temperature_c' => $temp,
            'tds_ppm' => $tds,
            'turbidity_ntu' => $turb,
            'water_level' => $waterLevel,
            'aerator_on' => $aeratorOn,
            'mode' => $mode,
            'battery_v' => $batteryV,
            'transport' => $normalizedTransport,
        ]);

        $deviceUpdates = [
            'status' => 'ONLINE',
            'transport_protocol' => $normalizedTransport,
            'last_heartbeat_at' => Carbon::now(),
            'aerator_on' => $reading->aerator_on,
            'mode' => $reading->mode,
        ];

        if ($normalizedTransport === 'WEBSOCKET') {
            $deviceUpdates['ws_connected_at'] = Carbon::now();
        }

        $device->update($deviceUpdates);

        if ($failsafeAerator) {
            RelayLog::create([
                'device_id' => $device->id,
                'action' => 'ON',
                'mode' => 'FAILSAFE',
                'reason' => "Failsafe aktif otomatis ({$normalizedTransport}): pH={$ph}, Suhu={$temp}°C",
                'actor' => 'BanyuWening Failsafe Guard',
                'triggered_at' => Carbon::now(),
            ]);
        }

        // Siarkan pembacaan realtime ke kanal WebSocket telemetry
        $this->broadcaster->publish('telemetry', 'telemetry.update', [
            'reading' => [
                'id' => $reading->id,
                'ts' => $reading->recorded_at->toIso8601String(),
                'ph' => $reading->ph,
                'temperature_c' => $reading->temperature_c,
                'tds_ppm' => $reading->tds_ppm,
                'turbidity_ntu' => $reading->turbidity_ntu,
                'water_level' => $reading->water_level,
                'aerator_on' => (bool) $reading->aerator_on,
                'mode' => $reading->mode,
                'battery_v' => $reading->battery_v,
                'transport' => $reading->transport,
            ],
            'device' => [
                'device_code' => $device->device_code,
                'name' => $device->name,
                'pond_name' => $device->pond_name,
                'status' => $device->status,
                'transport_protocol' => $device->transport_protocol,
                'mode' => $device->mode,
                'aerator_on' => (bool) $device->aerator_on,
            ],
            'aerator_command' => $reading->aerator_on ? 'ON' : 'OFF',
            'failsafe_triggered' => $failsafeAerator,
        ], $device->device_code);

        // Jalankan inferensi Machine Learning Random Forest
        PredictWaterQualityJob::dispatch($reading);

        return [
            'reading' => $reading,
            'device' => $device->fresh(),
            'aerator_command' => $reading->aerator_on ? 'ON' : 'OFF',
            'failsafe_triggered' => $failsafeAerator,
            'transport' => $normalizedTransport,
        ];
    }
}
