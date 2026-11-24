import { useState, useEffect } from "react";
import { Head, Link } from "@inertiajs/react";
import {
  LayoutDashboard,
  LineChart,
  Bell,
  Power,
  Cpu,
  FileSpreadsheet,
  Moon,
  Sun,
  AlertTriangle,
  WifiOff,
  ZapOff,
  Activity,
  ShieldCheck,
  Radio,
} from "lucide-react";

import { StatusCard } from "@/Components/StatusCard";
import { ParameterCard } from "@/Components/ParameterCard";
import { StatusBadge } from "@/Components/StatusBadge";
import { PredictionPanel } from "@/Components/PredictionPanel";
import { AeratorControlDialog } from "@/Components/AeratorControlDialog";
import { ChartsSection } from "@/Components/ChartsSection";
import { AlertsSection } from "@/Components/AlertsSection";
import { ExportSection } from "@/Components/ExportSection";

import type {
  SensorReading,
  PredictionResult,
  AlertItem,
  DeviceInfo,
} from "@/Types";

import {
  getOverallStatus,
  getParameterStatus,
  formatRelativeTime,
} from "@/lib/formatters";

type TabId = "ringkasan" | "grafik" | "peringatan" | "aerator" | "prediksi" | "ekspor";
type Role = "PEMILIK" | "OPERATOR" | "ANALIS" | "ADMIN";
type DataSimState =
  | "NORMAL"
  | "WASPADA"
  | "BAHAYA"
  | "BASI"
  | "OFFLINE"
  | "PLN_PADAM"
  | "WATCHDOG";
type PondSlot = "P01" | "P02" | "P03" | "P04";

const POND_OPTIONS: { id: PondSlot; label: string; offsetPh: number; offsetTemp: number; offsetTds: number; offsetTurb: number }[] = [
  { id: "P01", label: "Kolam Terpal 1 (P01)", offsetPh: 0, offsetTemp: 0, offsetTds: 0, offsetTurb: 0 },
  { id: "P02", label: "Kolam Terpal 2 (P02)", offsetPh: -0.18, offsetTemp: 0.4, offsetTds: 35, offsetTurb: 9 },
  { id: "P03", label: "Kolam Terpal 3 (P03)", offsetPh: -0.35, offsetTemp: 0.9, offsetTds: 80, offsetTurb: 18 },
  { id: "P04", label: "Kolam Terpal 4 (P04)", offsetPh: 0.12, offsetTemp: -0.3, offsetTds: -25, offsetTurb: -5 },
];

interface DemoPageProps {
  initialRole?: Role;
  allReadings?: SensorReading[];
  currentReading?: SensorReading;
  prediction?: PredictionResult;
  alerts?: AlertItem[];
  device?: DeviceInfo;
}

