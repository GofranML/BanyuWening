import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Edit3,
  Fish,
  Plus,
  Scale,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import type { FleetDeviceSummary, PondHarvestCycleItem } from "@/Types";

interface HarvestEvaluationPanelProps {
  initialCycles: PondHarvestCycleItem[];
  devices: FleetDeviceSummary[];
  activeTenantCode?: string | null;
  activeDeviceCode?: string | null;
  defaultPondName?: string;
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "";
}

const SIZE_PRESETS = [
  { label: "Isi 6 / kg", value: "6", desc: "Ukuran Besar (~167g/ekor)" },
  { label: "Isi 8 / kg", value: "8", desc: "Standar Konsumsi (~125g/ekor)" },
  { label: "Isi 10 / kg", value: "10", desc: "Ukuran Sedang (~100g/ekor)" },
  { label: "Isi 12 / kg", value: "12", desc: "Ukuran Kecil (~83g/ekor)" },
];

export function HarvestEvaluationPanel({
  initialCycles,
  devices,
  activeTenantCode,
  activeDeviceCode,
  defaultPondName = "Kolam Utama",
}: HarvestEvaluationPanelProps) {
  const [cycles, setCycles] = useState<PondHarvestCycleItem[]>(initialCycles || []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const defaultDevice = useMemo(() => {
    if (activeDeviceCode && activeDeviceCode !== "ALL") {
      return devices.find((d) => d.device_code === activeDeviceCode) || devices[0] || null;
    }
    return devices[0] || null;
  }, [devices, activeDeviceCode]);

  const [deviceId, setDeviceId] = useState<string>(defaultDevice ? String(defaultDevice.id) : "");
  const [pondName, setPondName] = useState<string>(defaultDevice?.pond_name || defaultPondName);
  const [cycleName, setCycleName] = useState<string>("");
  const [stockingDate, setStockingDate] = useState<string>(today);
  const [seedCount, setSeedCount] = useState<string>("5000");
  const [seedSizeCm, setSeedSizeCm] = useState<string>("5-7 cm");
  const [hasHarvested, setHasHarvested] = useState<boolean>(true);
  const [harvestDate, setHarvestDate] = useState<string>(today);
  const [harvestWeightKg, setHarvestWeightKg] = useState<string>("");
  const [fishPerKg, setFishPerKg] = useState<string>("8");
  const [harvestFishCount, setHarvestFishCount] = useState<string>("");
  const [harvestSizeCm, setHarvestSizeCm] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [reanalyzingId, setReanalyzingId] = useState<number | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setDeviceId(defaultDevice ? String(defaultDevice.id) : "");
    setPondName(defaultDevice?.pond_name || defaultPondName);
    setCycleName("");
    setStockingDate(today);
    setSeedCount("5000");
    setSeedSizeCm("5-7 cm");
    setHasHarvested(true);
    setHarvestDate(today);
    setHarvestWeightKg("");
    setFishPerKg("8");
    setHarvestFishCount("");
    setHarvestSizeCm("");
    setNotes("");
  };

  const handleEdit = (item: PondHarvestCycleItem) => {
    setEditingId(item.id);
    setDeviceId(item.device_id ? String(item.device_id) : "");
    setPondName(item.pond_name || defaultPondName);
    setCycleName(item.cycle_name);
    setStockingDate(item.stocking_date || today);
    setSeedCount(String(item.seed_count));
    setSeedSizeCm(item.seed_size_cm || "");
    const done = item.harvest_weight_kg !== null && item.fish_per_kg !== null;
    setHasHarvested(done || true);
    setHarvestDate(item.harvest_date || today);
    setHarvestWeightKg(item.harvest_weight_kg !== null ? String(item.harvest_weight_kg) : "");
    setFishPerKg(item.fish_per_kg !== null ? String(item.fish_per_kg) : "8");
    setHarvestFishCount(
      item.harvest_fish_count !== null && item.harvest_fish_count !== undefined
        ? String(item.harvest_fish_count)
        : ""
    );
    setHarvestSizeCm(item.harvest_size_cm || "");
    setNotes(item.notes || "");
    setNotice(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Live preview perhitungan Survival Rate: SR = (Nt / N0) × 100%
  const livePreview = useMemo(() => {
    const n0 = Number(seedCount);
    const kg = Number(harvestWeightKg);
    const perKg = Number(fishPerKg);
    const explicitNt = harvestFishCount !== "" ? Number(harvestFishCount) : null;
    if (!hasHarvested || !n0 || n0 <= 0) {
      return null;
    }
    const nt =
      explicitNt !== null && explicitNt >= 0
        ? Math.round(explicitNt)
        : kg > 0 && perKg > 0
        ? Math.round(kg * perKg)
        : null;
    if (nt === null) {
      return null;
    }
    const avgWeightG = perKg > 0 ? Math.round((1000 / perKg) * 10) / 10 : kg > 0 && nt > 0 ? Math.round(((kg * 1000) / nt) * 10) / 10 : 0;
    const estMortalityCount = Math.max(0, n0 - nt);
    const sr = Math.min(100, Math.round((nt / n0) * 1000) / 10);
    const mort = Math.max(0, Math.round((100 - sr) * 10) / 10);
    const status = mort <= 10 ? "BAIK" : mort <= 25 ? "PERLU_EVALUASI" : "TINGGI";
    return { avgWeightG, estHarvestCount: nt, estMortalityCount, sr, mort, status, n0, nt };
  }, [hasHarvested, seedCount, harvestWeightKg, fishPerKg, harvestFishCount]);

  // Filter tampilan sesuai scope tenant/device aktif
  const visibleCycles = useMemo(() => {
    return cycles.filter((c) => {
      if (activeTenantCode && activeTenantCode !== "ALL" && c.tenant_code && c.tenant_code !== activeTenantCode) {
        return false;
      }
      if (activeDeviceCode && activeDeviceCode !== "ALL" && c.device_code && c.device_code !== activeDeviceCode) {
        return false;
      }
      return true;
    });
  }, [cycles, activeTenantCode, activeDeviceCode]);

  const kpi = useMemo(() => {
    const completed = visibleCycles.filter((c) => c.mortality_rate_pct !== null);
    const totalSeeds = visibleCycles.reduce((acc, c) => acc + (c.seed_count || 0), 0);
    const totalHarvestKg = completed.reduce((acc, c) => acc + (c.harvest_weight_kg || 0), 0);
    const avgSr =
      completed.length > 0
        ? Math.round((completed.reduce((acc, c) => acc + (c.survival_rate_pct || 0), 0) / completed.length) * 10) / 10
        : null;
    const avgMort =
      completed.length > 0
        ? Math.round((completed.reduce((acc, c) => acc + (c.mortality_rate_pct || 0), 0) / completed.length) * 10) / 10
        : null;
    const highMortCount = completed.filter((c) => (c.mortality_rate_pct ?? 0) > 25).length;
    return {
      totalCycles: visibleCycles.length,
      completedCount: completed.length,
      totalSeeds,
      totalHarvestKg: Math.round(totalHarvestKg * 10) / 10,
      avgSr,
      avgMort,
      highMortCount,
    };
  }, [visibleCycles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);

    const payload: Record<string, any> = {
      device_id: deviceId ? Number(deviceId) : null,
      pond_name: pondName.trim() || defaultPondName,
      cycle_name: cycleName.trim(),
      stocking_date: stockingDate,
      seed_count: Number(seedCount),
      seed_size_cm: seedSizeCm.trim() || null,
      notes: notes.trim() || null,
    };

    if (hasHarvested && (harvestFishCount !== "" || (harvestWeightKg !== "" && fishPerKg !== ""))) {
      payload.harvest_date = harvestDate || stockingDate;
      payload.harvest_weight_kg = harvestWeightKg !== "" ? Number(harvestWeightKg) : null;
      payload.fish_per_kg = fishPerKg !== "" ? Number(fishPerKg) : null;
      payload.harvest_fish_count = harvestFishCount !== "" ? Number(harvestFishCount) : null;
      payload.harvest_size_cm = harvestSizeCm.trim() || null;
    } else {
      payload.harvest_date = null;
      payload.harvest_weight_kg = null;
      payload.fish_per_kg = null;
      payload.harvest_fish_count = null;
      payload.harvest_size_cm = null;
    }

    try {
      const url = editingId ? `/dashboard/harvest-cycles/${editingId}` : "/dashboard/harvest-cycles";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const firstErr = json?.errors ? Object.values(json.errors).flat()[0] : null;
        setNotice({ type: "err", text: String(firstErr || json?.message || "Gagal menyimpan data panen.") });
      } else {
        const saved: PondHarvestCycleItem = json.cycle;
        setCycles((prev) =>
          editingId ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]
        );
        setNotice({ type: "ok", text: json.message });
        resetForm();
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan saat menyimpan." });
    } finally {
      setSaving(false);
    }
  };

  const handleReanalyzeAi = async (item: PondHarvestCycleItem) => {
    setReanalyzingId(item.id);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/harvest-cycles/${item.id}/analyze-ai`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menjalankan analisis ulang AI." });
      } else {
        const updated: PondHarvestCycleItem = json.cycle;
        setCycles((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setReanalyzingId(null);
    }
  };

  const handleDelete = async (item: PondHarvestCycleItem) => {
    if (!window.confirm(`Hapus catatan siklus "${item.cycle_name}"?`)) return;
    setDeletingId(item.id);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/harvest-cycles/${item.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menghapus catatan." });
      } else {
        setCycles((prev) => prev.filter((c) => c.id !== item.id));
        if (editingId === item.id) resetForm();
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setDeletingId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "BAIK") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-aman-bg text-aman-text text-[10.5px] font-semibold">
          <CheckCircle2 className="w-3 h-3" />
          Mortalitas Rendah
        </span>
      );
    }
    if (status === "PERLU_EVALUASI") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-waspada-bg text-waspada-text text-[10.5px] font-semibold">
          <AlertTriangle className="w-3 h-3" />
          Perlu Evaluasi
        </span>
      );
    }
    if (status === "TINGGI") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-bahaya-bg text-bahaya-text text-[10.5px] font-semibold">
          <TrendingDown className="w-3 h-3" />
          Mortalitas Tinggi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-surface-2 text-muted text-[10.5px] font-semibold">
        <Calendar className="w-3 h-3" />
        Sedang Budidaya
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-5 sm:p-6 bg-surface border border-line rounded-[6px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
            <Scale className="w-4 h-4" />
            <span>Evaluasi Biologis &amp; Umpan Balik AI Self-Learning</span>
          </div>
          <h1 className="text-[20px] sm:text-[22px] font-display font-semibold text-ink">
            Pencatatan Bibit Masuk, Hasil Panen &amp; Evaluasi Mortalitas Lele
          </h1>
          <p className="text-[13px] text-muted mt-1 max-w-3xl">
            Catat jumlah bibit lele masuk (<strong>N0</strong>), jumlah ikan hidup saat panen (<strong>Nt</strong>), berat panen (KG),
            serta ukuran ikan untuk menghitung Survival Rate menggunakan rumus{" "}
            <code className="px-1.5 py-0.5 rounded bg-surface-2 border border-line font-mono text-ink">
              SR = (Nt / N0) × 100%
            </code>
            . Agent AI akan mendiagnosis apa yang salah pada model maupun hasil panen lalu mengirimnya ke <strong>AI Self-Learning</strong>.
          </p>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-[6px] border text-xs font-medium ${
            notice.type === "ok"
              ? "bg-aman-bg border-aman/30 text-aman-text"
              : "bg-bahaya-bg border-bahaya/30 text-bahaya-text"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Total Siklus Tercatat</span>
            <Fish className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-1">{kpi.totalCycles}</div>
          <div className="text-[11px] text-muted mt-0.5">
            {kpi.completedCount} sudah panen · {kpi.totalCycles - kpi.completedCount} berjalan
          </div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Total Bibit Masuk</span>
            <Plus className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-1">
            {kpi.totalSeeds.toLocaleString("id-ID")} <span className="text-xs font-normal text-muted">ekor</span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">Akumulasi tebar bibit kolam</div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Total Hasil Panen</span>
            <Scale className="w-3.5 h-3.5 text-aman" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-1">
            {kpi.totalHarvestKg.toLocaleString("id-ID")} <span className="text-xs font-normal text-muted">kg</span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">Total biomassa panen tercatat</div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Rata-Rata SR &amp; Mortalitas</span>
            <Bot className="w-3.5 h-3.5 text-waspada" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-1">
            {kpi.avgSr !== null ? `${kpi.avgSr}%` : "-"}
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Mortalitas: {kpi.avgMort !== null ? `${kpi.avgMort}%` : "-"} · Tinggi (&gt;25%): {kpi.highMortCount}
          </div>
        </div>
      </div>

      {/* Form Input Bibit & Panen */}
      <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-[6px] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              {editingId ? "Perbarui / Lengkapi Data Panen Siklus" : "Input Data Bibit Masuk & Hasil Panen"}
            </h2>
            <p className="text-[11.5px] text-muted">
              Bisa mencatat saat tebar bibit saja (belum panen) atau langsung lengkap dengan berat panen &amp; ukuran ikan.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="h-8 px-3 bg-surface-2 border border-line rounded-[6px] text-xs font-semibold text-muted hover:text-ink inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal Edit</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Kolam / Node IoT</label>
            <select
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value);
                const found = devices.find((d) => String(d.id) === e.target.value);
                if (found) setPondName(found.pond_name);
              }}
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            >
              <option value="">-- Kolam Manual / Umum --</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.pond_name} ({d.device_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Nama Siklus / Batch *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Siklus 04 - Lele Sangkuriang"
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Tanggal Tebar Bibit *</label>
            <input
              type="date"
              required
              value={stockingDate}
              onChange={(e) => setStockingDate(e.target.value)}
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Jumlah Bibit Masuk / N0 (ekor) *</label>
            <input
              type="number"
              required
              min={1}
              max={10000000}
              value={seedCount}
              onChange={(e) => setSeedCount(e.target.value)}
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs tnum text-ink"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Ukuran Bibit Awal (opsional)</label>
            <input
              type="text"
              placeholder="Contoh: 5-7 cm / 7-9 cm"
              value={seedSizeCm}
              onChange={(e) => setSeedSizeCm(e.target.value)}
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            />
          </div>

          <div className="lg:col-span-3 flex items-center gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={hasHarvested}
                onChange={(e) => setHasHarvested(e.target.checked)}
              />
              <span>Sudah Panen — Isi Berat Panen (KG) &amp; Ukuran Rata-Rata Ikan Lele</span>
            </label>
          </div>
        </div>

        {hasHarvested && (
          <div className="p-4 bg-surface-2/60 border border-line rounded-[6px] space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Tanggal Panen</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Ikan Hidup Panen / Nt (ekor)
                </label>
                <input
                  type="number"
                  min={0}
                  max={10000000}
                  placeholder="Otomatis dari kg × isi/kg"
                  value={harvestFishCount}
                  onChange={(e) => setHarvestFishCount(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs tnum text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Total Berat Panen (KG)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  required={hasHarvested && harvestFishCount === ""}
                  placeholder="Contoh: 520.5"
                  value={harvestWeightKg}
                  onChange={(e) => setHarvestWeightKg(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs tnum text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Ukuran Rata-Rata (Isi Ekor / KG)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0.5}
                  required={hasHarvested && harvestFishCount === ""}
                  placeholder="Contoh: 8"
                  value={fishPerKg}
                  onChange={(e) => setFishPerKg(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs tnum text-ink"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Ukuran Ikan Panen (cm, opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 22-26 cm"
                  value={harvestSizeCm}
                  onChange={(e) => setHarvestSizeCm(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs text-ink"
                />
              </div>
            </div>

            {/* Preset Cepat Ukuran Lele */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted font-medium">Preset ukuran panen lele:</span>
              {SIZE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFishPerKg(p.value)}
                  title={p.desc}
                  className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold border cursor-pointer transition-colors ${
                    fishPerKg === p.value
                      ? "bg-brand text-brand-ink border-brand"
                      : "bg-surface text-ink border-line hover:bg-brand/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Live Preview Kalkulator Mortalitas & Evaluasi AI */}
            {livePreview && (
              <div className="p-3 bg-surface border border-line rounded-[6px] grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div>
                  <div className="text-[10px] text-muted">Berat/Ekor</div>
                  <div className="font-mono font-bold text-ink tnum">{livePreview.avgWeightG} g</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted">Estimasi Panen</div>
                  <div className="font-mono font-bold text-ink tnum">
                    {livePreview.estHarvestCount.toLocaleString("id-ID")} ekor
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted">Estimasi Bibit Mati</div>
                  <div className="font-mono font-bold text-bahaya-text tnum">
                    {livePreview.estMortalityCount.toLocaleString("id-ID")} ekor
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted">SR = (Nt / N0) × 100%</div>
                  <div className="font-mono font-bold text-ink tnum">
                    {livePreview.sr}% ({livePreview.nt}/{livePreview.n0})
                  </div>
                </div>
                <div className="flex items-center">
                  {renderStatusBadge(livePreview.status)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Catatan Kondisi Lapangan (opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Pakan 3x/hari, sempat hujan deras minggu ke-4, beberapa bibit mati di awal tebar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Data Bibit & Panen"}
            </span>
          </button>
        </div>
      </form>

      {/* Riwayat Siklus & Evaluasi AI */}
      <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
        <div className="px-4 py-3 bg-surface-2 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink">
            Riwayat Siklus Budidaya, Mortalitas Bibit &amp; Evaluasi AI ({visibleCycles.length})
          </span>
          <span className="text-[11px] text-muted">
            Otomatis terhubung ke AI Self-Learning Agent saat generate ulang Random Forest
          </span>
        </div>

        {visibleCycles.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            Belum ada catatan bibit masuk atau hasil panen pada scope ini. Tambahkan data pertama di formulir atas.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-line">
              {visibleCycles.map((c) => (
                <div key={`m-${c.id}`} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-ink text-[13px]">{c.cycle_name}</div>
                      <div className="text-[11px] text-muted">
                        {c.pond_name} {c.device_code ? `· ${c.device_code}` : ""} · Tebar {c.stocking_date}
                      </div>
                    </div>
                    {renderStatusBadge(c.mortality_status)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono tnum text-[11px]">
                    <div className="p-2 bg-surface-2 rounded">
                      <div className="text-[10px] text-muted">Bibit Masuk</div>
                      <div className="font-bold text-ink">{c.seed_count.toLocaleString("id-ID")}</div>
                    </div>
                    <div className="p-2 bg-surface-2 rounded">
                      <div className="text-[10px] text-muted">Panen / Isi</div>
                      <div className="font-bold text-ink">
                        {c.harvest_weight_kg !== null ? `${c.harvest_weight_kg} kg (${c.fish_per_kg}/kg)` : "-"}
                      </div>
                    </div>
                    <div className="p-2 bg-surface-2 rounded">
                      <div className="text-[10px] text-muted">SR / Mati</div>
                      <div className="font-bold text-ink">
                        {c.survival_rate_pct !== null ? `${c.survival_rate_pct}% / ${c.mortality_rate_pct}%` : "-"}
                      </div>
                    </div>
                  </div>

                  {c.ai_evaluation_note && (
                    <div className="p-2.5 rounded bg-brand/5 border border-brand/20 text-[11px] text-ink">
                      <strong className="text-brand">Evaluasi AI:</strong> {c.ai_evaluation_note}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      className="flex-1 h-9 bg-surface-2 border border-line rounded-[5px] text-xs font-semibold text-ink inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{c.harvest_weight_kg === null ? "Catat Panen" : "Edit"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === c.id}
                      onClick={() => handleDelete(c)}
                      className="h-9 px-3 bg-bahaya-bg text-bahaya-text rounded-[5px] text-xs font-semibold inline-flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2/60 border-b border-line text-muted uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Siklus &amp; Kolam</th>
                    <th className="px-4 py-2.5">Bibit Masuk</th>
                    <th className="px-4 py-2.5">Panen (KG &amp; Ukuran)</th>
                    <th className="px-4 py-2.5">SR &amp; Mortalitas</th>
                    <th className="px-4 py-2.5">Korelasi &amp; Evaluasi AI</th>
                    <th className="px-4 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visibleCycles.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-2/30 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{c.cycle_name}</div>
                        <div className="text-[11px] text-muted">
                          {c.pond_name} {c.device_code ? `(${c.device_code})` : ""}
                        </div>
                        <div className="text-[10.5px] font-mono text-muted mt-0.5">
                          Tebar: {c.stocking_date}
                          {c.harvest_date ? ` → Panen: ${c.harvest_date}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono tnum">
                        <div className="font-semibold text-ink">{c.seed_count.toLocaleString("id-ID")} ekor</div>
                        {c.seed_size_cm && <div className="text-[10.5px] text-muted">Ukuran {c.seed_size_cm}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono tnum">
                        {c.harvest_weight_kg !== null ? (
                          <>
                            <div className="font-semibold text-ink">{c.harvest_weight_kg} kg</div>
                            <div className="text-[10.5px] text-muted">
                              Isi {c.fish_per_kg} ekor/kg (~{c.avg_fish_weight_g} g)
                            </div>
                            <div className="text-[10.5px] text-muted">
                              ≈ {c.estimated_harvest_count?.toLocaleString("id-ID")} ekor panen
                            </div>
                          </>
                        ) : (
                          <span className="text-muted">Belum panen</span>
                        )}
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        {renderStatusBadge(c.mortality_status)}
                        {c.survival_rate_pct !== null && (
                          <div className="font-mono tnum text-[11px] text-ink">
                            SR: <strong>{c.survival_rate_pct}%</strong> · Mati:{" "}
                            <strong>{c.mortality_rate_pct}%</strong>
                          </div>
                        )}
                        {c.estimated_mortality_count !== null && (
                          <div className="font-mono tnum text-[10.5px] text-muted">
                            ±{c.estimated_mortality_count.toLocaleString("id-ID")} ekor mati
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-sm space-y-1">
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-bahaya-bg text-bahaya-text font-semibold">
                            BAHAYA: {c.ai_danger_events}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-waspada-bg text-waspada-text font-semibold">
                            WASPADA: {c.ai_warning_events}
                          </span>
                          {c.avg_ph_cycle !== null && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted">
                              pH̄ {c.avg_ph_cycle} · T̄ {c.avg_temp_cycle}°C
                            </span>
                          )}
                        </div>
                        {c.ai_evaluation_note && (
                          <p className="text-[11px] text-muted leading-relaxed">{c.ai_evaluation_note}</p>
                        )}
                        {c.ai_diagnosis && (
                          <div className="p-2 rounded bg-surface-2/70 border border-line text-[10.5px] space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-brand">Diagnosis Agent AI</span>
                              <span className="px-1.5 py-0.2 rounded bg-surface border border-line font-mono text-[9.5px]">
                                {c.ai_diagnosis.fed_to_self_learning ? "Self-Learning ✓" : `Prioritas: ${c.ai_diagnosis.self_learning_priority}`}
                              </span>
                            </div>
                            {c.ai_diagnosis.model_issues?.[0] && (
                              <div className="text-ink">
                                <strong>Model:</strong> {c.ai_diagnosis.model_issues[0]}
                              </div>
                            )}
                            {c.ai_diagnosis.harvest_issues?.[0] && (
                              <div className="text-ink">
                                <strong>Panen/Ukuran:</strong> {c.ai_diagnosis.harvest_issues[0]}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={reanalyzingId === c.id}
                            onClick={() => handleReanalyzeAi(c)}
                            className="h-7 px-2 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[4px] text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Olah ulang evaluasi panen oleh Agent AI"
                          >
                            <Bot className="w-3 h-3 text-brand" />
                            <span>{reanalyzingId === c.id ? "..." : "AI Eval"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="h-7 px-2.5 bg-brand/10 hover:bg-brand/20 text-brand rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{c.harvest_weight_kg === null ? "Catat Panen" : "Edit"}</span>
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === c.id}
                            onClick={() => handleDelete(c)}
                            className="h-7 px-2 bg-bahaya-bg hover:opacity-80 text-bahaya-text rounded-[4px] text-[11px] inline-flex items-center cursor-pointer"
                            title="Hapus catatan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
