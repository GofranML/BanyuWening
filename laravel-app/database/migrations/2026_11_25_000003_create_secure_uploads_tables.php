<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('secure_uploads', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tenant_code', 80)->nullable()->index();
            $table->string('profile', 40)->index();
            $table->string('status', 32)->index();
            $table->string('original_name_sanitized', 255);
            $table->string('quarantine_disk', 40)->default('quarantine');
            $table->string('quarantine_path', 255)->nullable();
            $table->string('permanent_disk', 40)->nullable();
            $table->string('permanent_path', 255)->nullable();
            $table->string('public_url', 255)->nullable();
            $table->string('detected_mime', 120)->nullable();
            $table->string('detected_extension', 24)->nullable();
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->string('sha256_hash', 64)->index();
            $table->string('scanner_name', 64)->nullable();
            $table->string('scanner_version', 120)->nullable();
            $table->string('scan_result', 32)->nullable();
            $table->string('scan_signature', 160)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->unsignedInteger('scan_attempts')->default(0);
            $table->unsignedInteger('processing_duration_ms')->nullable();
            $table->timestamp('promoted_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->unsignedBigInteger('replaces_upload_id')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('secure_upload_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('secure_upload_id')->nullable()->constrained('secure_uploads')->nullOnDelete();
            $table->uuid('upload_uuid')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('tenant_code', 80)->nullable()->index();
            $table->string('event', 48)->index();
            $table->string('status_from', 32)->nullable();
            $table->string('status_to', 32)->nullable();
            $table->string('sha256_hash', 64)->nullable();
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->string('detected_mime', 120)->nullable();
            $table->string('scanner_version', 120)->nullable();
            $table->string('scan_result', 32)->nullable();
            $table->text('rejection_reason')->nullable();
            $table->unsignedInteger('processing_duration_ms')->nullable();
            $table->string('promotion_result', 48)->nullable();
            $table->string('ip_address', 64)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });

        Schema::table('firmware_releases', function (Blueprint $table) {
            $table->foreignId('secure_upload_id')->nullable()->after('id')->constrained('secure_uploads')->nullOnDelete();
            $table->string('scan_status', 24)->default('CLEAN')->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('firmware_releases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('secure_upload_id');
            $table->dropColumn('scan_status');
        });

        Schema::dropIfExists('secure_upload_audit_logs');
        Schema::dropIfExists('secure_uploads');
    }
};
