<?php

namespace Tests\Feature;

use App\Models\Device;
use App\Models\MlAgentConfig;
use App\Models\MlFieldValidation;
use App\Models\PondHarvestCycle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MlAgentAndHarvestEvaluationFeatureTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Super Admin Test',
            'email' => 'admin-ml@banyuwening.test',
            'password' => bcrypt('password123'),
            'role' => 'ADMIN',
            'pond_name' => 'Kolam Utama',
            'tenant_code' => 'TENANT-UTAMA',
        ]);
    }

    public function test_admin_can_select_ai_agent_model_and_save_field_validation(): void
    {
        $admin = $this->createAdmin();
        $device = Device::create([
            'device_code' => 'BW-NODE-01',
            'name' => 'Sensor Kolam A',
            'pond_name' => 'Kolam Terpal A',
            'tenant_code' => 'TENANT-UTAMA',
            'status' => 'ONLINE',
        ]);

        // 1. Update konfigurasi agent dengan model AI pilihan
        $cfgRes = $this->actingAs($admin)->postJson('/dashboard/ml/agent/config', [
            'auto_learning_enabled' => true,
            'promotion_mode' => 'AUTO_PROMOTE',
            'min_f1_threshold' => 0.90,
            'max_drift_threshold' => 0.25,
            'min_new_samples' => 10,
            'schedule_interval_hours' => 6,
            'llm_advisor_enabled' => true,
            'agent_model_id' => 'gemini-2.5-pro',
        ]);

        $cfgRes->assertOk()
            ->assertJsonPath('overview.agent_config.agent_model_id', 'gemini-2.5-pro');

        $this->assertSame('gemini-2.5-pro', MlAgentConfig::current()->agent_model_id);

        // 2. Simpan 2 validasi lapangan (1 sesuai, 1 koreksi meleset)
        $fv1 = $this->actingAs($admin)->postJson('/dashboard/ml/field-validations', [
            'device_id' => $device->id,
            'ph' => 7.2,
            'temperature_c' => 28.0,
            'tds_ppm' => 340,
            'turbidity_ntu' => 30,
            'water_level' => 'NORMAL',
            'predicted_risk' => 'AMAN',
            'actual_risk' => 'AMAN',
            'field_notes' => 'Ikan aktif makan',
        ]);
        $fv1->assertOk()->assertJsonPath('validation.is_match', true);

        $fv2 = $this->actingAs($admin)->postJson('/dashboard/ml/field-validations', [
            'device_id' => $device->id,
            'ph' => 6.4,
            'temperature_c' => 30.8,
            'tds_ppm' => 520,
            'turbidity_ntu' => 78,
            'water_level' => 'NORMAL',
            'predicted_risk' => 'AMAN',
            'actual_risk' => 'BAHAYA',
            'field_notes' => 'Ikan menggantung di permukaan',
        ]);
        $fv2->assertOk()
            ->assertJsonPath('validation.is_match', false)
            ->assertJsonPath('overview.field_validation_stats.total', 2)
            ->assertJsonPath('overview.field_validation_stats.matched', 1)
            ->assertJsonPath('overview.field_validation_stats.mismatched', 1)
            ->assertJsonPath('overview.field_validation_stats.match_rate_pct', 50);

        $this->assertSame(2, MlFieldValidation::count());
    }

    public function test_harvest_cycle_calculates_survival_rate_mortality_and_ai_verdict(): void
    {
        $admin = $this->createAdmin();
        $device = Device::create([
            'device_code' => 'BW-NODE-02',
            'name' => 'Sensor Kolam B',
            'pond_name' => 'Kolam Terpal B',
            'tenant_code' => 'TENANT-UTAMA',
            'status' => 'ONLINE',
        ]);

        // 5000 bibit masuk, panen 500 kg dengan ukuran isi 8 ekor/kg -> estimasi 4000 ekor panen, 1000 ekor mati (SR 80%, Mortalitas 20% -> PERLU_EVALUASI)
        $res = $this->actingAs($admin)->postJson('/dashboard/harvest-cycles', [
            'device_id' => $device->id,
            'cycle_name' => 'Siklus 01 - Lele Sangkuriang',
            'stocking_date' => '2026-09-01',
            'harvest_date' => '2026-11-20',
            'seed_count' => 5000,
            'seed_size_cm' => '5-7 cm',
            'harvest_weight_kg' => 500,
            'fish_per_kg' => 8,
            'notes' => 'Panen perdana isi 8/kg',
        ]);

        $res->assertCreated()
            ->assertJsonPath('cycle.avg_fish_weight_g', 125)
            ->assertJsonPath('cycle.estimated_harvest_count', 4000)
            ->assertJsonPath('cycle.estimated_mortality_count', 1000)
            ->assertJsonPath('cycle.survival_rate_pct', 80)
            ->assertJsonPath('cycle.mortality_rate_pct', 20)
            ->assertJsonPath('cycle.mortality_status', 'PERLU_EVALUASI');

        $cycleId = $res->json('cycle.id');

        // Update dengan mortalitas tinggi: 5000 bibit, panen 300 kg isi 8/kg -> 2400 ekor panen, 2600 mati (Mortalitas 52% -> TINGGI)
        $upd = $this->actingAs($admin)->putJson("/dashboard/harvest-cycles/{$cycleId}", [
            'device_id' => $device->id,
            'cycle_name' => 'Siklus 01 - Lele Sangkuriang',
            'stocking_date' => '2026-09-01',
            'harvest_date' => '2026-11-20',
            'seed_count' => 5000,
            'harvest_weight_kg' => 300,
            'fish_per_kg' => 8,
        ]);

        $upd->assertOk()
            ->assertJsonPath('cycle.estimated_harvest_count', 2400)
            ->assertJsonPath('cycle.estimated_mortality_count', 2600)
            ->assertJsonPath('cycle.mortality_rate_pct', 52)
            ->assertJsonPath('cycle.mortality_status', 'TINGGI');

        $this->assertSame(1, PondHarvestCycle::count());

        // Delete
        $del = $this->actingAs($admin)->deleteJson("/dashboard/harvest-cycles/{$cycleId}");
        $del->assertOk();
        $this->assertSame(0, PondHarvestCycle::count());
    }

    public function test_admin_can_configure_and_test_deepseek_v4_pro_connection(): void
    {
        $admin = $this->createAdmin();

        Http::fake([
            'https://api.deepseek.com/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Terhubung sebagai AI Agent MLOps BanyuWening dengan DeepSeek V4 Pro.',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $res = $this->actingAs($admin)->postJson('/dashboard/ml/agent/test', [
            'agent_model_id' => 'deepseek-v4-pro',
            'agent_api_url' => 'https://api.deepseek.com/chat/completions',
            'agent_api_key' => 'sk-test-deepseek-key',
        ]);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('result.protocol', 'openai_compatible')
            ->assertJsonPath('result.model', 'deepseek-v4-pro');
    }

    public function test_harvest_explicit_nt_sr_formula_and_ai_diagnosis_feed_self_learning(): void
    {
        $admin = $this->createAdmin();
        $device = Device::create([
            'device_code' => 'BW-NODE-SR',
            'name' => 'Sensor Kolam SR',
            'pond_name' => 'Kolam Terpal SR',
            'tenant_code' => 'TENANT-UTAMA',
            'status' => 'ONLINE',
        ]);

        // N0 = 1000, Nt = 600 -> SR = (600 / 1000) * 100% = 60%, Mortalitas = 40% (TINGGI, False Negative)
        $res = $this->actingAs($admin)->postJson('/dashboard/harvest-cycles', [
            'device_id' => $device->id,
            'cycle_name' => 'Siklus SR Formula',
            'stocking_date' => '2026-09-01',
            'harvest_date' => '2026-11-20',
            'seed_count' => 1000,
            'harvest_fish_count' => 600,
            'harvest_weight_kg' => 50,
            'fish_per_kg' => 12,
            'harvest_size_cm' => '18-20 cm',
        ]);

        $res->assertCreated()
            ->assertJsonPath('cycle.harvest_fish_count', 600)
            ->assertJsonPath('cycle.survival_rate_pct', 60)
            ->assertJsonPath('cycle.mortality_rate_pct', 40)
            ->assertJsonPath('cycle.mortality_status', 'TINGGI')
            ->assertJsonPath('cycle.harvest_size_cm', '18-20 cm')
            ->assertJsonPath('cycle.ai_diagnosis.formula', 'SR = (Nt / N0) × 100%')
            ->assertJsonPath('cycle.ai_diagnosis.n0', 1000)
            ->assertJsonPath('cycle.ai_diagnosis.nt', 600)
            ->assertJsonPath('cycle.ai_diagnosis.self_learning_priority', 'CRITICAL')
            ->assertJsonPath('cycle.ai_diagnosis.fed_to_self_learning', false);

        $cycleId = $res->json('cycle.id');

        // Re-analyze AI endpoint
        $this->actingAs($admin)
            ->postJson("/dashboard/harvest-cycles/{$cycleId}/analyze-ai")
            ->assertOk()
            ->assertJsonPath('cycle.ai_diagnosis.nt', 600);

        // Run Self-Learning with .pkl format -> should return commentary, pros/cons, and mark harvest cycle as fed
        $learn = $this->actingAs($admin)->postJson('/dashboard/ml/agent/run', [
            'force_retrain' => true,
            'model_format' => '.pkl',
        ]);

        $learn->assertOk()
            ->assertJsonPath('run.model_format', '.pkl')
            ->assertJsonPath('run.ai_commentary.model_format', '.pkl')
            ->assertJsonStructure([
                'run' => [
                    'ai_commentary' => ['evaluated_at', 'model_version', 'model_format', 'compared_with_version', 'comment', 'pros', 'cons'],
                ],
            ]);

        $cycle = PondHarvestCycle::findOrFail($cycleId);
        $this->assertTrue((bool) ($cycle->ai_diagnosis['fed_to_self_learning'] ?? false));
    }

    public function test_auto_evaluate_supports_h5_format_and_returns_ai_commentary(): void
    {
        $admin = $this->createAdmin();

        $eval = $this->actingAs($admin)->postJson('/dashboard/ml/evaluate', [
            'model_format' => '.h5',
        ]);

        $eval->assertOk()
            ->assertJsonPath('run.run_type', 'AUTO_EVALUATE')
            ->assertJsonPath('run.model_format', '.h5')
            ->assertJsonPath('run.ai_commentary.model_format', '.h5')
            ->assertJsonStructure([
                'run' => [
                    'ai_commentary' => ['evaluated_at', 'model_version', 'model_format', 'compared_with_version', 'comment', 'pros', 'cons'],
                ],
            ]);
    }

    public function test_expired_api_key_and_exhausted_token_quota_trigger_alerts_and_clear_on_update(): void
    {
        $admin = $this->createAdmin();

        Http::fake([
            'https://api.deepseek.com/chat/completions' => Http::sequence()
                ->push(['error' => ['message' => 'Invalid API key provided or token expired.']], 401)
                ->push(['error' => ['message' => 'You exceeded your current quota, insufficient_quota.']], 429),
        ]);

        // 1. Expired / Invalid API key (HTTP 401)
        $expiredRes = $this->actingAs($admin)->postJson('/dashboard/ml/agent/test', [
            'agent_model_id' => 'deepseek-v4-pro',
            'agent_api_url' => 'https://api.deepseek.com/chat/completions',
            'agent_api_key' => 'sk-expired-key',
        ]);

        $expiredRes->assertStatus(422)
            ->assertJsonPath('result.error_code', 'API_KEY_EXPIRED_OR_INVALID')
            ->assertJsonPath('api_key_alert.code', 'API_KEY_EXPIRED_OR_INVALID');

        $this->actingAs($admin)->getJson('/dashboard/ml/overview')
            ->assertOk()
            ->assertJsonPath('overview.api_key_alert.code', 'API_KEY_EXPIRED_OR_INVALID');

        // 2. Exhausted token quota (HTTP 429)
        $quotaRes = $this->actingAs($admin)->postJson('/dashboard/ml/agent/test', [
            'agent_model_id' => 'deepseek-v4-pro',
            'agent_api_url' => 'https://api.deepseek.com/chat/completions',
            'agent_api_key' => 'sk-empty-quota-key',
        ]);

        $quotaRes->assertStatus(422)
            ->assertJsonPath('result.error_code', 'TOKEN_QUOTA_EXHAUSTED')
            ->assertJsonPath('api_key_alert.code', 'TOKEN_QUOTA_EXHAUSTED');

        $this->actingAs($admin)->getJson('/dashboard/ml/overview')
            ->assertOk()
            ->assertJsonPath('overview.api_key_alert.code', 'TOKEN_QUOTA_EXHAUSTED');

        // 3. Updating config with a new API key clears the alert
        $cfgRes = $this->actingAs($admin)->postJson('/dashboard/ml/agent/config', [
            'auto_learning_enabled' => true,
            'promotion_mode' => 'AUTO_PROMOTE',
            'min_f1_threshold' => 0.90,
            'max_drift_threshold' => 0.25,
            'min_new_samples' => 10,
            'schedule_interval_hours' => 6,
            'llm_advisor_enabled' => true,
            'agent_model_id' => 'deepseek-v4-pro',
            'agent_api_url' => 'https://api.deepseek.com/chat/completions',
            'agent_api_key' => 'sk-fresh-valid-key',
        ]);

        $cfgRes->assertOk()
            ->assertJsonPath('overview.api_key_alert', null);
    }
}
