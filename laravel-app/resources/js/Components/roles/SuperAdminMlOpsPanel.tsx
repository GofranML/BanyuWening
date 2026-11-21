import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Activity,
  Bot,
  Cpu,
  Gauge,
  GitBranch,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import type {
  ManagedDevice,
  MlAgentConfigItem,
  MlModelVersionItem,
  MlPerformanceOverview,
} from "@/Types";

interface SuperAdminMlOpsPanelProps {
  initialOverview?: MlPerformanceOverview | null;
  devices?: ManagedDevice[];
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "";
}

export function SuperAdminMlOpsPanel({
  initialOverview,
  devices = [],
}: SuperAdminMlOpsPanelProps) {
  const [overview, setOverview] = useState<MlPerformanceOverview | null>(initialOverview ?? null);
  const [hoursWindow, setHoursWindow] = useState<number>(24);
  const [loading, setLoading] = useState(!initialOverview);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Agent config state
  const [configForm, setConfigForm] = useState<MlAgentConfigItem>(
    initialOverview?.agent_config || {
      auto_learning_enabled: true,
      promotion_mode: "AUTO_PROMOTE",
      min_f1_threshold: 0.9,
      max_drift_threshold: 0.25,
      min_new_samples: 10,
      schedule_interval_hours: 6,
      llm_advisor_enabled: false,
      last_run_at: null,
    }
  );
  const [forceRetrain, setForceRetrain] = useState(false);

  // Live API Tester state
  const [testToken, setTestToken] = useState("");
  const [testPh, setTestPh] = useState("7.15");
  const [testTemp, setTestTemp] = useState("28.4");
  const [testTds, setTestTds] = useState("355");
  const [testTurb, setTestTurb] = useState("36.2");
  const [testWaterLevel, setTestWaterLevel] = useState("NORMAL");
  const [apiTestResult, setApiTestResult] = useState<{
    endpoint: string;
    status: number | string;
    data: any;
  } | null>(null);

  const fetchOverview = async (hours = hoursWindow) => {
    setLoading(true);
    try {
      const res = await fetch(`/dashboard/ml/overview?hours=${hours}`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      if (res.ok && json.overview) {
        setOverview(json.overview);
        if (json.overview.agent_config) {
          setConfigForm(json.overview.agent_config);
        }
      }
    } catch {
      // tetap tenang jika gagal sementara
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOverview) {
      void fetchOverview(24);
    }
  }, [initialOverview]);

  const handleRangeChange = (nextHours: number) => {
    setHoursWindow(nextHours);
    void fetchOverview(nextHours);
  };

  const handleRunAgent = async (mode: "evaluate" | "self_learn") => {
    setBusyAction(mode);
    setNotice(null);
    const endpoint = mode === "evaluate" ? "/dashboard/ml/evaluate" : "/dashboard/ml/agent/run";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(mode === "self_learn" ? { force_retrain: forceRetrain } : {}),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menjalankan siklus AI Agent." });
      } else {
        if (json.overview) {
          setOverview(json.overview);
          setConfigForm(json.overview.agent_config);
        }
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("config");
    setNotice(null);
    try {
      const res = await fetch("/dashboard/ml/agent/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(configForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menyimpan konfigurasi agent." });
      } else {
        if (json.overview) {
          setOverview(json.overview);
          setConfigForm(json.overview.agent_config);
        }
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePromoteModel = async (model: MlModelVersionItem) => {
    setBusyAction(`promote-${model.id}`);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/ml/models/${model.id}/promote`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal mengaktifkan versi model." });
      } else {
        if (json.overview) setOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyAction(null);
    }
  };

  const runMlApiTest = async (endpoint: string, method: "GET" | "POST", withToken: boolean) => {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      let body: string | undefined;
      if (method === "POST") {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          ph: Number(testPh),
          temperature_c: Number(testTemp),
          tds_ppm: Number(testTds),
          turbidity_ntu: Number(testTurb),
          water_level: testWaterLevel,
          persist: true,
        });
      }
      if (withToken && testToken.trim()) {
        headers["Authorization"] = `Bearer ${testToken.trim()}`;
      }
      const res = await fetch(endpoint, { method, headers, body });
      const data = await res.json();
      setApiTestResult({ endpoint: `${method} ${endpoint}`, status: res.status, data });
      if (method === "POST" && res.ok) {
        void fetchOverview(hoursWindow);
      }
    } catch (err: any) {
      setApiTestResult({
        endpoint: `${method} ${endpoint}`,
        status: "Error",
        data: { error: err?.message || "Gagal menghubungi endpoint ML" },
      });
    }
  };

  const kpi = overview?.kpi;
  const trafficSeries = overview?.traffic_series || [];
  const evalTrend = overview?.evaluation_trend || [];
  const cm = overview?.confusion_matrix || [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const featureEntries = Object.entries(overview?.feature_importances || {}).sort(
    (a, b) => b[1] - a[1]
  );
  const models = overview?.model_versions || [];
  const runs = overview?.agent_runs || [];

  const classLabels = ["AMAN", "WASPADA", "BAHAYA"];
  const mlEndpoints = [
    { method: "GET", path: "/api/ml/status", auth: "Publik", desc: "Versi model RF aktif, metrik evaluasi, dan jadwal AI Agent." },
    { method: "POST", path: "/api/ml/predict", auth: "device.token", desc: "Inferensi Random Forest on-demand + failsafe deterministik + pencatatan latency_ms." },
    { method: "POST", path: "/api/ml/predict/batch", auth: "device.token", desc: "Inferensi batch hingga 100 payload sensor dalam 1 panggilan proses Python." },
    { method: "GET", path: "/api/ml/predictions", auth: "Publik", desc: "Riwayat prediksi terbaru dengan filter ?risk= & ?device_code=." },
    { method: "GET", path: "/api/ml/predictions/latest", auth: "Publik", desc: "Prediksi Random Forest terbaru per node sensor." },
    { method: "GET", path: "/api/ml/performance", auth: "Publik", desc: "Trafik inferensi, P95 latensi, tren F1/Drift, dan Confusion Matrix 3×3." },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Window Selector */}
      <div className="p-6 bg-surface border border-line rounded-[6px] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
            <Cpu className="w-4 h-4" />
            <span>Random Forest MLOps · Auto-Evaluation &amp; AI Agent Self-Learning</span>
          </div>
          <h2 className="text-[20px] font-display font-semibold text-ink">
            Dashboard Trafik Performa Random Forest &amp; Agent AI Self-Learning
          </h2>
          <p className="text-[13px] text-muted mt-1 max-w-3xl">
            Memantau trafik inferensi real-time, latensi P95, pergeseran distribusi sensor (<em>data drift</em>),
            serta orkestrasi otomatis pelatihan ulang Random Forest dengan Safety Gate SNI 8228.4:2015.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex rounded-[6px] bg-surface-2 p-1 border border-line text-xs font-semibold">
            {[
              { label: "6J", val: 6 },
              { label: "24J", val: 24 },
              { label: "7H", val: 168 },
              { label: "Semua", val: 0 },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => handleRangeChange(opt.val)}
                className={`px-2.5 py-1 rounded-[4px] cursor-pointer transition-colors ${
                  hoursWindow === opt.val ? "bg-brand text-brand-ink" : "text-muted hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => fetchOverview(hoursWindow)}
            disabled={loading}
            className="h-9 px-3 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-xs font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
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

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Model Aktif</span>
            <GitBranch className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-[16px] font-mono font-bold text-ink mt-1 truncate">
            {kpi?.active_version || "1.0.0-rf"}
          </div>
          <div className="text-[11px] text-muted mt-1">{kpi?.algorithm || "RandomForestClassifier"}</div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Akurasi &amp; Macro-F1</span>
            <ShieldCheck className="w-3.5 h-3.5 text-aman" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-0.5">
            {kpi ? `${(kpi.accuracy * 100).toFixed(1)}%` : "-"}
          </div>
          <div className="text-[11px] text-muted tnum">
            Macro-F1: {kpi ? kpi.macro_f1.toFixed(4) : "-"} · Recall BAHAYA:{" "}
            {kpi ? `${(kpi.bahaya_recall * 100).toFixed(0)}%` : "-"}
          </div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Trafik Inferensi</span>
            <Activity className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-0.5">
            {kpi?.predictions_in_window ?? 0}
          </div>
          <div className="text-[11px] text-muted tnum">
            Total DB: {kpi?.total_predictions ?? 0} · Fallback: {kpi?.fallback_rate_pct ?? 0}%
          </div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Latensi Inferensi</span>
            <Gauge className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-0.5">
            {kpi?.avg_latency_ms ?? 0} ms
          </div>
          <div className="text-[11px] text-muted tnum">
            P95: {kpi?.p95_latency_ms ?? 0} ms · Target &lt; 200 ms
          </div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px]">
          <div className="flex items-center justify-between text-[11px] text-muted font-medium">
            <span>Data Drift &amp; SNI Sync</span>
            <ShieldAlert className="w-3.5 h-3.5 text-waspada" />
          </div>
          <div className="text-[22px] font-semibold tnum text-ink mt-0.5">
            {kpi ? `${(kpi.drift_score * 100).toFixed(1)}%` : "0%"}
          </div>
          <div className="text-[11px] text-muted tnum">
            Live Agreement: {kpi ? `${(kpi.live_agreement_rate * 100).toFixed(1)}%` : "100%"}
          </div>
        </div>
      </div>

      {/* 2 Grafik Trafik & Tren Evaluasi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Grafik 1: Trafik Inferensi per Kelas + Confidence */}
        <div className="bg-surface border border-line rounded-[6px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">
                Trafik Inferensi Model &amp; Distribusi Risiko
              </h3>
              <p className="text-[11px] text-muted">Jumlah inferensi AMAN / WASPADA / BAHAYA &amp; rata-rata keyakinan (%)</p>
            </div>
            <span className="text-[11px] font-mono text-muted tnum">
              A:{kpi?.aman_count ?? 0} W:{kpi?.waspada_count ?? 0} B:{kpi?.bahaya_count ?? 0}
            </span>
          </div>

          {trafficSeries.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-muted border border-dashed border-line rounded-[6px] p-4 text-center">
              Belum ada trafik inferensi pada jendela waktu ini. Gunakan Playground Live Tester di bawah atau kirim telemetri untuk melihat grafik trafik.
            </div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trafficSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
                  <YAxis yAxisId="left" stroke="var(--muted)" fontSize={11} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      borderColor: "var(--line)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar yAxisId="left" dataKey="aman" stackId="a" name="AMAN" fill="var(--aman)" />
                  <Bar yAxisId="left" dataKey="waspada" stackId="a" name="WASPADA" fill="var(--waspada)" />
                  <Bar yAxisId="left" dataKey="bahaya" stackId="a" name="BAHAYA" fill="var(--bahaya)" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avg_confidence"
                    name="Confidence (%)"
                    stroke="var(--brand)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Grafik 2: Tren Akurasi, Macro-F1 & Drift antar Siklus Agent */}
        <div className="bg-surface border border-line rounded-[6px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">
                Tren Evaluasi Agent AI (Akurasi, Macro-F1 &amp; Drift)
              </h3>
              <p className="text-[11px] text-muted">Perubahan metrik evaluasi dan pergeseran distribusi tiap siklus agen</p>
            </div>
            <span className="text-[11px] font-mono text-muted tnum">{evalTrend.length} siklus</span>
          </div>

          {evalTrend.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-muted border border-dashed border-line rounded-[6px] p-4 text-center">
              Belum ada riwayat siklus Auto-Evaluasi / Self-Learning. Klik &ldquo;Jalankan Auto-Evaluasi&rdquo; di panel Agent AI di bawah.
            </div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evalTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      borderColor: "var(--line)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="accuracy_pct" name="Akurasi (%)" stroke="var(--aman)" strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="macro_f1_pct" name="Macro-F1 (%)" stroke="var(--brand)" strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="drift_pct" name="Drift (%)" stroke="var(--waspada)" strokeWidth={2} strokeDasharray="4 4" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Confusion Matrix 3x3 + Feature Importances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Confusion Matrix */}
        <div className="bg-surface border border-line rounded-[6px] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Confusion Matrix 3×3 (Holdout Evaluation)
            </h3>
            <span className="text-[11px] text-muted">Baris: Aktual · Kolom: Prediksi</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border border-line">
              <thead className="bg-surface-2 text-muted font-semibold">
                <tr>
                  <th className="p-2.5 border border-line text-left">Aktual \ Prediksi</th>
                  {classLabels.map((lbl) => (
                    <th key={lbl} className="p-2.5 border border-line font-mono">
                      {lbl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classLabels.map((rowLabel, rIdx) => (
                  <tr key={rowLabel}>
                    <td className="p-2.5 border border-line text-left font-mono font-semibold text-ink bg-surface-2/60">
                      {rowLabel}
                    </td>
                    {classLabels.map((_, cIdx) => {
                      const val = cm[rIdx]?.[cIdx] ?? 0;
                      const isDiag = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          className={`p-2.5 border border-line font-mono tnum font-semibold ${
                            isDiag
                              ? "bg-aman-bg text-aman-text"
                              : val > 0
                              ? "bg-bahaya-bg text-bahaya-text"
                              : "text-muted"
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Importances */}
        <div className="bg-surface border border-line rounded-[6px] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Feature Importances (9 Fitur Random Forest)
            </h3>
            <span className="text-[11px] text-muted">Kontribusi Gini Importance</span>
          </div>
          <div className="space-y-2">
            {featureEntries.map(([name, weight]) => {
              const pct = Math.min(100, Math.round(weight * 1000) / 10);
              return (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-ink">{name}</span>
                    <span className="font-mono tnum text-muted">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand transition-[width] duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {featureEntries.length === 0 && (
              <div className="text-xs text-muted">Metadata feature importances belum tersedia.</div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Auto-Evaluasi & Auto-Training Agent AI Self-Learning */}
      <div className="bg-surface border border-line rounded-[6px] p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider mb-1">
              <Bot className="w-4 h-4" />
              <span>AI Self-Learning Agent (Auto-Evaluate · TimeSeriesSplit · Safety Gate)</span>
            </div>
            <h3 className="text-[16px] font-semibold text-ink">
              Orkestrasi Otomatis Evaluasi, Deteksi Drift &amp; Pelatihan Ulang Model
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-ink mr-1 cursor-pointer">
              <input
                type="checkbox"
                checked={forceRetrain}
                onChange={(e) => setForceRetrain(e.target.checked)}
              />
              <span>Force Retrain</span>
            </label>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleRunAgent("evaluate")}
              className="h-9 px-3.5 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 text-brand" />
              <span>{busyAction === "evaluate" ? "Mengevaluasi..." : "Jalankan Auto-Evaluasi"}</span>
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleRunAgent("self_learn")}
              className="h-9 px-3.5 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {busyAction === "self_learn"
                  ? "Agent Melatih..."
                  : "Jalankan Agent AI Self-Learning"}
              </span>
            </button>
          </div>
        </div>

        {/* Form Kebijakan Agen */}
        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Mode Promosi</label>
            <select
              value={configForm.promotion_mode}
              onChange={(e) => setConfigForm({ ...configForm, promotion_mode: e.target.value })}
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            >
              <option value="AUTO_PROMOTE">AUTO_PROMOTE (Otomatis Lolos Gate)</option>
              <option value="HITL_REVIEW">HITL_REVIEW (Tunggu Persetujuan Admin)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Min Macro-F1</label>
            <input
              type="number"
              step="0.01"
              min={0.5}
              max={0.999}
              value={configForm.min_f1_threshold}
              onChange={(e) =>
                setConfigForm({ ...configForm, min_f1_threshold: Number(e.target.value) })
              }
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs tnum text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Max Drift Score</label>
            <input
              type="number"
              step="0.01"
              min={0.05}
              max={0.999}
              value={configForm.max_drift_threshold}
              onChange={(e) =>
                setConfigForm({ ...configForm, max_drift_threshold: Number(e.target.value) })
              }
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs tnum text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Min Sampel Live</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={configForm.min_new_samples}
              onChange={(e) =>
                setConfigForm({ ...configForm, min_new_samples: Number(e.target.value) })
              }
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs tnum text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Interval Jadwal (Jam)</label>
            <input
              type="number"
              min={1}
              max={168}
              value={configForm.schedule_interval_hours}
              onChange={(e) =>
                setConfigForm({ ...configForm, schedule_interval_hours: Number(e.target.value) })
              }
              className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs tnum text-ink"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={configForm.auto_learning_enabled}
                onChange={(e) =>
                  setConfigForm({ ...configForm, auto_learning_enabled: e.target.checked })
                }
              />
              <span>Auto-Run</span>
            </label>
            <button
              type="submit"
              disabled={busyAction === "config"}
              className="h-9 px-3 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-xs font-semibold text-ink inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-brand" />
              <span>Simpan</span>
            </button>
          </div>
        </form>

        {/* Model Registry & 1-Klik Promote / Rollback */}
        <div className="border border-line rounded-[6px] overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-2 border-b border-line flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">
              Registry Versi Model Random Forest &amp; 1-Klik Rollback
            </span>
            <span className="text-[11px] text-muted">Artefak tersimpan atomik di ml/models/versions/</span>
          </div>
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-line">
            {models.map((m) => (
              <div key={`m-mod-${m.id}`} className="p-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-ink text-[13px]">{m.version}</div>
                    <div className="text-[10.5px] text-muted">{m.trained_by}</div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-semibold shrink-0 ${
                      m.is_active
                        ? "bg-aman-bg text-aman-text"
                        : m.status === "REJECTED"
                        ? "bg-bahaya-bg text-bahaya-text"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {m.is_active ? "ACTIVE" : m.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono tnum">
                  <div className="p-2 rounded bg-surface-2">
                    <div className="text-[10px] text-muted">Akurasi</div>
                    <div className="font-bold text-ink">{(m.accuracy * 100).toFixed(1)}%</div>
                  </div>
                  <div className="p-2 rounded bg-surface-2">
                    <div className="text-[10px] text-muted">Macro-F1</div>
                    <div className="font-bold text-ink">{m.macro_f1.toFixed(4)}</div>
                  </div>
                  <div className="p-2 rounded bg-surface-2">
                    <div className="text-[10px] text-muted">Recall BAHAYA</div>
                    <div className="font-bold text-ink">
                      {m.bahaya_recall !== null ? `${(m.bahaya_recall * 100).toFixed(0)}%` : "-"}
                    </div>
                  </div>
                </div>
                {!m.is_active && (
                  <button
                    type="button"
                    disabled={busyAction === `promote-${m.id}`}
                    onClick={() => handlePromoteModel(m)}
                    className="w-full min-h-[40px] px-3 bg-brand/10 hover:bg-brand/20 text-brand rounded-[6px] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Aktifkan / Rollback ke Versi Ini</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-muted uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-2">Versi</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Akurasi</th>
                  <th className="px-4 py-2">Macro-F1</th>
                  <th className="px-4 py-2">Recall BAHAYA</th>
                  <th className="px-4 py-2">Sampel Train/Live</th>
                  <th className="px-4 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-2.5">
                      <div className="font-mono font-semibold text-ink">{m.version}</div>
                      <div className="text-[10px] text-muted">{m.trained_by}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-semibold ${
                          m.is_active
                            ? "bg-aman-bg text-aman-text"
                            : m.status === "REJECTED"
                            ? "bg-bahaya-bg text-bahaya-text"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {m.is_active ? "ACTIVE" : m.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono tnum">{(m.accuracy * 100).toFixed(2)}%</td>
                    <td className="px-4 py-2.5 font-mono tnum">{m.macro_f1.toFixed(4)}</td>
                    <td className="px-4 py-2.5 font-mono tnum">
                      {m.bahaya_recall !== null ? `${(m.bahaya_recall * 100).toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-2.5 font-mono tnum text-muted">
                      {m.train_samples} / +{m.live_samples_included}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {m.is_active ? (
                        <span className="text-[11px] font-semibold text-aman-text">Sedang Aktif</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyAction === `promote-${m.id}`}
                          onClick={() => handlePromoteModel(m)}
                          className="h-7 px-2.5 bg-brand/10 hover:bg-brand/20 text-brand rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Aktifkan / Rollback</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Trail Penalaran Agent AI */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-ink">
            Audit Trail &amp; Rantai Penalaran Agent AI ({runs.length})
          </div>
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {runs.map((run) => (
              <div key={run.id} className="p-3.5 bg-surface-2/60 border border-line rounded-[6px] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-ink">#{run.id} · {run.run_type}</span>
                    <span className="px-2 py-0.5 rounded-[4px] bg-surface border border-line font-mono text-[10px] font-semibold text-brand">
                      {run.decision || run.status}
                    </span>
                    <span className="text-[11px] text-muted">
                      ({run.trigger_source} · {run.duration_ms ?? 0} ms)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono tnum text-muted">
                    F1: {run.macro_f1_before?.toFixed(4) ?? "-"} →{" "}
                    <strong className="text-ink">{run.macro_f1_after?.toFixed(4) ?? "-"}</strong> · Drift:{" "}
                    {run.drift_score !== null ? `${(run.drift_score * 100).toFixed(1)}%` : "-"}
                  </div>
                </div>
                {run.summary && <p className="text-xs text-ink">{run.summary}</p>}
                {run.reasoning_steps && run.reasoning_steps.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                    {run.reasoning_steps.map((st, idx) => (
                      <div key={idx} className="p-2 bg-surface border border-line rounded-[4px] text-[11px]">
                        <span className="font-mono font-bold text-brand">{st.step}</span>{" "}
                        <span className="text-muted">[{st.status}]:</span>{" "}
                        <span className="text-ink">{st.detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {runs.length === 0 && (
              <div className="p-4 text-center text-xs text-muted border border-dashed border-line rounded-[6px]">
                Belum ada log eksekusi AI Agent. Jalankan Auto-Evaluasi atau Agent Self-Learning di atas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dokumentasi & Live Tester Endpoint Random Forest */}
      <div className="bg-surface border border-line rounded-[6px] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold text-ink">
            Spesifikasi &amp; Live Tester Endpoint Random Forest (/api/ml/*)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-line">
            <thead className="bg-surface-2 text-muted uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-3 py-2 border-b border-line">Method &amp; Endpoint</th>
                <th className="px-3 py-2 border-b border-line">Autentikasi</th>
                <th className="px-3 py-2 border-b border-line">Fungsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {mlEndpoints.map((ep) => (
                <tr key={ep.path}>
                  <td className="px-3 py-2 font-mono text-ink">
                    <span className="font-bold text-brand mr-1.5">{ep.method}</span>
                    {ep.path}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted">{ep.auth}</td>
                  <td className="px-3 py-2 text-muted">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mini Playground Tester */}
        <div className="p-4 bg-surface-2/60 border border-line rounded-[6px] space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2.5">
            <div className="col-span-2 md:col-span-2">
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">
                Token Alat (untuk POST /api/ml/predict)
              </label>
              <input
                type="text"
                placeholder={
                  devices[0]?.api_token_prefix
                    ? `Tempel token ${devices[0].device_code} (bw_dev_...)`
                    : "bw_dev_..."
                }
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[4px] bg-surface border border-line text-xs font-mono text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">pH</label>
              <input
                type="number"
                step="0.01"
                value={testPh}
                onChange={(e) => setTestPh(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Suhu (°C)</label>
              <input
                type="number"
                step="0.1"
                value={testTemp}
                onChange={(e) => setTestTemp(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">TDS (ppm)</label>
              <input
                type="number"
                value={testTds}
                onChange={(e) => setTestTds(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Turbidity (NTU)</label>
              <input
                type="number"
                step="0.1"
                value={testTurb}
                onChange={(e) => setTestTurb(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Level Air</label>
              <select
                value={testWaterLevel}
                onChange={(e) => setTestWaterLevel(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs text-ink"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => runMlApiTest("/api/ml/predict", "POST", true)}
              className="h-8 px-3 bg-brand text-brand-ink rounded-[4px] text-xs font-semibold cursor-pointer"
            >
              Uji POST /api/ml/predict
            </button>
            <button
              type="button"
              onClick={() => runMlApiTest("/api/ml/status", "GET", false)}
              className="h-8 px-3 bg-surface border border-line text-ink rounded-[4px] text-xs font-semibold cursor-pointer"
            >
              Uji GET /api/ml/status
            </button>
            <button
              type="button"
              onClick={() => runMlApiTest("/api/ml/performance?hours=24", "GET", false)}
              className="h-8 px-3 bg-surface border border-line text-ink rounded-[4px] text-xs font-semibold cursor-pointer"
            >
              Uji GET /api/ml/performance
            </button>
          </div>

          {apiTestResult && (
            <div className="p-3 bg-surface border border-line rounded-[4px] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-ink">{apiTestResult.endpoint}</span>
                <span className="px-2 py-0.5 rounded bg-surface-2 border border-line">
                  HTTP {apiTestResult.status}
                </span>
              </div>
              <pre className="text-[11px] font-mono text-ink overflow-x-auto max-h-56">
                {JSON.stringify(apiTestResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
