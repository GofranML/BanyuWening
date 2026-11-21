<?php

namespace App\Console\Commands;

use App\Models\MlAgentConfig;
use App\Services\MlSelfLearningAgentService;
use Illuminate\Console\Command;

class RunMlSelfLearningCommand extends Command
{
    protected $signature = 'ml:self-learn {--mode=self_learn : Mode agen: evaluate atau self_learn} {--force : Paksa retraining meskipun ambang belum terlewati} {--trigger=SCHEDULER : Sumber pemicu (SCHEDULER, MANUAL, CLI)}';
    protected $description = 'Menjalankan siklus Auto-Evaluasi & Auto-Training Random Forest berbasis AI Agent Self-Learning';

    public function handle(MlSelfLearningAgentService $agentService): int
    {
        $mode = (string) $this->option('mode');
        $force = (bool) $this->option('force');
        $trigger = strtoupper((string) $this->option('trigger'));

        if ($trigger === 'SCHEDULER' && !$force) {
            $config = MlAgentConfig::current();
            if (!$config->auto_learning_enabled) {
                $this->line('[ML Agent] Auto-learning dinonaktifkan pada konfigurasi Super Admin.');
                return 0;
            }

            if ($config->last_run_at && $config->last_run_at->gt(now()->subHours(max(1, (int) $config->schedule_interval_hours)))) {
                $this->line('[ML Agent] Belum melewati interval jadwal (' . $config->schedule_interval_hours . ' jam).');
                return 0;
            }
        }

        $this->info("[*] Memulai siklus AI Agent Random Forest (mode={$mode}, trigger={$trigger})...");
        $run = $agentService->runCycle($mode, $force, $trigger);

        $this->info("[✓] Selesai | Status: {$run->status} | Keputusan: {$run->decision} | Macro-F1: " . ($run->macro_f1_after ?? $run->macro_f1_before ?? '-'));
        if ($run->summary) {
            $this->line('    Ringkasan: ' . $run->summary);
        }

        return 0;
    }
}
