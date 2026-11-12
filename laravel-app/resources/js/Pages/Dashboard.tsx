import { useState, useEffect } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import {
  LayoutDashboard,
  LineChart,
  Bell,
  Power,
  Cpu,
  FileSpreadsheet,
  Moon,
  Sun,
  BookOpen,
  Users,
  Wrench,
  BarChart3,
  Fish,
  LogOut,
  Sparkles,
  ArrowRight,
  Bot,
  Globe,
  UserCog,
  ShieldCheck,
  Code2,
} from "lucide-react";

import { StatusCard } from "@/Components/StatusCard";
import { ParameterCard } from "@/Components/ParameterCard";
import { StatusBadge } from "@/Components/StatusBadge";
import { PredictionPanel } from "@/Components/PredictionPanel";
import { AeratorControlDialog } from "@/Components/AeratorControlDialog";
import { ChartsSection } from "@/Components/ChartsSection";
import { AlertsSection } from "@/Components/AlertsSection";
import { ExportSection } from "@/Components/ExportSection";

// Role-specific views
import { SuperAdminDocs } from "@/Components/roles/SuperAdminDocs";
import { SuperAdminUserManagement } from "@/Components/roles/SuperAdminUserManagement";
import { SuperAdminNotificationConfig } from "@/Components/roles/SuperAdminNotificationConfig";
import { SuperAdminContentManagement } from "@/Components/roles/SuperAdminContentManagement";
import { SuperAdminSecurityBackup } from "@/Components/roles/SuperAdminSecurityBackup";
import { SuperAdminApiDocs } from "@/Components/roles/SuperAdminApiDocs";
import { OperatorTutorial } from "@/Components/roles/OperatorTutorial";
import { AnalisDetailedData } from "@/Components/roles/AnalisDetailedData";
import { PemilikProcessedData } from "@/Components/roles/PemilikProcessedData";
import { UserProfileSettings } from "@/Components/UserProfileSettings";

import type {
  User,
  SensorReading,
  PredictionResult,
  AlertItem,
  DeviceInfo,
  AeratorState,
  UserRole,
  LandingContentSettings,
  BackupItem,
  SecurityStats,
} from "@/Types";

import {
  getOverallStatus,
  getParameterStatus,
  formatRelativeTime,
  getRoleBadgeLabel,
} from "@/lib/formatters";

type TabId =
  | "profil"
  | "ringkasan"
  | "grafik"
  | "peringatan"
  | "aerator"
  | "prediksi"
  | "ekspor"
  | "dokumentasi"
  | "manajemen-akun"
  | "manajemen-konten"
  | "konfigurasi-bot"
  | "keamanan-backup"
  | "dokumentasi-api"
  | "tutorial"
  | "analisis-lengkap"
  | "laporan-pemilik";

interface DashboardProps {
  user: User;
  currentReading: SensorReading;
  prediction: PredictionResult;
  allReadings: SensorReading[];
  alerts: AlertItem[];
  device: DeviceInfo;
  aeratorState: AeratorState;
  users: User[];
  notificationConfig?: any;
  dispatchLogs?: any[];
  landingContent?: LandingContentSettings;
  backups?: BackupItem[];
  securityStats?: SecurityStats;
}