export default function Demo({
  initialRole = "OPERATOR",
  allReadings: serverReadings = [],
  currentReading: serverReading,
  prediction: serverPrediction,
  alerts: serverAlerts = [],
  device: serverDevice,
}: DemoPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ringkasan");
  const [role, setRole] = useState<Role>(initialRole);
  const [simState, setSimState] = useState<DataSimState>("NORMAL");
  const [selectedPond, setSelectedPond] = useState<PondSlot>("P01");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isControlModalOpen, setIsControlModalOpen] = useState<boolean>(false);

  // Aerator runtime state
  const [aeratorState, setAeratorState] = useState<{
    isOn: boolean;
    mode: "AUTO" | "MANUAL" | "FAILSAFE";
    dailyDuration: string;
  }>({
    isOn: serverReading?.aerator_on ?? false,
    mode: serverReading?.mode ?? "AUTO",
    dailyDuration: "3 jam 20 menit",
  });

  // Baca query parameter ?role=... dari URL jika diakses dari panel login
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("role")?.toUpperCase();
      if (r === "ADMIN" || r === "OPERATOR" || r === "ANALIS" || r === "PEMILIK") {
        setRole(r as Role);
      }
    }
  }, []);

  // Dark mode effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.setAttribute("data-theme", "light");
    }
  }, [isDarkMode]);

  const pondMeta = POND_OPTIONS.find((p) => p.id === selectedPond) || POND_OPTIONS[0];
  const hubCode = serverDevice?.device_code || "BW-CORE-SIM01";

  const baseReading: SensorReading = serverReading || {
    id: 1,
    device_id: hubCode,
    pond_id: selectedPond,
    ts: new Date().toISOString(),
    ph: 7.12,
    temperature_c: 28.4,
    tds_ppm: 345,
    turbidity_ntu: 43.0,
    water_level: "NORMAL",
    aerator_on: false,
    pump_on: false,
    mode: "AUTO",
    sensor_health: "OK",
    power_source: "PLN",
  };

  const basePh = Number(((baseReading.ph ?? 7.12) + pondMeta.offsetPh).toFixed(2));
  const baseTemp = Number(((baseReading.temperature_c ?? 28.4) + pondMeta.offsetTemp).toFixed(1));
  const baseTds = Math.max(150, Math.round((baseReading.tds_ppm ?? 345) + pondMeta.offsetTds));
  const baseTurb = Math.max(10, Number(((baseReading.turbidity_ntu ?? 43.0) + pondMeta.offsetTurb).toFixed(1)));

  // Derive dynamic current reading based on simulation state and selected pond
  const currentReading: SensorReading = {
    ...baseReading,
    device_id: hubCode,
    pond_id: selectedPond,
    ph:
      simState === "BAHAYA"
        ? 5.82
        : simState === "WASPADA"
        ? 6.46
        : basePh,
    temperature_c:
      simState === "BAHAYA"
        ? 33.4
        : simState === "WASPADA"
        ? 32.2
        : baseTemp,
    tds_ppm:
      simState === "BAHAYA" ? 820 : simState === "WASPADA" ? 640 : baseTds,
    turbidity_ntu:
      simState === "WATCHDOG"
        ? null
        : simState === "BAHAYA"
        ? 125
        : simState === "WASPADA"
        ? 85
        : baseTurb,
    ts:
      simState === "BASI"
        ? new Date(Date.now() - 7 * 60000).toISOString()
        : baseReading.ts,
    aerator_on:
      simState === "PLN_PADAM"
        ? false
        : simState === "BAHAYA"
        ? true
        : aeratorState.isOn,
    pump_on: simState === "PLN_PADAM" ? false : simState === "BAHAYA",
    mode:
      simState === "BAHAYA"
        ? "FAILSAFE"
        : aeratorState.mode,
    sensor_health: simState === "WATCHDOG" ? "SATURATED" : "OK",
    power_source: simState === "PLN_PADAM" ? "BACKUP_BUFFER" : "PLN",
  };

  const dynamicPrediction: PredictionResult = {
    risk:
      simState === "BAHAYA"
        ? "BAHAYA"
        : simState === "WASPADA"
        ? "WASPADA"
        : serverPrediction?.risk || "AMAN",
    p_aman: simState === "BAHAYA" ? 0.05 : simState === "WASPADA" ? 0.28 : 0.94,
    p_waspada: simState === "BAHAYA" ? 0.15 : simState === "WASPADA" ? 0.62 : 0.05,
    p_bahaya: simState === "BAHAYA" ? 0.8 : simState === "WASPADA" ? 0.1 : 0.01,
    model_version: serverPrediction?.model_version || "rf-edge-sim",
    timeframe: serverPrediction?.timeframe || "1-3 jam",
    pond_id: selectedPond,
    is_pilot_model: true,
    hitl_approved: true,
    triggers:
      simState === "BAHAYA"
        ? [`${pondMeta.label}: pH anjlok ke 5,82 di bawah ambang kritis 6,0`]
        : simState === "WASPADA"
        ? [`${pondMeta.label}: Suhu naik di atas 32 C dalam 1 jam terakhir`]
        : simState === "WATCHDOG"
        ? ["Sensor Turbidity diisolasi Watchdog (SATURATED/FAULT); evaluasi memakai pH, Suhu, TDS"]
        : [],
    recommended_action:
      simState === "BAHAYA"
        ? "Segera lakukan pengapuran dolomit dan tambahkan air bersih segar."
        : simState === "PLN_PADAM"
        ? "PLN padam: nyalakan genset/inverter untuk aerator AC 220V atau lakukan pergantian air darurat."
        : simState === "WATCHDOG"
        ? "Seka lensa sensor kekeruhan di stilling well PVC dan konfirmasi bilas mingguan via WeningBot WA."
        : serverPrediction?.recommended_action ||
          "Klaster 4 kolam lele stabil sesuai SNI. Always-On Cloud & Offline-Plus Rp0 aktif.",
  };

  const overall = getOverallStatus(currentReading, dynamicPrediction);
  const paramStatus = getParameterStatus(currentReading);

  // Sparklines from last 72 readings (6h)
  const last6h = serverReadings.slice(-72);
  const phSparkline = last6h.map((r) => (r.ph || 7.0) + pondMeta.offsetPh);
  const tempSparkline = last6h.map((r) => (r.temperature_c || 28.0) + pondMeta.offsetTemp);
  const tdsSparkline = last6h.map((r) => (r.tds_ppm || 350) + pondMeta.offsetTds);
  const turbSparkline = last6h.map((r) => (r.turbidity_ntu || 40) + pondMeta.offsetTurb);

  const getStatusLabel = (status: "normal" | "waspada" | "bahaya") => {
    if (status === "normal") return "Normal";
    if (status === "waspada") return "Mendekati batas";
    return "Di luar batas";
  };

  // Handler for aerator control
  const handleApplyControl = async (
    action: "ON" | "OFF" | "AUTO",
    _durationMin: number
  ): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (simState === "PLN_PADAM") {
      throw new Error("PLN_OFF");
    }

    if (action === "AUTO") {
      setAeratorState((prev) => ({
        ...prev,
        isOn:
          currentReading.ph !== null &&
          (currentReading.ph < 6.85 || (currentReading.temperature_c ?? 0) > 29.5),
        mode: "AUTO",
      }));
    } else {
      setAeratorState((prev) => ({
        ...prev,
        isOn: action === "ON",
        mode: "MANUAL",
      }));
    }
    return true;
  };

  return (
    <div className="min-h-[100svh] bg-bg text-ink flex flex-col md:flex-row font-sans selection:bg-brand selection:text-brand-ink">
      <Head title="Demo Dashboard (1 Hub : 4 Kolam)" />

      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (>= 768px, 250px width)               */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-[250px] flex-col justify-between border-r border-line bg-surface p-4 flex-shrink-0 min-h-[100svh] sticky top-0 h-[100dvh] overflow-y-auto">
        <div className="space-y-5">
          {/* Logo brand */}
          <div className="pt-2 px-2">
            <Link href="/" className="inline-block" aria-label="Beranda BanyuWening">
              <img
                src={isDarkMode ? "/brand/horizontal-gelap.svg" : "/brand/horizontal.svg"}
                alt="BanyuWening Logo"
                width={160}
                height={38}
              />
            </Link>
          </div>

          {/* Pond Selector (1 Core Hub : 4 Kolam) */}
          <div className="px-1">
            <label
              htmlFor="desktop-pond-select"
              className="text-[11px] font-semibold tracking-wider text-muted uppercase block mb-1.5"
            >
              Core Hub (1 : 4 Kolam)
            </label>
            <select
              id="desktop-pond-select"
              value={selectedPond}
              onChange={(e) => setSelectedPond(e.target.value as PondSlot)}
              className="w-full min-h-[44px] bg-surface-2 border border-line rounded-[6px] px-3 py-2 text-[13px] font-semibold text-ink cursor-pointer"
            >
              {POND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-muted mt-1 px-1">
              Hub: {hubCode} (3x ADS1115 + MCP23017)
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Navigasi Dashboard Demo">
            <button
              type="button"
              onClick={() => setActiveTab("ringkasan")}
              className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "ringkasan"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span>Ringkasan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("grafik")}
              className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "grafik"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <LineChart className="w-4 h-4" aria-hidden="true" />
              <span>Grafik Sensor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("peringatan")}
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "peringatan"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" aria-hidden="true" />
                <span>Peringatan</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === "peringatan"
                    ? "bg-brand-ink text-brand"
                    : "bg-surface-2 text-muted"
                }`}
              >
                {serverAlerts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("aerator")}
              className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "aerator"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <Power className="w-4 h-4" aria-hidden="true" />
              <span>Relay 8-Ch & Aerator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("prediksi")}
              className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "prediksi"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <Cpu className="w-4 h-4" aria-hidden="true" />
              <span>Prediksi ML & HITL</span>
            </button>

            {(role === "ANALIS" || role === "ADMIN") && (
              <button
                type="button"
                onClick={() => setActiveTab("ekspor")}
                className={`w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                  activeTab === "ekspor"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                <span>Ekspor CSV</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer: Scenario, Role & Theme Switchers */}
        <div className="pt-4 border-t border-line space-y-3">
          <div>
            <label
              htmlFor="desktop-sim-state"
              className="flex items-center gap-1 text-[11px] font-semibold uppercase text-muted tracking-wider mb-1 px-1"
            >
              <Radio className="w-3 h-3 text-brand" aria-hidden="true" />
              <span>Uji State Lapangan</span>
            </label>
            <select
              id="desktop-sim-state"
              value={simState}
              onChange={(e) => setSimState(e.target.value as DataSimState)}
              className="w-full min-h-[44px] bg-surface-2 border border-line rounded-[6px] py-2 px-2.5 text-[13px] font-medium text-ink cursor-pointer"
            >
              <option value="NORMAL">Normal (Aman)</option>
              <option value="WASPADA">Waspada (Suhu/pH naik)</option>
              <option value="BAHAYA">Bahaya (pH 5,82 kritis)</option>
              <option value="OFFLINE">WiFi Mati (Offline-Plus Rp0)</option>
              <option value="PLN_PADAM">PLN Padam (Edge Watchdog)</option>
              <option value="WATCHDOG">Watchdog (Turbidity Lumut)</option>
              <option value="BASI">Basi (Data &gt; 2 Menit)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="desktop-role-select"
              className="text-[11px] font-semibold uppercase text-muted tracking-wider mb-1 px-1 block"
            >
              Peran Akun
            </label>
            <select
              id="desktop-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full min-h-[44px] bg-surface-2 border border-line rounded-[6px] py-2 px-2.5 text-[13px] font-medium text-ink cursor-pointer"
            >
              <option value="PEMILIK">Pemilik (Petambak)</option>
              <option value="OPERATOR">Operator Kolam</option>
              <option value="ANALIS">Analis Akuakultur</option>
              <option value="ADMIN">Super Administrator</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="min-h-[44px] px-3 py-2 border border-line rounded-[6px] text-muted hover:text-ink hover:bg-surface-2 transition-colors flex items-center gap-1.5 text-[13px] cursor-pointer"
              aria-label="Toggle tema gelap/terang"
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 text-[#F2C46B]" aria-hidden="true" />
              ) : (
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isDarkMode ? "Terang" : "Gelap"}</span>
            </button>

            <Link
              href="/"
              className="min-h-[44px] inline-flex items-center px-2 text-[13px] text-muted hover:text-brand transition-colors font-medium"
            >
              Beranda
            </Link>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA                                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Mobile Header */}
        <header className="md:hidden h-14 border-b border-line bg-surface px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" aria-label="BanyuWening">
              <img
                src={isDarkMode ? "/brand/logogram-gelap.svg" : "/brand/logogram.svg"}
                alt=""
                width={26}
                height={32}
              />
            </Link>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-ink truncate">
                {pondMeta.label}
              </div>
              <div className="text-[11px] text-muted truncate">
                {simState === "OFFLINE"
                  ? "WiFi Mati (Offline-Plus)"
                  : simState === "PLN_PADAM"
                  ? "PLN Padam (Edge Watchdog)"
                  : "Core Hub Online"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={simState}
              onChange={(e) => setSimState(e.target.value as DataSimState)}
              aria-label="Pilih Skenario Uji Data Kolam (Mobile)"
              className="min-h-[44px] bg-surface-2 border border-line rounded px-2.5 py-2 text-[12px] text-ink cursor-pointer"
            >
              <option value="NORMAL">Normal</option>
              <option value="WASPADA">Waspada</option>
              <option value="BAHAYA">Bahaya</option>
              <option value="OFFLINE">WiFi Mati</option>
              <option value="PLN_PADAM">PLN Padam</option>
              <option value="WATCHDOG">Watchdog</option>
              <option value="BASI">Basi</option>
            </select>

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="min-h-[44px] min-w-[44px] p-2 rounded border border-line text-muted hover:text-ink flex items-center justify-center cursor-pointer"
              aria-label="Toggle tema gelap/terang"
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-[#F2C46B]" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {/* Demo Sandbox Top Banner */}
          <div className="mb-6 p-4 bg-surface border border-line rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="text-ink">
                  Simulasi BanyuWening : Core Hub (1 Hub : 4 Kolam) &amp; Always-On Cloud
                </strong>
                <p className="text-muted text-[12px] mt-0.5">
                  Data demonstrasi dengan Edge Watchdog &amp; Auto-Resume, Multi-ADS1115 + MCP23017, WeningBot WhatsApp-First + Telegram, dan mode Offline-Plus Rp0.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="min-h-[44px] px-4 py-2 bg-brand text-brand-ink font-semibold rounded-[6px] text-[13px] hover:opacity-90 transition-opacity whitespace-nowrap self-start sm:self-center inline-flex items-center"
            >
              Masuk Dashboard Utama
            </Link>
          </div>

          {/* Mobile Pond & Role Selector */}
          <div className="md:hidden mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="mobile-pond-select" className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                Pilih Kolam (1 Hub : 4 Kolam)
              </label>
              <select
                id="mobile-pond-select"
                value={selectedPond}
                onChange={(e) => setSelectedPond(e.target.value as PondSlot)}
                className="w-full min-h-[44px] bg-surface border border-line rounded-[6px] px-3 py-2 text-[13px] font-semibold text-ink"
              >
                {POND_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mobile-role-select" className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                Uji Tampilan Peran Akun
              </label>
              <select
                id="mobile-role-select"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full min-h-[44px] bg-surface border border-line rounded-[6px] px-3 py-2 text-[13px] font-semibold text-ink"
              >
                <option value="PEMILIK">Pemilik (Petambak)</option>
                <option value="OPERATOR">Operator Kolam</option>
                <option value="ANALIS">Analis Akuakultur</option>
                <option value="ADMIN">Super Administrator</option>
              </select>
            </div>
          </div>

          {/* Scenario Alert Banners */}
          {simState === "BASI" && (
            <div className="mb-6 p-3.5 bg-surface-2 border border-line rounded-[6px] flex items-center gap-2.5 text-[13px] text-muted">
              <AlertTriangle className="w-4 h-4 text-waspada-text flex-shrink-0" aria-hidden="true" />
              <span>
                <strong>Data Terlambat:</strong> Pembacaan terakhir diterima 7 menit lalu. Menunggu paket telemetri baru dari kolam.
              </span>
            </div>
          )}

          {simState === "OFFLINE" && (
            <div className="mb-6 p-3.5 bg-waspada-bg border border-waspada/40 rounded-[6px] flex items-center gap-2.5 text-[13px] text-waspada-text">
              <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                <strong>WiFi Kolam Terputus (Offline-Plus Rp0 Aktif):</strong> Edge Fuzzy, RTC DS3231, dan LittleFS Store-and-Forward tetap menggerakkan aerator/pompa secara lokal tanpa mengunci alat (Anti-Bricking).
              </span>
            </div>
          )}

          {simState === "PLN_PADAM" && (
            <div className="mb-6 p-3.5 bg-bahaya-bg border border-bahaya/40 rounded-[6px] flex items-center gap-2.5 text-[13px] text-bahaya-text">
              <ZapOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                <strong>Listrik PLN 220V Padam:</strong> Edge Watchdog &amp; Auto-Resume mengunci log LittleFS 72 jam dan menyiapkan sinkronisasi otomatis saat daya pulih. Aerator &amp; pompa AC 220V tidak berjalan tanpa genset/inverter eksternal.
              </span>
            </div>
          )}

          {simState === "WATCHDOG" && (
            <div className="mb-6 p-3.5 bg-waspada-bg border border-waspada/40 rounded-[6px] flex items-center gap-2.5 text-[13px] text-waspada-text">
              <Activity className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                <strong>Sensor Health Watchdog Aktif (SATURATED/FAULT):</strong> Lensa kekeruhan terdeteksi jenuh lumut dan diisolasi otomatis (graceful degradation). Pengingat bilas mingguan dikirim ke WeningBot WhatsApp.
              </span>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 1: RINGKASAN                                     */}
          {/* ==================================================== */}
          {activeTab === "ringkasan" && (
            <div className={`space-y-6 ${simState === "BASI" ? "opacity-60 transition-opacity" : ""}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-[24px] leading-[30px] font-display">
                  Ringkasan : {pondMeta.label}
                </h1>
                <div className="text-[12px] text-muted">
                  Data diperbarui {formatRelativeTime(currentReading.ts)}
                </div>
              </div>

              <StatusCard
                level={
                  simState === "PLN_PADAM"
                    ? "BAHAYA"
                    : simState === "OFFLINE"
                    ? "offline"
                    : simState === "BASI"
                    ? "basi"
                    : overall.level
                }
                title={
                  simState === "PLN_PADAM"
                    ? "Listrik PLN padam, Edge Watchdog siaga"
                    : simState === "OFFLINE"
                    ? "WiFi terputus, Edge Fuzzy lokal aktif"
                    : simState === "BASI"
                    ? "Data terlambat"
                    : simState === "WATCHDOG"
                    ? "Sensor kekeruhan diisolasi Watchdog"
                    : overall.title
                }
                subtitle={
                  simState === "PLN_PADAM"
                    ? "Log LittleFS bertahan lokal. Segera nyalakan genset/inverter untuk aerator AC 220V."
                    : simState === "OFFLINE"
                    ? "Store-and-Forward LittleFS mencatat telemetri dan menjaga aktuator otomatis (Offline-Plus Rp0)."
                    : simState === "BASI"
                    ? "Data terakhir diterima 7 menit lalu."
                    : simState === "WATCHDOG"
                    ? "Parameter pH, Suhu, dan TDS tetap dipantau normal tanpa alarm palsu."
                    : `Diperbarui ${formatRelativeTime(currentReading.ts)}`
                }
                prediction={{
                  risk: dynamicPrediction.risk,
                  timeframe: dynamicPrediction.timeframe,
                }}
              />

              {/* Grid Parameter */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wider">
                    Parameter Kualitas Air ({selectedPond})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("grafik")}
                    className="min-h-[44px] px-2 inline-flex items-center text-[13px] text-brand hover:underline font-medium cursor-pointer"
                  >
                    Buka grafik lengkap
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <ParameterCard
                    label="pH (Consumable 4-6 Bln)"
                    value={currentReading.ph}
                    unit=""
                    status={paramStatus.ph}
                    statusLabel={getStatusLabel(paramStatus.ph)}
                    sparklineData={phSparkline}
                  />

                  <ParameterCard
                    label="Suhu (DS18B20)"
                    value={currentReading.temperature_c}
                    unit="°C"
                    status={paramStatus.temperature_c}
                    statusLabel={getStatusLabel(paramStatus.temperature_c)}
                    sparklineData={tempSparkline}
                  />

                  <ParameterCard
                    label="TDS (MOSFET Switch)"
                    value={currentReading.tds_ppm}
                    unit="ppm"
                    status={paramStatus.tds_ppm}
                    statusLabel={getStatusLabel(paramStatus.tds_ppm)}
                    sparklineData={tdsSparkline}
                  />

                  <ParameterCard
                    label="Kekeruhan (Stilling Well PVC)"
                    value={currentReading.turbidity_ntu}
                    unit="NTU"
                    status={paramStatus.turbidity_ntu}
                    statusLabel={
                      simState === "WATCHDOG"
                        ? "Diisolasi Watchdog"
                        : getStatusLabel(paramStatus.turbidity_ntu)
                    }
                    sparklineData={turbSparkline}
                  />

                  {/* Level Air */}
                  <div className="bg-surface border border-line rounded-[6px] p-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="text-[13px] leading-[18px] font-medium text-muted mb-1">
                        Level Air Kolam ({selectedPond})
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-[34px] md:text-[40px] leading-[1.1] font-semibold tnum text-ink">
                          {currentReading.water_level === "NORMAL" ? "Aman" : "Surut"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <StatusBadge
                          level={currentReading.water_level === "NORMAL" ? "aman" : "bahaya"}
                        >
                          {currentReading.water_level === "NORMAL"
                            ? "Pelampung Normal"
                            : "Level Air Kritis"}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-line/50 text-[11px] text-muted">
                      <span>MCP23017 GPIO Expander</span>
                      <span className="font-semibold text-ink">GX16 Port {selectedPond}</span>
                    </div>
                  </div>

                  {/* Quick Prediction Summary */}
                  <div className="bg-surface border border-line rounded-[6px] p-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="text-[13px] leading-[18px] font-medium text-muted mb-1">
                        Prediksi Risiko (1-3 Jam)
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span
                          className={`text-[34px] md:text-[40px] leading-[1.1] font-semibold tnum ${
                            dynamicPrediction.risk === "AMAN"
                              ? "text-aman"
                              : dynamicPrediction.risk === "WASPADA"
                              ? "text-waspada"
                              : "text-bahaya"
                          }`}
                        >
                          {dynamicPrediction.risk === "AMAN"
                            ? "Aman"
                            : dynamicPrediction.risk === "WASPADA"
                            ? "Waspada"
                            : "Bahaya"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <StatusBadge
                          level={
                            dynamicPrediction.risk === "AMAN"
                              ? "aman"
                              : dynamicPrediction.risk === "WASPADA"
                              ? "waspada"
                              : "bahaya"
                          }
                        >
                          {Math.round(
                            (dynamicPrediction.risk === "AMAN"
                              ? dynamicPrediction.p_aman
                              : dynamicPrediction.risk === "WASPADA"
                              ? dynamicPrediction.p_waspada
                              : dynamicPrediction.p_bahaya) * 100
                          )}
                          % Kemungkinan
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-line/50 text-[11px]">
                      <span className="text-muted">Random Forest + HITL Gate</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("prediksi")}
                        className="min-h-[44px] px-2 inline-flex items-center text-brand hover:underline font-semibold cursor-pointer"
                      >
                        Lihat rincian
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris Kedua: Aerator & Core Hub Specs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-surface border border-line rounded-[6px] p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-semibold text-ink">
                      Relay 8-Ch Optocoupler : Aerator & Pompa ({selectedPond})
                    </h3>
                    <span className="text-[14px] font-semibold text-ink">
                      {simState === "PLN_PADAM"
                        ? "Mati (PLN Padam)"
                        : currentReading.aerator_on
                        ? "Menyala (ON)"
                        : "Mati (OFF)"}
                    </span>
                  </div>

                  <p className="text-[13px] text-muted mb-4">
                    Mode:{" "}
                    <strong>
                      {simState === "PLN_PADAM"
                        ? "PLN Padam (Aerator AC 220V butuh genset/inverter)"
                        : currentReading.mode === "AUTO"
                        ? "Otomatis (Edge Fuzzy + Safety Clamp)"
                        : currentReading.mode === "MANUAL"
                        ? "Kendali Manual Operator"
                        : "Pengaman Perangkat (Failsafe ESP32)"}
                    </strong>
                    {" · "}
                    Total menyala: {aeratorState.dailyDuration} hari ini
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    {role === "PEMILIK" ? (
                      <span className="text-[12px] text-muted">
                        Mode pantau saja. Kendali aktuator dikelola oleh Operator.
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsControlModalOpen(true)}
                        className="min-h-[44px] px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Atur Aerator</span>
                      </button>
                    )}
                    <span className="text-[12px] text-muted">
                      Notifikasi: WeningBot WhatsApp-First + Telegram
                    </span>
                  </div>
                </div>

                {/* Kartu Core Hub */}
                <div className="bg-surface border border-line rounded-[6px] p-5 space-y-2">
                  <h3 className="text-[15px] font-semibold text-ink">
                    Core Hub (1 Hub : 4 Kolam)
                  </h3>
                  <div>
                    <StatusBadge
                      level={
                        simState === "OFFLINE"
                          ? "offline"
                          : simState === "PLN_PADAM"
                          ? "waspada"
                          : "aman"
                      }
                    >
                      {simState === "OFFLINE"
                        ? "Offline-Plus Rp0 Aktif"
                        : simState === "PLN_PADAM"
                        ? "Edge Watchdog + Auto-Resume"
                        : "EMQX TLS Online"}
                    </StatusBadge>
                  </div>
                  <div className="text-[12px] text-muted leading-[19px] pt-1">
                    <div>Firmware: <strong>{serverDevice?.firmware_version || "edge-fuzzy-demo"}</strong></div>
                    <div>ID: <strong>{hubCode}</strong></div>
                    <div>ADC & Expander: <strong>3x ADS1115 (12-Ch) + MCP23017</strong></div>
                    <div>Ketahanan: <strong>LittleFS 72 Jam &amp; Anti-Bricking</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: GRAFIK SENSOR                                 */}
          {/* ==================================================== */}
          {activeTab === "grafik" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Grafik Riwayat Kualitas Air ({pondMeta.label})
                </h1>
                <p className="text-[13px] text-muted">
                  Empat parameter air tersinkronisasi pada sumbu waktu yang sama dengan pita batas aman SNI lele (Always-On Supabase Pro + agregasi 90 hari).
                </p>
              </div>

              <ChartsSection allReadings={serverReadings} />
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: PERINGATAN                                    */}
          {/* ==================================================== */}
          {activeTab === "peringatan" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Daftar Peringatan & WeningBot
                </h1>
                <p className="text-[13px] text-muted">
                  Log anomali air, peringatan Sensor Health Watchdog, dan pengiriman notifikasi WeningBot WhatsApp-First (&gt;90% Rule-Based Engine Rp0 LLM) + Telegram.
                </p>
              </div>

              <AlertsSection
                initialAlerts={serverAlerts}
                currentUserName={`Operator (${role})`}
                canAcknowledge={role !== "PEMILIK"}
              />
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: KONTROL AERATOR                               */}
          {/* ==================================================== */}
          {activeTab === "aerator" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Kendali Relay 8-Ch & Aerator ({pondMeta.label})
                </h1>
                <p className="text-[13px] text-muted">
                  Pengoperasian relay optocoupler 4-Ch/8-Ch untuk aerator & pompa AC 220V dengan Hard Safety Bounds serta catatan nyala harian.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface border border-line rounded-[6px] p-6">
                  <h3 className="text-[16px] font-semibold text-ink mb-2">
                    Kendali Cepat Aktuator
                  </h3>
                  <p className="text-[13px] text-muted mb-4">
                    Saat ini aerator berstatus{" "}
                    <strong>
                      {simState === "PLN_PADAM"
                        ? "MATI (PLN Padam)"
                        : currentReading.aerator_on
                        ? "MENYALA"
                        : "MATI"}
                    </strong>{" "}
                    dalam mode{" "}
                    <strong>
                      {currentReading.mode === "AUTO"
                        ? "Otomatis (Edge Fuzzy)"
                        : currentReading.mode === "MANUAL"
                        ? "Manual"
                        : "Pengaman (Failsafe)"}
                    </strong>
                    .
                  </p>

                  {role === "PEMILIK" ? (
                    <div className="p-3 bg-surface-2 rounded text-[13px] text-muted">
                      Akun Anda berperan sebagai <strong>Pemilik</strong> (hanya melihat). Ubah peran ke Operator atau Admin untuk melakukan kendali relay.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsControlModalOpen(true)}
                      className="min-h-[44px] px-6 bg-brand text-brand-ink rounded-[6px] text-[14px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Power className="w-4 h-4" aria-hidden="true" />
                      <span>Buka Dialog Kendali Aerator</span>
                    </button>
                  )}
                </div>

                <div className="bg-surface border border-line rounded-[6px] p-6">
                  <h3 className="text-[16px] font-semibold text-ink mb-2">
                    Prinsip Keamanan &amp; Ketahanan Edge
                  </h3>
                  <div className="space-y-2 text-[13px] text-muted leading-[19px]">
                    <p>
                      <strong>1. Edge Fuzzy &amp; Safety Clamp Lokal:</strong> Saat WiFi mati atau mode Offline-Plus Rp0, Core Hub tetap menyalakan relay sesuai batas aman dan membatasi duty-cycle.
                    </p>
                    <p>
                      <strong>2. Edge Watchdog &amp; Auto-Resume:</strong> LittleFS menyimpan telemetri 72 jam saat gangguan daya/jaringan dan memulihkan status pompa otomatis tanpa mengunci alat petambak.
                    </p>
                    <p>
                      <strong>3. HITL Engineer Gate:</strong> Perubahan parameter Fuzzy maupun Dual-OTA 60s rollback wajib disetujui Engineer secara manual (zero autonomous push).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 5: PREDIKSI ML DETAIL                            */}
          {/* ==================================================== */}
          {activeTab === "prediksi" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Prediksi Risiko & Cold-Start 4-Fase
                </h1>
                <p className="text-[13px] text-muted">
                  Model Random Forest per pond_id (1-3 jam ke depan) yang dikalibrasi memakai 2 DO Meter Portabel & Test Kit Amonia/Nitrit untuk mengatasi bias organ labirin ikan lele.
                </p>
              </div>

              <div className="max-w-2xl">
                <PredictionPanel prediction={dynamicPrediction} isDetailed={true} />
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 6: EKSPOR DATA CSV                               */}
          {/* ==================================================== */}
          {activeTab === "ekspor" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Ekspor Data Telemetri
                </h1>
                <p className="text-[13px] text-muted">
                  Unduh histori pembacaan sensor lengkap untuk keperluan analisis akuakultur dan audit lapangan.
                </p>
              </div>

              <ExportSection readings={serverReadings} userRole={role} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Navigasi Mobile Demo"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line px-1.5 pt-1.5 safe-bottom grid grid-cols-5 gap-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab("ringkasan")}
          aria-current={activeTab === "ringkasan" ? "page" : undefined}
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "ringkasan" ? "bg-brand text-brand-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" aria-hidden="true" />
          <span>Ringkasan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grafik")}
          aria-current={activeTab === "grafik" ? "page" : undefined}
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "grafik" ? "bg-brand text-brand-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          <LineChart className="w-4 h-4 mb-0.5" aria-hidden="true" />
          <span>Grafik</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("peringatan")}
          aria-current={activeTab === "peringatan" ? "page" : undefined}
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "peringatan" ? "bg-brand text-brand-ink font-semibold" : "text-muted hover:text-ink"
          }`}
        >
          <Bell className="w-4 h-4 mb-0.5" aria-hidden="true" />
          <span>Alert</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("aerator")}
          aria-current={activeTab === "aerator" ? "page" : undefined}
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "aerator"
              ? "bg-brand text-brand-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <Power className="w-4 h-4 mb-0.5" aria-hidden="true" />
          <span>Aerator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("prediksi")}
          aria-current={activeTab === "prediksi" ? "page" : undefined}
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "prediksi"
              ? "bg-brand text-brand-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <Cpu className="w-4 h-4 mb-0.5" aria-hidden="true" />
          <span>Prediksi</span>
        </button>
      </nav>

      {/* Aerator Control Modal / Bottom Sheet */}
      <AeratorControlDialog
        isOpen={isControlModalOpen}
        onClose={() => setIsControlModalOpen(false)}
        currentState={aeratorState}
        isWaterCritical={overall.level === "BAHAYA"}
        criticalReason={
          simState === "PLN_PADAM"
            ? "Listrik PLN 220V sedang padam (aerator membutuhkan daya AC 220V eksternal)"
            : overall.level === "BAHAYA"
            ? `${pondMeta.label} berada di luar batas aman`
            : undefined
        }
        onApplyControl={handleApplyControl}
      />
    </div>
  );
}
