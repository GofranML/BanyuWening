<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        $hasExt = DB::selectOne("SELECT 1 AS ok FROM pg_extension WHERE extname = 'timescaledb'");
        if (!$hasExt) {
            try {
                DB::statement('CREATE EXTENSION IF NOT EXISTS timescaledb');
            } catch (\Throwable) {
                return;
            }
        }

        // 1. Lepas FK masuk ke sensor_readings (TimescaleDB tidak mendukung incoming FK ke hypertable)
        // Relasi Eloquent (Prediction/Alert -> SensorReading) tetap berjalan penuh via kolom terindeks.
        DB::statement('ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_sensor_reading_id_foreign');
        DB::statement('ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_sensor_reading_id_foreign');
        DB::statement('CREATE INDEX IF NOT EXISTS alerts_sensor_reading_id_idx ON alerts (sensor_reading_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS predictions_sensor_reading_id_idx ON predictions (sensor_reading_id)');

        // 2. Pastikan PK sensor_readings menyertakan kolom partisi waktu (recorded_at)
        $isHypertable = DB::selectOne(
            "SELECT 1 AS ok FROM timescaledb_information.hypertables WHERE hypertable_name = 'sensor_readings'"
        );

        if (!$isHypertable) {
            DB::statement('ALTER TABLE sensor_readings DROP CONSTRAINT IF EXISTS sensor_readings_pkey');
            DB::statement('ALTER TABLE sensor_readings ADD PRIMARY KEY (id, recorded_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS sensor_readings_id_idx ON sensor_readings (id)');

            // 3. Konversi sensor_readings menjadi TimescaleDB Hypertable (chunk 7 hari) & migrasikan data eksisting
            DB::statement(
                "SELECT create_hypertable('sensor_readings', 'recorded_at', chunk_time_interval => INTERVAL '7 days', migrate_data => true, if_not_exists => true)"
            );
        }
    }

    public function down(): void
    {
        // Hypertable conversion tidak di-rollback secara destruktif untuk mencegah kehilangan data telemetri.
    }
};