export default function Dashboard({
  user: propUser,
  currentReading,
  prediction,
  allReadings = [],
  alerts = [],
  device: propDevice,
  aeratorState: initialAeratorState,
  users = [],
  landingContent: initialLandingContent,
  backups: initialBackups = [],
  securityStats: initialSecurityStats,
}: DashboardProps) {
  const pageProps = usePage<any>().props;
  const landingContent = initialLandingContent || pageProps.landingContent;
  const backups = initialBackups.length > 0 ? initialBackups : pageProps.backups || [];
  const securityStats = initialSecurityStats || pageProps.securityStats;
  const user: User = propUser || pageProps.user || pageProps.auth?.user || {
    id: 1,
    name: "Administrator",
    email: "admin@banyuwening.id",
    role: "ADMIN",
    title: "Super Administrator",
    pond_name: "Kolam Terpal Sangkuriang 01",
    avatar_initials: "SA",
    phone: "",
  };

  const device: DeviceInfo = propDevice || {
    device_code: "ESP32-NODE-01",
    name: "Node Sensor Kolam 01",
    pond_name: "Kolam Terpal Sangkuriang 01",
    firmware_version: "v1.4.2-failsafe",
    status: "ONLINE",
    mode: "AUTO",
    aerator_on: false,
  };

  const [activeTab, setActiveTab] = useState<TabId>(
    user.role === "PEMILIK" ? "laporan-pemilik" : "ringkasan"
  );
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isControlModalOpen, setIsControlModalOpen] = useState<boolean>(false);

  // Aerator runtime state
  const [aeratorState, setAeratorState] = useState<AeratorState>(
    initialAeratorState || {
      isOn: false,
      mode: "AUTO",
      dailyDuration: "0 jam 0 menit",
    }
  );

  // Dark mode effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute("data-theme", "dark");
    } else {
      root.setAttribute("data-theme", "light");
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    router.post("/logout");
  };

  const role = user.role;
  const overall = getOverallStatus(currentReading, prediction);
  const paramStatus = getParameterStatus(currentReading);

  // Sparklines from last 72 readings (6h)
  const safeReadings = allReadings || [];
  const last6h = safeReadings.slice(-72);
  const phSparkline = last6h.map((r) => r.ph || 0);
  const tempSparkline = last6h.map((r) => r.temperature_c || 0);
  const tdsSparkline = last6h.map((r) => r.tds_ppm || 0);
  const turbSparkline = last6h.map((r) => r.turbidity_ntu || 0);

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
    return new Promise((resolve) => {
      router.post(
        "/dashboard/aerator",
        {
          action,
          duration_minutes: durationMin,
        },
        {
          preserveScroll: true,
          onSuccess: () => {
            setAeratorState({
              isOn: action === "ON" ? true : action === "OFF" ? false : aeratorState.isOn,
              mode: action,
              dailyDuration: aeratorState.dailyDuration,
            });
            resolve(true);
          },
          onError: () => {
            resolve(false);
          },
        }
      );
    });
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col md:flex-row font-sans selection:bg-brand selection:text-brand-ink">
      {/* ======================================================== */}
      {/* 1. SIDEBAR DESKTOP (W-72..80 = 288-320px fluid)          */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-72 lg:w-72 xl:w-80 flex-col justify-between border-r border-line bg-surface p-3.5 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <Link href="/" className="flex items-center gap-3 px-2 py-1">
            <img
              src={isDarkMode ? "/brand/logogram-gelap.svg" : "/brand/logogram.svg"}
              alt="BanyuWening Logo"
              width={28}
              height={34}
              className="w-auto h-7"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-display font-semibold text-[17px] tracking-tight text-ink leading-tight truncate">
                BanyuWening
              </span>
              <span className="text-[10px] text-muted tracking-wide uppercase font-medium truncate">
                Dashboard Operasional
              </span>
            </div>
          </Link>

          {/* User Profile Card */}
          <div
            onClick={() => setActiveTab("profil")}
            className={`p-3 rounded-[6px] border space-y-2 cursor-pointer transition-all group ${
              activeTab === "profil"
                ? "bg-brand/10 border-brand shadow-xs"
                : "bg-surface-2 hover:bg-brand/10 border-line hover:border-brand/40"
            }`}
            title="Klik untuk membuka Pengaturan Profil & Keamanan (2FA)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand text-brand-ink font-bold text-[12px] flex items-center justify-center shrink-0">
                {user.avatar_initials || user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-ink truncate leading-tight group-hover:text-brand transition-colors" title={user.name}>
                  {user.name}
                </div>
                <div className="text-[10px] font-medium text-brand truncate flex items-center gap-1">
                  <span>{getRoleBadgeLabel(user.role)}</span>
                  {user.two_factor_enabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-aman" title="2FA Aktif" />
                  )}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-muted truncate border-t border-line/60 pt-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-aman shrink-0" />
                <span className="truncate">{user.pond_name || device.pond_name}</span>
              </div>
              <span className={`text-[10px] ${activeTab === "profil" ? "text-brand font-semibold" : "text-muted group-hover:text-brand"}`}>
                {activeTab === "profil" ? "Buka Profil ✓" : "Edit Profil →"}
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1" aria-label="Menu Navigasi Utama">
            {/* Khusus Pemilik: Menu Laporan Eksekutif ditaruh paling atas */}
            {role === "PEMILIK" && (
              <button
                onClick={() => setActiveTab("laporan-pemilik")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                  activeTab === "laporan-pemilik"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
                title="Laporan Eksekutif Kolam"
              >
                <Fish className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">Laporan Eksekutif Kolam</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("ringkasan")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                activeTab === "ringkasan"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
              title="Ringkasan Realtime"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="truncate whitespace-nowrap">Ringkasan Realtime</span>
            </button>

            <button
              onClick={() => setActiveTab("grafik")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                activeTab === "grafik"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
              title="Grafik Riwayat"
            >
              <LineChart className="w-4 h-4 shrink-0" />
              <span className="truncate whitespace-nowrap">Grafik Riwayat</span>
            </button>

            <button
              onClick={() => setActiveTab("peringatan")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                activeTab === "peringatan"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "text-ink hover:bg-surface-2"
              }`}
              title="Peringatan & Log"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">Peringatan & Log</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-ink/20 font-bold shrink-0 ml-2">
                {alerts.length}
              </span>
            </button>

            {/* Aerator: Untuk Operator dan Admin */}
            {(role === "OPERATOR" || role === "ADMIN") && (
              <button
                onClick={() => setActiveTab("aerator")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                  activeTab === "aerator"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
                title="Kendali Aerator"
              >
                <Power className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">Kendali Aerator</span>
              </button>
            )}

            {/* Prediksi ML: Untuk Analis dan Admin */}
            {(role === "ANALIS" || role === "ADMIN") && (
              <button
                onClick={() => setActiveTab("prediksi")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                  activeTab === "prediksi"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
                title="Prediksi Machine Learning"
              >
                <Cpu className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">Prediksi Machine Learning</span>
              </button>
            )}

            {/* Ekspor CSV: Untuk Analis dan Admin */}
            {(role === "ANALIS" || role === "ADMIN") && (
              <button
                onClick={() => setActiveTab("ekspor")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                  activeTab === "ekspor"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
                title="Ekspor CSV"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap">Ekspor CSV</span>
              </button>
            )}

            {/* MENU KHUSUS SUPER ADMINISTRATOR: Dokumentasi, Akun, Bot */}
            {role === "ADMIN" && (
              <>
                <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Menu Super Admin
                </div>

                <button
                  onClick={() => setActiveTab("dokumentasi")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                    activeTab === "dokumentasi"
                      ? "bg-brand text-brand-ink font-semibold"
                      : "text-ink hover:bg-surface-2"
                  }`}
                  title="Dokumentasi Lengkap"
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Dokumentasi Lengkap</span>
                </button>

                <button
                  onClick={() => setActiveTab("manajemen-akun")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                    activeTab === "manajemen-akun"
                      ? "bg-brand text-brand-ink font-semibold"
                      : "text-ink hover:bg-surface-2"
                  }`}
                  title="Buat & Kelola Akun"
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Buat & Kelola Akun</span>
                </button>

                <button
                  onClick={() => setActiveTab("manajemen-konten")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                    activeTab === "manajemen-konten"
                      ? "bg-brand text-brand-ink font-semibold"
                      : "text-ink hover:bg-surface-2"
                  }`}
                  title="Manajemen Konten Landing"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Manajemen Konten Landing</span>
                </button>

                <button
                  onClick={() => setActiveTab("konfigurasi-bot")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                    activeTab === "konfigurasi-bot"
                      ? "bg-brand text-brand-ink font-semibold"
                      : "text-ink hover:bg-surface-2"
                  }`}
                  title="Konfigurasi Bot & Notifikasi"
                >
                  <Bot className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Konfigurasi Bot & Notifikasi</span>
                </button>

                <button
                  onClick={() => setActiveTab("keamanan-backup")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                    activeTab === "keamanan-backup"
                      ? "bg-brand text-brand-ink font-semibold"
                      : "text-ink hover:bg-surface-2"
                  }`}
                  title="Keamanan & Backup Basis Data"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Keamanan & Backup</span>
                </button>
              </>
            )}

            {/* MENU KHUSUS OPERATOR: Tutorial SOP */}
            {role === "OPERATOR" && (
              <>
                <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Panduan Lapangan
                </div>

                <button
                  onClick={() => setActiveTab("tutorial")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                    activeTab === "tutorial"
                      ? "bg-brand text-brand-ink font-semibold"
                      : "text-ink hover:bg-surface-2"
                  }`}
                  title="Tutorial Alat & SOP"
                >
                  <Wrench className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Tutorial Alat & SOP</span>
                </button>
              </>
            )}

            {/* MENU KHUSUS ANALIS: Analisis Lengkap */}
            {role === "ANALIS" && (
              <>
                <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Kajian Akuakultur
                </div>

                <button
                  onClick={() => setActiveTab("analisis-lengkap")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                    activeTab === "analisis-lengkap"
                      ? "bg-brand text-brand-ink font-semibold"
                      : "text-ink hover:bg-surface-2"
                  }`}
                  title="Pembacaan Data Lengkap"
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Pembacaan Data Lengkap</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-line space-y-3">
          {/* Link to Demo Simulator */}
          <Link
            href="/demo"
            className="w-full flex items-center justify-between p-2 rounded-[6px] bg-surface-2 hover:bg-brand/10 border border-line text-[12px] text-ink transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Buka Demo Simulator</span>
            </span>
            <ArrowRight className="w-3 h-3 text-muted" />
          </Link>

          {/* Theme & Logout Button */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 border border-line rounded-[6px] text-muted hover:text-ink hover:bg-surface-2 transition-colors flex items-center gap-1.5 text-[12px] cursor-pointer"
              aria-label="Toggle tema gelap/terang"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 text-[#F2C46B]" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDarkMode ? "Terang" : "Gelap"}</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 border border-line rounded-[6px] text-muted hover:text-bahaya hover:bg-bahaya/10 transition-colors flex items-center gap-1.5 text-[12px] cursor-pointer"
              title="Keluar dari sesi akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
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
              <div className="text-[13px] font-semibold text-ink leading-tight truncate max-w-[130px]">
                {user.name}
              </div>
              <div className="text-[10px] text-brand font-medium">
                {getRoleBadgeLabel(user.role)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded border border-line text-muted hover:text-ink cursor-pointer"
              aria-label="Toggle tema gelap/terang"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F2C46B]" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded border border-line text-muted hover:text-bahaya cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Sub-Bar (Horizontal Scrollable) */}
        <div className="md:hidden flex overflow-x-auto border-b border-line bg-surface px-3 py-2 gap-1.5 sticky top-14 z-30 text-[12px] font-medium">
          <button
            onClick={() => setActiveTab("profil")}
            className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === "profil"
                ? "bg-brand text-brand-ink font-semibold"
                : "bg-surface-2 text-ink"
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Profil & 2FA</span>
          </button>
          {role === "PEMILIK" && (
            <button
              onClick={() => setActiveTab("laporan-pemilik")}
              className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "laporan-pemilik"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "bg-surface-2 text-ink"
              }`}
            >
              Laporan Eksekutif
            </button>
          )}

          <button
            onClick={() => setActiveTab("ringkasan")}
            className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "ringkasan"
                ? "bg-brand text-brand-ink font-semibold"
                : "bg-surface-2 text-ink"
            }`}
          >
            Ringkasan
          </button>

          <button
            onClick={() => setActiveTab("grafik")}
            className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "grafik"
                ? "bg-brand text-brand-ink font-semibold"
                : "bg-surface-2 text-ink"
            }`}
          >
            Grafik
          </button>

          <button
            onClick={() => setActiveTab("peringatan")}
            className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "peringatan"
                ? "bg-brand text-brand-ink font-semibold"
                : "bg-surface-2 text-ink"
            }`}
          >
            Peringatan ({alerts.length})
          </button>

          {(role === "OPERATOR" || role === "ADMIN") && (
            <button
              onClick={() => setActiveTab("aerator")}
              className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "aerator"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "bg-surface-2 text-ink"
              }`}
            >
              Aerator
            </button>
          )}

          {(role === "ANALIS" || role === "ADMIN") && (
            <button
              onClick={() => setActiveTab("prediksi")}
              className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "prediksi"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "bg-surface-2 text-ink"
              }`}
            >
              Prediksi ML
            </button>
          )}

          {(role === "ANALIS" || role === "ADMIN") && (
            <button
              onClick={() => setActiveTab("ekspor")}
              className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "ekspor"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "bg-surface-2 text-ink"
              }`}
            >
              Ekspor CSV
            </button>
          )}

          {role === "ADMIN" && (
            <>
              <button
                onClick={() => setActiveTab("dokumentasi")}
                className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "dokumentasi"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "bg-surface-2 text-ink"
                }`}
              >
                Dokumentasi
              </button>

              <button
                onClick={() => setActiveTab("manajemen-akun")}
                className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "manajemen-akun"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "bg-surface-2 text-ink"
                }`}
              >
                Kelola Akun
              </button>

              <button
                onClick={() => setActiveTab("manajemen-konten")}
                className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "manajemen-konten"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "bg-surface-2 text-ink"
                }`}
              >
                Konten Landing
              </button>

              <button
                onClick={() => setActiveTab("konfigurasi-bot")}
                className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "konfigurasi-bot"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "bg-surface-2 text-ink"
                }`}
              >
                Konfigurasi Bot
              </button>

              <button
                onClick={() => setActiveTab("keamanan-backup")}
                className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === "keamanan-backup"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "bg-surface-2 text-ink"
                }`}
              >
                Keamanan & Backup
              </button>
            </>
          )}

          {role === "OPERATOR" && (
            <button
              onClick={() => setActiveTab("tutorial")}
              className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "tutorial"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "bg-surface-2 text-ink"
              }`}
            >
              Tutorial Alat
            </button>
          )}

          {role === "ANALIS" && (
            <button
              onClick={() => setActiveTab("analisis-lengkap")}
              className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "analisis-lengkap"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "bg-surface-2 text-ink"
              }`}
            >
              Data Lengkap
            </button>
          )}
        </div>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {/* Status Bar Operasional Kolam */}
          <div className="mb-6 p-3 bg-surface border border-line rounded-[6px] flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${device.status === "ONLINE" ? "bg-aman animate-pulse" : "bg-muted"}`} />
              <span className="font-semibold text-ink">
                {device.status === "ONLINE" ? "Node Sensor ESP32 Terhubung:" : "Status Node Sensor ESP32:"}
              </span>
              <span className="text-muted">
                {device.status === "ONLINE"
                  ? "Protokol MQTT TLS (Port 8883) · Update Tiap 30 Detik"
                  : "Standby (Menunggu Pengiriman Data Telemetri Pertama dari Node ESP32)"}
              </span>
            </div>
            <div className="text-muted">
              Unit: <strong className="text-ink">{user.pond_name || device.pond_name}</strong>
            </div>
          </div>

          {/* TAB: PENGATURAN PROFIL & 2FA (Semua Role) */}
          {activeTab === "profil" && <UserProfileSettings user={user} />}

          {/* TAB: LAPORAN PEMILIK (Khusus Role Pemilik) */}
          {activeTab === "laporan-pemilik" && <PemilikProcessedData />}

          {/* TAB: DOKUMENTASI PROYEK (Khusus Super Admin) */}
          {activeTab === "dokumentasi" && <SuperAdminDocs />}

          {/* TAB: MANAJEMEN AKUN (Khusus Super Admin) */}
          {activeTab === "manajemen-akun" && <SuperAdminUserManagement users={users} />}

          {/* TAB: MANAJEMEN KONTEN LANDING (Khusus Super Admin) */}
          {activeTab === "manajemen-konten" && (
            <SuperAdminContentManagement landingContent={landingContent} />
          )}

          {/* TAB: KONFIGURASI BOT & NOTIFIKASI (Khusus Super Admin) */}
          {activeTab === "konfigurasi-bot" && <SuperAdminNotificationConfig />}

          {/* TAB: KEAMANAN & BACKUP BASIS DATA (Khusus Super Admin) */}
          {role === "ADMIN" && activeTab === "keamanan-backup" && (
            <SuperAdminSecurityBackup
              securityStats={securityStats}
              backups={backups}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* TAB: TUTORIAL ALAT & SOP (Khusus Operator) */}
          {activeTab === "tutorial" && <OperatorTutorial />}

          {/* TAB: PEMBACAAN DATA LENGKAP (Khusus Analis) */}
          {activeTab === "analisis-lengkap" && <AnalisDetailedData allReadings={allReadings} />}

          {/* TAB: RINGKASAN REALTIME */}
          {activeTab === "ringkasan" && (
            <div className="space-y-6">
              {/* Header Page */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h1 className="text-[24px] leading-[30px] font-display">
                  Ringkasan Kualitas Air Kolam
                </h1>
                <div className="text-[12px] text-muted flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentReading ? "bg-aman animate-pulse" : "bg-muted"}`} />
                  <span>
                    {currentReading
                      ? `Data realtime diperbarui ${formatRelativeTime(currentReading.ts)}`
                      : "Menunggu Pengiriman Data Telemetri Pertama dari Node ESP32"}
                  </span>
                </div>
              </div>

              {/* Standby Banner Jika Belum Ada Data Sensor */}
              {!currentReading && (
                <div className="p-4 md:p-5 rounded-[8px] bg-brand/5 border border-brand/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
                      <Cpu className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-ink">
                        Node Sensor ESP32 Dalam Status Standby
                      </h3>
                      <p className="text-[13px] text-muted mt-0.5 leading-relaxed">
                        Dashboard operasional utama saat ini belum memiliki data telemetri. Data fisik kolam dan prediksi AI akan langsung masuk dan ditampilkan secara realtime begitu node sensor ESP32 diaktifkan dan terhubung.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <Link
                      href="/demo"
                      className="px-3.5 py-1.5 rounded-[6px] bg-surface border border-line text-[12px] font-medium text-ink hover:border-brand/50 transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>Buka Simulasi di Mode Demo</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Status Kolam Utama */}
              <StatusCard
                level={overall.level}
                title={overall.title}
                subtitle={
                  currentReading
                    ? `Diperbarui ${formatRelativeTime(currentReading.ts)}`
                    : "Sistem Operasional Standby · Siap Menerima Data"
                }
                prediction={{
                  risk: prediction?.risk || "AMAN",
                  timeframe: prediction?.timeframe || "1–3 jam",
                }}
              />

              {/* Grid 4 Kartu Parameter + Level Air + Ringkasan Prediksi */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wider">
                    Parameter Fisik Kolam
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
                    value={currentReading ? currentReading.ph : "—"}
                    unit=""
                    status={paramStatus.ph}
                    statusLabel={getStatusLabel(paramStatus.ph)}
                    sparklineData={phSparkline}
                  />

                  <ParameterCard
                    label="Suhu"
                    value={currentReading ? currentReading.temperature_c : "—"}
                    unit="°C"
                    status={paramStatus.temperature_c}
                    statusLabel={getStatusLabel(paramStatus.temperature_c)}
                    sparklineData={tempSparkline}
                  />

                  <ParameterCard
                    label="TDS (Zat Terlarut)"
                    value={currentReading ? currentReading.tds_ppm : "—"}
                    unit="ppm"
                    status={paramStatus.tds_ppm}
                    statusLabel={getStatusLabel(paramStatus.tds_ppm)}
                    sparklineData={tdsSparkline}
                  />

                  <ParameterCard
                    label="Kekeruhan"
                    value={currentReading ? currentReading.turbidity_ntu : "—"}
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
                          {currentReading
                            ? currentReading.water_level === "NORMAL"
                              ? "Aman"
                              : "Surut"
                            : "Standby"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <StatusBadge
                          level={
                            currentReading
                              ? currentReading.water_level === "NORMAL"
                                ? "aman"
                                : "bahaya"
                              : "netral"
                          }
                        >
                          {currentReading
                            ? currentReading.water_level === "NORMAL"
                              ? "Pelampung Normal"
                              : "Level Air Kritis"
                            : "Menunggu Sensor"}
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
                      {prediction ? (
                        <>
                          <div className="flex items-baseline gap-1.5 mb-2">
                            <span className="text-[34px] md:text-[40px] leading-[1.1] font-semibold text-aman">
                              {prediction.risk === "AMAN" ? "Aman" : prediction.risk === "WASPADA" ? "Waspada" : "Bahaya"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <StatusBadge level={prediction.risk === "AMAN" ? "aman" : prediction.risk === "WASPADA" ? "waspada" : "bahaya"}>
                              {Math.round(prediction.p_aman * 100)}% Probabilitas Aman
                            </StatusBadge>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5 mb-2">
                            <span className="text-[34px] md:text-[40px] leading-[1.1] font-semibold text-muted">
                              Standby
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <StatusBadge level="netral">
                              Menunggu Telemetri
                            </StatusBadge>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2.5 border-t border-line/50 text-[11px] text-muted">
                      <span>Model Random Forest</span>
                      {(role === "ANALIS" || role === "ADMIN") ? (
                        <button
                          onClick={() => setActiveTab("prediksi")}
                          className="font-medium text-brand hover:underline cursor-pointer"
                        >
                          Lihat rincian →
                        </button>
                      ) : (
                        <span className="text-muted">Inferensi Aktif</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris Status Aerator & Perangkat */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-2 bg-surface border border-line rounded-[6px] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-semibold text-ink">Aerator Kolam</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          currentReading?.aerator_on ? "bg-brand animate-pulse" : "bg-muted"
                        }`}
                      />
                      <span className="text-[14px] font-semibold text-ink">
                        {currentReading ? (currentReading.aerator_on ? "Menyala (ON)" : "Mati (OFF)") : "Mati (Standby)"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[13px] text-muted mb-4">
                    Mode:{" "}
                    <strong>
                      {currentReading
                        ? currentReading.mode === "AUTO"
                          ? "Otomatis (Cloud & Aturan)"
                          : currentReading.mode === "MANUAL"
                          ? "Kendali Manual Operator"
                          : "Pengaman Perangkat (Failsafe ESP32)"
                        : "Otomatis (Standby)"}
                    </strong>
                    {" · "}
                    Total menyala: {aeratorState.dailyDuration} hari ini
                  </p>

                  <div className="flex items-center gap-3">
                    {role === "PEMILIK" ? (
                      <span className="text-[12px] text-muted italic">
                        Mode pantau saja (Read-only). Kendali aerator dikelola oleh Operator lapangan.
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
                    <StatusBadge level={device.status === "ONLINE" ? "aman" : "netral"}>
                      {device.status === "ONLINE" ? "Online · WiFi Kolam" : "Standby · Siap Menerima Data"}
                    </StatusBadge>
                  </div>
                  <p className="text-[12px] text-muted leading-[18px]">
                    Firmware: <strong>{device.firmware_version || "v1.4.2-failsafe"}</strong>
                    <br />
                    ID: <strong>{device.device_code || "BANYUWENING-01"}</strong>
                    <br />
                    Protokol: <strong>MQTT TLS (Port 8883)</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GRAFIK SENSOR */}
          {activeTab === "grafik" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Grafik Riwayat Kualitas Air
                </h1>
                <p className="text-[13px] text-muted">
                  Empat parameter air tersinkronisasi pada sumbu waktu yang sama dengan pita batas aman SNI lele.
                </p>
              </div>

              <ChartsSection allReadings={allReadings} />
            </div>
          )}

          {/* TAB: PERINGATAN */}
          {activeTab === "peringatan" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Daftar Peringatan & Notifikasi
                </h1>
                <p className="text-[13px] text-muted">
                  Log anomali kualitas air, trigger aturan deterministik, dan riwayat notifikasi bot Telegram.
                </p>
              </div>

              {role === "ADMIN" && (
                <div className="p-3 bg-surface border border-line rounded-[6px] flex flex-wrap items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2 text-ink">
                    <Bot className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Konfigurasi bot pengirim notifikasi (Telegram, WhatsApp, Email) dapat disesuaikan di menu Super Admin.</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("konfigurasi-bot")}
                    className="h-8 px-3 bg-brand/10 hover:bg-brand/20 text-brand rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Buka Konfigurasi Bot</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              <AlertsSection
                initialAlerts={alerts}
                currentUserName={`${user.name} (${user.role})`}
                canAcknowledge={role !== "PEMILIK"}
              />
            </div>
          )}

          {/* TAB: KONTROL AERATOR */}
          {activeTab === "aerator" && (role === "OPERATOR" || role === "ADMIN") && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Kendali & Riwayat Aerator
                </h1>
                <p className="text-[13px] text-muted">
                  Pengoperasian relay aerator DC 12V dan catatan durasi nyala harian.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface border border-line rounded-[6px] p-6">
                  <h3 className="text-[16px] font-semibold text-ink mb-2">
                    Kendali Cepat Aerator
                  </h3>
                  <p className="text-[13px] text-muted mb-4">
                    Status saat ini:{" "}
                    <strong>{currentReading?.aerator_on ? "MENYALA" : "MATI"}</strong> dalam mode{" "}
                    <strong>
                      {currentReading
                        ? currentReading.mode === "AUTO"
                          ? "Otomatis"
                          : currentReading.mode === "MANUAL"
                          ? "Manual"
                          : "Pengaman (Failsafe)"
                        : "Otomatis (Standby)"}
                    </strong>
                    .
                  </p>

                  <button
                    onClick={() => setIsControlModalOpen(true)}
                    className="h-11 px-6 bg-brand text-brand-ink rounded-[6px] text-[14px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Power className="w-4 h-4" />
                    <span>Buka Dialog Kendali Aerator</span>
                  </button>
                </div>

                <div className="bg-surface border border-line rounded-[6px] p-6">
                  <h3 className="text-[16px] font-semibold text-ink mb-2">
                    Prinsip Prioritas Keselamatan
                  </h3>
                  <div className="space-y-2 text-[13px] text-muted leading-[19px]">
                    <p>
                      <strong>1. Failsafe Lokal ESP32</strong> memiliki wewenang tertinggi.
                      Bila pH &lt; 6,0 atau suhu &gt; 33 °C, aerator dinyalakan langsung oleh mikrokontroler.
                    </p>
                    <p>
                      <strong>2. Perintah Cloud Ditolak</strong> bila operator mencoba mematikan
                      aerator saat aturan darurat lokal sedang aktif.
                    </p>
                    <p>
                      <strong>3. Batas Waktu Otomatis (TTL)</strong> memastikan aerator tidak menyala tanpa henti jika koneksi putus.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PREDIKSI ML */}
          {activeTab === "prediksi" && (role === "ANALIS" || role === "ADMIN") && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Model Prediksi Risiko Kualitas Air
                </h1>
                <p className="text-[13px] text-muted">
                  Model klasifikasi Random Forest yang memprediksi tren penurunan kualitas air 1–3 jam sebelum ikan mengalami stres.
                </p>
              </div>

              <div className="max-w-2xl">
                <PredictionPanel prediction={prediction} isDetailed={true} />
              </div>
            </div>
          )}

          {/* TAB: EKSPOR CSV */}
          {activeTab === "ekspor" && (role === "ANALIS" || role === "ADMIN") && (
            <div className="space-y-6">
              <div>
                <h1 className="text-[24px] leading-[30px] font-display mb-1">
                  Ekspor Data Sensor Historis
                </h1>
                <p className="text-[13px] text-muted">
                  Unduh data pembacaan sensor dalam format CSV dengan separator titik koma (;) untuk Microsoft Excel Indonesia.
                </p>
              </div>

              <ExportSection readings={allReadings} userRole={role} />
            </div>
          )}
        </main>
      </div>

      {/* Aerator Control Modal Dialog */}
      <AeratorControlDialog
        isOpen={isControlModalOpen}
        onClose={() => setIsControlModalOpen(false)}
        currentState={aeratorState}
        isWaterCritical={overall.level === "BAHAYA"}
        criticalReason={
          overall.level === "BAHAYA"
            ? "pH kolam berada di bawah ambang batas aman 6,0"
            : undefined
        }
        onApplyControl={handleApplyControl}
      />
    </div>
  );
}
