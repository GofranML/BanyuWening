<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('predictions', function (Blueprint $table) {
            $table->unsignedInteger('latency_ms')->nullable()->after('failsafe_active');
            $table->boolean('is_fallback')->default(false)->after('latency_ms');
            $table->string('source', 24)->default('TELEMETRY')->after('is_fallback');
        });

        Schema::create('firmware_releases', function (Blueprint $table) {
            $table->id();
            $table->string('version', 64)->unique();
            $table->string('channel', 20)->default('stable');
            $table->string('target_hardware', 80)->default('ESP32-WROOM-CoreHub-v2');
            $table->string('file_path', 255);
            $table->string('file_name', 160);
            $table->unsignedBigInteger('file_size_bytes');
            $table->string('sha256_checksum', 64);
            $table->string('hmac_signature', 64);
            $table->string('min_previous_version', 64)->nullable();
            $table->unsignedInteger('rollback_timeout_s')->default(60);
            $table->text('changelog')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_mandatory')->default(false);
            $table->string('uploaded_by', 120)->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
        });

        Schema::create('firmware_rollouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('firmware_release_id')->constrained('firmware_releases')->cascadeOnDelete();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->string('status', 32)->default('QUEUED');
            $table->unsignedTinyInteger('progress_pct')->default(0);
            $table->string('from_version', 64)->nullable();
            $table->string('to_version', 64);
            $table->string('active_partition', 24)->nullable();
            $table->string('transport', 24)->default('HTTP_FALLBACK');
            $table->boolean('boot_health_ok')->nullable();
            $table->text('error_message')->nullable();
            $table->string('initiated_by', 120)->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('rolled_back_at')->nullable();
            $table->timestamps();

            $table->index(['device_id', 'status']);
        });

        Schema::create('ml_model_versions', function (Blueprint $table) {
            $table->id();
            $table->string('version', 64)->unique();
            $table->string('algorithm', 64)->default('RandomForestClassifier');
            $table->string('artifact_path', 255);
            $table->string('model_card_path', 255)->nullable();
            $table->string('status', 24)->default('CANDIDATE_READY');
            $table->boolean('is_active')->default(false);
            $table->decimal('accuracy', 6, 4)->default(0);
            $table->decimal('macro_f1', 6, 4)->default(0);
            $table->decimal('weighted_f1', 6, 4)->nullable();
            $table->decimal('bahaya_recall', 6, 4)->nullable();
            $table->decimal('drift_score', 6, 4)->nullable();
            $table->decimal('avg_latency_ms', 8, 2)->nullable();
            $table->unsignedInteger('train_samples')->default(0);
            $table->unsignedInteger('test_samples')->default(0);
            $table->unsignedInteger('live_samples_included')->default(0);
            $table->json('hyperparameters')->nullable();
            $table->json('confusion_matrix')->nullable();
            $table->json('feature_importances')->nullable();
            $table->json('per_class_metrics')->nullable();
            $table->string('trained_by', 80)->default('AI_AGENT');
            $table->text('notes')->nullable();
            $table->timestamp('trained_at')->nullable();
            $table->timestamp('promoted_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ml_agent_runs', function (Blueprint $table) {
            $table->id();
            $table->string('run_type', 32);
            $table->string('trigger_source', 40)->default('MANUAL');
            $table->string('status', 32)->default('RUNNING');
            $table->string('decision', 40)->nullable();
            $table->string('active_model_version', 64)->nullable();
            $table->string('candidate_model_version', 64)->nullable();
            $table->decimal('accuracy_before', 6, 4)->nullable();
            $table->decimal('macro_f1_before', 6, 4)->nullable();
            $table->decimal('accuracy_after', 6, 4)->nullable();
            $table->decimal('macro_f1_after', 6, 4)->nullable();
            $table->decimal('drift_score', 6, 4)->nullable();
            $table->decimal('live_agreement_rate', 6, 4)->nullable();
            $table->unsignedInteger('new_live_samples')->default(0);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->json('reasoning_steps')->nullable();
            $table->text('summary')->nullable();
            $table->json('metrics_snapshot')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ml_agent_configs', function (Blueprint $table) {
            $table->id();
            $table->string('key', 40)->unique()->default('default');
            $table->boolean('auto_learning_enabled')->default(true);
            $table->string('promotion_mode', 24)->default('AUTO_PROMOTE');
            $table->decimal('min_f1_threshold', 5, 4)->default(0.9000);
            $table->decimal('max_drift_threshold', 5, 4)->default(0.2500);
            $table->unsignedInteger('min_new_samples')->default(10);
            $table->unsignedInteger('schedule_interval_hours')->default(6);
            $table->boolean('llm_advisor_enabled')->default(false);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ml_agent_configs');
        Schema::dropIfExists('ml_agent_runs');
        Schema::dropIfExists('ml_model_versions');
        Schema::dropIfExists('firmware_rollouts');
        Schema::dropIfExists('firmware_releases');

        Schema::table('predictions', function (Blueprint $table) {
            $table->dropColumn(['latency_ms', 'is_fallback', 'source']);
        });
    }
};
