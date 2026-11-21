<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'custom_permissions')) {
            Schema::table('users', function (Blueprint $table) {
                $table->json('custom_permissions')->nullable()->after('two_factor_recovery_codes');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'custom_permissions')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('custom_permissions');
            });
        }
    }
};
