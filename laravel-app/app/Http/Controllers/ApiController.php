<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Prediction;
use App\Models\RelayLog;
use App\Jobs\PredictWaterQualityJob;
use Carbon\Carbon;

class ApiController extends Controller
{
    /**
     * Endpoint Ingestion HTTP fallback untuk node ESP32 (POST /api/telemetry)
     */
    public function ingestTelemetry(Request $request)
    {
        if (!$request->has('device_code') && $request->has('device_id')) {
            $request->merge(['device_code' => $request->input('device_id')]);
        }

        $validated = $request->validate([
            'device_code' => ['required', 'string'],
            'ph' => ['nullable', 'numeric'],
            'temperature_c' => ['nullable', 'numeric'],
            'tds_ppm' => ['nullable', 'numeric'],
            'turbidity_ntu' => ['nullable', 'numeric'],
            'water_level' => ['nullable', 'string'],
            'aerator_on' => ['nullable', 'boolean'],
            'mode' => ['nullable', 'string'],
        ]);

        $device = Device::firstOrCreate(
            ['device_code' => $validated['device_code']],
            [
                'name' => 'ESP32 Node Sensor Kolam',
                'pond_name' => 'Kolam Terpal Sangkuriang 01',
                'status' => 'ONLINE',
                'last_heartbeat_at' => Carbon::now(),
            ]
        );

        $ph = $validated['ph'] ?? null;
        $temp = $validated['temperature_c'] ?? null;
        $waterLevel = strtoupper($validated['water_level'] ?? 'NORMAL');

        $failsafeAerator = false;
        if (($ph !== null && ($ph < 6.0 || $ph > 8.8)) || ($temp !== null && $temp > 33.0)) {
            $failsafeAerator = true;
        }

        $reading = SensorReading::create([
            'device_id' => $device->id,
            'recorded_at' => Carbon::now(),
            'ph' => $ph,
            'temperature_c' => $temp,
            'tds_ppm' => $validated['tds_ppm'] ?? null,
            'turbidity_ntu' => $validated['turbidity_ntu'] ?? null,
            'water_level' => $waterLevel,
            'aerator_on' => $failsafeAerator || ($validated['aerator_on'] ?? false),
            'mode' => $failsafeAerator ? 'FAILSAFE' : ($validated['mode'] ?? 'AUTO'),
        ]);

        $device->update([
            'status' => 'ONLINE',
            'last_heartbeat_at' => Carbon::now(),
            'aerator_on' => $reading->aerator_on,
            'mode' => $reading->mode,
        ]);

        // Dispatch ML prediction
        PredictWaterQualityJob::dispatch($reading);

        return response()->json([
            'success' => true,
            'message' => 'Telemetri tersimpan.',
            'reading_id' => $reading->id,
            'aerator_command' => $reading->aerator_on ? 'ON' : 'OFF',
            'failsafe_triggered' => $failsafeAerator,
        ], 201);
    }

    /**
     * Endpoint status terkini (GET /api/latest)
     */
    public function getLatest()
    {
        $latest = SensorReading::latest('recorded_at')->first();
        $prediction = Prediction::latest('predicted_at')->first();
        $device = Device::first();

        return response()->json([
            'success' => true,
            'reading' => $latest,
            'prediction' => $prediction,
            'device' => $device,
        ]);
    }

    /**
     * Endpoint riwayat data sensor (GET /api/history)
     */
    public function getHistory(Request $request)
    {
        $limit = min((int)$request->input('limit', 72), 288);
        $readings = SensorReading::latest('recorded_at')->take($limit)->get()->reverse()->values();

        return response()->json([
            'success' => true,
            'count' => $readings->count(),
            'data' => $readings,
        ]);
    }
}
