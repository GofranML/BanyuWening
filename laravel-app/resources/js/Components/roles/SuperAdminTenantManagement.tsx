import { useState, useEffect } from "react";
import { router } from "@inertiajs/react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Cpu,
  MapPin,
  Phone,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  X,
  AlertTriangle,
  ExternalLink,
  Activity,
  ChevronDown,
  Rocket,
} from "lucide-react";
import { TenantDeviceCrudPanel } from "@/Components/roles/TenantDeviceCrudPanel";
import { SuperAdminOtaProtocolPanel } from "@/Components/roles/SuperAdminOtaProtocolPanel";
import type { ManagedDevice, OtaOverview, RealtimeConfig, Tenant, User } from "@/Types";

interface SuperAdminTenantManagementProps {
  tenants: Tenant[];
  users: User[];
  devices?: ManagedDevice[];
  activeTenantCode?: string;
  activeDeviceCode?: string;
  otaOverview?: OtaOverview | null;
  realtimeConfig?: RealtimeConfig;
  canManageOta?: boolean;
  isTenantOtaMode?: boolean;
  initialSubTab?: "tenants" | "devices";
  initialDeviceSection?: "crud" | "ota";
  onSubTabChange?: (sub: "tenants" | "devices") => void;
  onSelectTenantScope?: (tenantCode: string, deviceCode?: string, navigateToMonitoring?: boolean) => void;
  onOpenCreateUserWithTenant?: (tenantCode: string) => void;
  onFilterUsersByTenant?: (tenantCode: string) => void;
}

