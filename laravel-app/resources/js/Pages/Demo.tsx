import { useState, useEffect } from "react";
import { Link } from "@inertiajs/react";
import {
  LayoutDashboard,
  LineChart,
  Bell,
  Power,
  Cpu,
  FileSpreadsheet,
  Moon,
  Sun,
  ChevronDown,
  AlertTriangle,
  WifiOff,
  Sparkles,
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
  UserRole,
} from "@/Types";

import {
  getOverallStatus,
  getParameterStatus,
  formatRelativeTime,
} from "@/lib/formatters";

type TabId = "ringkasan" | "grafik" | "peringatan" | "aerator" | "prediksi" | "ekspor";
type Role = "PEMILIK" | "OPERATOR" | "ANALIS" | "ADMIN";
type DataSimState = "NORMAL" | "WASPADA" | "BAHAYA" | "BASI" | "OFFLINE";

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
}: DemoPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ringkasan");
  const [role, setRole] = useState<Role>(initialRole);
  const [simState, setSimState] = useState<DataSimState>("NORMAL");
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

  const baseReading: SensorReading = serverReading || {
    id: 1,
    device_id: "BANYUWENING-01",
    ts: new Date().toISOString(),
    ph: 7.12,
    temperature_c: 28.4,
    tds_ppm: 345,
    turbidity_ntu: 43.0,
    water_level: "NORMAL",
    aerator_on: false,
    mode: "AUTO",
  };

  // Derive dynamic current reading based on simulation state
  const currentReading: SensorReading = {
    ...baseReading,
    ph:
      simState === "BAHAYA"
        ? 5.82
        : simState === "WASPADA"
        ? 6.46
        : baseReading.ph,
    temperature_c:
      simState === "BAHAYA"
        ? 33.4
        : simState === "WASPADA"
        ? 32.2
        : baseReading.temperature_c,
    tds_ppm:
      simState === "BAHAYA" ? 820 : simState === "WASPADA" ? 640 : baseReading.tds_ppm,
    turbidity_ntu:
      simState === "BAHAYA" ? 125 : simState === "WASPADA" ? 85 : baseReading.turbidity_ntu,
    ts:
      simState === "BASI"
        ? new Date(Date.now() - 7 * 60000).toISOString()
        : baseReading.ts,
    aerator_on:
      simState === "BAHAYA" ? true : aeratorState.isOn,
    mode:
      simState === "BAHAYA"
        ? "FAILSAFE"
        : aeratorState.mode,
  };

  const dynamicPrediction: PredictionResult = {
    risk:
      simState === "BAHAYA"
        ? "BAHAYA"
        : simState === "WASPADA"
        ? "WASPADA"
        : "AMAN",
    p_aman: simState === "BAHAYA" ? 0.05 : simState === "WASPADA" ? 0.28 : 0.87,
    p_waspada: simState === "BAHAYA" ? 0.15 : simState === "WASPADA" ? 0.62 : 0.11,
    p_bahaya: simState === "BAHAYA" ? 0.8 : simState === "WASPADA" ? 0.1 : 0.02,
    model_version: "rf-v1.0.0",
    timeframe: "1–3 jam",
    triggers:
      simState === "BAHAYA"
        ? ["pH anjlok ke 5,82 di bawah ambang batas kritis 6,0"]
        : simState === "WASPADA"
        ? ["Suhu naik di atas 32 °C dalam 1 jam terakhir"]
        : [],
    recommended_action:
      simState === "BAHAYA"
        ? "Segera lakukan pengapuran dolomit dan tambahkan air bersih segar."
        : "Lanjutkan pemantauan normal.",
  };

  const overall = getOverallStatus(currentReading, dynamicPrediction);
  const paramStatus = getParameterStatus(currentReading);

  // Sparklines from last 72 readings (6h)
  const last6h = serverReadings.slice(-72);
  const phSparkline = last6h.map((r) => r.ph || 7.0);
  const tempSparkline = last6h.map((r) => r.temperature_c || 28.0);
  const tdsSparkline = last6h.map((r) => r.tds_ppm || 350);
  const turbSparkline = last6h.map((r) => r.turbidity_ntu || 40);

  const getStatusLabel = (status: "normal" | "waspada" | "bahaya") => {
    if (status === "normal") return "Normal";
    if (status === "waspada") return "Mendekati batas";
    return "Di luar batas";
  };

  // Handler for aerator control
  const handleApplyControl = async (
    action: "ON" | "OFF" | "AUTO",
    durationMin: number
  ): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (action === "AUTO") {
      setAeratorState((prev) => ({
        ...prev,
        isOn: currentReading.ph !== null && (currentReading.ph < 6.85 || (currentReading.temperature_c ?? 0) > 29.5),
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
    <div className="min-h-screen bg-bg text-ink flex flex-col md:flex-row font-sans selection:bg-brand selection:text-brand-ink">
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (≥ 768px, 240px width)                */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-[240px] flex-col justify-between border-r border-line bg-surface p-4 flex-shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
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

          {/* Pond Selector */}
          <div className="px-2">
            <label className="text-[11px] font-semibold tracking-wider text-muted uppercase block mb-1">
              Kolam Terpilih
            </label>
            <div className="bg-surface-2 border border-line rounded-[6px] px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-ink leading-tight">
                  Kolam Terpal 1
                </div>
                <div className="text-[11px] text-muted">BANYUWENING-01</div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("ringkasan")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "ringkasan"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Ringkasan</span>
            </button>

            <button
              onClick={() => setActiveTab("grafik")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "grafik"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span>Grafik Sensor</span>
            </button>

            <button
              onClick={() => setActiveTab("peringatan")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "peringatan"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4" />
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
              onClick={() => setActiveTab("aerator")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "aerator"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>Kontrol Aerator</span>
            </button>

            <button
              onClick={() => setActiveTab("prediksi")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                activeTab === "prediksi"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Prediksi ML</span>
            </button>

            {/* Ekspor only visible for Analis & Admin */}
            {(role === "ANALIS" || role === "ADMIN") && (
              <button
                onClick={() => setActiveTab("ekspor")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors cursor-pointer ${
                  activeTab === "ekspor"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor CSV</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer: Role & Theme Switchers */}
        <div className="pt-4 border-t border-line space-y-3">
          {/* Simulation State Selector */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-muted tracking-wider mb-1 px-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand" />
                Uji State Data
              </span>
            </div>
            <select
              value={simState}
              onChange={(e) => setSimState(e.target.value as DataSimState)}
              aria-label="Pilih Skenario Uji Data Kolam"
              className="w-full bg-surface-2 border border-line rounded-[6px] py-1.5 px-2 text-[12px] font-medium text-ink focus:outline-hidden cursor-pointer"
            >
              <option value="NORMAL">Normal (Aman)</option>
              <option value="WASPADA">Waspada (Suhu/pH naik)</option>
              <option value="BAHAYA">Bahaya (pH 5,82 kritis)</option>
              <option value="BASI">Basi (Data &gt; 2 Menit)</option>
              <option value="OFFLINE">Offline (LWT MQTT)</option>
            </select>
          </div>

          {/* Role Switcher */}
          <div>
            <div className="text-[11px] font-semibold uppercase text-muted tracking-wider mb-1 px-1">
              Peran Akun
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              aria-label="Pilih Peran Akun Pengguna"
              className="w-full bg-surface-2 border border-line rounded-[6px] py-1.5 px-2 text-[12px] font-medium text-ink focus:outline-hidden cursor-pointer"
            >
              <option value="PEMILIK">Pemilik (Petambak)</option>
              <option value="OPERATOR">Operator Kolam</option>
              <option value="ANALIS">Analis Akuakultur</option>
              <option value="ADMIN">Super Administrator</option>
            </select>
          </div>

          {/* Theme & Back Link */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 border border-line rounded-[6px] text-muted hover:text-ink hover:bg-surface-2 transition-colors flex items-center gap-1.5 text-[12px] cursor-pointer"
              aria-label="Toggle tema gelap/terang"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-[#F2C46B]" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDarkMode ? "Terang" : "Gelap"}</span>
            </button>

            <Link
              href="/"
              className="text-[12px] text-muted hover:text-brand transition-colors"
            >
              Landing Page →
            </Link>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA                                     */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Mobile Header (56px) */}
        <header className="md:hidden h-14 border-b border-line bg-surface px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <Link href="/" aria-label="BanyuWening">
              <img
                src={isDarkMode ? "/brand/logogram-gelap.svg" : "/brand/logogram.svg"}
                alt=""
                width={26}
                height={32}
              />
            </Link>
            <div>
              <div className="text-[14px] font-semibold text-ink leading-tight">
                Kolam Terpal 1
              </div>
              <div className="text-[11px] text-muted flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    simState === "OFFLINE" ? "bg-muted" : "bg-aman"
                  }`}
                />
                <span>{simState === "OFFLINE" ? "Offline" : "Online"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick state selector mobile */}
            <select
              value={simState}
              onChange={(e) => setSimState(e.target.value as DataSimState)}
              aria-label="Pilih Skenario Uji Data Kolam (Mobile)"
              className="bg-surface-2 border border-line rounded px-1.5 py-1 text-[11px] text-ink cursor-pointer"
            >
              <option value="NORMAL">Normal</option>
              <option value="WASPADA">Waspada</option>
              <option value="BAHAYA">Bahaya</option>
              <option value="BASI">Basi</option>
              <option value="OFFLINE">Offline</option>
            </select>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded border border-line text-muted hover:text-ink cursor-pointer"
              aria-label="Toggle tema gelap/terang"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F2C46B]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {/* Demo Sandbox Top Banner */}
          <div className="mb-6 p-4 bg-brand/10 border border-brand/30 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-brand shrink-0" />
              <div>
                <strong className="text-ink">Dashboard Demo & Simulasi Interaktif</strong>
                <p className="text-muted text-[12px] mt-0.5">
                  Seluruh data pada halaman ini adalah <strong>data demonstrasi</strong>. Anda dapat menguji perubahan peran dan simulasi skenario bahaya/offline pada panel kontrol.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="px-3.5 py-1.5 bg-brand text-brand-ink font-semibold rounded-[6px] text-[12px] hover:opacity-90 transition-opacity whitespace-nowrap self-start sm:self-center"
            >
              Masuk Dashboard Utama →
            </Link>
          </div>

          {/* Stale / Offline Banner Alert */}
          {simState === "BASI" && (
            <div className="mb-6 p-3.5 bg-surface-2 border border-line rounded-[6px] flex items-center gap-2.5 text-[13px] text-muted">
              <AlertTriangle className="w-4 h-4 text-waspada flex-shrink-0" />
              <span>
                <strong>Data Terlambat:</strong> Pembacaan terakhir diterima 7 menit
                lalu. Menunggu kiriman paket telemetri baru dari kolam.
              </span>
            </div>
          )}

          {simState === "OFFLINE" && (
            <div className="mb-6 p-3.5 bg-bahaya/10 border border-bahaya/30 rounded-[6px] flex items-center gap-2.5 text-[13px] text-ink">
              <WifiOff className="w-4 h-4 text-bahaya flex-shrink-0" />
              <span>
                <strong>Perangkat Tidak Terhubung (LWT):</strong> ESP32 terputus dari
                jaringan WiFi kolam. Aturan pengaman aerator lokal tetap beroperasi secara
                mandiri tanpa internet.
              </span>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 1: RINGKASAN                                     */}
          {/* ==================================================== */}
          {activeTab === "ringkasan" && (
            <div className={`space-y-6 ${simState === "BASI" ? "opacity-60 transition-opacity" : ""}`}>
              {/* Header Page */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-[24px] leading-[30px] font-display">Ringkasan</h1>
                <div className="text-[12px] text-muted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-aman animate-pulse" />
                  <span>
                    Data diperbarui {formatRelativeTime(currentReading.ts)}
                  </span>
                </div>
              </div>

              {/* Status Kolam Utama */}
              <StatusCard
                level={
                  simState === "OFFLINE"
                    ? "bahaya"
                    : simState === "BASI"
                    ? "waspada"
                    : overall.level
                }
                title={
                  simState === "OFFLINE"
                    ? "Perangkat tidak terhubung"
                    : simState === "BASI"
                    ? "Data terlambat"
                    : overall.title
                }
                subtitle={
                  simState === "OFFLINE"
                    ? "ESP32 offline. Pengaman lokal di kolam tetap menjaga aerator aktif."
                    : simState === "BASI"
                    ? "Data terakhir diterima 7 menit lalu."
                    : `Diperbarui ${formatRelativeTime(currentReading.ts)}`
                }
                prediction={{
                  risk: dynamicPrediction.risk,
                  timeframe: "1–3 jam",
                }}
              />

              {/* Grid 5 Kartu Parameter */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wider">
                    Parameter Kualitas Air
                  </h2>
                  <button
                    onClick={() => setActiveTab("grafik")}
                    className="text-[13px] text-brand hover:underline font-medium cursor-pointer"
                  >
                    Buka grafik lengkap →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ParameterCard
                    label="pH"
                    value={currentReading.ph}
                    unit=""
                    status={paramStatus.ph}
                    statusLabel={getStatusLabel(paramStatus.ph)}
                    sparklineData={phSparkline}
                  />

                  <ParameterCard
                    label="Suhu"
                    value={currentReading.temperature_c}
                    unit="°C"
                    status={paramStatus.temperature_c}
                    statusLabel={getStatusLabel(paramStatus.temperature_c)}
                    sparklineData={tempSparkline}
                  />

                  <ParameterCard
                    label="TDS (Zat Terlarut)"
                    value={currentReading.tds_ppm}
                    unit="ppm"
                    status={paramStatus.tds_ppm}
                    statusLabel={getStatusLabel(paramStatus.tds_ppm)}
                    sparklineData={tdsSparkline}
                  />

                  <ParameterCard
                    label="Kekeruhan"
                    value={currentReading.turbidity_ntu}
                    unit="NTU"
                    status={paramStatus.turbidity_ntu}
                    statusLabel={getStatusLabel(paramStatus.turbidity_ntu)}
                    sparklineData={turbSparkline}
                  />

                  {/* Level Air */}
                  <div className="bg-surface border border-line rounded-[6px] p-4 flex flex-col justify-between h-full transition-shadow hover:shadow-xs">
                    <div>
                      <div className="text-[13px] leading-[18px] font-medium text-muted mb-1">
                        Level Air Kolam
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
                      <span>Sensor Float Switch</span>
                      <span className="font-semibold text-ink">GPIO 18</span>
                    </div>
                  </div>

                  {/* Card Quick Prediction Summary */}
                  <div className="bg-surface border border-line rounded-[6px] p-4 flex flex-col justify-between h-full transition-shadow hover:shadow-xs">
                    <div>
                      <div className="text-[13px] leading-[18px] font-medium text-muted mb-1">
                        Prediksi Risiko (1–3 Jam)
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
                      <span className="text-muted">Model Random Forest</span>
                      <button
                        onClick={() => setActiveTab("prediksi")}
                        className="text-brand hover:underline font-semibold cursor-pointer"
                      >
                        Lihat rincian →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris Kedua: Aerator & Perangkat */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Kartu Aerator */}
                <div className="bg-surface border border-line rounded-[6px] p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-semibold text-ink">Aerator Kolam</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          currentReading.aerator_on ? "bg-brand animate-pulse" : "bg-muted"
                        }`}
                      />
                      <span className="text-[14px] font-semibold text-ink">
                        {currentReading.aerator_on ? "Menyala (ON)" : "Mati (OFF)"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[13px] text-muted mb-4">
                    Mode:{" "}
                    <strong>
                      {currentReading.mode === "AUTO"
                        ? "Otomatis (Cloud & Aturan)"
                        : currentReading.mode === "MANUAL"
                        ? "Kendali Manual Operator"
                        : "Pengaman Perangkat (Failsafe ESP32)"}
                    </strong>
                    {" · "}
                    Total menyala: {aeratorState.dailyDuration} hari ini
                  </p>

                  <div className="flex items-center gap-3">
                    {role === "PEMILIK" ? (
                      <span className="text-[12px] text-muted italic">
                        Mode pantau saja. Kendali aerator dikelola oleh Operator.
                      </span>
                    ) : (
                      <button
                        onClick={() => setIsControlModalOpen(true)}
                        className="h-10 px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Atur Aerator</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Kartu Perangkat */}
                <div className="bg-surface border border-line rounded-[6px] p-5">
                  <h3 className="text-[15px] font-semibold text-ink mb-3">
                    Status Node ESP32
                  </h3>
                  <div className="mb-2">
                    <StatusBadge level={simState === "OFFLINE" ? "bahaya" : "aman"}>
                      {simState === "OFFLINE" ? "Terputus" : "Online · WiFi Kolam"}
                    </StatusBadge>
                  </div>
                  <p className="text-[12px] text-muted leading-[18px]">
                    Firmware: <strong>v1.2.0</strong>
                    <br />
                    ID: <strong>{currentReading.device_id}</strong>
                    <br />
                    Protokol: <strong>MQTT TLS (Port 8883)</strong>
                  </p>
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
                  Grafik Riwayat Kualitas Air
                </h1>
                <p className="text-[13px] text-muted">
                  Empat parameter air tersinkronisasi pada sumbu waktu yang sama dengan
                  pita batas aman SNI lele.
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
                  Daftar Peringatan & Notifikasi
                </h1>
                <p className="text-[13px] text-muted">
                  Log anomali kualitas air, trigger aturan deterministik, dan riwayat
                  notifikasi bot Telegram.
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
                  Kendali & Riwayat Aerator
                </h1>
                <p className="text-[13px] text-muted">
                  Pengoperasian relay aerator DC 12V dan catatan nyala harian.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Control Panel */}
                <div className="bg-surface border border-line rounded-[6px] p-6">
                  <h3 className="text-[16px] font-semibold text-ink mb-2">
                    Kendali Cepat Aerator
                  </h3>
                  <p className="text-[13px] text-muted mb-4">
                    Saat ini aerator berstatus{" "}
                    <strong>{currentReading.aerator_on ? "MENYALA" : "MATI"}</strong> dalam
                    mode{" "}
                    <strong>
                      {currentReading.mode === "AUTO"
                        ? "Otomatis"
                        : currentReading.mode === "MANUAL"
                        ? "Manual"
                        : "Pengaman (Failsafe)"}
                    </strong>
                    .
                  </p>

                  {role === "PEMILIK" ? (
                    <div className="p-3 bg-surface-2 rounded text-[13px] text-muted">
                      Akun Anda berperan sebagai <strong>Pemilik</strong> (hanya melihat).
                      Ubah peran ke Operator atau Admin untuk melakukan kendali relay.
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsControlModalOpen(true)}
                      className="h-11 px-6 bg-brand text-brand-ink rounded-[6px] text-[14px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Power className="w-4 h-4" />
                      <span>Buka Dialog Kendali Aerator</span>
                    </button>
                  )}
                </div>

                {/* Failsafe Local Guarantee */}
                <div className="bg-surface border border-line rounded-[6px] p-6">
                  <h3 className="text-[16px] font-semibold text-ink mb-2">
                    Prinsip Prioritas Keselamatan
                  </h3>
                  <div className="space-y-2 text-[13px] text-muted leading-[19px]">
                    <p>
                      <strong>1. Failsafe Lokal ESP32</strong> memiliki prioritas
                      tertinggi. Jika pH &lt; 6,0 atau suhu &gt; 33 °C, aerator seketika
                      dinyalakan oleh mikrokontroler.
                    </p>
                    <p>
                      <strong>2. Perintah Cloud Ditolak</strong> bila operator mencoba
                      mematikan aerator saat aturan lokal sedang memicu kondisi bahaya.
                    </p>
                    <p>
                      <strong>3. Batas Waktu Otomatis (TTL)</strong> memastikan aerator
                      tidak tersangkut ON terus-menerus jika koneksi backend terputus.
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
                  Model Prediksi Risiko Kualitas Air
                </h1>
                <p className="text-[13px] text-muted">
                  Model klasifikasi Random Forest yang memprediksi tren penurunan kualitas air 1–3
                  jam sebelum ikan mengalami stres.
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
                  Unduh histori pembacaan sensor lengkap untuk keperluan analisis
                  akuakultur.
                </p>
              </div>

              <ExportSection readings={serverReadings} userRole={role} />
            </div>
          )}
        </main>
      </div>

      {/* Aerator Control Modal / Bottom Sheet */}
      <AeratorControlDialog
        isOpen={isControlModalOpen}
        onClose={() => setIsControlModalOpen(false)}
        currentState={aeratorState}
        isWaterCritical={overall.level === "BAHAYA"}
        criticalReason={
          overall.level === "BAHAYA"
            ? "pH kolam 5,82 berada di bawah batas aman 6,0"
            : undefined
        }
        onApplyControl={handleApplyControl}
      />
    </div>
  );
}
