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
  Menu,
  X,
  Rocket,
  Building2,
  RefreshCw,
  ChevronDown,
  Scale,
} from "lucide-react";

import { StatusCard } from "@/Components/StatusCard";
import { ParameterCard } from "@/Components/ParameterCard";
import { StatusBadge } from "@/Components/StatusBadge";
import { PredictionPanel } from "@/Components/PredictionPanel";
import { AeratorControlDialog } from "@/Components/AeratorControlDialog";
import { ChartsSection } from "@/Components/ChartsSection";
import { AlertsSection } from "@/Components/AlertsSection";
import { ExportSection } from "@/Components/ExportSection";
import { HarvestEvaluationPanel } from "@/Components/HarvestEvaluationPanel";

// Role-specific views
import { SuperAdminDocs } from "@/Components/roles/SuperAdminDocs";
import { SuperAdminUserManagement } from "@/Components/roles/SuperAdminUserManagement";
import { SuperAdminTenantManagement } from "@/Components/roles/SuperAdminTenantManagement";
import { SuperAdminNotificationConfig } from "@/Components/roles/SuperAdminNotificationConfig";
import { SuperAdminContentManagement } from "@/Components/roles/SuperAdminContentManagement";
import { SuperAdminSecurityBackup } from "@/Components/roles/SuperAdminSecurityBackup";
import { SuperAdminOtaProtocolPanel } from "@/Components/roles/SuperAdminOtaProtocolPanel";
import { OperatorTutorial } from "@/Components/roles/OperatorTutorial";
import { AnalisDetailedData } from "@/Components/roles/AnalisDetailedData";
import { PemilikProcessedData } from "@/Components/roles/PemilikProcessedData";
import { UserProfileSettings } from "@/Components/UserProfileSettings";

import {
  DEFAULT_ROLE_PERMISSIONS,
  type User,
  type SensorReading,
  type PredictionResult,
  type AlertItem,
  type DeviceInfo,
  type AeratorState,
  type LandingContentSettings,
  type BackupItem,
  type SecurityStats,
  type ManagedDevice,
  type FleetDeviceSummary,
  type Tenant,
  type MlPerformanceOverview,
  type OtaOverview,
  type PondHarvestCycleItem,
  type PermissionKey,
  type RealtimeConfig,
  type RealtimeTransportMode,
  type UserPermissions,
} from "@/Types";

import { BanyuWeningRealtimeClient } from "@/lib/realtime-client";

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
  | "manajemen-tenant"
  | "manajemen-konten"
  | "konfigurasi-bot"
  | "keamanan-backup"
  | "tutorial"
  | "analisis-lengkap"
  | "laporan-pemilik"
  | "ota-mandiri"
  | "evaluasi-panen";

interface DashboardProps {
  user: User;
  currentReading: SensorReading;
  prediction: PredictionResult;
  allReadings: SensorReading[];
  alerts: AlertItem[];
  device: DeviceInfo;
  tenantDevices?: FleetDeviceSummary[];
  activeTenantCode?: string | null;
  activeDeviceCode?: string | null;
  aeratorState: AeratorState;
  users: User[];
  tenants?: Tenant[];
  devices?: ManagedDevice[];
  otaOverview?: OtaOverview | null;
  mlOverview?: MlPerformanceOverview | null;
  harvestCycles?: PondHarvestCycleItem[];
  realtimeConfig?: RealtimeConfig;
  notificationConfig?: any;
  dispatchLogs?: any[];
  landingContent?: LandingContentSettings;
  backups?: BackupItem[];
  securityStats?: SecurityStats;
}

