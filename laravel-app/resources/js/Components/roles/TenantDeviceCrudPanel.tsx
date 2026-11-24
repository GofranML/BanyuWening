import { useState } from "react";
import { router } from "@inertiajs/react";
import {
  Cpu,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Search,
  Filter,
  Activity,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Power,
  ShieldCheck,
  AlertTriangle,
  X,
  Building2,
  ChevronDown,
  Rocket,
} from "lucide-react";
import type { ManagedDevice, Tenant, User } from "@/Types";

const HARDWARE_PROFILES = [
  { value: "ESP32-WROOM-CoreHub-v2", label: "ESP32-WROOM CoreHub v2 (Multi-Sensor + Relay)" },
  { value: "ESP32-WROOM-Entry1K-v1", label: "ESP32-WROOM Entry 1K v1 (1 Kolam 4-Ch)" },
  { value: "ESP32-S3-Juragan4K-v2", label: "ESP32-S3 Juragan 4K v2 (PSRAM + DO Pro)" },
  { value: "ESP32-C3-MiniNode-v1", label: "ESP32-C3 Mini Node v1 (Sensor Satelit Ringkas)" },
];

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "";
}

interface TenantDeviceCrudPanelProps {
  tenants: Tenant[];
  devices: ManagedDevice[];
  users: User[];
  selectedTenantCode: string;
  onChangeTenantCode: (code: string) => void;
  onSelectDeviceToMonitor?: (tenantCode: string, deviceCode: string) => void;
  onOpenOtaForDevice?: (deviceCode: string) => void;
  onNotify?: (msg: string) => void;
}

