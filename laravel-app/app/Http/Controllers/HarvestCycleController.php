<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\PondHarvestCycle;
use App\Models\User;
use App\Services\HarvestAiEvaluatorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HarvestCycleController extends Controller
{
    public function __construct(
        private readonly HarvestAiEvaluatorService $evaluator
    ) {
    }
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $cycles = $this->scopedQuery($user, $request->query('tenant_code'), $request->query('device_code'))
            ->latest('stocking_date')
            ->latest('id')
            ->get();

        return response()->json([
            'success' => true,
            'cycles' => $cycles->map(fn (PondHarvestCycle $c) => self::serialize($c))->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $validated = $request->validate([
            'device_id' => ['nullable', 'integer', 'exists:devices,id'],
            'pond_name' => ['nullable', 'string', 'max:120'],
            'cycle_name' => ['required', 'string', 'max:120'],
            'stocking_date' => ['required', 'date'],
            'harvest_date' => ['nullable', 'date', 'after_or_equal:stocking_date'],
            'seed_count' => ['required', 'integer', 'min:1', 'max:10000000'],
            'seed_size_cm' => ['nullable', 'string', 'max:32'],
            'harvest_weight_kg' => ['nullable', 'numeric', 'min:0.1', 'max:1000000'],
            'fish_per_kg' => ['nullable', 'numeric', 'min:0.5', 'max:500'],
            'harvest_fish_count' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'harvest_size_cm' => ['nullable', 'string', 'max:32'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $device = $this->resolveAuthorizedDevice($user, $validated['device_id'] ?? null);
        $metrics = $this->evaluator->evaluate($validated, $device);

        $cycle = PondHarvestCycle::create(array_merge([
            'device_id' => $device?->id,
            'tenant_code' => $device?->tenant_code ?? $user->tenant_code ?? 'TENANT-UTAMA',
            'device_code' => $device?->device_code,
            'pond_name' => $device?->pond_name ?? ($validated['pond_name'] ?: ($user->pond_name ?: 'Kolam Utama')),
            'cycle_name' => trim($validated['cycle_name']),
            'stocking_date' => $validated['stocking_date'],
            'harvest_date' => $validated['harvest_date'] ?? null,
            'seed_count' => (int) $validated['seed_count'],
            'seed_size_cm' => $validated['seed_size_cm'] ?? null,
            'harvest_weight_kg' => isset($validated['harvest_weight_kg']) ? (float) $validated['harvest_weight_kg'] : null,
            'fish_per_kg' => isset($validated['fish_per_kg']) ? (float) $validated['fish_per_kg'] : null,
            'harvest_size_cm' => $validated['harvest_size_cm'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'recorded_by' => $user->name . ' (' . $user->role . ')',
        ], $metrics));

        return response()->json([
            'success' => true,
            'message' => 'Data bibit & evaluasi panen berhasil disimpan dan terhubung ke evaluasi AI.',
            'cycle' => self::serialize($cycle),
        ], 201);
    }

    public function update(Request $request, PondHarvestCycle $cycle): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $this->authorizeCycleAccess($user, $cycle);

        $validated = $request->validate([
            'device_id' => ['nullable', 'integer', 'exists:devices,id'],
            'pond_name' => ['nullable', 'string', 'max:120'],
            'cycle_name' => ['required', 'string', 'max:120'],
            'stocking_date' => ['required', 'date'],
            'harvest_date' => ['nullable', 'date', 'after_or_equal:stocking_date'],
            'seed_count' => ['required', 'integer', 'min:1', 'max:10000000'],
            'seed_size_cm' => ['nullable', 'string', 'max:32'],
            'harvest_weight_kg' => ['nullable', 'numeric', 'min:0.1', 'max:1000000'],
            'fish_per_kg' => ['nullable', 'numeric', 'min:0.5', 'max:500'],
            'harvest_fish_count' => ['nullable', 'integer', 'min:0', 'max:10000000'],
            'harvest_size_cm' => ['nullable', 'string', 'max:32'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $device = $this->resolveAuthorizedDevice($user, $validated['device_id'] ?? $cycle->device_id);
        $metrics = $this->evaluator->evaluate($validated, $device);

        $cycle->update(array_merge([
            'device_id' => $device?->id,
            'tenant_code' => $device?->tenant_code ?? $cycle->tenant_code ?? $user->tenant_code ?? 'TENANT-UTAMA',
            'device_code' => $device?->device_code,
            'pond_name' => $device?->pond_name ?? ($validated['pond_name'] ?: $cycle->pond_name),
            'cycle_name' => trim($validated['cycle_name']),
            'stocking_date' => $validated['stocking_date'],
            'harvest_date' => $validated['harvest_date'] ?? null,
            'seed_count' => (int) $validated['seed_count'],
            'seed_size_cm' => $validated['seed_size_cm'] ?? null,
            'harvest_weight_kg' => isset($validated['harvest_weight_kg']) ? (float) $validated['harvest_weight_kg'] : null,
            'fish_per_kg' => isset($validated['fish_per_kg']) ? (float) $validated['fish_per_kg'] : null,
            'harvest_size_cm' => $validated['harvest_size_cm'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ], $metrics));

        return response()->json([
            'success' => true,
            'message' => 'Data siklus bibit & panen berhasil diperbarui.',
            'cycle' => self::serialize($cycle->fresh()),
        ]);
    }

    public function reanalyzeAi(PondHarvestCycle $cycle): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $this->authorizeCycleAccess($user, $cycle);

        $device = $cycle->device_id ? Device::find($cycle->device_id) : null;
        $metrics = $this->evaluator->evaluate([
            'stocking_date' => $cycle->stocking_date?->format('Y-m-d') ?? now()->toDateString(),
            'harvest_date' => $cycle->harvest_date?->format('Y-m-d'),
            'seed_count' => $cycle->seed_count,
            'seed_size_cm' => $cycle->seed_size_cm,
            'harvest_weight_kg' => $cycle->harvest_weight_kg,
            'fish_per_kg' => $cycle->fish_per_kg,
            'harvest_fish_count' => $cycle->harvest_fish_count ?? $cycle->estimated_harvest_count,
            'harvest_size_cm' => $cycle->harvest_size_cm,
        ], $device);

        $cycle->update($metrics);

        return response()->json([
            'success' => true,
            'message' => 'Diagnosis Agent AI untuk siklus panen & SR berhasil diperbarui.',
            'cycle' => self::serialize($cycle->fresh()),
        ]);
    }

    public function destroy(PondHarvestCycle $cycle): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $this->authorizeCycleAccess($user, $cycle);

        $cycle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Catatan siklus bibit & panen berhasil dihapus.',
        ]);
    }

    public static function serialize(PondHarvestCycle $c): array
    {
        return [
            'id' => $c->id,
            'device_id' => $c->device_id,
            'tenant_code' => $c->tenant_code,
            'device_code' => $c->device_code,
            'pond_name' => $c->pond_name,
            'cycle_name' => $c->cycle_name,
            'stocking_date' => $c->stocking_date?->format('Y-m-d'),
            'harvest_date' => $c->harvest_date?->format('Y-m-d'),
            'seed_count' => (int) $c->seed_count,
            'seed_size_cm' => $c->seed_size_cm,
            'harvest_weight_kg' => $c->harvest_weight_kg !== null ? (float) $c->harvest_weight_kg : null,
            'fish_per_kg' => $c->fish_per_kg !== null ? (float) $c->fish_per_kg : null,
            'harvest_fish_count' => $c->harvest_fish_count !== null ? (int) $c->harvest_fish_count : ($c->estimated_harvest_count !== null ? (int) $c->estimated_harvest_count : null),
            'harvest_size_cm' => $c->harvest_size_cm,
            'avg_fish_weight_g' => $c->avg_fish_weight_g !== null ? (float) $c->avg_fish_weight_g : null,
            'estimated_harvest_count' => $c->estimated_harvest_count !== null ? (int) $c->estimated_harvest_count : null,
            'estimated_mortality_count' => $c->estimated_mortality_count !== null ? (int) $c->estimated_mortality_count : null,
            'survival_rate_pct' => $c->survival_rate_pct !== null ? (float) $c->survival_rate_pct : null,
            'mortality_rate_pct' => $c->mortality_rate_pct !== null ? (float) $c->mortality_rate_pct : null,
            'mortality_status' => $c->mortality_status ?: 'BERJALAN',
            'ai_danger_events' => (int) $c->ai_danger_events,
            'ai_warning_events' => (int) $c->ai_warning_events,
            'avg_ph_cycle' => $c->avg_ph_cycle !== null ? (float) $c->avg_ph_cycle : null,
            'avg_temp_cycle' => $c->avg_temp_cycle !== null ? (float) $c->avg_temp_cycle : null,
            'ai_evaluation_note' => $c->ai_evaluation_note,
            'ai_diagnosis' => $c->ai_diagnosis,
            'notes' => $c->notes,
            'recorded_by' => $c->recorded_by,
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }

    private function scopedQuery(User $user, ?string $tenantCode = null, ?string $deviceCode = null)
    {
        $query = PondHarvestCycle::query();

        if (!$user->isAdmin()) {
            $userTenant = $user->tenant_code ? strtoupper($user->tenant_code) : null;
            if ($userTenant) {
                $query->where('tenant_code', $userTenant);
            }
        } elseif ($tenantCode && strtoupper($tenantCode) !== 'ALL') {
            $query->where('tenant_code', strtoupper($tenantCode));
        }

        if ($deviceCode && strtoupper($deviceCode) !== 'ALL') {
            $query->where('device_code', $deviceCode);
        }

        return $query;
    }

    private function resolveAuthorizedDevice(User $user, ?int $deviceId): ?Device
    {
        if (!$deviceId) {
            return null;
        }
        $device = Device::find($deviceId);
        if (!$device) {
            return null;
        }
        if (!$user->isAdmin() && $user->tenant_code && strtoupper((string) $device->tenant_code) !== strtoupper((string) $user->tenant_code)) {
            abort(403, 'Alat IoT bukan milik tenant Anda.');
        }
        return $device;
    }

    private function authorizeCycleAccess(User $user, PondHarvestCycle $cycle): void
    {
        if ($user->isAdmin()) {
            return;
        }
        if ($user->tenant_code && strtoupper((string) $cycle->tenant_code) !== strtoupper((string) $user->tenant_code)) {
            abort(403, 'Anda tidak memiliki akses ke catatan panen tenant lain.');
        }
    }
}