export default function Dashboard({
  user: propUser,
  currentReading: initialCurrentReading,
  prediction: initialPrediction,
  allReadings: initialAllReadings = [],
  alerts: initialAlerts = [],
  device: propDevice,
  tenantDevices: initialTenantDevices = [],
  activeTenantCode: propActiveTenantCode,
  activeDeviceCode: propActiveDeviceCode,
  aeratorState: initialAeratorState,
  users = [],
  tenants: initialTenants = [],
  devices: initialDevices = [],
  otaOverview: initialOtaOverview,
  mlOverview: initialMlOverview,
  harvestCycles: initialHarvestCycles = [],
  realtimeConfig: initialRealtimeConfig,
  landingContent: initialLandingContent,
  backups: initialBackups = [],
  securityStats: initialSecurityStats,
}: DashboardProps) {
  const pageProps = usePage<any>().props;
  const landingContent = initialLandingContent || pageProps.landingContent;
  const backups = initialBackups.length > 0 ? initialBackups : pageProps.backups || [];
  const securityStats = initialSecurityStats || pageProps.securityStats;
  const tenantDevices: FleetDeviceSummary[] =
    initialTenantDevices.length > 0 ? initialTenantDevices : pageProps.tenantDevices || [];
  const managedDevices: ManagedDevice[] =
    initialDevices.length > 0 ? initialDevices : pageProps.devices || [];
  const tenants: Tenant[] =
    initialTenants.length > 0 ? initialTenants : pageProps.tenants || [];
  const otaOverview: OtaOverview | null =
    initialOtaOverview !== undefined ? initialOtaOverview : pageProps.otaOverview || null;
  const harvestCycles: PondHarvestCycleItem[] =
    initialHarvestCycles.length > 0 ? initialHarvestCycles : pageProps.harvestCycles || [];
  const mlOverview: MlPerformanceOverview | null =
    initialMlOverview !== undefined ? initialMlOverview : pageProps.mlOverview || null;
  const realtimeConfig: RealtimeConfig | undefined =
    initialRealtimeConfig || pageProps.realtimeConfig;

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

  const defaultDevice: DeviceInfo = propDevice || {
    device_code: "ESP32-NODE-01",
    name: "Node Sensor Kolam 01",
    pond_name: "Kolam Terpal Sangkuriang 01",
    firmware_version: "v1.4.2-failsafe",
    status: "ONLINE",
    transport_protocol: "STANDBY",
    mode: "AUTO",
    aerator_on: false,
  };

  // Live Realtime State (diperbarui via WebSocket multi-protokol atau otomatis via HTTP Fallback)
  const [currentReading, setCurrentReading] = useState<SensorReading>(initialCurrentReading);
  const [prediction, setPrediction] = useState<PredictionResult>(initialPrediction);
  const [allReadings, setAllReadings] = useState<SensorReading[]>(initialAllReadings);
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [device, setDevice] = useState<DeviceInfo>(defaultDevice);
  const [realtimeMode, setRealtimeMode] = useState<RealtimeTransportMode>("CONNECTING");
  const [transportReason, setTransportReason] = useState<string>("");

  const [activeTab, setActiveTab] = useState<TabId>(
    user.role === "PEMILIK" && (user.permissions?.view_owner_report ?? true)
      ? "laporan-pemilik"
      : (user.permissions?.view_summary ?? true)
      ? "ringkasan"
      : "profil"
  );
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isControlModalOpen, setIsControlModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [tenantSubTab, setTenantSubTab] = useState<"tenants" | "devices">("tenants");
  const [tenantDeviceSection, setTenantDeviceSection] = useState<"crud" | "ota">("crud");

  const activeTenantCode: string =
    propActiveTenantCode !== undefined && propActiveTenantCode !== null
      ? propActiveTenantCode
      : pageProps.activeTenantCode ||
        (user.role === "ADMIN" ? "ALL" : user.tenant_code || "TENANT-UTAMA");

  const activeDeviceCode: string =
    propActiveDeviceCode !== undefined && propActiveDeviceCode !== null
      ? propActiveDeviceCode
      : pageProps.activeDeviceCode || "ALL";

  const scopedTenantDevices: FleetDeviceSummary[] =
    activeTenantCode !== "ALL"
      ? tenantDevices.filter(
          (td) =>
            (td.tenant_code || "TENANT-UTAMA").toUpperCase() ===
            activeTenantCode.toUpperCase()
        )
      : tenantDevices;

  const activeTenantObj = tenants.find(
    (t) => t.code.toUpperCase() === activeTenantCode.toUpperCase()
  );

  const scopeLabel =
    activeTenantCode === "ALL"
      ? "Semua Tenant (Agregasi Armada)"
      : activeDeviceCode === "ALL"
      ? `${activeTenantObj?.name || activeTenantCode} · Semua Alat (${scopedTenantDevices.length})`
      : `${device.device_code} · ${device.pond_name}`;

  const [aeratorTargetCode, setAeratorTargetCode] = useState<string>(
    activeDeviceCode !== "ALL"
      ? activeDeviceCode
      : scopedTenantDevices[0]?.device_code || ""
  );

  useEffect(() => {
    if (activeDeviceCode !== "ALL") {
      setAeratorTargetCode(activeDeviceCode);
    } else if (
      scopedTenantDevices.length > 0 &&
      !scopedTenantDevices.some((d) => d.device_code === aeratorTargetCode)
    ) {
      setAeratorTargetCode(scopedTenantDevices[0].device_code);
    }
  }, [activeDeviceCode, activeTenantCode, tenantDevices.length]);

  const handleSelectScope = (
    nextTenantCode: string,
    nextDeviceCode: string = "ALL",
    nextTab?: TabId,
    nextSubTab?: "tenants" | "devices"
  ) => {
    if (nextTab) setActiveTab(nextTab);
    if (nextSubTab) setTenantSubTab(nextSubTab);

    const targetTab = nextTab || activeTab;
    const query: Record<string, string> = {
      tenant_code: nextTenantCode,
      device_code:
        nextTenantCode !== "ALL" && nextDeviceCode ? nextDeviceCode : "ALL",
    };
    if (targetTab) {
      query.tab = targetTab;
    }
    if (
      (nextTab === "manajemen-tenant" || targetTab === "manajemen-tenant") &&
      (nextSubTab || tenantSubTab)
    ) {
      query.subtab = nextSubTab || tenantSubTab;
    }

    router.get("/dashboard", query, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const selectMobileTab = (tab: TabId) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Aerator runtime state
  const [aeratorState, setAeratorState] = useState<AeratorState>(
    initialAeratorState || {
      isOn: false,
      mode: "AUTO",
      dailyDuration: "0 jam 0 menit",
    }
  );

  // Sinkronisasi props Inertia saat reload parsial / navigasi
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      const subTabParam = urlParams.get("subtab");
      if (subTabParam === "ota") {
        setTenantSubTab("devices");
        setTenantDeviceSection("ota");
      } else if (subTabParam === "devices") {
        setTenantSubTab("devices");
        setTenantDeviceSection("crud");
      } else if (subTabParam === "tenants") {
        setTenantSubTab("tenants");
      }
      if (tabParam === "tenant" || tabParam === "manajemen-tenant" || tabParam === "tenants") {
        setActiveTab("manajemen-tenant");
      } else if (tabParam === "ota-mandiri") {
        if (hasPerm("manage_users")) {
          setActiveTab("manajemen-tenant");
          setTenantSubTab("devices");
          setTenantDeviceSection("ota");
        } else {
          setActiveTab("ota-mandiri");
        }
      } else if (tabParam === "users" || tabParam === "akun" || tabParam === "manajemen-akun") {
        setActiveTab("manajemen-akun");
      } else if (
        tabParam === "ringkasan" ||
        tabParam === "grafik" ||
        tabParam === "peringatan" ||
        tabParam === "aerator" ||
        tabParam === "prediksi" ||
        tabParam === "ekspor" ||
        tabParam === "dokumentasi" ||
        tabParam === "laporan-pemilik"
      ) {
        setActiveTab(tabParam as TabId);
      }
    }
  }, []);

  useEffect(() => {
    setCurrentReading(initialCurrentReading);
  }, [initialCurrentReading]);

  useEffect(() => {
    setPrediction(initialPrediction);
  }, [initialPrediction]);

  useEffect(() => {
    setAllReadings(initialAllReadings);
  }, [initialAllReadings]);

  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  useEffect(() => {
    if (propDevice) setDevice(propDevice);
  }, [propDevice]);

  // Realtime WebSocket-first + Automatic HTTP Fallback lifecycle
  useEffect(() => {
    if (!realtimeConfig) return;

    const client = new BanyuWeningRealtimeClient(
      realtimeConfig,
      {
        onModeChange: (mode, reason) => {
          setRealtimeMode(mode);
          if (reason) setTransportReason(reason);
        },
        onTelemetry: (reading, devicePatch) => {
          setCurrentReading(reading);
          setAllReadings((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.ts === reading.ts) return prev;
            return [...prev.slice(-287), reading];
          });
          if (devicePatch) {
            setDevice((prev) => ({ ...prev, ...devicePatch }));
          }
          setAeratorState((prev) => ({
            ...prev,
            isOn: Boolean(reading.aerator_on),
            mode: reading.mode || prev.mode,
          }));
        },
        onPrediction: (nextPrediction, nextAlert) => {
          setPrediction(nextPrediction);
          if (nextAlert) {
            setAlerts((prev) => {
              if (prev.some((a) => a.id === nextAlert.id)) return prev;
              return [nextAlert, ...prev].slice(0, 50);
            });
          }
        },
        onAlertsRefresh: (nextAlerts) => {
          setAlerts(nextAlerts);
        },
        onControlUpdate: (ctrl) => {
          setAeratorState((prev) => ({
            ...prev,
            isOn: typeof ctrl.aerator_on === "boolean" ? ctrl.aerator_on : prev.isOn,
            mode: ctrl.mode || prev.mode,
          }));
        },
      },
      activeDeviceCode || device.device_code
    );

    client.start();
    return () => client.stop();
  }, [realtimeConfig, activeDeviceCode]);

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
  const resolvedPerms: UserPermissions = {
    ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.OPERATOR),
    ...(user.permissions || {}),
  };
  const hasPerm = (key: PermissionKey): boolean => Boolean(resolvedPerms[key]);
  const hasAnyAdminMenu =
    hasPerm("view_docs_api") ||
    hasPerm("manage_users") ||
    hasPerm("manage_landing") ||
    hasPerm("manage_notifications") ||
    hasPerm("manage_backups");
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
    const resolvedTargetDevice =
      activeDeviceCode !== "ALL" && activeDeviceCode !== "BELUM-TERHUBUNG"
        ? activeDeviceCode
        : aeratorTargetCode ||
          scopedTenantDevices[0]?.device_code ||
          (device.device_code !== "BELUM-TERHUBUNG" && device.device_code !== "SEMUA-TENANT"
            ? device.device_code
            : undefined);

    return new Promise((resolve) => {
      router.post(
        "/dashboard/aerator",
        {
          action,
          duration_minutes: durationMin,
          device_code: resolvedTargetDevice,
        },
        {
          preserveScroll: true,
          onSuccess: () => {
            setAeratorState({
              isOn: action === "ON" ? true : action === "OFF" ? false : aeratorState.isOn,
              mode: action === "AUTO" ? "AUTO" : "MANUAL",
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
            {/* Laporan Eksekutif Kolam */}
            {hasPerm("view_owner_report") && (
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

            {hasPerm("view_summary") && (
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
            )}

            {hasPerm("view_charts") && (
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
            )}

            {hasPerm("view_alerts") && (
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
            )}

            {/* Aerator */}
            {hasPerm("control_aerator") && (
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

            {/* Prediksi ML */}
            {hasPerm("view_predictions") && (
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

            {/* Ekspor CSV */}
            {hasPerm("export_csv") && (
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

            {/* Bibit Masuk & Evaluasi Panen AI */}
            {hasPerm("view_summary") && (
              <button
                onClick={() => setActiveTab("evaluasi-panen")}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                  activeTab === "evaluasi-panen"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
                title="Input Bibit Masuk, Hasil Panen (KG & Ukuran Lele) & Evaluasi Mortalitas AI"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Scale className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Bibit &amp; Evaluasi Panen</span>
                </span>
                {harvestCycles.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 ${
                      activeTab === "evaluasi-panen"
                        ? "bg-brand-ink/15 text-brand-ink"
                        : "bg-brand/10 text-brand"
                    }`}
                  >
                    {harvestCycles.length}
                  </span>
                )}
              </button>
            )}

            {/* Kelola Alat IoT & Firmware OTA (Khusus Non-Admin yang Punya Izin Update Firmware) */}
            {hasPerm("update_device_firmware") && !hasPerm("manage_users") && (
              <button
                onClick={() => setActiveTab("ota-mandiri")}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                  activeTab === "ota-mandiri"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "text-ink hover:bg-surface-2"
                }`}
                title="Kelola Alat IoT & Update Firmware Per Alat"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Cpu className="w-4 h-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">Kelola Alat IoT</span>
                </span>
                {tenantDevices.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 ${
                      activeTab === "ota-mandiri"
                        ? "bg-brand-ink/15 text-brand-ink"
                        : "bg-brand/10 text-brand"
                    }`}
                  >
                    {tenantDevices.length}
                  </span>
                )}
              </button>
            )}

            {/* MENU ADMINISTRASI & SUPER ADMIN */}
            {hasAnyAdminMenu && (
              <>
                <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                  Menu Super Admin
                </div>

                {hasPerm("view_docs_api") && (
                  <button
                    onClick={() => setActiveTab("dokumentasi")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                      activeTab === "dokumentasi"
                        ? "bg-brand text-brand-ink font-semibold"
                        : "text-ink hover:bg-surface-2"
                    }`}
                    title="Dokumentasi Lengkap, OTA ESP32, RF MLOps & API Swagger"
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate whitespace-nowrap">Dokumentasi Lengkap</span>
                  </button>
                )}

                {hasPerm("manage_users") && (
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setTenantSubTab("tenants");
                        setTenantDeviceSection("crud");
                        setActiveTab("manajemen-tenant");
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                        activeTab === "manajemen-tenant"
                          ? "bg-brand text-brand-ink font-semibold"
                          : "text-ink hover:bg-surface-2"
                      }`}
                      title="Kelola Mitra Multi-Tenant Tambak & Alokasi Node IoT"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span className="truncate whitespace-nowrap">Mitra Multi-Tenant</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0 ${
                          activeTab === "manajemen-tenant"
                            ? "bg-brand-ink/20 text-brand-ink"
                            : "bg-brand/10 text-brand"
                        }`}
                      >
                        {tenants.length} Tenant
                      </span>
                    </button>

                    <div className="pl-5 ml-3 border-l border-line space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTenantSubTab("tenants");
                          setTenantDeviceSection("crud");
                          setActiveTab("manajemen-tenant");
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[5px] text-left text-[12px] transition-colors cursor-pointer ${
                          activeTab === "manajemen-tenant" && tenantSubTab === "tenants"
                            ? "bg-brand/15 text-brand font-semibold"
                            : "text-muted hover:text-ink hover:bg-surface-2"
                        }`}
                      >
                        <span className="truncate">Daftar Mitra Tenant</span>
                        <span className="text-[10px] font-mono">{tenants.length}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTenantSubTab("devices");
                          setTenantDeviceSection("crud");
                          setActiveTab("manajemen-tenant");
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[5px] text-left text-[12px] transition-colors cursor-pointer ${
                          activeTab === "manajemen-tenant" && tenantSubTab === "devices"
                            ? "bg-brand/15 text-brand font-semibold"
                            : "text-muted hover:text-ink hover:bg-surface-2"
                        }`}
                      >
                        <span className="truncate">Kelola Alat IoT</span>
                        <span className="text-[10px] font-mono">{scopedTenantDevices.length}</span>
                      </button>
                    </div>
                  </div>
                )}

                {hasPerm("manage_users") && (
                  <button
                    onClick={() => setActiveTab("manajemen-akun")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left text-[13px] font-medium transition-colors cursor-pointer group ${
                      activeTab === "manajemen-akun"
                        ? "bg-brand text-brand-ink font-semibold"
                        : "text-ink hover:bg-surface-2"
                    }`}
                    title="Buat & Kelola Akun serta Kustom Hak Akses"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="truncate whitespace-nowrap">Buat & Kelola Akun</span>
                  </button>
                )}

                {hasPerm("manage_landing") && (
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
                )}

                {hasPerm("manage_notifications") && (
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
                )}

                {hasPerm("manage_backups") && (
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
                )}
              </>
            )}

            {/* MENU PANDUAN LAPANGAN: Tutorial SOP */}
            {hasPerm("view_tutorial") && (
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

            {/* MENU KAJIAN AKUAKULTUR: Analisis Lengkap */}
            {hasPerm("view_analis_data") && (
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
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        {/* Mobile Header (56px) */}
        <header className="md:hidden h-14 border-b border-line bg-surface px-3 sm:px-4 flex items-center justify-between gap-2 sticky top-0 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" aria-label="BanyuWening" className="shrink-0 min-h-[44px] inline-flex items-center">
              <img
                src={isDarkMode ? "/brand/logogram-gelap.svg" : "/brand/logogram.svg"}
                alt=""
                width={26}
                height={32}
              />
            </Link>
            <button
              type="button"
              onClick={() => selectMobileTab("profil")}
              className="text-left min-w-0 min-h-[44px] flex flex-col justify-center cursor-pointer"
              title="Buka Pengaturan Profil & 2FA"
            >
              <div className="text-[13px] font-semibold text-ink leading-tight truncate max-w-[140px]">
                {user.name}
              </div>
              <div className="text-[10px] text-brand font-medium truncate">
                {getRoleBadgeLabel(user.role)}
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasPerm("control_aerator") && (
              <button
                type="button"
                onClick={() => setIsControlModalOpen(true)}
                className="min-h-[44px] px-2.5 rounded-[6px] border border-brand/30 bg-brand/10 text-brand text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Kendali Cepat Aerator"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Aerator</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="min-h-[44px] min-w-[44px] rounded-[6px] border border-line text-muted hover:text-ink inline-flex items-center justify-center cursor-pointer"
              aria-label="Toggle tema gelap/terang"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#F2C46B]" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="dashboard-mobile-drawer"
              className={`min-h-[44px] px-2.5 rounded-[6px] border text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                isMobileMenuOpen
                  ? "bg-brand text-brand-ink border-brand"
                  : "bg-surface-2 text-ink border-line"
              }`}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>{isMobileMenuOpen ? "Tutup" : "Menu"}</span>
            </button>
          </div>
        </header>

        {/* Mobile Categorized Navigation Drawer */}
        {isMobileMenuOpen && (
          <>
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 top-14 z-30 bg-black/55 backdrop-blur-xs"
              aria-hidden="true"
            />
            <div
              id="dashboard-mobile-drawer"
              className="md:hidden fixed top-14 left-0 right-0 z-40 max-h-[calc(100dvh-7.5rem)] overflow-y-auto bg-surface border-b border-line p-4 space-y-4 shadow-2xl"
            >
              {/* Monitoring & Operasional */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-1">
                  Monitoring &amp; Lapangan
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {hasPerm("view_summary") && (
                    <button
                      onClick={() => selectMobileTab("ringkasan")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "ringkasan" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span className="truncate">Ringkasan</span>
                    </button>
                  )}
                  {hasPerm("view_charts") && (
                    <button
                      onClick={() => selectMobileTab("grafik")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "grafik" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <LineChart className="w-4 h-4 shrink-0" />
                      <span className="truncate">Grafik Riwayat</span>
                    </button>
                  )}
                  {hasPerm("view_alerts") && (
                    <button
                      onClick={() => selectMobileTab("peringatan")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center justify-between gap-1 border text-left ${
                        activeTab === "peringatan" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Bell className="w-4 h-4 shrink-0" />
                        <span className="truncate">Peringatan</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-ink/20 font-bold shrink-0">
                        {alerts.length}
                      </span>
                    </button>
                  )}
                  {hasPerm("control_aerator") && (
                    <button
                      onClick={() => selectMobileTab("aerator")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "aerator" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <Power className="w-4 h-4 shrink-0" />
                      <span className="truncate">Aerator</span>
                    </button>
                  )}
                  {hasPerm("view_predictions") && (
                    <button
                      onClick={() => selectMobileTab("prediksi")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "prediksi" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <Cpu className="w-4 h-4 shrink-0" />
                      <span className="truncate">Prediksi ML</span>
                    </button>
                  )}
                  {hasPerm("export_csv") && (
                    <button
                      onClick={() => selectMobileTab("ekspor")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "ekspor" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <span className="truncate">Ekspor CSV</span>
                    </button>
                  )}
                  {hasPerm("view_tutorial") && (
                    <button
                      onClick={() => selectMobileTab("tutorial")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "tutorial" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <Wrench className="w-4 h-4 shrink-0" />
                      <span className="truncate">Tutorial SOP</span>
                    </button>
                  )}
                  {hasPerm("view_analis_data") && (
                    <button
                      onClick={() => selectMobileTab("analisis-lengkap")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "analisis-lengkap" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 shrink-0" />
                      <span className="truncate">Data Analis</span>
                    </button>
                  )}
                  {hasPerm("view_owner_report") && (
                    <button
                      onClick={() => selectMobileTab("laporan-pemilik")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "laporan-pemilik" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <Fish className="w-4 h-4 shrink-0" />
                      <span className="truncate">Laporan Kolam</span>
                    </button>
                  )}
                  {hasPerm("view_summary") && (
                    <button
                      onClick={() => selectMobileTab("evaluasi-panen")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "evaluasi-panen" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <Scale className="w-4 h-4 shrink-0" />
                      <span className="truncate">Bibit &amp; Panen</span>
                    </button>
                  )}
                  {hasPerm("update_device_firmware") && !hasPerm("manage_users") && (
                    <button
                      onClick={() => selectMobileTab("ota-mandiri")}
                      className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                        activeTab === "ota-mandiri" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                      }`}
                    >
                      <Cpu className="w-4 h-4 shrink-0" />
                      <span className="truncate">Kelola Alat IoT</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Super Admin Menu */}
              {hasAnyAdminMenu && (
                <div className="space-y-1.5 pt-1 border-t border-line">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-1 pt-1">
                    Menu Super Admin
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {hasPerm("view_docs_api") && (
                      <button
                        onClick={() => selectMobileTab("dokumentasi")}
                        className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                          activeTab === "dokumentasi" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                        }`}
                      >
                        <BookOpen className="w-4 h-4 shrink-0" />
                        <span>Dokumentasi Lengkap (OTA, RF &amp; API)</span>
                      </button>
                    )}
                    {hasPerm("manage_users") && (
                      <>
                        <button
                          onClick={() => {
                            setTenantSubTab("tenants");
                            setTenantDeviceSection("crud");
                            selectMobileTab("manajemen-tenant");
                          }}
                          className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center justify-between gap-2 border text-left ${
                            activeTab === "manajemen-tenant" && tenantSubTab === "tenants"
                              ? "bg-brand text-brand-ink border-brand font-semibold"
                              : "bg-surface-2 text-ink border-line"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">Mitra Multi-Tenant (Daftar)</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-ink/15 font-mono font-bold">
                            {tenants.length}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setTenantSubTab("devices");
                            setTenantDeviceSection("crud");
                            selectMobileTab("manajemen-tenant");
                          }}
                          className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center justify-between gap-2 border text-left ${
                            activeTab === "manajemen-tenant" && tenantSubTab === "devices"
                              ? "bg-brand text-brand-ink border-brand font-semibold"
                              : "bg-surface-2 text-ink border-line"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Cpu className="w-4 h-4 shrink-0" />
                            <span className="truncate">Kelola Alat IoT (Per Tenant)</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-ink/15 font-mono font-bold">
                            {scopedTenantDevices.length}
                          </span>
                        </button>
                      </>
                    )}
                    {hasPerm("manage_users") && (
                      <button
                        onClick={() => selectMobileTab("manajemen-akun")}
                        className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                          activeTab === "manajemen-akun" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                        }`}
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Buat &amp; Kelola Akun + Hak Akses</span>
                      </button>
                    )}
                    {hasPerm("manage_landing") && (
                      <button
                        onClick={() => selectMobileTab("manajemen-konten")}
                        className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                          activeTab === "manajemen-konten" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                        }`}
                      >
                        <Globe className="w-4 h-4 shrink-0" />
                        <span>Manajemen Konten Landing</span>
                      </button>
                    )}
                    {hasPerm("manage_notifications") && (
                      <button
                        onClick={() => selectMobileTab("konfigurasi-bot")}
                        className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                          activeTab === "konfigurasi-bot" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                        }`}
                      >
                        <Bot className="w-4 h-4 shrink-0" />
                        <span>Konfigurasi Bot &amp; Notifikasi</span>
                      </button>
                    )}
                    {hasPerm("manage_backups") && (
                      <button
                        onClick={() => selectMobileTab("keamanan-backup")}
                        className={`min-h-[44px] px-3 rounded-[6px] text-[12.5px] font-medium flex items-center gap-2 border text-left ${
                          activeTab === "keamanan-backup" ? "bg-brand text-brand-ink border-brand font-semibold" : "bg-surface-2 text-ink border-line"
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Keamanan &amp; Backup</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Akun & Keluar */}
              <div className="pt-2 border-t border-line grid grid-cols-3 gap-2">
                <button
                  onClick={() => selectMobileTab("profil")}
                  className={`min-h-[44px] px-2.5 rounded-[6px] text-[12px] font-semibold flex items-center justify-center gap-1.5 border ${
                    activeTab === "profil" ? "bg-brand text-brand-ink border-brand" : "bg-surface-2 text-ink border-line"
                  }`}
                >
                  <UserCog className="w-3.5 h-3.5 shrink-0" />
                  <span>Profil &amp; 2FA</span>
                </button>
                <Link
                  href="/demo"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="min-h-[44px] px-2.5 rounded-[6px] text-[12px] font-semibold flex items-center justify-center gap-1.5 border border-line bg-surface-2 text-ink"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>Demo</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="min-h-[44px] px-2.5 rounded-[6px] text-[12px] font-semibold flex items-center justify-center gap-1.5 border border-bahaya/30 bg-bahaya/10 text-bahaya"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mobile Navigation Sub-Bar (Horizontal Scrollable) */}
        <div className="md:hidden flex items-center overflow-x-auto no-scrollbar border-b border-line bg-surface px-3 py-1.5 gap-1.5 text-[12px] font-medium [&_button]:min-h-[44px] [&_button]:inline-flex [&_button]:items-center">
          <button
            onClick={() => setActiveTab("profil")}
            className={`min-h-[38px] px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
              activeTab === "profil"
                ? "bg-brand text-brand-ink font-semibold"
                : "bg-surface-2 text-ink"
            }`}
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Profil & 2FA</span>
          </button>
          {hasPerm("view_owner_report") && (
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

          {hasPerm("view_summary") && (
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
          )}

          {hasPerm("view_charts") && (
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
          )}

          {hasPerm("view_alerts") && (
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
          )}

          {hasPerm("control_aerator") && (
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

          {hasPerm("view_predictions") && (
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

          {hasPerm("export_csv") && (
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

          {hasPerm("update_device_firmware") && !hasPerm("manage_users") && (
            <button
              onClick={() => setActiveTab("ota-mandiri")}
              className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                activeTab === "ota-mandiri"
                  ? "bg-brand text-brand-ink font-semibold"
                  : "bg-surface-2 text-ink"
              }`}
            >
              Kelola Alat IoT
            </button>
          )}

          {hasPerm("view_docs_api") && (
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
          )}

          {hasPerm("manage_users") && (
            <>
              <button
                onClick={() => {
                  setTenantSubTab("tenants");
                  setTenantDeviceSection("crud");
                  setActiveTab("manajemen-tenant");
                }}
                className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  activeTab === "manajemen-tenant" && tenantSubTab === "tenants"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "bg-surface-2 text-ink"
                }`}
              >
                Mitra Tenant ({tenants.length})
              </button>
              <button
                onClick={() => {
                  setTenantSubTab("devices");
                  setTenantDeviceSection("crud");
                  setActiveTab("manajemen-tenant");
                }}
                className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  activeTab === "manajemen-tenant" && tenantSubTab === "devices"
                    ? "bg-brand text-brand-ink font-semibold"
                    : "bg-surface-2 text-ink"
                }`}
              >
                Alat IoT ({scopedTenantDevices.length})
              </button>
            </>
          )}

          {hasPerm("manage_users") && (
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
          )}

          {hasPerm("manage_landing") && (
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
          )}

          {hasPerm("manage_notifications") && (
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
          )}

          {hasPerm("manage_backups") && (
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
          )}

          {hasPerm("view_tutorial") && (
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

          {hasPerm("view_analis_data") && (
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
          {/* Status Bar Operasional Kolam (2-Tier Scope: Tenant -> Alat IoT) */}
          <div className="mb-5 sm:mb-6 p-3 sm:px-4 sm:py-3 bg-surface border border-line rounded-[6px] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5 sm:gap-3 text-[11.5px] sm:text-[12px] shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 shrink-0 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {device.status === "ONLINE" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aman opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${device.status === "ONLINE" ? "bg-aman" : "bg-muted"}`} />
              </span>
              <span className="font-semibold text-ink whitespace-nowrap">
                {device.status === "ONLINE"
                  ? activeDeviceCode === "ALL"
                    ? "Armada Terhubung:"
                    : "ESP32 Terhubung:"
                  : "Status ESP32:"}
              </span>
              <span className="text-muted whitespace-nowrap">
                {device.status === "ONLINE"
                  ? `${device.transport_protocol || "HTTP"} · Realtime`
                  : "Standby"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-semibold whitespace-nowrap ${
                  realtimeMode === "WEBSOCKET"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : realtimeMode === "HTTP_FALLBACK"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-surface-2 text-muted"
                }`}
                title={transportReason || "Status kanal realtime dashboard"}
              >
                {realtimeMode === "WEBSOCKET"
                  ? "WS Aktif"
                  : realtimeMode === "HTTP_FALLBACK"
                  ? "HTTP Fallback"
                  : "Menghubungkan WS..."}
              </span>
            </div>

            <div
              className={`grid grid-cols-1 ${
                activeTenantCode !== "ALL"
                  ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  : "sm:grid-cols-[minmax(0,1fr)_auto]"
              } xl:flex xl:items-center gap-2 w-full xl:w-auto min-w-0 text-muted`}
            >
              {user.role === "ADMIN" || tenants.length > 1 || hasPerm("manage_users") ? (
                <div className="flex items-center min-h-[44px] sm:min-h-[38px] bg-surface-2 border border-line hover:border-brand/50 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 rounded-[6px] pl-2.5 pr-2 transition-colors min-w-0 w-full xl:w-[250px] 2xl:w-[275px]">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted shrink-0 min-w-[52px] sm:min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span>Tenant:</span>
                  </span>
                  <select
                    value={activeTenantCode}
                    onChange={(e) => handleSelectScope(e.target.value, "ALL")}
                    className="appearance-none bg-transparent border-0 py-1 pl-1.5 pr-6 w-full min-w-0 truncate font-mono text-[11.5px] font-semibold text-ink cursor-pointer focus:outline-hidden"
                    aria-label="Pilih Tenant Aktif"
                  >
                    <option value="ALL" className="bg-surface text-ink">
                      Semua Tenant ({tenants.length} Mitra · {tenantDevices.length} Alat)
                    </option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.code} className="bg-surface text-ink">
                        {t.code} · {t.name} ({t.devices_count ?? 0} alat)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0 pointer-events-none -ml-4" />
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 min-h-[44px] sm:min-h-[38px] rounded-[6px] bg-brand/10 border border-brand/25 font-mono text-[11px] text-brand font-semibold">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{user.tenant_code || "TENANT-UTAMA"}</span>
                </div>
              )}

              {activeTenantCode !== "ALL" && (
                scopedTenantDevices.length > 0 ? (
                  <div className="flex items-center min-h-[44px] sm:min-h-[38px] bg-surface-2 border border-line hover:border-brand/50 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 rounded-[6px] pl-2.5 pr-2 transition-colors min-w-0 w-full xl:w-[220px] 2xl:w-[245px]">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted shrink-0 min-w-[52px] sm:min-w-0">
                      <Cpu className="w-3.5 h-3.5 text-brand shrink-0" />
                      <span>Alat:</span>
                    </span>
                    <select
                      value={activeDeviceCode}
                      onChange={(e) => handleSelectScope(activeTenantCode, e.target.value)}
                      className="appearance-none bg-transparent border-0 py-1 pl-1.5 pr-6 w-full min-w-0 truncate font-mono text-[11.5px] font-semibold text-ink cursor-pointer focus:outline-hidden"
                      aria-label="Pilih Alat IoT Tenant Ini"
                    >
                      <option value="ALL" className="bg-surface text-ink">
                        Semua Alat Tenant ({scopedTenantDevices.length})
                      </option>
                      {scopedTenantDevices.map((td) => (
                        <option key={td.id} value={td.device_code} className="bg-surface text-ink">
                          {td.device_code} · {td.pond_name} [{td.status}]
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0 pointer-events-none -ml-4" />
                  </div>
                ) : (
                  hasPerm("manage_users") && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectScope(activeTenantCode, "ALL", "manajemen-tenant", "devices")
                      }
                      className="min-h-[44px] sm:min-h-[38px] px-3 rounded-[6px] border border-dashed border-brand/40 bg-brand/5 hover:bg-brand/10 text-brand text-[11.5px] font-semibold cursor-pointer inline-flex items-center justify-center whitespace-nowrap shrink-0"
                    >
                      + Alokasikan Alat ke Tenant Ini
                    </button>
                  )
                )
              )}

              <button
                type="button"
                onClick={() =>
                  router.reload({
                    only: [
                      "currentReading",
                      "prediction",
                      "allReadings",
                      "alerts",
                      "device",
                      "tenantDevices",
                      "devices",
                      "tenants",
                    ],
                  })
                }
                className="min-h-[44px] sm:min-h-[38px] px-3 rounded-[6px] border border-line bg-surface-2 hover:border-brand/50 text-ink text-[11.5px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                title="Muat ulang data telemetry terkini"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {/* TAB: PENGATURAN PROFIL & 2FA (Semua Role) */}
          {activeTab === "profil" && <UserProfileSettings user={user} />}

          {/* TAB: UPDATE FIRMWARE MANDIRI (Peternak Self-OTA Terisolasi Tenant) */}
          {activeTab === "ota-mandiri" &&
            (hasPerm("update_device_firmware") || hasPerm("view_docs_api")) && (
              <SuperAdminOtaProtocolPanel
                initialOverview={otaOverview}
                realtimeConfig={realtimeConfig}
                users={users}
                activeTenantCode={activeTenantCode}
                activeDeviceCode={activeDeviceCode}
                isTenantMode={user.role !== "ADMIN" && !hasPerm("view_docs_api")}
              />
            )}

          {/* TAB: LAPORAN PEMILIK */}
          {activeTab === "laporan-pemilik" && hasPerm("view_owner_report") && (
            <PemilikProcessedData
              currentReading={currentReading}
              prediction={prediction}
              aeratorState={aeratorState}
              scopeLabel={scopeLabel}
            />
          )}

          {/* TAB: BIBIT MASUK & EVALUASI PANEN AI */}
          {activeTab === "evaluasi-panen" && hasPerm("view_summary") && (
            <HarvestEvaluationPanel
              initialCycles={harvestCycles}
              devices={tenantDevices}
              activeTenantCode={activeTenantCode}
              activeDeviceCode={activeDeviceCode}
              defaultPondName={device?.pond_name || user.pond_name || "Kolam Utama"}
            />
          )}

          {/* TAB: DOKUMENTASI LENGKAP (Termasuk RBAC Granular, OTA ESP32, RF MLOps, Swagger/AsyncAPI & Token Alat) */}
          {activeTab === "dokumentasi" && hasPerm("view_docs_api") && (
            <SuperAdminDocs
              users={users}
              devices={managedDevices}
              realtimeConfig={realtimeConfig}
              activeTransport={realtimeMode}
              transportReason={transportReason}
              otaOverview={otaOverview}
              mlOverview={mlOverview}
            />
          )}

          {/* TAB: MANAJEMEN TENANT (Multi-Tenant Tambak, Kelola Alat IoT & OTA Firmware) */}
          {activeTab === "manajemen-tenant" && hasPerm("manage_users") && (
            <SuperAdminTenantManagement
              tenants={tenants}
              users={users}
              devices={managedDevices}
              activeTenantCode={activeTenantCode}
              activeDeviceCode={activeDeviceCode}
              otaOverview={otaOverview}
              realtimeConfig={realtimeConfig}
              canManageOta={hasPerm("update_device_firmware") || hasPerm("view_docs_api")}
              isTenantOtaMode={user.role !== "ADMIN" && !hasPerm("view_docs_api")}
              initialSubTab={tenantSubTab}
              initialDeviceSection={tenantDeviceSection}
              onSubTabChange={setTenantSubTab}
              onSelectTenantScope={(tenantCode, deviceCode, navigateToMonitoring) =>
                handleSelectScope(
                  tenantCode,
                  deviceCode || "ALL",
                  navigateToMonitoring ? "ringkasan" : "manajemen-tenant"
                )
              }
              onFilterUsersByTenant={(tenantCode) =>
                handleSelectScope(tenantCode, "ALL", "manajemen-akun")
              }
            />
          )}

          {/* TAB: MANAJEMEN AKUN */}
          {activeTab === "manajemen-akun" && hasPerm("manage_users") && (
            <SuperAdminUserManagement
              users={users}
              tenants={tenants}
              devices={managedDevices}
              activeTenantCode={activeTenantCode}
            />
          )}

          {/* TAB: MANAJEMEN KONTEN LANDING */}
          {activeTab === "manajemen-konten" && hasPerm("manage_landing") && (
            <SuperAdminContentManagement landingContent={landingContent} />
          )}

          {/* TAB: KONFIGURASI BOT & NOTIFIKASI */}
          {activeTab === "konfigurasi-bot" && hasPerm("manage_notifications") && (
            <SuperAdminNotificationConfig />
          )}

          {/* TAB: KEAMANAN & BACKUP BASIS DATA */}
          {activeTab === "keamanan-backup" && hasPerm("manage_backups") && (
            <SuperAdminSecurityBackup
              securityStats={securityStats}
              backups={backups}
              onNavigateTab={(tab) => setActiveTab(tab as TabId)}
            />
          )}

          {/* TAB: TUTORIAL ALAT & SOP */}
          {activeTab === "tutorial" && hasPerm("view_tutorial") && <OperatorTutorial />}

          {/* TAB: PEMBACAAN DATA LENGKAP */}
          {activeTab === "analisis-lengkap" && hasPerm("view_analis_data") && (
            <AnalisDetailedData allReadings={allReadings} />
          )}

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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h2 className="text-[13px] sm:text-[14px] font-semibold text-muted uppercase tracking-wider">
                    {activeDeviceCode === "ALL"
                      ? "Parameter Fisik Kolam (Rata-rata)"
                      : "Parameter Fisik Kolam"}
                  </h2>
                  <button
                    onClick={() => setActiveTab("grafik")}
                    className="min-h-[44px] sm:min-h-[36px] inline-flex items-center text-[13px] text-brand hover:underline font-medium cursor-pointer"
                  >
                    Buka grafik lengkap →
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <ParameterCard
                    label={activeDeviceCode === "ALL" ? "pH (Rata-rata)" : "pH"}
                    value={currentReading ? currentReading.ph : "-"}
                    unit=""
                    status={paramStatus.ph}
                    statusLabel={getStatusLabel(paramStatus.ph)}
                    sparklineData={phSparkline}
                  />

                  <ParameterCard
                    label={activeDeviceCode === "ALL" ? "Suhu (Rata-rata)" : "Suhu"}
                    value={currentReading ? currentReading.temperature_c : "-"}
                    unit="°C"
                    status={paramStatus.temperature_c}
                    statusLabel={getStatusLabel(paramStatus.temperature_c)}
                    sparklineData={tempSparkline}
                  />

                  <ParameterCard
                    label={activeDeviceCode === "ALL" ? "TDS (Rata-rata)" : "TDS (Zat Terlarut)"}
                    value={currentReading ? currentReading.tds_ppm : "-"}
                    unit="ppm"
                    status={paramStatus.tds_ppm}
                    statusLabel={getStatusLabel(paramStatus.tds_ppm)}
                    sparklineData={tdsSparkline}
                  />

                  <ParameterCard
                    label={activeDeviceCode === "ALL" ? "Kekeruhan (Rata-rata)" : "Kekeruhan"}
                    value={currentReading ? currentReading.turbidity_ntu : "-"}
                    unit="NTU"
                    status={paramStatus.turbidity_ntu}
                    statusLabel={getStatusLabel(paramStatus.turbidity_ntu)}
                    sparklineData={turbSparkline}
                  />

                  {/* Level Air */}
                  <div className="bg-surface border border-line rounded-[6px] p-3.5 sm:p-4 flex flex-col justify-between h-full transition-shadow hover:shadow-xs min-w-0">
                    <div>
                      <div className="text-[12px] sm:text-[13px] leading-[18px] font-medium text-muted mb-1 truncate">
                        Level Air Kolam
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-[22px] sm:text-[32px] md:text-[38px] leading-[1.1] font-semibold tnum text-ink">
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
                    <div className="flex flex-wrap items-center justify-between gap-1 pt-2.5 border-t border-line/50 text-[11px] text-muted">
                      <span>Float Switch</span>
                      <span className="font-semibold text-ink">GPIO 18</span>
                    </div>
                  </div>

                  {/* Card Quick Prediction Summary */}
                  <div className="bg-surface border border-line rounded-[6px] p-3.5 sm:p-4 flex flex-col justify-between h-full transition-shadow hover:shadow-xs min-w-0">
                    <div>
                      <div className="text-[12px] sm:text-[13px] leading-[18px] font-medium text-muted mb-1 truncate">
                        Prediksi Risiko (1–3 Jam)
                      </div>
                      {prediction ? (
                        <>
                          <div className="flex items-baseline gap-1.5 mb-2">
                            <span className="text-[22px] sm:text-[32px] md:text-[38px] leading-[1.1] font-semibold text-aman">
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
                            <span className="text-[22px] sm:text-[32px] md:text-[38px] leading-[1.1] font-semibold text-muted">
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
                    <div className="flex flex-wrap items-center justify-between gap-1 pt-2.5 border-t border-line/50 text-[11px] text-muted">
                      <span>Random Forest</span>
                      {hasPerm("view_predictions") ? (
                        <button
                          onClick={() => setActiveTab("prediksi")}
                          className="min-h-[44px] sm:min-h-[36px] inline-flex items-center font-medium text-brand hover:underline cursor-pointer"
                        >
                          Rincian →
                        </button>
                      ) : (
                        <span className="text-muted">Aktif</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris Status Aerator & Perangkat */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
                <div className="md:col-span-2 bg-surface border border-line rounded-[6px] p-4 sm:p-5">
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
                    {!hasPerm("control_aerator") ? (
                      <span className="text-[12px] text-muted italic">
                        Mode pantau saja (Read-only). Hak akses kendali aerator tidak aktif untuk akun ini.
                      </span>
                    ) : (
                      <button
                        onClick={() => setIsControlModalOpen(true)}
                        className="min-h-[44px] px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Atur Aerator</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Kartu Perangkat */}
                <div className="bg-surface border border-line rounded-[6px] p-4 sm:p-5">
                  <h3 className="text-[15px] font-semibold text-ink mb-3">
                    {activeDeviceCode === "ALL" ? "Ringkasan Armada Scope" : "Status Node ESP32"}
                  </h3>
                  <div className="mb-2">
                    <StatusBadge level={device.status === "ONLINE" ? "aman" : "netral"}>
                      {device.status === "ONLINE" ? "Online · Terhubung" : "Standby · Siap Menerima Data"}
                    </StatusBadge>
                  </div>
                  <p className="text-[12px] text-muted leading-[18px]">
                    Firmware: <strong>{device.firmware_version || "v1.4.2-failsafe"}</strong>
                    <br />
                    Scope: <strong>{device.device_code || "BANYUWENING-01"}</strong>
                    <br />
                    Protokol: <strong>{device.transport_protocol || "MQTT / HTTP"}</strong>
                  </p>
                </div>
              </div>

              {/* Log Telemetri Armada Node IoT dalam Scope */}
              <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2 bg-surface-2/60">
                  <div>
                    <h3 className="text-[14px] font-semibold text-ink">
                      Log Telemetri Armada Node ({scopedTenantDevices.length} Alat)
                    </h3>
                    <p className="text-[11.5px] text-muted">
                      Scope aktif:{" "}
                      <strong className="text-ink">
                        {activeTenantCode === "ALL" ? "Semua Tenant" : activeTenantCode}
                      </strong>
                    </p>
                  </div>
                  {hasPerm("manage_users") && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectScope(
                          activeTenantCode,
                          "ALL",
                          "manajemen-tenant",
                          "devices"
                        )
                      }
                      className="min-h-[44px] sm:min-h-[38px] px-3 rounded-[6px] border border-brand/30 bg-brand/10 hover:bg-brand/15 text-brand text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Kelola Alat →</span>
                    </button>
                  )}
                </div>

                {scopedTenantDevices.length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-muted">
                    Belum ada node sensor ESP32 yang dialokasikan pada scope ini.
                  </div>
                ) : (
                  <>
                    {/* Desktop Table (>= lg) */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[12.5px]">
                        <thead>
                          <tr className="border-b border-line bg-surface-2/40 text-muted text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-4 font-semibold">Node / Kolam</th>
                            <th className="py-2.5 px-3 font-semibold">Tenant</th>
                            <th className="py-2.5 px-3 font-semibold">Status</th>
                            <th className="py-2.5 px-3 font-semibold">pH</th>
                            <th className="py-2.5 px-3 font-semibold">Suhu</th>
                            <th className="py-2.5 px-3 font-semibold">TDS</th>
                            <th className="py-2.5 px-3 font-semibold">Kekeruhan</th>
                            <th className="py-2.5 px-3 font-semibold">Aerator</th>
                            <th className="py-2.5 px-4 font-semibold text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {scopedTenantDevices.map((td) => {
                            const lr = td.latest_reading;
                            const isSelected = activeDeviceCode === td.device_code;
                            return (
                              <tr
                                key={td.id}
                                className={`hover:bg-surface-2/50 transition-colors ${
                                  isSelected ? "bg-brand/5" : ""
                                }`}
                              >
                                <td className="py-2.5 px-4">
                                  <div className="font-mono font-semibold text-ink">{td.device_code}</div>
                                  <div className="text-[11px] text-muted">{td.pond_name}</div>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-muted">
                                  {td.tenant_code || "TENANT-UTAMA"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <StatusBadge level={td.status === "ONLINE" ? "aman" : "netral"}>
                                    {td.status}
                                  </StatusBadge>
                                </td>
                                <td className="py-2.5 px-3 font-mono tnum">
                                  {lr ? lr.ph ?? "-" : "-"}
                                </td>
                                <td className="py-2.5 px-3 font-mono tnum">
                                  {lr ? (lr.temperature_c != null ? `${lr.temperature_c}°C` : "-") : "-"}
                                </td>
                                <td className="py-2.5 px-3 font-mono tnum">
                                  {lr ? (lr.tds_ppm != null ? `${lr.tds_ppm} ppm` : "-") : "-"}
                                </td>
                                <td className="py-2.5 px-3 font-mono tnum">
                                  {lr ? (lr.turbidity_ntu != null ? `${lr.turbidity_ntu} NTU` : "-") : "-"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      td.aerator_on
                                        ? "bg-brand/15 text-brand"
                                        : "bg-surface-2 text-muted"
                                    }`}
                                  >
                                    {td.aerator_on ? "ON" : "OFF"} · {td.mode || "AUTO"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectScope(
                                        td.tenant_code || activeTenantCode,
                                        td.device_code,
                                        "ringkasan"
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-[5px] border border-brand/30 text-brand hover:bg-brand/10 text-[11.5px] font-semibold cursor-pointer"
                                  >
                                    {isSelected ? "Aktif ✓" : "Pantau →"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile & Tablet Cards (< lg) */}
                    <div className="lg:hidden divide-y divide-line">
                      {scopedTenantDevices.map((td) => {
                        const lr = td.latest_reading;
                        const isSelected = activeDeviceCode === td.device_code;
                        return (
                          <div key={td.id} className="p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-mono text-[13px] font-bold text-ink truncate">
                                  {td.device_code}
                                </div>
                                <div className="text-[12px] text-muted truncate">
                                  {td.pond_name} · {td.tenant_code || "TENANT-UTAMA"}
                                </div>
                              </div>
                              <StatusBadge level={td.status === "ONLINE" ? "aman" : "netral"}>
                                {td.status}
                              </StatusBadge>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center bg-surface-2 rounded-[5px] p-2 text-[11px]">
                              <div>
                                <div className="text-muted text-[10px]">pH</div>
                                <div className="font-mono font-semibold tnum">{lr?.ph ?? "-"}</div>
                              </div>
                              <div>
                                <div className="text-muted text-[10px]">Suhu</div>
                                <div className="font-mono font-semibold tnum">
                                  {lr?.temperature_c != null ? `${lr.temperature_c}°` : "-"}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted text-[10px]">TDS</div>
                                <div className="font-mono font-semibold tnum">{lr?.tds_ppm ?? "-"}</div>
                              </div>
                              <div>
                                <div className="text-muted text-[10px]">NTU</div>
                                <div className="font-mono font-semibold tnum">{lr?.turbidity_ntu ?? "-"}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectScope(
                                  td.tenant_code || activeTenantCode,
                                  td.device_code,
                                  "ringkasan"
                                )
                              }
                              className="w-full min-h-[44px] rounded-[6px] border border-brand/30 bg-brand/10 text-brand text-[12.5px] font-semibold flex items-center justify-center cursor-pointer"
                            >
                              {isSelected ? "Sedang Dipantau ✓" : "Pantau Node Ini →"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
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

              {hasPerm("manage_notifications") && (
                <div className="p-3 bg-surface border border-line rounded-[6px] flex flex-wrap items-center justify-between gap-3 text-[13px]">
                  <div className="flex items-center gap-2 text-ink">
                    <Bot className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Konfigurasi bot pengirim notifikasi (Telegram, WhatsApp, Email) dapat disesuaikan di menu Konfigurasi Bot.</span>
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
                canAcknowledge={hasPerm("ack_alerts")}
              />
            </div>
          )}

          {/* TAB: KONTROL AERATOR */}
          {activeTab === "aerator" && hasPerm("control_aerator") && (
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

                  {activeDeviceCode === "ALL" && scopedTenantDevices.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      <label className="block text-[11.5px] font-semibold text-muted uppercase tracking-wider">
                        Target Node Kendali Aerator
                      </label>
                      <select
                        value={aeratorTargetCode}
                        onChange={(e) => setAeratorTargetCode(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-[6px] border border-line bg-surface-2 text-[12.5px] font-mono font-semibold text-ink"
                      >
                        {scopedTenantDevices.map((td) => (
                          <option key={td.id} value={td.device_code}>
                            {td.device_code} · {td.pond_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => setIsControlModalOpen(true)}
                    className="min-h-[44px] px-6 bg-brand text-brand-ink rounded-[6px] text-[14px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer"
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
          {activeTab === "prediksi" && hasPerm("view_predictions") && (
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
          {activeTab === "ekspor" && hasPerm("export_csv") && (
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

      {/* Mobile Fixed Bottom Thumb-Zone Navigation Bar */}
      <nav
        aria-label="Navigasi Cepat Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line px-1.5 pt-1.5 safe-bottom grid grid-cols-5 gap-1"
      >
        <button
          type="button"
          onClick={() =>
            selectMobileTab(
              hasPerm("view_summary")
                ? "ringkasan"
                : hasPerm("view_owner_report")
                ? "laporan-pemilik"
                : "profil"
            )
          }
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "ringkasan" || activeTab === "laporan-pemilik"
              ? "bg-brand text-brand-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span className="truncate max-w-full px-0.5">
            {hasPerm("view_summary") ? "Ringkasan" : "Laporan"}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            selectMobileTab(
              hasPerm("view_charts")
                ? "grafik"
                : hasPerm("view_docs_api")
                ? "dokumentasi"
                : "profil"
            )
          }
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "grafik" || activeTab === "dokumentasi"
              ? "bg-brand text-brand-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          {hasPerm("view_charts") ? (
            <LineChart className="w-4 h-4 mb-0.5" />
          ) : (
            <BookOpen className="w-4 h-4 mb-0.5" />
          )}
          <span>{hasPerm("view_charts") ? "Grafik" : "Docs"}</span>
        </button>

        <button
          type="button"
          onClick={() => selectMobileTab(hasPerm("view_alerts") ? "peringatan" : "profil")}
          className={`relative min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "peringatan"
              ? "bg-brand text-brand-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          <Bell className="w-4 h-4 mb-0.5" />
          <span>Alert</span>
          {alerts.length > 0 && (
            <span className="absolute top-1 right-2 px-1 rounded-full bg-bahaya text-white text-[9px] font-bold leading-tight">
              {alerts.length > 99 ? "99+" : alerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            selectMobileTab(
              hasPerm("manage_users")
                ? "manajemen-tenant"
                : hasPerm("control_aerator")
                ? "aerator"
                : hasPerm("view_predictions")
                ? "prediksi"
                : "profil"
            )
          }
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            activeTab === "manajemen-tenant" || activeTab === "aerator" || activeTab === "prediksi"
              ? "bg-brand text-brand-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          {hasPerm("manage_users") ? (
            <Building2 className="w-4 h-4 mb-0.5" />
          ) : hasPerm("control_aerator") ? (
            <Power className="w-4 h-4 mb-0.5" />
          ) : (
            <Cpu className="w-4 h-4 mb-0.5" />
          )}
          <span>
            {hasPerm("manage_users")
              ? "Tenant"
              : hasPerm("control_aerator")
              ? "Aerator"
              : hasPerm("view_predictions")
              ? "Prediksi"
              : "Profil"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`min-h-[48px] rounded-[6px] flex flex-col items-center justify-center text-[10.5px] font-medium cursor-pointer ${
            isMobileMenuOpen
              ? "bg-brand text-brand-ink font-semibold"
              : "text-muted hover:text-ink"
          }`}
        >
          {isMobileMenuOpen ? (
            <X className="w-4 h-4 mb-0.5" />
          ) : (
            <Menu className="w-4 h-4 mb-0.5" />
          )}
          <span>Menu</span>
        </button>
      </nav>

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
        targetDeviceLabel={
          activeDeviceCode !== "ALL"
            ? `${activeDeviceCode} (${device.pond_name})`
            : aeratorTargetCode
            ? `${aeratorTargetCode} (${
                scopedTenantDevices.find((d) => d.device_code === aeratorTargetCode)?.pond_name ||
                ""
              })`
            : undefined
        }
        scopedDevices={scopedTenantDevices}
        selectedTargetCode={activeDeviceCode !== "ALL" ? activeDeviceCode : aeratorTargetCode}
        onChangeTargetCode={setAeratorTargetCode}
        onApplyControl={handleApplyControl}
      />
    </div>
  );
}