export function TenantDeviceCrudPanel({
  tenants,
  devices,
  users,
  selectedTenantCode,
  onChangeTenantCode,
  onSelectDeviceToMonitor,
  onOpenOtaForDevice,
  onNotify,
}: TenantDeviceCrudPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [modalMode, setModalMode] = useState<"create" | "edit" | "delete" | "token" | null>(null);
  const [targetDevice, setTargetDevice] = useState<ManagedDevice | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Token state
  const [issuedTokens, setIssuedTokens] = useState<Record<number, string>>({});
  const [showPlainToken, setShowPlainToken] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);

  // Create / Edit form fields
  const [deviceCode, setDeviceCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [pondName, setPondName] = useState("");
  const [formTenantCode, setFormTenantCode] = useState("TENANT-UTAMA");
  const [hardwareProfile, setHardwareProfile] = useState("ESP32-WROOM-CoreHub-v2");
  const [firmwareVersion, setFirmwareVersion] = useState("v1.4.2-failsafe");
  const [deviceStatus, setDeviceStatus] = useState<"ONLINE" | "STANDBY" | "OFFLINE" | "CALIBRATING">("STANDBY");
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);
  const [grantOtaPermission, setGrantOtaPermission] = useState(true);

  const selectedTenantObj = tenants.find((t) => t.code === selectedTenantCode) || null;

  const tenantScopedDevices =
    selectedTenantCode === "ALL"
      ? devices
      : devices.filter(
          (d) => (d.tenant_code || "TENANT-UTAMA").toUpperCase() === selectedTenantCode.toUpperCase()
        );

  const filteredDevices = tenantScopedDevices.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      d.device_code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.pond_name.toLowerCase().includes(q) ||
      (d.tenant_code && d.tenant_code.toLowerCase().includes(q)) ||
      (d.hardware_profile && d.hardware_profile.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "ALL" || (d.status || "STANDBY").toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = tenantScopedDevices.filter((d) => (d.status || "").toUpperCase() === "ONLINE").length;

  const reloadDashboardProps = () => {
    router.reload({
      only: ["devices", "tenantDevices", "tenants", "otaOverview", "alerts", "currentReading", "prediction"],
    });
  };

  const openCreateModal = () => {
    const defaultTenant =
      selectedTenantCode !== "ALL"
        ? selectedTenantCode
        : tenants[0]?.code || "TENANT-UTAMA";
    const tObj = tenants.find((t) => t.code === defaultTenant);
    setTargetDevice(null);
    setDeviceCode("");
    setDeviceName("");
    setPondName(tObj?.pond_name || "Kolam Terpal Sangkuriang");
    setFormTenantCode(defaultTenant);
    setHardwareProfile("ESP32-WROOM-CoreHub-v2");
    setFirmwareVersion("v1.4.2-failsafe");
    setDeviceStatus("STANDBY");
    setAssignedUserIds(tObj?.owner_user_id ? [Number(tObj.owner_user_id)] : []);
    setGrantOtaPermission(true);
    setErrorMsg(null);
    setModalMode("create");
  };

  const openEditModal = (d: ManagedDevice) => {
    setTargetDevice(d);
    setDeviceCode(d.device_code);
    setDeviceName(d.name);
    setPondName(d.pond_name);
    setFormTenantCode(d.tenant_code || "TENANT-UTAMA");
    setHardwareProfile(d.hardware_profile || "ESP32-WROOM-CoreHub-v2");
    setFirmwareVersion(d.firmware_version || "v1.4.2-failsafe");
    setDeviceStatus(((d.status || "STANDBY").toUpperCase() as any) || "STANDBY");
    setAssignedUserIds(d.assigned_user_ids || []);
    setGrantOtaPermission(true);
    setErrorMsg(null);
    setModalMode("edit");
  };

  const openTokenModal = (d: ManagedDevice) => {
    setTargetDevice(d);
    setShowPlainToken(true);
    setCopiedToken(false);
    setErrorMsg(null);
    setModalMode("token");
  };

  const openDeleteModal = (d: ManagedDevice) => {
    setTargetDevice(d);
    setErrorMsg(null);
    setModalMode("delete");
  };

  const toggleUserAssign = (uid: number) => {
    setAssignedUserIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (modalMode === "create" && !deviceCode.trim()) {
      setErrorMsg("Kode perangkat IoT wajib diisi (contoh: ESP32-TAMBAK-01).");
      return;
    }
    if (!deviceName.trim() || !pondName.trim()) {
      setErrorMsg("Nama perangkat dan nama unit kolam wajib diisi.");
      return;
    }

    setBusy(true);
    try {
      const isCreate = modalMode === "create";
      const url = isCreate ? "/dashboard/devices" : `/dashboard/devices/${targetDevice?.id}`;
      const ownerId = assignedUserIds[0] || null;

      const res = await fetch(url, {
        method: isCreate ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          device_code: isCreate ? deviceCode.trim().toUpperCase() : undefined,
          name: deviceName.trim(),
          pond_name: pondName.trim(),
          tenant_code: formTenantCode,
          hardware_profile: hardwareProfile,
          firmware_version: firmwareVersion.trim() || "v1.4.2-failsafe",
          status: deviceStatus,
          owner_user_id: ownerId,
          assigned_user_ids: assignedUserIds,
          grant_ota_permission: grantOtaPermission,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const firstErr = json?.errors ? Object.values(json.errors).flat()[0] : null;
        setErrorMsg(String(firstErr || json?.message || "Gagal menyimpan konfigurasi perangkat IoT."));
      } else {
        if (isCreate && json.device && json.plain_token) {
          setIssuedTokens((prev) => ({ ...prev, [json.device.id]: json.plain_token }));
          setTargetDevice({ ...json.device, plain_token: json.plain_token });
          setShowPlainToken(true);
          setModalMode("token");
        } else {
          setModalMode(null);
        }
        onNotify?.(json.message || "Perangkat IoT berhasil disimpan.");
        reloadDashboardProps();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleRotateToken = async () => {
    if (!targetDevice) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/dashboard/devices/${targetDevice.id}/rotate-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.message || "Gagal merotasi token perangkat.");
      } else {
        if (json.plain_token) {
          setIssuedTokens((prev) => ({ ...prev, [targetDevice.id]: json.plain_token }));
        }
        if (json.device) {
          setTargetDevice({ ...json.device, plain_token: json.plain_token || json.device.plain_token });
        }
        setShowPlainToken(true);
        onNotify?.(json.message || "Token API baru berhasil diterbitkan.");
        reloadDashboardProps();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleToken = async () => {
    if (!targetDevice) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/dashboard/devices/${targetDevice.id}/toggle-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.message || "Gagal mengubah status token.");
      } else {
        if (json.device) {
          setTargetDevice({ ...targetDevice, ...json.device });
        }
        onNotify?.(json.message || "Status token diperbarui.");
        reloadDashboardProps();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!targetDevice) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/dashboard/devices/${targetDevice.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.message || "Gagal menghapus perangkat IoT.");
      } else {
        setModalMode(null);
        setTargetDevice(null);
        onNotify?.(json.message || "Perangkat IoT dihapus.");
        reloadDashboardProps();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const activeTokenText = targetDevice
    ? issuedTokens[targetDevice.id] || targetDevice.plain_token || targetDevice.api_token_prefix || ""
    : "";

  const copyActiveToken = () => {
    if (!activeTokenText) return;
    navigator.clipboard.writeText(activeTokenText);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header Device CRUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-[18px] sm:text-[20px] font-display font-semibold text-ink flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand shrink-0" />
            <span>
              Kelola Alat IoT —{" "}
              {selectedTenantObj ? `${selectedTenantObj.name}` : "Semua Mitra Tenant"}
            </span>
          </h3>
          <p className="text-[12.5px] text-muted mt-0.5 font-mono">
            {onlineCount} Online · {tenantScopedDevices.length} Total Node Terdaftar
            {selectedTenantCode !== "ALL" ? ` (${selectedTenantCode})` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Alat IoT Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 bg-surface border border-line rounded-[6px] grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="relative md:col-span-5">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode alat, nama perangkat, atau kolam..."
            className="w-full min-h-[44px] pl-9 pr-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-brand shrink-0" />
          <div className="relative flex-1 min-w-0">
            <select
              aria-label="Filter Alat Berdasarkan Tenant"
              value={selectedTenantCode}
              onChange={(e) => onChangeTenantCode(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] appearance-none pl-3 pr-8 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink truncate focus:outline-hidden focus:border-brand cursor-pointer"
            >
              <option value="ALL">Semua Tenant ({devices.length} Alat)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="md:col-span-3 flex items-center gap-2 min-w-0">
          <Filter className="w-4 h-4 text-muted shrink-0" />
          <div className="relative flex-1 min-w-0">
            <select
              aria-label="Filter Status Koneksi Alat"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] appearance-none pl-3 pr-8 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink truncate focus:outline-hidden focus:border-brand cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="ONLINE">Online</option>
              <option value="STANDBY">Standby</option>
              <option value="OFFLINE">Offline</option>
            </select>
            <ChevronDown className="w-4 h-4 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Devices Grid */}
      {filteredDevices.length === 0 ? (
        <div className="p-10 text-center bg-surface border border-line rounded-[6px] space-y-3">
          <Cpu className="w-10 h-10 text-muted mx-auto opacity-50" />
          <div className="text-[15px] font-semibold text-ink">
            {selectedTenantCode !== "ALL"
              ? `Belum ada alat IoT di tenant ${selectedTenantCode}`
              : "Tidak ada perangkat IoT yang cocok"}
          </div>
          <p className="text-[13px] text-muted max-w-md mx-auto">
            Tambahkan node sensor ESP32 baru untuk tenant ini atau pilih tenant lain dari daftar filter.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[44px] px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Daftarkan Alat ke Tenant Ini</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDevices.map((d) => {
            const st = (d.status || "STANDBY").toUpperCase();
            const isOnline = st === "ONLINE";
            const isOffline = st === "OFFLINE";
            const reading = d.latest_reading;

            return (
              <div
                key={d.id}
                className="bg-surface border border-line hover:border-brand/40 rounded-[6px] p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors shadow-2xs"
              >
                <div className="space-y-3">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-semibold text-brand truncate">
                        {d.device_code}
                      </div>
                      <h4 className="text-[15px] font-bold text-ink truncate mt-0.5" title={d.name}>
                        {d.name}
                      </h4>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold shrink-0 border ${
                        isOnline
                          ? "bg-aman-bg text-aman-text border-aman/30"
                          : isOffline
                          ? "bg-bahaya-bg text-bahaya-text border-bahaya/30"
                          : "bg-surface-2 text-muted border-line"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? "bg-aman" : isOffline ? "bg-bahaya" : "bg-muted"
                        }`}
                      />
                      <span>{st}</span>
                    </span>
                  </div>

                  {/* Metadata 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                    <div className="p-2.5 rounded-[6px] bg-surface-2/80 border border-line/60 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                        Unit Kolam
                      </div>
                      <div className="font-semibold text-ink truncate mt-0.5" title={d.pond_name}>
                        {d.pond_name}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-[6px] bg-surface-2/80 border border-line/60 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                        Mitra Tenant
                      </div>
                      <div className="font-mono font-semibold text-brand truncate mt-0.5">
                        {d.tenant_code || "TENANT-UTAMA"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-[6px] bg-surface-2/80 border border-line/60 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                        Hardware
                      </div>
                      <div className="font-medium text-ink truncate mt-0.5" title={d.hardware_profile}>
                        {d.hardware_profile || "CoreHub v2"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-[6px] bg-surface-2/80 border border-line/60 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted font-medium">
                        Firmware &amp; Token
                      </div>
                      <div className="font-mono text-ink truncate mt-0.5">
                        {d.firmware_version} · {d.token_active ? "Aktif" : "Nonaktif"}
                      </div>
                    </div>
                  </div>

                  {/* Live Sensor Snapshot Strip */}
                  {reading ? (
                    <div className="grid grid-cols-4 gap-1.5 p-2 rounded-[6px] bg-bg border border-line text-center text-[11px] tnum">
                      <div>
                        <div className="text-[9.5px] text-muted">pH</div>
                        <div className="font-bold text-ink">
                          {reading.ph !== null ? Number(reading.ph).toFixed(2) : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-muted">Suhu</div>
                        <div className="font-bold text-ink">
                          {reading.temperature_c !== null ? `${Number(reading.temperature_c).toFixed(1)}°` : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-muted">TDS</div>
                        <div className="font-bold text-ink">{reading.tds_ppm ?? "-"}</div>
                      </div>
                      <div>
                        <div className="text-[9.5px] text-muted">NTU</div>
                        <div className="font-bold text-ink">
                          {reading.turbidity_ntu !== null ? Number(reading.turbidity_ntu).toFixed(0) : "-"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-[6px] bg-bg border border-line/70 text-[11px] text-muted text-center">
                      Standby · Menunggu telemetri pertama
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => openTokenModal(d)}
                    className="min-h-[44px] sm:min-h-[38px] px-3 rounded-[6px] border border-brand/30 bg-brand/10 text-brand text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-brand/20 cursor-pointer flex-1"
                  >
                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                    <span>Token</span>
                  </button>

                  {onOpenOtaForDevice && (
                    <button
                      type="button"
                      onClick={() => onOpenOtaForDevice(d.device_code)}
                      className="min-h-[44px] sm:min-h-[38px] px-3 rounded-[6px] border border-brand/30 bg-surface-2 text-brand text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-brand/10 cursor-pointer flex-1"
                      title="Update firmware OTA & simulator alat ini"
                    >
                      <Rocket className="w-3.5 h-3.5 shrink-0" />
                      <span>OTA</span>
                    </button>
                  )}

                  <div className="col-span-2 flex items-center gap-2 sm:contents">
                    <button
                      type="button"
                      onClick={() => openEditModal(d)}
                      className="min-h-[44px] sm:min-h-[38px] px-3 rounded-[6px] border border-line bg-surface-2 text-ink text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:border-brand cursor-pointer flex-1"
                    >
                      <Pencil className="w-3.5 h-3.5 text-brand shrink-0" />
                      <span>Edit</span>
                    </button>

                    {onSelectDeviceToMonitor && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectDeviceToMonitor(d.tenant_code || "TENANT-UTAMA", d.device_code)
                        }
                        className="min-h-[44px] sm:min-h-[38px] px-3 rounded-[6px] border border-line text-ink text-[12px] font-medium inline-flex items-center justify-center gap-1.5 hover:border-brand hover:text-brand cursor-pointer flex-1"
                        title="Pantau grafik & sensor alat ini"
                      >
                        <Activity className="w-3.5 h-3.5 shrink-0" />
                        <span>Pantau</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openDeleteModal(d)}
                      aria-label={`Hapus alat ${d.device_code}`}
                      className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] px-2.5 rounded-[6px] border border-bahaya/30 bg-bahaya/10 text-bahaya inline-flex items-center justify-center hover:bg-bahaya/20 cursor-pointer shrink-0"
                      title="Hapus node IoT"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREATE / EDIT DEVICE */}
      {(modalMode === "create" || modalMode === "edit") && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => !busy && setModalMode(null)}
        >
          <div
            className="w-full sm:max-w-xl bg-surface border border-line rounded-t-[14px] sm:rounded-[8px] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[88dvh] overflow-y-auto safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-brand shrink-0" />
                <div>
                  <h4 className="text-[16px] font-semibold text-ink">
                    {modalMode === "create"
                      ? "Daftarkan Node Sensor IoT Baru"
                      : `Edit Node IoT: ${targetDevice?.device_code}`}
                  </h4>
                  <p className="text-[11.5px] text-muted">
                    Atur kode unik, penempatan mitra tenant, dan profil hardware ESP32
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !busy && setModalMode(null)}
                aria-label="Tutup modal perangkat"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-surface-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[6px] bg-bahaya-bg border border-bahaya/30 text-bahaya-text text-[12.5px]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-ink">
                    Kode Unik Alat <span className="text-bahaya">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    value={deviceCode}
                    onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                    placeholder="ESP32-KOLAM-03"
                    className="w-full min-h-[44px] px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] font-mono text-ink disabled:opacity-60 focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-ink">
                    Mitra Tenant Pemilik <span className="text-bahaya">*</span>
                  </label>
                  <select
                    value={formTenantCode}
                    onChange={(e) => setFormTenantCode(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.code}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-ink">
                    Nama Perangkat <span className="text-bahaya">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Node Telemetry Tambak Bioflok 3"
                    className="w-full min-h-[44px] px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-ink">
                    Unit / Nama Kolam <span className="text-bahaya">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pondName}
                    onChange={(e) => setPondName(e.target.value)}
                    placeholder="Kolam Terpal Sangkuriang 03"
                    className="w-full min-h-[44px] px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[12px] font-semibold text-ink">Profil Hardware</label>
                  <select
                    value={hardwareProfile}
                    onChange={(e) => setHardwareProfile(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                  >
                    {HARDWARE_PROFILES.map((hw) => (
                      <option key={hw.value} value={hw.value}>
                        {hw.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-ink">Versi Firmware</label>
                  <input
                    type="text"
                    value={firmwareVersion}
                    onChange={(e) => setFirmwareVersion(e.target.value)}
                    placeholder="v1.4.2-failsafe"
                    className="w-full min-h-[44px] px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] font-mono text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-semibold text-ink">Status Koneksi</label>
                  <select
                    value={deviceStatus}
                    onChange={(e) => setDeviceStatus(e.target.value as any)}
                    className="w-full min-h-[44px] px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                  >
                    <option value="STANDBY">STANDBY</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="CALIBRATING">CALIBRATING</option>
                  </select>
                </div>
              </div>

              {users.filter((u) => u.role !== "ADMIN").length > 0 && (
                <div className="p-3 bg-surface-2/60 border border-line rounded-[6px] space-y-2">
                  <div className="text-[12px] font-semibold text-ink">
                    Akun Petambak Penanggung Jawab (Opsional)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {users
                      .filter((u) => u.role !== "ADMIN")
                      .map((u) => {
                        const checked = assignedUserIds.includes(Number(u.id));
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-2 p-2 rounded-[6px] border text-[12px] cursor-pointer ${
                              checked
                                ? "bg-brand/10 border-brand text-ink"
                                : "bg-surface border-line text-muted"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUserAssign(Number(u.id))}
                              className="rounded border-line text-brand"
                            />
                            <span className="truncate">
                              {u.name} ({u.tenant_code || "UTAMA"})
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2.5 pt-2 border-t border-line">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setModalMode(null)}
                  className="min-h-[44px] px-4 border border-line rounded-[6px] text-[13px] font-medium text-muted hover:text-ink cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-[44px] px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {busy
                    ? "Menyimpan..."
                    : modalMode === "create"
                    ? "Daftarkan Alat & Terbitkan Token"
                    : "Simpan Konfigurasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEVICE API TOKEN */}
      {modalMode === "token" && targetDevice && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => !busy && setModalMode(null)}
        >
          <div
            className="w-full sm:max-w-lg bg-surface border border-line rounded-t-[14px] sm:rounded-[8px] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[88dvh] overflow-y-auto safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-brand shrink-0" />
                <div>
                  <h4 className="text-[16px] font-semibold text-ink">
                    Token API Perangkat IoT
                  </h4>
                  <p className="text-[11.5px] text-muted font-mono">
                    {targetDevice.device_code} · {targetDevice.tenant_code || "TENANT-UTAMA"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !busy && setModalMode(null)}
                aria-label="Tutup modal token"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-surface-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[6px] bg-bahaya-bg border border-bahaya/30 text-bahaya-text text-[12.5px]">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-[6px] bg-surface-2 border border-line text-[12.5px]">
              <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                <ShieldCheck className={`w-4 h-4 ${targetDevice.token_active ? "text-aman" : "text-bahaya"}`} />
                <span>Status Token: {targetDevice.token_active ? "Aktif" : "Dicabut (Nonaktif)"}</span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={handleToggleToken}
                className="min-h-[38px] px-3 rounded-[6px] border border-line bg-surface text-[12px] font-semibold text-ink hover:border-brand cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{targetDevice.token_active ? "Cabut" : "Aktifkan"}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-[6px] bg-brand/5 border border-brand/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                  Bearer Token Autentikasi ESP32
                </span>
                <button
                  type="button"
                  onClick={() => setShowPlainToken(!showPlainToken)}
                  className="text-[11.5px] text-muted hover:text-ink inline-flex items-center gap-1 cursor-pointer"
                >
                  {showPlainToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPlainToken ? "Sembunyikan" : "Tampilkan"}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-[6px] bg-surface border border-line font-mono text-[12px] break-all text-ink select-all">
                {activeTokenText
                  ? showPlainToken
                    ? activeTokenText
                    : "••••••••••••••••••••••••••••••••••••"
                  : "Belum ada token yang diterbitkan."}
              </div>
              <p className="text-[11px] text-muted">
                Sertakan pada header HTTP <code>Authorization: Bearer &lt;token&gt;</code> atau query WebSocket perangkat.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                disabled={!activeTokenText}
                onClick={copyActiveToken}
                className="min-h-[44px] px-4 border border-line bg-surface-2 rounded-[6px] text-[13px] font-semibold text-ink inline-flex items-center justify-center gap-2 hover:border-brand cursor-pointer disabled:opacity-50"
              >
                {copiedToken ? <Check className="w-4 h-4 text-aman" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToken ? "Token Tersalin" : "Salin Token"}</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleRotateToken}
                className="min-h-[44px] px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
                <span>Generate Token Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE DEVICE */}
      {modalMode === "delete" && targetDevice && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => !busy && setModalMode(null)}
        >
          <div
            className="w-full sm:max-w-md bg-surface border border-line rounded-t-[14px] sm:rounded-[8px] shadow-2xl p-5 sm:p-6 space-y-4 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bahaya/15 text-bahaya flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Hapus Node IoT Ini?</h4>
                <p className="text-[12px] text-muted">
                  {targetDevice.device_code} ({targetDevice.name})
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[6px] bg-bahaya-bg border border-bahaya/30 text-bahaya-text text-[12.5px]">
                {errorMsg}
              </div>
            )}

            <p className="text-[12.5px] text-muted leading-relaxed">
              Perangkat dan token aksesnya akan dihapus permanen dari sistem. Pastikan setidaknya 1 perangkat utama tetap tersedia.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                disabled={busy}
                onClick={() => setModalMode(null)}
                className="min-h-[44px] px-4 border border-line rounded-[6px] text-[13px] font-medium text-muted hover:text-ink cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteDevice}
                className="min-h-[44px] px-4 bg-bahaya text-white rounded-[6px] text-[13px] font-semibold hover:opacity-90 cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{busy ? "Menghapus..." : "Hapus Node"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
