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
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Gauge,
  GitBranch,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type {
  ManagedDevice,
  MlAgentConfigItem,
  MlAgentModelOption,
  MlApiKeyAlert,
  MlModelVersionItem,
  MlPerformanceOverview,
  MlRecentPredictionForValidation,
  RiskLevel,
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
      agent_model_id: "rf-autonomous-local",
      agent_api_url: "",
      has_agent_api_key: false,
      last_run_at: null,
    }
  );
  const [selectedAgentModel, setSelectedAgentModel] = useState<string>(
    initialOverview?.agent_config?.agent_model_id || "rf-autonomous-local"
  );
  const [agentApiKeyInput, setAgentApiKeyInput] = useState<string>("");
  const [agentTestResult, setAgentTestResult] = useState<{
    ok: boolean;
    model?: string;
    endpoint?: string;
    latency_ms?: number;
    reply?: string;
    error?: string;
    error_code?: string | null;
    api_key_alert?: MlApiKeyAlert | null;
  } | null>(null);
  const [remoteModels, setRemoteModels] = useState<{ id: string; name: string; owned_by?: string }[]>([]);
  const [forceRetrain, setForceRetrain] = useState(true);
  const [selectedModelFormat, setSelectedModelFormat] = useState<string>(
    initialOverview?.kpi?.model_format || ".joblib"
  );
  const [selectedCommentaryModel, setSelectedCommentaryModel] = useState<MlModelVersionItem | null>(null);

  // Field Validation (Cek Kesesuaian Lapangan) state
  const [fvDeviceId, setFvDeviceId] = useState<string>("");
  const [fvPh, setFvPh] = useState<string>("7.10");
  const [fvTemp, setFvTemp] = useState<string>("28.5");
  const [fvTds, setFvTds] = useState<string>("350");
  const [fvTurb, setFvTurb] = useState<string>("35");
  const [fvWaterLevel, setFvWaterLevel] = useState<string>("NORMAL");
  const [fvPredictedRisk, setFvPredictedRisk] = useState<RiskLevel>("AMAN");
  const [fvActualRisk, setFvActualRisk] = useState<RiskLevel>("AMAN");
  const [fvNotes, setFvNotes] = useState<string>("");

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
          if (json.overview.agent_config.agent_model_id) {
            setSelectedAgentModel(json.overview.agent_config.agent_model_id);
          }
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

  const handleRunAgent = async (mode: "evaluate" | "self_learn", forceOverride?: boolean) => {
    setBusyAction(mode);
    setNotice(null);
    const endpoint = mode === "evaluate" ? "/dashboard/ml/evaluate" : "/dashboard/ml/agent/run";
    const useForce = forceOverride !== undefined ? forceOverride : forceRetrain;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(
          mode === "self_learn"
            ? { force_retrain: useForce, agent_model_id: selectedAgentModel, model_format: selectedModelFormat }
            : { agent_model_id: selectedAgentModel, model_format: selectedModelFormat }
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menjalankan siklus AI Agent." });
      } else {
        if (json.overview) {
          setOverview(json.overview);
          setConfigForm(json.overview.agent_config);
          if (json.overview.agent_config?.agent_model_id) {
            setSelectedAgentModel(json.overview.agent_config.agent_model_id);
          }
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
      const payload: Record<string, any> = {
        ...configForm,
        agent_model_id: selectedAgentModel,
        agent_api_url: configForm.agent_api_url || null,
      };
      if (agentApiKeyInput.trim() !== "") {
        payload.agent_api_key = agentApiKeyInput.trim();
      }
      const res = await fetch("/dashboard/ml/agent/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menyimpan konfigurasi agent." });
      } else {
        if (json.overview) {
          setOverview(json.overview);
          setConfigForm(json.overview.agent_config);
        }
        setAgentApiKeyInput("");
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleFetchRemoteModels = async () => {
    setBusyAction("fetch-models");
    setNotice(null);
    try {
      const payload: Record<string, any> = {
        agent_api_url: configForm.agent_api_url || activeAgentMeta?.default_api_url || "https://router.classai.id/v1/chat/completions",
      };
      if (agentApiKeyInput.trim() !== "") {
        payload.agent_api_key = agentApiKeyInput.trim();
      }
      const res = await fetch("/dashboard/ml/agent/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.api_key_alert) {
          setOverview((prev) => (prev ? { ...prev, api_key_alert: json.api_key_alert } : prev));
        }
        setNotice({ type: "err", text: json?.message || "Gagal memuat daftar model dari provider." });
      } else {
        setOverview((prev) => (prev ? { ...prev, api_key_alert: null } : prev));
        const list = Array.isArray(json.models) ? json.models : [];
        setRemoteModels(list);
        const deepseekMatch = list.find((m: any) => String(m.id).toLowerCase().includes("deepseek"));
        if (deepseekMatch) {
          setSelectedAgentModel(deepseekMatch.id);
          setConfigForm((prev) => ({ ...prev, agent_model_id: deepseekMatch.id }));
        }
        setNotice({ type: "ok", text: json.message || `Berhasil memuat ${list.length} model.` });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan saat memuat model." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleTestAgentConnection = async () => {
    setBusyAction("agent-test");
    setAgentTestResult(null);
    setNotice(null);
    try {
      const payload: Record<string, any> = {
        agent_model_id: selectedAgentModel,
        agent_api_url: configForm.agent_api_url || null,
      };
      if (agentApiKeyInput.trim() !== "") {
        payload.agent_api_key = agentApiKeyInput.trim();
      }
      const res = await fetch("/dashboard/ml/agent/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setAgentTestResult(
        json.result || {
          ok: res.ok,
          error: json.message || "Gagal menguji koneksi AI Agent.",
          error_code: json.error_code || null,
          api_key_alert: json.api_key_alert || null,
        }
      );
      if (json.api_key_alert) {
        setOverview((prev) => (prev ? { ...prev, api_key_alert: json.api_key_alert } : prev));
      } else if (res.ok && json.success) {
        setOverview((prev) => (prev ? { ...prev, api_key_alert: null } : prev));
      }
      setNotice({
        type: res.ok && json.success ? "ok" : "err",
        text: json.message || (res.ok ? "Koneksi berhasil." : "Koneksi gagal."),
      });
    } catch (err: any) {
      setAgentTestResult({ ok: false, error: err?.message || "Kesalahan jaringan." });
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleQuickFieldValidate = async (
    item: MlRecentPredictionForValidation,
    actualRisk: RiskLevel
  ) => {
    setBusyAction(`fv-${item.prediction_id}`);
    setNotice(null);
    try {
      const res = await fetch("/dashboard/ml/field-validations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          prediction_id: item.prediction_id,
          device_id: item.device_id,
          device_code: item.device_code,
          pond_name: item.pond_name,
          ph: item.ph,
          temperature_c: item.temperature_c,
          tds_ppm: item.tds_ppm,
          turbidity_ntu: item.turbidity_ntu,
          water_level: item.water_level || "NORMAL",
          predicted_risk: item.predicted_risk,
          actual_risk: actualRisk,
          field_notes:
            actualRisk === item.predicted_risk
              ? "Terverifikasi sesuai kondisi kolam di lapangan."
              : `Koreksi lapangan: prediksi ${item.predicted_risk}, aktual ${actualRisk}.`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menyimpan validasi lapangan." });
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

  const handleManualFieldValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyAction("fv-manual");
    setNotice(null);
    try {
      const selectedDev = devices.find((d) => String(d.id) === fvDeviceId);
      const res = await fetch("/dashboard/ml/field-validations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          device_id: selectedDev ? selectedDev.id : null,
          device_code: selectedDev?.device_code || "MANUAL",
          pond_name: selectedDev?.pond_name || "Kolam Lapangan",
          ph: Number(fvPh),
          temperature_c: Number(fvTemp),
          tds_ppm: fvTds !== "" ? Number(fvTds) : null,
          turbidity_ntu: fvTurb !== "" ? Number(fvTurb) : null,
          water_level: fvWaterLevel,
          predicted_risk: fvPredictedRisk,
          actual_risk: fvActualRisk,
          field_notes: fvNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menyimpan cek lapangan." });
      } else {
        if (json.overview) setOverview(json.overview);
        setFvNotes("");
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteFieldValidation = async (id: number) => {
    setBusyAction(`fv-del-${id}`);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/ml/field-validations/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (res.ok && json.overview) {
        setOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      }
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
  const supportedFormats = overview?.supported_model_formats || [".joblib", ".pkl", ".h5", ".onnx", ".pt", ".tflite"];
  const formatEvalDate = (iso?: string | null) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };
  const agentModels: MlAgentModelOption[] = overview?.available_agent_models || [
    {
      id: "rf-autonomous-local",
      name: "BanyuWening Autonomous RF Agent (Lokal)",
      provider: "Local Python Engine",
      badge: "Default · Offline Ready",
      description: "Orkestrator deterministik lokal (TimeSeriesSplit 3-fold + Safety Gate SNI).",
      requires_api_key: false,
    },
  ];
  const activeAgentMeta = agentModels.find((m) => m.id === selectedAgentModel) || agentModels[0];
  const fieldValidations = overview?.field_validations || [];
  const fieldStats = overview?.field_validation_stats;
  const recentPredsForValidation = overview?.recent_predictions_for_validation || [];
  const harvestSummary = overview?.harvest_evaluation_summary;

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

      {overview?.api_key_alert && (
        <div
          role="alert"
          className={`p-4 rounded-[6px] border flex items-start gap-3 text-xs ${
            overview.api_key_alert.severity === "warning"
              ? "bg-waspada-bg border-waspada/40 text-waspada-text"
              : "bg-bahaya-bg border-bahaya/40 text-bahaya-text"
          }`}
        >
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-[13px] font-semibold">{overview.api_key_alert.title}</strong>
              <span className="px-2 py-0.5 rounded bg-surface/80 border border-line font-mono text-[10px]">
                {overview.api_key_alert.code}
                {overview.api_key_alert.http_status ? ` · HTTP ${overview.api_key_alert.http_status}` : ""}
              </span>
            </div>
            <p className="leading-relaxed">{overview.api_key_alert.message}</p>
            <div className="text-[10.5px] font-mono opacity-85">
              Model: {overview.api_key_alert.model || "-"} · Terdeteksi:{" "}
              {formatEvalDate(overview.api_key_alert.detected_at)}
            </div>
          </div>
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
        <div className="bg-surface border border-line rounded-[6px] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">
                Confusion Matrix 3×3 (Holdout Evaluation)
              </h3>
              <span className="text-[11px] text-muted">Baris: Aktual · Kolom: Prediksi</span>
            </div>
            <div className="overflow-x-auto rounded-[6px] border border-line">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-surface-2 text-muted font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 border-b border-r border-line text-left whitespace-nowrap">
                      Aktual \ Prediksi
                    </th>
                    {classLabels.map((lbl) => (
                      <th key={lbl} className="px-3 py-2.5 border-b border-r last:border-r-0 border-line font-mono whitespace-nowrap">
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classLabels.map((rowLabel, rIdx) => {
                    const rowSum = (cm[rIdx] || []).reduce((acc, v) => acc + (v || 0), 0);
                    return (
                      <tr key={rowLabel} className="border-b last:border-b-0 border-line">
                        <td className="px-3 py-3 border-r border-line text-left font-mono font-semibold text-ink bg-surface-2/60 whitespace-nowrap">
                          {rowLabel}
                        </td>
                        {classLabels.map((_, cIdx) => {
                          const val = cm[rIdx]?.[cIdx] ?? 0;
                          const isDiag = rIdx === cIdx;
                          const pct = rowSum > 0 ? Math.round((val / rowSum) * 100) : 0;
                          return (
                            <td
                              key={cIdx}
                              className={`px-3 py-3 border-r last:border-r-0 border-line font-mono tnum ${
                                isDiag
                                  ? "bg-aman-bg text-aman-text font-bold"
                                  : val > 0
                                  ? "bg-bahaya-bg text-bahaya-text font-semibold"
                                  : "text-muted"
                              }`}
                            >
                              <div className="text-[14px] leading-tight">{val}</div>
                              <div className="text-[10px] opacity-75 mt-0.5">{pct}%</div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-ink">Ringkasan Metrik Per Kelas</span>
              <span className="font-mono text-muted tnum">
                Total Holdout: {cm.flat().reduce((acc, v) => acc + (v || 0), 0)} sampel
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {classLabels.map((cls) => {
                const m = overview?.per_class_metrics?.[cls];
                return (
                  <div key={cls} className="p-2.5 rounded-[5px] bg-surface-2/70 border border-line space-y-1">
                    <div className="font-mono font-bold text-ink">{cls}</div>
                    <div className="font-mono tnum text-[10.5px] text-muted space-y-0.5">
                      <div>P: <strong className="text-ink">{m ? `${(m.precision * 100).toFixed(1)}%` : "-"}</strong></div>
                      <div>R: <strong className="text-ink">{m ? `${(m.recall * 100).toFixed(1)}%` : "-"}</strong></div>
                      <div>F1: <strong className="text-ink">{m ? m.f1.toFixed(3) : "-"}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
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
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-brand font-semibold text-[11px] uppercase tracking-wider mb-1">
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span>AI Self-Learning Agent · Auto-Evaluate · Safety Gate</span>
            </div>
            <h3 className="text-[15.5px] sm:text-[16px] font-semibold text-ink leading-snug">
              Orkestrasi Evaluasi, Deteksi Drift &amp; Pelatihan Ulang Model
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={selectedModelFormat}
              onChange={(e) => setSelectedModelFormat(e.target.value)}
              title="Format artefak model evaluasi & export"
              className="h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs font-mono font-semibold text-ink cursor-pointer"
            >
              {supportedFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  Format: {fmt}
                </option>
              ))}
            </select>
            <label
              className="h-9 px-2.5 rounded-[6px] bg-surface-2/70 border border-line inline-flex items-center gap-1.5 text-xs font-medium text-ink whitespace-nowrap cursor-pointer select-none"
              title="Paksa pelatihan ulang meskipun ambang drift/F1 masih sehat"
            >
              <input
                type="checkbox"
                checked={forceRetrain}
                onChange={(e) => setForceRetrain(e.target.checked)}
                className="accent-brand"
              />
              <span>Force Retrain</span>
            </label>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleRunAgent("evaluate")}
              className="h-9 px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>{busyAction === "evaluate" ? "Mengevaluasi..." : "Auto-Evaluasi"}</span>
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleRunAgent("self_learn", forceRetrain)}
              className="h-9 px-3.5 bg-brand hover:opacity-95 text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 transition-opacity"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                {busyAction === "self_learn" ? "Melatih RF..." : "Generate Ulang RF"}
              </span>
            </button>
          </div>
        </div>

        {/* Pemilih Model AI Agent untuk Generate Ulang Model RF */}
        <div className="p-4 bg-surface-2/60 border border-line rounded-[6px] space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-ink">
                Pilih Model AI Agent untuk Generate Ulang Random Forest (Data Sensor + Validasi Lapangan + Panen)
              </div>
              <div className="text-[11px] text-muted">
                Setiap model AI Agent mengatur profil pencarian hyperparameter TimeSeriesSplit &amp; ringkasan audit evaluasi.
              </div>
            </div>
            {activeAgentMeta && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-brand/10 text-brand text-[11px] font-semibold shrink-0">
                <Bot className="w-3.5 h-3.5" />
                <span>{activeAgentMeta.provider} · {activeAgentMeta.badge}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-muted mb-1">Preset Provider AI Agent</label>
              <select
                value={agentModels.some((m) => m.id === selectedAgentModel) ? selectedAgentModel : "deepseek-v4-pro"}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const nextMeta = agentModels.find((m) => m.id === nextId);
                  setSelectedAgentModel(nextId);
                  setConfigForm({
                    ...configForm,
                    agent_model_id: nextId,
                    agent_api_url: nextMeta?.default_api_url ?? configForm.agent_api_url ?? "",
                  });
                }}
                className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs font-semibold text-ink"
              >
                {agentModels.map((am) => (
                  <option key={am.id} value={am.id}>
                    {am.name} ({am.badge})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-muted mb-1">
                Model ID / Slug Persis (bisa edit bebas)
              </label>
              <input
                type="text"
                placeholder="deepseek-v4-pro atau slug dari ClassAI"
                value={selectedAgentModel}
                onChange={(e) => {
                  setSelectedAgentModel(e.target.value);
                  setConfigForm({ ...configForm, agent_model_id: e.target.value });
                }}
                className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs font-mono text-ink"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-muted mb-1">
                Endpoint URL (ClassAI / DeepSeek / Ollama)
              </label>
              <input
                type="url"
                placeholder={activeAgentMeta?.default_api_url || "https://router.classai.id/v1/chat/completions"}
                value={configForm.agent_api_url || ""}
                onChange={(e) => setConfigForm({ ...configForm, agent_api_url: e.target.value })}
                className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs text-ink"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-muted mb-1">
                API Key {configForm.has_agent_api_key ? "(Tersimpan ✓)" : "(sk_live_... / sk-...)"}
              </label>
              <input
                type="password"
                placeholder={configForm.has_agent_api_key ? "•••••••• (kosongkan jika tidak ubah)" : "Tempel API key ClassAI / DeepSeek"}
                value={agentApiKeyInput}
                onChange={(e) => setAgentApiKeyInput(e.target.value)}
                className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line text-xs text-ink"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleFetchRemoteModels}
              className="h-8 px-3 bg-surface hover:bg-brand/10 border border-line rounded-[6px] text-xs font-semibold text-ink inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand ${busyAction === "fetch-models" ? "animate-spin" : ""}`} />
              <span>{busyAction === "fetch-models" ? "Memuat Model..." : "Muat Daftar Model (/v1/models)"}</span>
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={handleTestAgentConnection}
              className="h-8 px-3 bg-surface hover:bg-brand/10 border border-line rounded-[6px] text-xs font-semibold text-ink inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Activity className="w-3.5 h-3.5 text-brand" />
              <span>{busyAction === "agent-test" ? "Menguji..." : "Uji Koneksi AI Agent"}</span>
            </button>
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={(e) => void handleSaveConfig(e as any)}
              className="h-8 px-3 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{busyAction === "config" ? "Menyimpan..." : "Simpan AI Agent"}</span>
            </button>
          </div>

          {remoteModels.length > 0 && (
            <div className="p-3 bg-surface border border-line rounded-[6px] space-y-2">
              <div className="text-[11px] font-semibold text-ink">
                Model Aktif dari Provider ({remoteModels.length}) — klik untuk memilih:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {remoteModels.map((rm) => (
                  <button
                    key={rm.id}
                    type="button"
                    onClick={() => {
                      setSelectedAgentModel(rm.id);
                      setConfigForm((prev) => ({ ...prev, agent_model_id: rm.id }));
                    }}
                    className={`px-2 py-1 rounded-[4px] font-mono text-[11px] border cursor-pointer transition-colors ${
                      selectedAgentModel === rm.id
                        ? "bg-brand text-brand-ink border-brand font-semibold"
                        : "bg-surface-2 text-ink border-line hover:bg-brand/10"
                    }`}
                  >
                    {rm.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {agentTestResult && (
            <div
              className={`p-3 rounded-[6px] border text-xs space-y-1 ${
                agentTestResult.ok
                  ? "bg-aman-bg border-aman/30 text-aman-text"
                  : "bg-bahaya-bg border-bahaya/30 text-bahaya-text"
              }`}
            >
              <div className="font-mono font-semibold flex flex-wrap items-center justify-between gap-2">
                <span>
                  {agentTestResult.ok ? "Koneksi AI Agent Aktif" : "Koneksi Gagal"} · {agentTestResult.model}
                </span>
                {agentTestResult.latency_ms && <span>{agentTestResult.latency_ms} ms</span>}
              </div>
              <div className="text-[11.5px]">
                {agentTestResult.ok ? agentTestResult.reply : agentTestResult.error}
              </div>
            </div>
          )}

          {activeAgentMeta && (
            <div className="text-[11px] text-muted flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/60">
              <span>{activeAgentMeta.description}</span>
              <span className="font-mono text-ink">
                Data siap latih: {kpi?.total_predictions ?? 0} prediksi · {fieldStats?.total ?? 0} cek lapangan ·{" "}
                {harvestSummary?.completed_cycles ?? 0} evaluasi panen
              </span>
            </div>
          )}
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
          </div>
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-line">
            {models.map((m) => (
              <div key={`m-mod-${m.id}`} className="p-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-ink text-[13px] flex items-center gap-1.5 flex-wrap">
                      <span>{m.version}</span>
                      <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px]">
                        {m.model_format || ".joblib"}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-muted">
                      {m.trained_by} · {formatEvalDate(m.trained_at || m.evaluated_at)}
                    </div>
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
                {m.ai_commentary && (
                  <button
                    type="button"
                    onClick={() => setSelectedCommentaryModel(m)}
                    className="w-full min-h-[36px] px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-[11.5px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-brand" />
                    <span>Lihat Komentar AI</span>
                  </button>
                )}
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
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Versi &amp; Format</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Tanggal Evaluasi</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Akurasi</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Macro-F1</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Recall Bahaya</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Sampel Train/Live</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap">Komentar AI</th>
                  <th className="px-3.5 py-2.5 whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-2.5">
                      <div className="font-mono font-semibold text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{m.version}</span>
                        <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[10px]">
                          {m.model_format || ".joblib"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted">{m.trained_by}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted whitespace-nowrap">
                      {formatEvalDate(m.trained_at || m.evaluated_at)}
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
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {m.ai_commentary ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCommentaryModel(m)}
                          className="h-7 px-2.5 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Bot className="w-3.5 h-3.5 text-brand" />
                          <span>Lihat Komentar AI</span>
                        </button>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
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

        {/* Modal Detail Komentar AI (Kelebihan & Kekurangan Model Terbaru vs Lama) */}
        {selectedCommentaryModel?.ai_commentary && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedCommentaryModel(null)}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-surface border border-line rounded-[8px] shadow-xl overflow-hidden animate-fadeIn"
            >
              <div className="px-5 py-3.5 bg-surface-2 border-b border-line flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <Bot className="w-4 h-4 text-brand shrink-0" />
                  <span className="text-sm font-semibold text-ink">Komentar Evaluasi Agent AI</span>
                  <span className="px-2 py-0.5 rounded bg-brand text-brand-ink font-mono text-[10px] font-bold">
                    {selectedCommentaryModel.ai_commentary.model_format}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-[10px] text-ink">
                    {selectedCommentaryModel.version}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCommentaryModel(null)}
                  className="p-1 rounded hover:bg-surface text-muted hover:text-ink cursor-pointer"
                  aria-label="Tutup komentar AI"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted">
                  <span>
                    Tanggal Evaluasi:{" "}
                    <strong className="text-ink">
                      {formatEvalDate(selectedCommentaryModel.ai_commentary.evaluated_at || selectedCommentaryModel.trained_at)}
                    </strong>
                  </span>
                  <span>
                    Dibandingkan vs:{" "}
                    <strong className="text-ink">{selectedCommentaryModel.ai_commentary.compared_with_version}</strong>
                  </span>
                </div>

                <p className="text-ink leading-relaxed bg-surface-2/60 p-3 rounded-[6px] border border-line">
                  {selectedCommentaryModel.ai_commentary.comment}
                </p>

                {selectedCommentaryModel.ai_commentary.harvest_feedback_summary && (
                  <div className="p-2.5 rounded-[6px] bg-brand/5 border border-brand/20 text-[11px] text-ink">
                    <strong className="text-brand">Umpan Balik Panen &amp; SR:</strong>{" "}
                    {selectedCommentaryModel.ai_commentary.harvest_feedback_summary}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-[6px] bg-aman-bg/40 border border-aman/25 space-y-2">
                    <div className="font-semibold text-aman-text flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Kelebihan vs {selectedCommentaryModel.ai_commentary.compared_with_version}</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-ink">
                      {(selectedCommentaryModel.ai_commentary.pros || []).map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-[6px] bg-waspada-bg/40 border border-waspada/25 space-y-2">
                    <div className="font-semibold text-waspada-text flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>Kekurangan &amp; Catatan Risiko</span>
                    </div>
                    {(selectedCommentaryModel.ai_commentary.cons || []).length > 0 ? (
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-ink">
                        {selectedCommentaryModel.ai_commentary.cons.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-muted">
                        Tidak ada kekurangan signifikan terdeteksi dibanding model sebelumnya.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    {run.agent_model_id && (
                      <span className="px-2 py-0.5 rounded-[4px] bg-brand/10 font-mono text-[10px] font-semibold text-brand">
                        {run.agent_model_id}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-[4px] bg-surface border border-line font-mono text-[10px] font-semibold text-ink">
                      {run.model_format || ".joblib"}
                    </span>
                    <span className="text-[11px] text-muted">
                      ({formatEvalDate(run.finished_at || run.started_at)} · {run.trigger_source} · {run.duration_ms ?? 0} ms
                      {(run.field_validation_count ?? 0) > 0 ? ` · ${run.field_validation_count} cek lapangan` : ""}
                      {(run.harvest_eval_count ?? 0) > 0 ? ` · ${run.harvest_eval_count} panen` : ""})
                    </span>
                  </div>
                  <div className="text-[11px] font-mono tnum text-muted">
                    F1: {run.macro_f1_before?.toFixed(4) ?? "-"} →{" "}
                    <strong className="text-ink">{run.macro_f1_after?.toFixed(4) ?? "-"}</strong> · Drift:{" "}
                    {run.drift_score !== null ? `${(run.drift_score * 100).toFixed(1)}%` : "-"}
                  </div>
                </div>
                {run.summary && <p className="text-xs text-ink">{run.summary}</p>}
                {run.ai_commentary && (
                  <div className="p-2.5 rounded bg-surface border border-line text-[11px] space-y-1">
                    <div className="font-semibold text-brand">
                      Komentar AI ({run.ai_commentary.model_format}) vs {run.ai_commentary.compared_with_version}:
                    </div>
                    <div className="text-ink">
                      <span className="text-aman-text font-semibold">Kelebihan:</span>{" "}
                      {(run.ai_commentary.pros || []).slice(0, 2).join(" ")}
                    </div>
                    {(run.ai_commentary.cons || []).length > 0 && (
                      <div className="text-ink">
                        <span className="text-waspada-text font-semibold">Kekurangan:</span>{" "}
                        {run.ai_commentary.cons.slice(0, 2).join(" ")}
                      </div>
                    )}
                  </div>
                )}
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

      {/* Panel Validasi Lapangan (Cek Kesesuaian Prediksi AI vs Kondisi Aktual Kolam) & Ringkasan Panen */}
      <div className="bg-surface border border-line rounded-[6px] p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider mb-1">
              <ClipboardCheck className="w-4 h-4" />
              <span>Cek Kesesuaian Lapangan (Ground-Truth) &amp; Umpan Balik Panen</span>
            </div>
            <h3 className="text-[16px] font-semibold text-ink">
              Validasi Prediksi Random Forest di Lapangan (Sesuai vs Meleset)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Verifikasi apakah hasil prediksi AI sesuai dengan kondisi nyata kolam &amp; ikan lele. Koreksi yang tidak
              sesuai otomatis diberi bobot prioritas saat generate ulang model RF.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono tnum">
            <div className="px-3 py-1.5 rounded-[6px] bg-surface-2 border border-line">
              <span className="text-muted">Kesesuaian Lapangan: </span>
              <strong className="text-ink">
                {fieldStats?.match_rate_pct !== null && fieldStats?.match_rate_pct !== undefined
                  ? `${fieldStats.match_rate_pct}%`
                  : "-"}
              </strong>{" "}
              <span className="text-muted">({fieldStats?.matched ?? 0}/{fieldStats?.total ?? 0})</span>
            </div>
            <div className="px-3 py-1.5 rounded-[6px] bg-surface-2 border border-line inline-flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-brand" />
              <span className="text-muted">Panen:</span>
              <strong className="text-ink">{harvestSummary?.completed_cycles ?? 0} siklus</strong>
              {harvestSummary?.avg_mortality_rate_pct !== null && harvestSummary?.avg_mortality_rate_pct !== undefined && (
                <span className="text-muted">(Matī {harvestSummary.avg_mortality_rate_pct}%)</span>
              )}
            </div>
          </div>
        </div>

        {/* Daftar Prediksi Terbaru untuk Validasi 1-Klik */}
        {recentPredsForValidation.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-ink">
              Prediksi Live Terbaru — Klik untuk Cek Kesesuaian di Lapangan
            </div>
            <div className="overflow-x-auto border border-line rounded-[6px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-muted uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-3 py-2">Kolam / Alat</th>
                    <th className="px-3 py-2">Parameter</th>
                    <th className="px-3 py-2">Prediksi AI</th>
                    <th className="px-3 py-2 text-right">Kondisi Aktual di Lapangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentPredsForValidation.slice(0, 6).map((item) => (
                    <tr key={item.prediction_id} className="hover:bg-surface-2/30">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-ink">{item.pond_name}</div>
                        <div className="text-[10.5px] font-mono text-muted">{item.device_code}</div>
                      </td>
                      <td className="px-3 py-2 font-mono tnum text-[11px] text-ink">
                        pH {item.ph} · {item.temperature_c}°C · TDS {item.tds_ppm ?? "-"} · Turb {item.turbidity_ntu ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-semibold ${
                            item.predicted_risk === "AMAN"
                              ? "bg-aman-bg text-aman-text"
                              : item.predicted_risk === "WASPADA"
                              ? "bg-waspada-bg text-waspada-text"
                              : "bg-bahaya-bg text-bahaya-text"
                          }`}
                        >
                          {item.predicted_risk}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {item.already_validated ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-aman-text font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sudah Dicek
                          </span>
                        ) : (
                          <div className="inline-flex flex-wrap justify-end gap-1">
                            <button
                              type="button"
                              disabled={busyAction === `fv-${item.prediction_id}`}
                              onClick={() => handleQuickFieldValidate(item, item.predicted_risk)}
                              className="h-7 px-2 bg-aman-bg text-aman-text rounded-[4px] text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Sesuai ({item.predicted_risk})
                            </button>
                            {(["AMAN", "WASPADA", "BAHAYA"] as RiskLevel[])
                              .filter((r) => r !== item.predicted_risk)
                              .map((alt) => (
                                <button
                                  key={alt}
                                  type="button"
                                  disabled={busyAction === `fv-${item.prediction_id}`}
                                  onClick={() => handleQuickFieldValidate(item, alt)}
                                  className="h-7 px-2 bg-surface-2 hover:bg-bahaya-bg hover:text-bahaya-text border border-line rounded-[4px] text-[10.5px] font-semibold cursor-pointer"
                                >
                                  Aktual: {alt}
                                </button>
                              ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Form Input Cek Lapangan Manual */}
        <form onSubmit={handleManualFieldValidate} className="p-4 bg-surface-2/60 border border-line rounded-[6px] space-y-3">
          <div className="text-xs font-semibold text-ink">Input Validasi Lapangan Manual</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 items-end">
            <div className="col-span-2">
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Alat / Kolam</label>
              <select
                value={fvDeviceId}
                onChange={(e) => setFvDeviceId(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs text-ink"
              >
                <option value="">Kolam Manual</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.pond_name} ({d.device_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">pH</label>
              <input
                type="number"
                step="0.01"
                required
                value={fvPh}
                onChange={(e) => setFvPh(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Suhu (°C)</label>
              <input
                type="number"
                step="0.1"
                required
                value={fvTemp}
                onChange={(e) => setFvTemp(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">TDS</label>
              <input
                type="number"
                value={fvTds}
                onChange={(e) => setFvTds(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Turbidity</label>
              <input
                type="number"
                step="0.1"
                value={fvTurb}
                onChange={(e) => setFvTurb(e.target.value)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs tnum text-ink"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Prediksi AI</label>
              <select
                value={fvPredictedRisk}
                onChange={(e) => setFvPredictedRisk(e.target.value as RiskLevel)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs text-ink"
              >
                <option value="AMAN">AMAN</option>
                <option value="WASPADA">WASPADA</option>
                <option value="BAHAYA">BAHAYA</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-muted mb-1">Aktual Kolam</label>
              <select
                value={fvActualRisk}
                onChange={(e) => setFvActualRisk(e.target.value as RiskLevel)}
                className="w-full h-8 px-2 rounded-[4px] bg-surface border border-line text-xs font-semibold text-ink"
              >
                <option value="AMAN">AMAN</option>
                <option value="WASPADA">WASPADA</option>
                <option value="BAHAYA">BAHAYA</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Catatan kondisi lapangan (contoh: ikan aktif makan, air jernih / ikan megap-megap di permukaan)"
              value={fvNotes}
              onChange={(e) => setFvNotes(e.target.value)}
              className="flex-1 h-8 px-2.5 rounded-[4px] bg-surface border border-line text-xs text-ink"
            />
            <button
              type="submit"
              disabled={busyAction === "fv-manual"}
              className="h-8 px-3.5 bg-brand text-brand-ink rounded-[4px] text-xs font-semibold cursor-pointer disabled:opacity-50 shrink-0"
            >
              {busyAction === "fv-manual" ? "Menyimpan..." : "Simpan Cek Lapangan"}
            </button>
          </div>
        </form>

        {/* Riwayat Validasi Lapangan */}
        {fieldValidations.length > 0 && (
          <div className="overflow-x-auto border border-line rounded-[6px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2 text-muted uppercase text-[10px] font-semibold">
                <tr>
                  <th className="px-3 py-2">Kolam &amp; Parameter</th>
                  <th className="px-3 py-2">Prediksi → Aktual</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Catatan</th>
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {fieldValidations.slice(0, 10).map((fv) => (
                  <tr key={fv.id} className="hover:bg-surface-2/30">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-ink">{fv.pond_name || fv.device_code}</div>
                      <div className="text-[10.5px] font-mono tnum text-muted">
                        pH {fv.ph} · {fv.temperature_c}°C · {fv.validated_by}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      <span>{fv.predicted_risk}</span> → <strong className="text-ink">{fv.actual_risk}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {fv.is_match ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-aman-bg text-aman-text text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          SESUAI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bahaya-bg text-bahaya-text text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" />
                          KOREKSI
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted max-w-xs truncate" title={fv.field_notes || ""}>
                      {fv.field_notes || "-"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={busyAction === `fv-del-${fv.id}`}
                        onClick={() => handleDeleteFieldValidation(fv.id)}
                        className="h-6 px-2 bg-bahaya-bg text-bahaya-text rounded-[4px] inline-flex items-center cursor-pointer"
                        title="Hapus validasi"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            {[
              { label: "Uji POST /api/ml/predict", endpoint: "/api/ml/predict", method: "POST" as const, withToken: true },
              { label: "Uji GET /api/ml/status", endpoint: "/api/ml/status", method: "GET" as const, withToken: false },
              { label: "Uji GET /api/ml/performance", endpoint: "/api/ml/performance?hours=24", method: "GET" as const, withToken: false },
            ].map((btn) => {
              const isSelected = apiTestResult?.endpoint === `${btn.method} ${btn.endpoint}`;
              return (
                <button
                  key={btn.endpoint}
                  type="button"
                  onClick={() => runMlApiTest(btn.endpoint, btn.method, btn.withToken)}
                  className={`h-8 px-3 rounded-[4px] border text-xs font-semibold cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-brand text-brand-ink border-brand"
                      : "bg-surface hover:bg-brand/10 border-line text-ink"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
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
