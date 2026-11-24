<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ml_agent_configs', function (Blueprint $table) {
            $table->string('agent_model_id', 80)->default('rf-autonomous-local')->after('llm_advisor_enabled');
            $table->string('agent_api_url', 255)->nullable()->after('agent_model_id');
            $table->text('agent_api_key')->nullable()->after('agent_api_url');
        });

        Schema::table('ml_agent_runs', function (Blueprint $table) {
            $table->string('agent_model_id', 80)->nullable()->after('trigger_source');
            $table->unsignedInteger('field_validation_count')->default(0)->after('new_live_samples');
            $table->unsignedInteger('harvest_eval_count')->default(0)->after('field_validation_count');
        });

        Schema::create('ml_field_validations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->foreignId('prediction_id')->nullable()->constrained('predictions')->nullOnDelete();
            $table->string('tenant_code', 64)->nullable()->index();
            $table->string('device_code', 64)->nullable()->index();
            $table->string('pond_name', 120)->nullable();
            $table->decimal('ph', 5, 2);
            $table->decimal('temperature_c', 5, 2);
            $table->decimal('tds_ppm', 8, 2)->nullable();
            $table->decimal('turbidity_ntu', 8, 2)->nullable();
            $table->string('water_level', 20)->default('NORMAL');
            $table->string('predicted_risk', 16);
            $table->string('actual_risk', 16);
            $table->boolean('is_match')->default(true);
            $table->string('model_version', 64)->nullable();
            $table->text('field_notes')->nullable();
            $table->string('validated_by', 120)->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();

            $table->index(['validated_at', 'is_match']);
        });

        Schema::create('pond_harvest_cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->string('tenant_code', 64)->nullable()->index();
            $table->string('device_code', 64)->nullable()->index();
            $table->string('pond_name', 120)->nullable();
            $table->string('cycle_name', 120);
            $table->date('stocking_date');
            $table->date('harvest_date')->nullable();
            $table->unsignedInteger('seed_count');
            $table->string('seed_size_cm', 32)->nullable();
            $table->decimal('harvest_weight_kg', 10, 2)->nullable();
            $table->decimal('fish_per_kg', 6, 2)->nullable();
            $table->decimal('avg_fish_weight_g', 8, 2)->nullable();
            $table->unsignedInteger('estimated_harvest_count')->nullable();
            $table->unsignedInteger('estimated_mortality_count')->nullable();
            $table->decimal('survival_rate_pct', 5, 2)->nullable();
            $table->decimal('mortality_rate_pct', 5, 2)->nullable();
            $table->string('mortality_status', 24)->default('BERJALAN');
            $table->unsignedInteger('ai_danger_events')->default(0);
            $table->unsignedInteger('ai_warning_events')->default(0);
            $table->decimal('avg_ph_cycle', 5, 2)->nullable();
            $table->decimal('avg_temp_cycle', 5, 2)->nullable();
            $table->text('ai_evaluation_note')->nullable();
            $table->text('notes')->nullable();
            $table->string('recorded_by', 120)->nullable();
            $table->timestamps();

            $table->index(['tenant_code', 'stocking_date']);
            $table->index(['mortality_status', 'harvest_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pond_harvest_cycles');
        Schema::dropIfExists('ml_field_validations');

        Schema::table('ml_agent_runs', function (Blueprint $table) {
            $table->dropColumn(['agent_model_id', 'field_validation_count', 'harvest_eval_count']);
        });

        Schema::table('ml_agent_configs', function (Blueprint $table) {
            $table->dropColumn(['agent_model_id', 'agent_api_url', 'agent_api_key']);
        });
    }
};
