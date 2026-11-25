<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ml_model_versions', function (Blueprint $table) {
            $table->string('model_format', 24)->default('.joblib')->after('algorithm');
        });

        Schema::table('ml_agent_runs', function (Blueprint $table) {
            $table->string('model_format', 24)->nullable()->after('agent_model_id');
            $table->json('ai_commentary')->nullable()->after('summary');
        });

        Schema::table('firmware_releases', function (Blueprint $table) {
            $table->string('source_type', 16)->default('bin')->after('channel');
            $table->string('source_file_path', 255)->nullable()->after('file_path');
            $table->string('compile_status', 24)->default('PRECOMPILED')->after('scan_status');
            $table->json('compile_log')->nullable()->after('compile_status');
        });

        Schema::table('pond_harvest_cycles', function (Blueprint $table) {
            $table->unsignedInteger('harvest_fish_count')->nullable()->after('fish_per_kg');
            $table->string('harvest_size_cm', 32)->nullable()->after('harvest_fish_count');
            $table->json('ai_diagnosis')->nullable()->after('ai_evaluation_note');
        });
    }

    public function down(): void
    {
        Schema::table('pond_harvest_cycles', function (Blueprint $table) {
            $table->dropColumn(['harvest_fish_count', 'harvest_size_cm', 'ai_diagnosis']);
        });

        Schema::table('firmware_releases', function (Blueprint $table) {
            $table->dropColumn(['source_type', 'source_file_path', 'compile_status', 'compile_log']);
        });

        Schema::table('ml_agent_runs', function (Blueprint $table) {
            $table->dropColumn(['model_format', 'ai_commentary']);
        });

        Schema::table('ml_model_versions', function (Blueprint $table) {
            $table->dropColumn(['model_format']);
        });
    }
};