export function SuperAdminTenantManagement({
  tenants = [],
  users = [],
  devices = [],
  activeTenantCode = "ALL",
  activeDeviceCode = "ALL",
  otaOverview = null,
  realtimeConfig,
  canManageOta = true,
  isTenantOtaMode = false,
  initialSubTab = "tenants",
  initialDeviceSection = "crud",
  onSubTabChange,
  onSelectTenantScope,
  onOpenCreateUserWithTenant,
  onFilterUsersByTenant,
}: SuperAdminTenantManagementProps) {
  const [subTab, setSubTab] = useState<"tenants" | "devices">(initialSubTab);
  const [deviceSection, setDeviceSection] = useState<"crud" | "ota">(initialDeviceSection);
  const [otaTargetDeviceCode, setOtaTargetDeviceCode] = useState<string | undefined>(undefined);
  const [selectedTenantCode, setSelectedTenantCode] = useState<string>(activeTenantCode || "ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    setDeviceSection(initialDeviceSection);
  }, [initialDeviceSection]);

  useEffect(() => {
    if (activeTenantCode) {
      setSelectedTenantCode(activeTenantCode);
    }
  }, [activeTenantCode]);

  const switchSubTab = (next: "tenants" | "devices") => {
    setSubTab(next);
    onSubTabChange?.(next);
  };

  const handleScopeChange = (nextCode: string) => {
    setSelectedTenantCode(nextCode);
    setOtaTargetDeviceCode(undefined);
    onSelectTenantScope?.(nextCode, "ALL", false);
  };

  // Create Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pondName, setPondName] = useState("");
  const [picName, setPicName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "TRIAL" | "SUSPENDED">("ACTIVE");
  const [notes, setNotes] = useState("");

  // Owner options
  const [ownerMode, setOwnerMode] = useState<"existing" | "new" | "none">("existing");
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | "">("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPassword, setNewOwnerPassword] = useState("BanyuWening@123");

  // Device allocation option
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);

  // Edit Modal State
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editName, setEditName] = useState("");
  const [editPondName, setEditPondName] = useState("");
  const [editPicName, setEditPicName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "TRIAL" | "SUSPENDED">("ACTIVE");
  const [editOwnerId, setEditOwnerId] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Delete Modal State
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper untuk auto generate kode tenant slug
  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code.startsWith("TENANT-")) {
      const slug = val
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setCode(slug ? `TENANT-${slug}` : "");
    }
  };

  const handleOpenAddModal = () => {
    setName("");
    setCode("");
    setPondName("Kolam Terpal Sangkuriang");
    setPicName("");
    setPhone("");
    setAddress("");
    setStatus("ACTIVE");
    setNotes("");
    setOwnerMode("existing");
    setSelectedOwnerId("");
    setNewOwnerName("");
    setNewOwnerEmail("");
    setNewOwnerPassword("BanyuWening@123");
    setSelectedDeviceIds([]);
    setIsAddModalOpen(true);
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama Tenant / Usaha Tambak wajib diisi.");
      return;
    }

    if (ownerMode === "new" && (!newOwnerEmail.trim() || !newOwnerPassword.trim())) {
      alert("Harap lengkapi email dan kata sandi untuk akun pemilik baru.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      "/dashboard/tenants",
      {
        name: name.trim(),
        code: code.trim() || undefined,
        pond_name: pondName.trim() || undefined,
        pic_name: picName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
        owner_user_id: ownerMode === "existing" && selectedOwnerId ? selectedOwnerId : undefined,
        create_owner_account: ownerMode === "new",
        owner_name: newOwnerName.trim() || picName.trim() || name.trim(),
        owner_email: newOwnerEmail.trim() || undefined,
        owner_password: newOwnerPassword || undefined,
        assign_device_ids: selectedDeviceIds.length > 0 ? selectedDeviceIds : undefined,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          showToast(`Tenant "${name}" berhasil didaftarkan ke sistem!`);
          setIsAddModalOpen(false);
          setIsSubmitting(false);
        },
        onError: (errs) => {
          const firstErr = Object.values(errs)[0];
          alert(firstErr || "Terjadi kesalahan saat menyimpan data tenant.");
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleOpenEdit = (t: Tenant) => {
    setEditingTenant(t);
    setEditName(t.name);
    setEditPondName(t.pond_name || "");
    setEditPicName(t.pic_name || "");
    setEditPhone(t.phone || "");
    setEditAddress(t.address || "");
    setEditStatus(t.status || "ACTIVE");
    setEditOwnerId(t.owner_user_id || "");
    setEditNotes(t.notes || "");
  };

  const handleUpdateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editName.trim()) return;

    setIsEditing(true);
    router.post(
      `/dashboard/tenants/${editingTenant.id}`,
      {
        _method: "PUT",
        name: editName.trim(),
        pond_name: editPondName.trim() || undefined,
        pic_name: editPicName.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
        status: editStatus,
        owner_user_id: editOwnerId ? editOwnerId : null,
        notes: editNotes.trim() || undefined,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          showToast(`Data tenant "${editName}" berhasil diperbarui!`);
          setEditingTenant(null);
          setIsEditing(false);
        },
        onError: (errs) => {
          const firstErr = Object.values(errs)[0];
          alert(firstErr || "Terjadi kesalahan saat memperbarui tenant.");
          setIsEditing(false);
        },
      }
    );
  };

  const handleDeleteTenant = () => {
    if (!deletingTenant) return;
    if (deletingTenant.code === "TENANT-UTAMA") {
      alert("Tenant utama sistem tidak dapat dihapus.");
      return;
    }

    setIsDeleting(true);
    router.delete(`/dashboard/tenants/${deletingTenant.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        showToast(`Tenant ${deletingTenant.name} berhasil dihapus.`);
        setDeletingTenant(null);
        setIsDeleting(false);
      },
      onError: () => {
        alert("Gagal menghapus tenant. Pastikan hak akses Anda mencukupi.");
        setIsDeleting(false);
      },
    });
  };

  const toggleSelectDevice = (deviceId: number) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    if (selectedTenantCode !== "ALL" && t.code.toUpperCase() !== selectedTenantCode.toUpperCase()) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      (t.pic_name && t.pic_name.toLowerCase().includes(q)) ||
      (t.pond_name && t.pond_name.toLowerCase().includes(q)) ||
      (t.address && t.address.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const scopedDeviceCount =
    selectedTenantCode === "ALL"
      ? devices.length
      : devices.filter(
          (d) => (d.tenant_code || "TENANT-UTAMA").toUpperCase() === selectedTenantCode.toUpperCase()
        ).length;

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const totalAssignedDevices = tenants.reduce((acc, t) => acc + (t.devices_count || 0), 0);
  const totalUsersInTenants = tenants.reduce((acc, t) => acc + (t.users_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 bg-aman/15 border border-aman text-ink rounded-[6px] flex items-center gap-2.5 text-[13px] animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-aman shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/25 text-[12px] font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>Arsitektur Multi-Tenancy &amp; Alokasi Alat IoT</span>
          </div>
          <h2 className="text-[20px] sm:text-[22px] md:text-[26px] font-display text-ink leading-tight">
            Mitra Multi-Tenant &amp; Pengaturan Alat IoT
          </h2>
          <p className="text-[13px] text-muted mt-1">
            Pilih tenant untuk mengatur daftar kolam mitra, penetapan akun pemilik, dan manajemen node ESP32 + Token API per tenant.
          </p>
        </div>

        {subTab === "tenants" && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="min-h-[44px] px-4 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 cursor-pointer self-start shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tenant Baru</span>
          </button>
        )}
      </div>

      {/* Sub-Menu Navigation + Global Tenant Scope Filter */}
      <div className="p-3 bg-surface border border-line rounded-[6px] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:inline-flex gap-2 bg-surface-2 p-1 rounded-[6px]">
          <button
            type="button"
            onClick={() => switchSubTab("tenants")}
            className={`min-h-[44px] px-3.5 rounded-[5px] text-[12.5px] sm:text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              subTab === "tenants"
                ? "bg-brand text-brand-ink shadow-2xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Mitra ({tenants.length})</span>
            <span className="hidden sm:inline truncate">Daftar Mitra Tenant ({tenants.length})</span>
          </button>
          <button
            type="button"
            onClick={() => switchSubTab("devices")}
            className={`min-h-[44px] px-3 sm:px-3.5 rounded-[5px] text-[12px] sm:text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer ${
              subTab === "devices"
                ? "bg-brand text-brand-ink shadow-2xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Alat IoT ({scopedDeviceCount})</span>
            <span className="hidden sm:inline truncate">Kelola Alat IoT ({scopedDeviceCount})</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
          <label
            htmlFor="tenant-management-scope-select"
            className="text-[11.5px] font-semibold text-muted whitespace-nowrap"
          >
            Filter Lingkup Tenant:
          </label>
          <div className="relative w-full sm:w-[260px] max-w-full">
            <select
              id="tenant-management-scope-select"
              value={selectedTenantCode}
              onChange={(e) => handleScopeChange(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] appearance-none pl-3 pr-8 bg-surface-2 border border-line rounded-[6px] text-[12.5px] font-medium text-ink truncate focus:outline-hidden focus:border-brand cursor-pointer"
            >
              <option value="ALL">
                Semua Tenant ({tenants.length} Mitra · {devices.length} Alat)
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {subTab === "devices" ? (
        <div className="space-y-4">
          {canManageOta && (
            <div className="p-2.5 bg-surface border border-line rounded-[6px] grid grid-cols-2 sm:inline-flex gap-2">
              <button
                type="button"
                onClick={() => setDeviceSection("crud")}
                className={`min-h-[44px] sm:min-h-[38px] px-3 rounded-[5px] text-[12px] sm:text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  deviceSection === "crud"
                    ? "bg-brand text-brand-ink shadow-2xs"
                    : "bg-surface-2 text-muted hover:text-ink"
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Daftar Alat ({scopedDeviceCount})</span>
                <span className="hidden sm:inline">Daftar &amp; Konfigurasi Alat ({scopedDeviceCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceSection("ota")}
                className={`min-h-[44px] sm:min-h-[38px] px-3 rounded-[5px] text-[12px] sm:text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  deviceSection === "ota"
                    ? "bg-brand text-brand-ink shadow-2xs"
                    : "bg-surface-2 text-muted hover:text-ink"
                }`}
              >
                <Rocket className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">Update Firmware</span>
                <span className="hidden sm:inline">Update Firmware Per Alat (OTA)</span>
              </button>
            </div>
          )}

          {deviceSection === "ota" && canManageOta ? (
            <SuperAdminOtaProtocolPanel
              initialOverview={otaOverview}
              realtimeConfig={realtimeConfig}
              users={users}
              activeTenantCode={selectedTenantCode}
              activeDeviceCode={otaTargetDeviceCode || activeDeviceCode}
              isTenantMode={Boolean(isTenantOtaMode)}
            />
          ) : (
            <TenantDeviceCrudPanel
              tenants={tenants}
              devices={devices}
              users={users}
              selectedTenantCode={selectedTenantCode}
              onChangeTenantCode={handleScopeChange}
              onSelectDeviceToMonitor={(tCode, dCode) => onSelectTenantScope?.(tCode, dCode, true)}
              onOpenOtaForDevice={
                canManageOta
                  ? (dCode) => {
                      setOtaTargetDeviceCode(dCode);
                      setDeviceSection("ota");
                    }
                  : undefined
              }
              onNotify={showToast}
            />
          )}
        </div>
      ) : (
        <>

      {/* Metric Cards Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-surface border border-line rounded-[6px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/15 text-brand flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Total Tenant</div>
            <div className="text-[20px] font-bold text-ink">{totalTenants}</div>
          </div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-aman/15 text-aman flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Tenant Aktif</div>
            <div className="text-[20px] font-bold text-ink">{activeTenants}</div>
          </div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Petambak Terdaftar</div>
            <div className="text-[20px] font-bold text-ink">{totalUsersInTenants || users.length}</div>
          </div>
        </div>

        <div className="p-4 bg-surface border border-line rounded-[6px] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider">Node IoT Terhubung</div>
            <div className="text-[20px] font-bold text-ink">{totalAssignedDevices || devices.length}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-surface border border-line rounded-[6px] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama tenant, kode (TENANT-...), nama PIC, atau kolam..."
            className="w-full min-h-[44px] sm:min-h-[38px] pl-9 pr-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted shrink-0" />
          <div className="relative w-full sm:w-auto min-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] appearance-none pl-3 pr-8 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink truncate focus:outline-hidden focus:border-brand cursor-pointer"
            >
              <option value="ALL">Semua Status Operasional</option>
              <option value="ACTIVE">Hanya Aktif (Active)</option>
              <option value="TRIAL">Masa Uji Coba (Trial)</option>
              <option value="SUSPENDED">Ditangguhkan (Suspended)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-muted pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Grid Daftar Tenant */}
      {filteredTenants.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-line rounded-[6px] space-y-3">
          <Building2 className="w-10 h-10 text-muted mx-auto opacity-50" />
          <div className="text-[15px] font-semibold text-ink">Tidak ada data tenant yang cocok</div>
          <p className="text-[13px] text-muted max-w-md mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "Coba ubah kata kunci pencarian atau reset filter status operasional."
              : "Belum ada tenant yang terdaftar. Klik tombol 'Tambah Tenant Baru' untuk membuat tenant pertama."}
          </p>
          {(searchQuery || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="text-[13px] text-brand hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              Reset Filter Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTenants.map((t) => {
            const isUtama = t.code === "TENANT-UTAMA";
            const tenantDeviceList = devices.filter(
              (d) => (d.tenant_code || "TENANT-UTAMA").toUpperCase() === t.code.toUpperCase()
            );
            return (
              <div
                key={t.id}
                className="bg-surface border border-line hover:border-brand/40 rounded-[6px] p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-2xs hover:shadow-xs"
              >
                <div className="space-y-3">
                  {/* Top Bar Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[16px] font-bold text-ink truncate">{t.name}</h3>
                        {isUtama && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            TENANT UTAMA SISTEM
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-brand mt-0.5">{t.code}</div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 shadow-2xs ${
                        t.status === "ACTIVE"
                          ? "bg-aman/15 text-aman border border-aman/30"
                          : t.status === "TRIAL"
                          ? "bg-waspada/15 text-waspada border border-waspada/30"
                          : "bg-bahaya/15 text-bahaya border border-bahaya/30"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        t.status === "ACTIVE" ? "bg-aman" : t.status === "TRIAL" ? "bg-waspada" : "bg-bahaya"
                      }`} />
                      <span>
                        {t.status === "ACTIVE"
                          ? "Aktif"
                          : t.status === "TRIAL"
                          ? "Uji Coba"
                          : "Ditangguhkan"}
                      </span>
                    </span>
                  </div>

                  {/* Lokasi & PIC Details */}
                  <div className="space-y-1.5 text-[12.5px] text-muted">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                      <span className="text-ink font-medium">{t.pond_name || "Kolam Terpal"}</span>
                      {t.address && <span className="truncate">· {t.address}</span>}
                    </div>

                    {(t.pic_name || t.phone) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span>
                          PIC: <strong>{t.pic_name || "Petambak"}</strong>
                        </span>
                        {t.phone && (
                          <a
                            href={`https://wa.me/${t.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline font-mono inline-flex items-center gap-1"
                          >
                            <span>{t.phone}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {t.owner && (
                      <div className="flex items-center gap-2 pt-0.5 min-w-0">
                        <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">
                          Pemilik: <strong>{t.owner.name}</strong> ({t.owner.email})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Badges: Users & Devices */}
                  <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-line/60">
                    <div className="flex items-center gap-1.5 text-[12px] text-ink font-medium">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>{t.users_count || 0} Akun Terdaftar</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[12px] text-ink font-medium">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{tenantDeviceList.length || t.devices_count || 0} Node IoT Aktif</span>
                    </div>
                  </div>

                  {/* Assigned Device Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tenantDeviceList.length > 0 ? (
                      tenantDeviceList.map((dev) => (
                        <button
                          key={dev.id}
                          type="button"
                          onClick={() => {
                            setSelectedTenantCode(t.code);
                            switchSubTab("devices");
                          }}
                          className="px-2 py-1 rounded-[4px] bg-surface-2 hover:bg-brand/10 border border-line hover:border-brand/40 font-mono text-[10.5px] text-ink inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          title={`Kelola ${dev.device_code} (${dev.pond_name})`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              (dev.status || "").toUpperCase() === "ONLINE" ? "bg-aman" : "bg-muted"
                            }`}
                          />
                          <span>{dev.device_code}</span>
                        </button>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted italic">
                        Belum ada node ESP32 dialokasikan
                      </span>
                    )}
                  </div>

                  {t.notes && (
                    <div className="p-2.5 rounded bg-surface-2/60 border border-line text-[11.5px] text-muted leading-relaxed">
                      {t.notes}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-line">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleScopeChange(t.code);
                        switchSubTab("devices");
                      }}
                      className="min-h-[44px] sm:min-h-[36px] px-3 rounded-[6px] bg-brand/10 border border-brand/30 text-[12px] text-brand hover:bg-brand/20 font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Cpu className="w-3.5 h-3.5 shrink-0" />
                      <span>Kelola Alat ({tenantDeviceList.length}) →</span>
                    </button>

                    {onSelectTenantScope && (
                      <button
                        type="button"
                        onClick={() => onSelectTenantScope(t.code, "ALL", true)}
                        className="min-h-[44px] sm:min-h-[36px] px-3 rounded-[6px] border border-line bg-surface-2 text-[12px] text-ink hover:border-brand font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span>Pantau</span>
                      </button>
                    )}

                    {onFilterUsersByTenant && (
                      <button
                        type="button"
                        onClick={() => onFilterUsersByTenant(t.code)}
                        className="min-h-[44px] sm:min-h-[36px] px-2.5 text-[12px] text-muted hover:text-brand font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Akun</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="min-h-[44px] sm:min-h-[36px] px-3 border border-line rounded-[6px] text-[12px] text-ink hover:border-brand inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors flex-1 sm:flex-initial"
                      title="Edit Data Tenant"
                    >
                      <Pencil className="w-3.5 h-3.5 text-brand" />
                      <span>Edit</span>
                    </button>

                    {!isUtama && (
                      <button
                        type="button"
                        onClick={() => setDeletingTenant(t)}
                        className="min-h-[44px] sm:min-h-[36px] px-3 border border-line rounded-[6px] text-[12px] text-bahaya hover:border-bahaya inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors flex-1 sm:flex-initial"
                        title="Hapus Tenant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* MODAL: TAMBAH TENANT BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full sm:max-w-2xl bg-surface border border-line rounded-t-[14px] sm:rounded-[8px] shadow-2xl p-5 sm:p-6 space-y-5 max-h-[88dvh] overflow-y-auto safe-bottom">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-ink">Tambah Tenant / Mitra Tambak Baru</h3>
                  <p className="text-[12px] text-muted">
                    Daftarkan entitas usaha tambak baru dengan isolasi data telemetri otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-surface-2 cursor-pointer"
                aria-label="Tutup modal tambah tenant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[12px] font-semibold text-ink">
                    Nama Usaha Tambak / Tenant <span className="text-bahaya">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Contoh: Tambak Lele Mina Makmur"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Kode Tenant (Identifier Unik) <span className="text-muted">(Otomatis/Bisa Diedit)</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="TENANT-MINA-MAKMUR"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] font-mono text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Unit / Nama Kolam Default
                  </label>
                  <input
                    type="text"
                    value={pondName}
                    onChange={(e) => setPondName(e.target.value)}
                    placeholder="Kolam Terpal Sangkuriang 02"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Nama PIC / Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Bapak Ahmad Subari"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[12px] font-semibold text-ink">
                    Alamat Lengkap / Lokasi Tambak
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Dusun Sangkuriang, Kec. Sleman, D.I. Yogyakarta"
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Status Operasional Tenant
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                  >
                    <option value="ACTIVE">Aktif Penuh (Active)</option>
                    <option value="TRIAL">Masa Uji Coba (Trial)</option>
                    <option value="SUSPENDED">Ditangguhkan (Suspended)</option>
                  </select>
                </div>
              </div>

              {/* SEKSI AKUN PEMILIK */}
              <div className="p-4 bg-surface-2/60 border border-line rounded-[6px] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>Penetapan Akun Pemilik (Owner PIC)</span>
                  </span>
                  <div className="flex items-center gap-3 text-[12px]">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="ownerMode"
                        checked={ownerMode === "existing"}
                        onChange={() => setOwnerMode("existing")}
                        className="text-brand focus:ring-brand"
                      />
                      <span>Pilih Akun Ada</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="ownerMode"
                        checked={ownerMode === "new"}
                        onChange={() => setOwnerMode("new")}
                        className="text-brand focus:ring-brand"
                      />
                      <span className="font-semibold text-brand">+ Buat Akun Baru</span>
                    </label>
                  </div>
                </div>

                {ownerMode === "existing" && (
                  <div className="space-y-1.5">
                    <label className="text-[11.5px] text-muted">
                      Pilih dari akun petambak yang telah terdaftar:
                    </label>
                    <select
                      value={selectedOwnerId}
                      onChange={(e) => setSelectedOwnerId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full h-10 px-3 bg-surface border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                    >
                      <option value="">-- Belum Ditugaskan / Atur Nanti --</option>
                      {users
                        .filter((u) => u.role !== "ADMIN")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) - Peran: {u.role}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {ownerMode === "new" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11.5px] text-muted">Nama Pemilik Akun</label>
                      <input
                        type="text"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        placeholder={picName || name || "Nama Pemilik"}
                        className="w-full h-9 px-3 bg-surface border border-line rounded-[6px] text-[12.5px] text-ink focus:outline-hidden focus:border-brand"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11.5px] text-muted">
                        Email Login <span className="text-bahaya">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                        placeholder="pemilik@tambak.id"
                        className="w-full h-9 px-3 bg-surface border border-line rounded-[6px] text-[12.5px] text-ink focus:outline-hidden focus:border-brand"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11.5px] text-muted">
                        Kata Sandi Awal <span className="text-bahaya">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newOwnerPassword}
                        onChange={(e) => setNewOwnerPassword(e.target.value)}
                        className="w-full h-9 px-3 bg-surface border border-line rounded-[6px] text-[12.5px] text-ink focus:outline-hidden focus:border-brand font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SEKSI ALOKASI PERANGKAT IOT */}
              {devices.length > 0 && (
                <div className="p-4 bg-surface-2/60 border border-line rounded-[6px] space-y-2.5">
                  <span className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>Alokasikan Node IoT ESP32 ke Tenant Ini (Opsional)</span>
                  </span>
                  <p className="text-[11.5px] text-muted">
                    Centang alat di bawah untuk langsung mengisolasi bacaan sensor dan kontrol aktuator ke tenant baru ini:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {devices.map((d) => {
                      const isSelected = selectedDeviceIds.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center gap-2 p-2 rounded-[6px] border text-[12px] cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-brand/10 border-brand text-ink"
                              : "bg-surface border-line text-muted hover:border-line-hover"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDevice(d.id)}
                            className="rounded border-line text-brand focus:ring-brand"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-ink truncate">{d.device_code}</div>
                            <div className="text-[10px] text-muted truncate">
                              {d.name} · Tenant saat ini: {d.tenant_code || "GLOBAL"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Catatan Operasional */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">Catatan Kemitraan / Operasional</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Paket kemitraan Klaster Sleman Timur, kapasitas 8 kolam bioflok."
                  className="w-full p-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                />
              </div>

              {/* Footer Modal Buttons */}
              <div className="grid grid-cols-2 sm:flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 border border-line rounded-[6px] text-[13px] font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? "Menyimpan..." : "Daftarkan Tenant Baru"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TENANT */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full sm:max-w-xl bg-surface border border-line rounded-t-[14px] sm:rounded-[8px] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[88dvh] overflow-y-auto safe-bottom">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-brand" />
                <h3 className="text-[16px] font-semibold text-ink">Edit Data Tenant: {editingTenant.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-surface-2 cursor-pointer"
                aria-label="Tutup modal edit tenant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">
                  Nama Usaha Tambak <span className="text-bahaya">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Unit Kolam</label>
                  <input
                    type="text"
                    value={editPondName}
                    onChange={(e) => setEditPondName(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Status Operasional</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                  >
                    <option value="ACTIVE">Aktif (Active)</option>
                    <option value="TRIAL">Uji Coba (Trial)</option>
                    <option value="SUSPENDED">Ditangguhkan (Suspended)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Nama PIC</label>
                  <input
                    type="text"
                    value={editPicName}
                    onChange={(e) => setEditPicName(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">No WhatsApp</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">Alamat Tambak</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">Akun Pemilik (Owner PIC)</label>
                <select
                  value={editOwnerId}
                  onChange={(e) => setEditOwnerId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full h-10 px-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                >
                  <option value="">-- Tanpa Pemilik / Belum Ditetapkan --</option>
                  {users
                    .filter((u) => u.role !== "ADMIN")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.role}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">Catatan Operasional</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-3 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 sm:flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="min-h-[44px] px-4 border border-line rounded-[6px] text-[13px] font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="min-h-[44px] px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS TENANT */}
      {deletingTenant && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full sm:max-w-md bg-surface border border-line rounded-t-[14px] sm:rounded-[8px] shadow-2xl p-5 sm:p-6 space-y-4 safe-bottom">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bahaya/15 text-bahaya flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-ink">Hapus Tenant Ini?</h3>
                <p className="text-[12px] text-muted">
                  Konfirmasi penghapusan entitas tenant budidaya
                </p>
              </div>
            </div>

            <div className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-1.5 text-[12.5px] text-ink">
              <div>
                Nama: <strong>{deletingTenant.name}</strong>
              </div>
              <div className="font-mono text-[11px] text-brand">Kode: {deletingTenant.code}</div>
              <p className="text-[11.5px] text-muted pt-1">
                Akun petambak dan alat IoT yang sebelumnya terikat pada tenant ini akan otomatis dialihkan ke{" "}
                <strong>TENANT-UTAMA</strong> agar data tidak hilang.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTenant(null)}
                className="min-h-[44px] px-4 border border-line rounded-[6px] text-[13px] font-medium text-muted hover:text-ink cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteTenant}
                className="min-h-[44px] px-5 bg-bahaya text-white rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Menghapus..." : "Ya, Hapus Tenant"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
