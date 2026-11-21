import { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
import {
  Cpu,
  Layers,
  ShieldCheck,
  Server,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Code2,
  Users,
  XCircle,
  SlidersHorizontal,
  Check,
  X,
  Activity,
  Rocket,
  Save,
} from "lucide-react";
import { SuperAdminApiDocs } from "@/Components/roles/SuperAdminApiDocs";
import { SuperAdminOtaProtocolPanel } from "@/Components/roles/SuperAdminOtaProtocolPanel";
import { SuperAdminMlOpsPanel } from "@/Components/roles/SuperAdminMlOpsPanel";
import {
  UserPermissionsEditor,
  countCustomOverrides,
} from "@/Components/roles/UserPermissionsEditor";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type ManagedDevice,
  type MlPerformanceOverview,
  type OtaOverview,
  type RealtimeConfig,
  type RealtimeTransportMode,
  type User,
  type UserPermissions,
} from "@/Types";

type DocSubTab = "arsitektur" | "peran-akun" | "ota-esp32" | "ml-rf-ops" | "api";

interface SuperAdminDocsProps {
  users?: User[];
  devices?: ManagedDevice[];
  realtimeConfig?: RealtimeConfig;
  activeTransport?: RealtimeTransportMode;
  transportReason?: string;
  otaOverview?: OtaOverview | null;
  mlOverview?: MlPerformanceOverview | null;
}

export function SuperAdminDocs({
  users = [],
  devices = [],
  realtimeConfig,
  activeTransport = "HTTP_FALLBACK",
  transportReason,
  otaOverview,
  mlOverview,
}: SuperAdminDocsProps) {
  const [activeSubTab, setActiveSubTab] = useState<DocSubTab>("arsitektur");
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users[0] ? String(users[0].id) : ""
  );
  const [permDraft, setPermDraft] = useState<UserPermissions>(
    users[0]
      ? {
          ...(DEFAULT_ROLE_PERMISSIONS[users[0].role] || DEFAULT_ROLE_PERMISSIONS.OPERATOR),
          ...(users[0].permissions || {}),
        }
      : { ...DEFAULT_ROLE_PERMISSIONS.OPERATOR }
  );
  const [savingPerms, setSavingPerms] = useState(false);
  const [permToast, setPermToast] = useState<string | null>(null);

  const selectedUser = users.find((u) => String(u.id) === selectedUserId) || users[0] || null;

  useEffect(() => {
    if (!selectedUser) return;
    setSelectedUserId(String(selectedUser.id));
    setPermDraft({
      ...(DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || DEFAULT_ROLE_PERMISSIONS.OPERATOR),
      ...(selectedUser.permissions || {}),
    });
  }, [selectedUser?.id, JSON.stringify(selectedUser?.permissions || {})]);

  const handleSaveUserPermissions = (reset = false) => {
    if (!selectedUser) return;
    setSavingPerms(true);
    router.post(
      `/dashboard/users/${selectedUser.id}/permissions`,
      {
        reset,
        permissions: reset ? {} : (permDraft as Record<string, boolean>),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setPermToast(
            reset
              ? `Hak akses ${selectedUser.name} dikembalikan ke default role ${selectedUser.role}.`
              : `Hak akses khusus ${selectedUser.name} berhasil disimpan.`
          );
          setTimeout(() => setPermToast(null), 3500);
          setSavingPerms(false);
        },
        onError: () => {
          setSavingPerms(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[12px] font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Dokumentasi Terpadu Khusus Super Admin: Arsitektur, RBAC, Dual-OTA ESP32, RF MLOps &amp; API</span>
        </div>
        <h1 className="text-[26px] md:text-[30px] font-display text-ink leading-tight">
          Dokumentasi Lengkap Sistem BanyuWening
        </h1>
        <p className="text-[14px] text-muted mt-1 max-w-3xl">
          Pusat kendali &amp; spesifikasi teknis eksklusif Super Administrator: arsitektur Modular Multi-Kolam,
          Protokol Dual-OTA Firmware ESP32 (<code>banyuwening.ota.v1</code>), Endpoint &amp; Dashboard Performa
          Random Forest + AI Agent Self-Learning, serta Swagger/AsyncAPI Studio.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-line pb-2 text-[12.5px] sm:text-[13px] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab("arsitektur")}
          className={`min-h-[42px] px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "arsitektur"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>1. Arsitektur &amp; Sistem</span>
        </button>

        <button
          onClick={() => setActiveSubTab("peran-akun")}
          className={`min-h-[42px] px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "peran-akun"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>2. Hak Akses (RBAC)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ota-esp32")}
          className={`min-h-[42px] px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "ota-esp32"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Rocket className="w-4 h-4 shrink-0" />
          <span>3. Protokol Firmware OTA ESP32</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ml-rf-ops")}
          className={`min-h-[42px] px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "ml-rf-ops"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span>4. Performa RF &amp; Agent AI Self-Learning</span>
        </button>

        <button
          onClick={() => setActiveSubTab("api")}
          className={`min-h-[42px] px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === "api"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Code2 className="w-4 h-4 shrink-0" />
          <span>5. REST API, Swagger &amp; AsyncAPI</span>
        </button>
      </div>

      {activeSubTab === "ota-esp32" ? (
        <SuperAdminOtaProtocolPanel
          initialOverview={otaOverview}
          realtimeConfig={realtimeConfig}
          users={users}
        />
      ) : activeSubTab === "ml-rf-ops" ? (
        <SuperAdminMlOpsPanel initialOverview={mlOverview} devices={devices} />
      ) : activeSubTab === "api" ? (
        <SuperAdminApiDocs
          users={users}
          devices={devices}
          realtimeConfig={realtimeConfig}
          activeTransport={activeTransport}
          transportReason={transportReason}
        />
      ) : activeSubTab === "peran-akun" ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Subtab Peran Akun */}
          <div className="p-5 bg-surface border border-line rounded-[6px] space-y-2">
            <div className="flex items-center gap-2 text-brand font-semibold text-[14px]">
              <ShieldCheck className="w-5 h-5" />
              <span>Prinsip Keamanan Role-Based Access Control (RBAC) BanyuWening</span>
            </div>
            <p className="text-[13px] text-muted leading-relaxed max-w-3xl">
              Sistem BanyuWening membagi hak akses ke dalam 4 peran akun hierarkis dengan prinsip{" "}
              <strong>Least Privilege</strong> (hanya memberikan wewenang sesuai kebutuhan tugas).
              Pemisahan peran ini mencegah salah kendali aktuator di lapangan, mengisolasi data analitis riset,
              dan mengunci seluruh konfigurasi sensitif hanya untuk Super Administrator — disertai{" "}
              <strong>kustomisasi hak akses granular per pengguna</strong> bila dibutuhkan pengecualian khusus.
            </p>
          </div>

          {/* Panel Interaktif Kustomisasi Hak Akses Per Pengguna */}
          {users.length > 0 && selectedUser && (
            <div className="bg-surface border border-brand/30 rounded-[6px] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-brand" />
                    <span>Kustomisasi Hak Akses Per Pengguna (Granular Override)</span>
                  </h3>
                  <p className="text-[12px] text-muted mt-0.5">
                    Pilih akun pengguna di bawah untuk menambah atau mencabut hak akses fitur secara spesifik tanpa mengubah role dasarnya.
                  </p>
                </div>
                <div className="w-full sm:w-auto shrink-0">
                  <select
                    value={String(selectedUser.id)}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedUserId(nextId);
                      const nextUser = users.find((u) => String(u.id) === nextId);
                      if (nextUser) {
                        setPermDraft({
                          ...(DEFAULT_ROLE_PERMISSIONS[nextUser.role] || DEFAULT_ROLE_PERMISSIONS.OPERATOR),
                          ...(nextUser.permissions || {}),
                        });
                      }
                    }}
                    className="w-full sm:w-auto min-h-[42px] px-3 bg-surface-2 border border-line rounded-[6px] text-[12px] font-medium text-ink focus:outline-hidden focus:border-brand cursor-pointer"
                  >
                    {users.map((u) => {
                      const eff = {
                        ...(DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.OPERATOR),
                        ...(u.permissions || {}),
                      };
                      const overrides = countCustomOverrides(u.role, eff);
                      return (
                        <option key={u.id} value={String(u.id)}>
                          {u.name} ({u.role}) {overrides > 0 ? `• Kustom (${overrides})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {permToast && (
                <div className="p-3 rounded-[6px] bg-aman/15 border border-aman text-ink text-[12px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-aman shrink-0" />
                  <span>{permToast}</span>
                </div>
              )}

              <UserPermissionsEditor
                targetRole={selectedUser.role}
                targetEmail={selectedUser.email}
                value={permDraft}
                onChange={setPermDraft}
                onReset={() => handleSaveUserPermissions(true)}
              />

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
                <button
                  type="button"
                  disabled={savingPerms}
                  onClick={() => handleSaveUserPermissions(false)}
                  className="h-9 px-4 bg-brand text-brand-ink rounded-[6px] text-[12px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {savingPerms
                      ? "Menyimpan..."
                      : `Simpan Hak Akses ${selectedUser.name}`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Tabel Matriks Perbandingan Hak Akses */}
          <div className="bg-surface border border-line rounded-[6px] p-5 space-y-4">
            <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand" />
              <span>Matriks Perbandingan Cepat Fitur Antar-Peran</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px] md:text-[13px] border border-line rounded">
                <thead className="bg-surface-2 text-ink font-semibold">
                  <tr>
                    <th className="p-3 border-b border-line">Modul / Fitur Sistem</th>
                    <th className="p-3 border-b border-line text-center">Super Admin</th>
                    <th className="p-3 border-b border-line text-center">Operator Lapangan</th>
                    <th className="p-3 border-b border-line text-center">Pakar Analis</th>
                    <th className="p-3 border-b border-line text-center">Pemilik Kolam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-muted">
                  <tr>
                    <td className="p-3 font-medium text-ink">Monitoring Telemetri Realtime</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Pasif</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Kendali Manual & Otomasi Aerator</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Read-Only</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Read-Only</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Konfirmasi Peringatan (Acknowledge)</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Dilarang</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Grafik Riwayat Multi-Parameter (6h/24h/7d)</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Prediksi Risiko Machine Learning (Random Forest)</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Ekspor Dataset CSV (Format Excel Indonesia)</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Dilarang</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Dilarang</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Laporan Eksekutif Kolam (WQI & Panen)</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Utama</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Tutorial SOP Lapangan & Kalibrasi</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Utama</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                    <td className="p-3 text-center text-muted font-normal">-</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Buat, Edit & Hapus Akun Pengguna</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Manajemen Konten Landing Page & Hotline WA</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Konfigurasi Bot Telegram / WA / Email</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Snapshot Backup & Keamanan Database</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Dokumentasi Arsitektur & Playground REST API</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Penuh</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                    <td className="p-3 text-center text-bahaya font-semibold">✗ Terkunci</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Pengaturan Profil Pribadi, Password & 2FA</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rincian Setiap Akun (4 Cards) */}
          <div className="space-y-6">
            {/* 1. Super Administrator */}
            <div className="p-6 bg-surface border border-brand/30 rounded-[8px] space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand text-brand-ink font-bold flex items-center justify-center shrink-0">
                    GM
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[17px] font-semibold text-ink">Super Administrator</h4>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand/10 text-brand border border-brand/20">
                        ADMIN (Tingkat Otoritas Tertinggi)
                      </span>
                    </div>
                    <p className="text-[12px] text-muted">
                      Akun Standar: <code>admin@banyuwening.id</code> · Gofran Muttaqi Likhan
                    </p>
                  </div>
                </div>
                <div className="text-[12px] text-muted self-start sm:self-auto">
                  Scope: <strong>Seluruh Unit Kolam & Pengaturan Sistem</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 text-[13px]">
                {/* Hal yang BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-aman">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Hal yang BISA Dilakukan:</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Manajemen Akun Penuh:</strong> Membuat akun baru untuk semua role, mengedit informasi profil & unit kolam, mereset password, serta menghapus akun yang tidak diperlukan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Manajemen Konten Landing Page:</strong> Mengganti judul/teks hero, pernyataan visi, video demo, foto mockup, email resmi, nomor hotline WhatsApp (+62), tautan kampus, dan FAQ.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Konfigurasi Notifikasi Multi-Kanal:</strong> Menyetel bot token Telegram, Chat ID, API key Fonnte WhatsApp, kredensial SMTP Email, serta parameter trigger alert.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Keamanan & Backup Basis Data:</strong> Membuat snapshot backup SQLite instan, mengunduh arsip database, dan mengawasi audit trail sistem.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Kendali Penuh Aerator Kolam:</strong> Mengatur relay aerator (ON / OFF / AUTO) dan menetapkan timer durasi manual hingga 120 menit.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Dokumentasi Lengkap & API Playground:</strong> Mengakses blueprint arsitektur, diagram wiring ESP32, REST API endpoint, dan simulasi POST telemetri.</span>
                    </li>
                  </ul>
                </div>

                {/* Hal yang TIDAK BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-bahaya">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Hal yang TIDAK BISA Dilakukan (Batasan Keamanan):</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Menghapus Akun Diri Sendiri:</strong> Sistem memblokir aksi hapus pada akun yang sedang login untuk mencegah penguncian sistem (Zero-Lockout).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mematikan Aerator Saat Failsafe Fisik ESP32 Aktif:</strong> Jika mikrokontroler mendeteksi status darurat (pH &lt; 6.0 atau Suhu &gt; 33°C), instruksi OFF dari cloud/admin akan otomatis ditolak demi keselamatan ikan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Menembus Proteksi 2FA Tanpa Token TOTP:</strong> Begitu 2FA aktif, sesi login wajib diverifikasi menggunakan authenticator app (Google Authenticator).</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. Operator Lapangan */}
            <div className="p-6 bg-surface border border-line rounded-[8px] space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 text-ink font-bold flex items-center justify-center shrink-0 border border-line">
                    RH
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[17px] font-semibold text-ink">Operator Teknis Lapangan</h4>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-2 text-ink border border-line">
                        OPERATOR (Operasional & Kendali Lapangan)
                      </span>
                    </div>
                    <p className="text-[12px] text-muted">
                      Akun Standar: <code>operator@banyuwening.id</code> · Rudi Hartono
                    </p>
                  </div>
                </div>
                <div className="text-[12px] text-muted self-start sm:self-auto">
                  Scope: <strong>Kolam Produksi Lele 01 (Terpal)</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 text-[13px]">
                {/* Hal yang BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-aman">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Hal yang BISA Dilakukan:</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Monitoring Kualitas Air Realtime:</strong> Memantau 5 parameter fisik (pH, Suhu, TDS, Kekeruhan, Pelampung Level Air) tiap 30 detik di kolam operasional.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Kendali Relay Aerator Lapangan:</strong> Menyalakan aerator (ON), mematikan (OFF), atau mengembalikan ke mode otomatis (AUTO) lengkap dengan timer durasi menit.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Konfirmasi Peringatan (Acknowledge):</strong> Menandai peringatan bahaya/waspada setelah melakukan inspeksi fisik air atau penaburan kapur dolomit di kolam.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Akses Tutorial SOP Lapangan:</strong> Membuka petunjuk teknis langkah penanganan anomali air, prosedur kalibrasi elektroda pH/TDS, dan jadwal perawatan filter mekanik.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Pengaturan Profil & 2FA Akun:</strong> Memperbarui informasi profil, mengganti password pribadi, dan mengamankan akun dengan 2FA.</span>
                    </li>
                  </ul>
                </div>

                {/* Hal yang TIDAK BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-bahaya">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Hal yang TIDAK BISA Dilakukan (Batasan Keamanan):</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengakses Menu Manajemen Super Admin:</strong> Akses ke Kelola Akun, Konten Landing, Konfigurasi Bot, Backup Database, dan Dokumentasi API ditolak secara ketat (HTTP 403 Forbidden).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengubah Akun Pengguna Lain:</strong> Tidak memiliki izin untuk membuat, mengubah wewenang, atau menghapus pengguna manapun.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengekspor Dataset CSV Mentah:</strong> Fitur ekspor data telemetri historis skala riset dinonaktifkan khusus untuk Operator.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengubah Token Bot / Gateway:</strong> Kredensial integrasi Telegram dan WhatsApp tidak ditampilkan pada antarmuka operator.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 3. Pakar Akuakultur / Analis */}
            <div className="p-6 bg-surface border border-line rounded-[8px] space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 text-ink font-bold flex items-center justify-center shrink-0 border border-line">
                    HW
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[17px] font-semibold text-ink">Pakar Akuakultur & Analis Data</h4>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-2 text-ink border border-line">
                        ANALIS (Riset & Analisis Mutu Air)
                      </span>
                    </div>
                    <p className="text-[12px] text-muted">
                      Akun Standar: <code>analis@banyuwening.id</code> · Dr. Ir. Hendra Wijaya
                    </p>
                  </div>
                </div>
                <div className="text-[12px] text-muted self-start sm:self-auto">
                  Scope: <strong>Unit Riset & Analisis Tambak</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 text-[13px]">
                {/* Hal yang BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-aman">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Hal yang BISA Dilakukan:</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Analisis Grafik Riwayat Multi-Horizon:</strong> Menelaah fluktuasi parameter air dengan pilihan rentang 6 Jam, 24 Jam, dan 7 Hari berlatar pita acuan aman SNI lele.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Inferensi Model Machine Learning:</strong> Memeriksa probabilitas prediksi risiko 1–3 jam ke depan, faktor pemicu (triggers), dan rekomendasi biokimia air.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Tabel Pembacaan Data Lengkap:</strong> Mengakses baris data mentah per interval 5 menit beserta indikator deviasi statistik.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Ekspor Dataset Format CSV Indonesia:</strong> Mengunduh telemetri ke file `.csv` dengan pemisah titik-koma (;) dan UTF-8 BOM untuk Microsoft Excel, Python Pandas, atau R Studio.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Konfirmasi Log Anomali Air:</strong> Memberikan catatan dan status konfirmasi pada tabel peringatan anomali.</span>
                    </li>
                  </ul>
                </div>

                {/* Hal yang TIDAK BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-bahaya">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Hal yang TIDAK BISA Dilakukan (Batasan Keamanan):</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengontrol Relay Aerator Fisik:</strong> Analis dikunci dalam mode Read-Only pada aktuator aerator untuk mencegah konflik kendali dengan operator lapangan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengakses Menu Super Admin:</strong> Tidak dapat mengelola akun pengguna, mengedit konten landing, mengubah token bot, atau mengunduh backup database.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengubah Aturan Ambang Batas Sensor:</strong> Parameter evaluasi baku mutu air dikunci secara sistemik sesuai regulasi SNI.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 4. Pemilik Kolam */}
            <div className="p-6 bg-surface border border-line rounded-[8px] space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-2 text-ink font-bold flex items-center justify-center shrink-0 border border-line">
                    BS
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[17px] font-semibold text-ink">Pemilik Budidaya / Petambak</h4>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-2 text-ink border border-line">
                        PEMILIK (Pemantauan Eksekutif & Hasil Usaha)
                      </span>
                    </div>
                    <p className="text-[12px] text-muted">
                      Akun Standar: <code>pemilik@banyuwening.id</code> · H. Bambang Sugiarto
                    </p>
                  </div>
                </div>
                <div className="text-[12px] text-muted self-start sm:self-auto">
                  Scope: <strong>Kolam Terpal Sangkuriang 1 & 2</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1 text-[13px]">
                {/* Hal yang BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-aman">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Hal yang BISA Dilakukan:</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Laporan Eksekutif Kolam (Data Terproses):</strong> Mengakses ringkasan cerdas yang mudah dipahami: skor Water Quality Index (WQI 0–100), estimasi produktivitas panen, dan efisiensi aerasi.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Pemantauan Ringkasan Kolam:</strong> Melihat status terkini kualitas air kolam tanpa dibebani grafik kurva teknis yang membingungkan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Pemantauan Log Peringatan:</strong> Melihat riwayat peringatan yang diteruskan otomatis ke WhatsApp / Telegram pemilik.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-aman shrink-0 mt-0.5" />
                      <span><strong>Pengaturan Akun Pemilik & 2FA:</strong> Mengubah nama profil, email pribadi, password, serta mengaktifkan proteksi 2FA.</span>
                    </li>
                  </ul>
                </div>

                {/* Hal yang TIDAK BISA dilakukan */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold text-bahaya">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Hal yang TIDAK BISA Dilakukan (Batasan Keamanan):</span>
                  </div>
                  <ul className="space-y-2 text-muted leading-relaxed">
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengendalikan Aerator:</strong> Tombol kendali aerator disembunyikan/dilarang demi mematuhi SOP teknis lapangan yang dipegang penuh oleh Operator.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengonfirmasi (Acknowledge) Peringatan:</strong> Konfirmasi peringatan teknis wajib dilakukan oleh operator yang memeriksa langsung fisik kolam.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengakses Menu Manajemen Super Admin:</strong> Akun, konten landing, token bot, dan backup database terkunci rapat.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-bahaya shrink-0 mt-0.5" />
                      <span><strong>TIDAK BISA Mengekspor CSV Mentah:</strong> Dibatasi dari dataset telemetri mentah; pemilik disajikan laporan eksekutif terolah.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">

      {/* Grid Quick Nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <a
          href="#hardware"
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors block"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1">
            <Cpu className="w-4 h-4 text-brand" />
            <span>1. Core Hub (1:4)</span>
          </div>
          <p className="text-[12px] text-muted">
            ESP32-WROOM, 2-3x ADS1115, MCP23017, Relay 4/8-Ch, LittleFS + RTC DS3231, GX16.
          </p>
        </a>

        <a
          href="#mqtt"
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors block"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1">
            <Server className="w-4 h-4 text-brand" />
            <span>2. Cloud Always-On</span>
          </div>
          <p className="text-[12px] text-muted">
            EMQX/Mosquitto TLS 8883, FastAPI Always-On, Supabase Pro & WeningBot WA.
          </p>
        </a>

        <a
          href="#ml"
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors block"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1">
            <FileCode2 className="w-4 h-4 text-brand" />
            <span>3. ML & HITL Gate</span>
          </div>
          <p className="text-[12px] text-muted">
            Cold-Start 4-Fase, Sensor Health Watchdog, dan HITL Engineer Gate.
          </p>
        </a>

        <a
          href="#failsafe"
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors block"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>4. Failsafe &amp; Edge Watchdog</span>
          </div>
          <p className="text-[12px] text-muted">
            Edge Fuzzy (WiFi mati), Anti-Bricking Rp0, &amp; pemulihan daya otomatis.
          </p>
        </a>

        <button
          onClick={() => setActiveSubTab("peran-akun")}
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors text-left cursor-pointer group"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1 group-hover:text-brand">
            <Users className="w-4 h-4 text-brand" />
            <span>5. Hak Akses Akun (RBAC)</span>
          </div>
          <p className="text-[12px] text-muted">
            Matriks wewenang apa yang BISA & TIDAK BISA dilakukan tiap role.
          </p>
        </button>
      </div>

      {/* Bagian 1: Core Hub & Modul Sensor Kolam */}
      <section id="hardware" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Cpu className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            1. Arsitektur Hardware : 1 Core Hub : 1-4 Modul Kolam
          </h2>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Satu <strong>Core Hub</strong> (Carrier PCB berbasis <strong>ESP32-WROOM</strong>) melayani maksimal <strong>4 kolam berdempetan dalam klaster 1 pemilik</strong> via soket kedap air GX16 dan kabel shielded maksimal 3-5 meter (terpisah dari jalur AC 220V). Setiap unit wajib lulus <strong>QC Burn-in Test 48 Jam</strong> dan kalibrasi 2-titik (buffer pH 4 &amp; 7).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border border-line rounded">
            <thead className="bg-surface-2 text-ink font-semibold">
              <tr>
                <th className="p-3 border-b border-line">Subsistem / Komponen</th>
                <th className="p-3 border-b border-line">Antarmuka / Alamat</th>
                <th className="p-3 border-b border-line">Spesifikasi Teknis</th>
                <th className="p-3 border-b border-line">Peran &amp; Kebijakan Garansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-muted">
              <tr>
                <td className="p-3 font-medium text-ink">Multi-ADC 2-3x ADS1115 (16-bit)</td>
                <td className="p-3 font-mono text-[12px]">I2C 0x48 - 0x4A + Level Shifter 3.3V&lt;-&gt;5V</td>
                <td className="p-3">8 kanal (Starter 2K) atau 12 kanal (Juragan 4K)</td>
                <td className="p-3">Membaca pH, TDS, dan Turbidity 1-4 kolam dengan resolusi presisi 16-bit.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">GPIO Expander MCP23017 / PCF8574</td>
                <td className="p-3 font-mono text-[12px]">I2C Bus + Pull-up</td>
                <td className="p-3">Ekspansi I/O digital untuk float switch &amp; relay</td>
                <td className="p-3">Menangani 2 aktuator/kolam pada konfigurasi multi-kolam (Garansi Hub 12 bln).</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Edge Watchdog + RTC DS3231 + LittleFS</td>
                <td className="p-3 font-mono text-[12px]">SPI Flash / I2C / Watchdog Timer</td>
                <td className="p-3">Retensi data lokal hingga 72 jam &amp; Auto-Resume</td>
                <td className="p-3">Store-and-forward offline (WiFi mati) &amp; sinkronisasi otomatis saat jaringan pulih.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Probe Kaca pH (PH-4502C) & TDS MOSFET</td>
                <td className="p-3 font-mono text-[12px]">GX16 + EMI RC/Ferrite (maks 3-5 m)</td>
                <td className="p-3">pH 0-14; TDS dengan MOSFET power-switch</td>
                <td className="p-3">MOSFET mencegah korosi elektrolisis. Probe pH berstatus Consumable 4-6 bln (DOA 30 hari; pengganti Rp195.000).</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Turbidity Epoksi + DS18B20 + Float Switch</td>
                <td className="p-3 font-mono text-[12px]">Stilling Well PVC + 1-Wire</td>
                <td className="p-3">Sensor kekeruhan potting epoxy tahan percikan</td>
                <td className="p-3">Dilindungi pipa PVC berlubang dari tubrukan lele; dipantau Sensor Health Watchdog.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Relay Optocoupler 4-Ch / 8-Ch</td>
                <td className="p-3 font-mono text-[12px]">Active Signal + Hard Safety Clamp</td>
                <td className="p-3">Starter 4-Ch; Juragan 8-Ch (aerator + pompa AC 220V)</td>
                <td className="p-3">Mengendalikan aerator dan pompa AC 220V (hanya aktif saat PLN 220V tersedia atau via genset/inverter).</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">LCD 16x2 + Box IP65 (4 Port GX16) + Slot DO Pro</td>
                <td className="p-3 font-mono text-[12px]">I2C (0x27) & Ekspansi I2C/GX16</td>
                <td className="p-3">Layar diagnostik lokal pinggir kolam</td>
                <td className="p-3">Siap ekspansi add-on Modul DO Pro untuk komoditas sensitif oksigen.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Bagian 2: Cloud Always-On, MQTT TLS & WeningBot WhatsApp-First */}
      <section id="mqtt" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Server className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            2. Arsitektur Cloud Always-On, MQTT TLS & WeningBot WhatsApp-First
          </h2>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Untuk menghindari jebakan free-tier pada beban produksi, BanyuWening memakai arsitektur <strong>Always-On Cloud</strong>: broker <strong>EMQX / Mosquitto TLS Port 8883</strong>, <strong>FastAPI Always-On</strong>, dan <strong>Supabase Pro</strong>, serta kanal <strong>WeningBot WhatsApp-First</strong> (lebih dari 90% trafik memakai Rule-Based Engine Rp0 LLM dengan kuota 3 kueri AI/hari) plus Telegram dan PWA opsional.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <h4 className="text-[13px] font-semibold text-ink mb-2">Topik MQTT TLS (EMQX / Mosquitto):</h4>
            <ul className="space-y-2 text-[12px] text-muted">
              <li>
                <strong className="text-ink">banyuwening/{"{hub_id}"}/telemetry</strong> (QoS 1):
                <br />
                Core Hub mengirim telemetri multi-kolam per pond_id beserta status watchdog &amp; LittleFS buffer.
              </li>
              <li>
                <strong className="text-ink">banyuwening/{"{hub_id}"}/control</strong> (QoS 1):
                <br />
                Perintah aktuator relay 4/8-Ch serta pembaruan parameter JSON setelah lolos HITL Engineer Gate.
              </li>
              <li>
                <strong className="text-ink">banyuwening/{"{hub_id}"}/status</strong> (QoS 1, Retained):
                <br />
                Status LWT, indikator daya AC, dan pemisahan mode Offline-Plus Rp0.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <h4 className="text-[13px] font-semibold text-ink mb-2">Contoh Payload JSON Multi-Kolam:</h4>
            <pre className="text-[11px] font-mono text-ink bg-surface p-2.5 rounded border border-line overflow-x-auto">
{`{
  "hub_id": "BW-CORE-01",
  "pond_id": "P01",
  "ts": "2026-11-20T08:30:00Z",
  "seq": 18452,
  "ph": 7.12,
  "temperature_c": 28.4,
  "tds_ppm": 345,
  "turbidity_ntu": 43.0,
  "sensor_health": "OK",
  "power_source": "PLN",
  "aerator_on": true,
  "mode": "AUTO"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Bagian 3: Cold-Start 4-Fase, Watchdog & HITL AI Safety Gate */}
      <section id="ml" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <FileCode2 className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            3. Cold-Start 4-Fase, Biologi Lele & HITL AI Safety Gate
          </h2>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Ikan lele memiliki organ pernapasan labirin (<em>arborescent</em>) sehingga perilaku naik ke permukaan (<em>piping</em>) sering membiaskan tebakan mata. Karena itu BanyuWening menolak zero-shot tanpa data kolam riil dan menjalankan protokol <strong>Cold-Start 4-Fase</strong> serta penguncian <strong>Human-in-the-Loop (HITL) Engineer Gate</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div className="p-4 bg-surface-2 rounded border border-line">
            <div className="font-semibold text-ink mb-1">Random Forest REST API &amp; Trafik MLOps</div>
            <p className="text-[12px] text-muted">
              Endpoint <code>/api/ml/predict</code>, <code>/api/ml/predict/batch</code>, <code>/api/ml/performance</code>, dan <code>/api/ml/status</code> menyediakan inferensi &amp; metrik latensi P95 secara terukur.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded border border-line">
            <div className="font-semibold text-ink mb-1">AI Agent Self-Learning &amp; Safety Gate</div>
            <p className="text-[12px] text-muted">
              Agen AI memantau data drift, menjalankan 3-fold TimeSeriesSplit, memvalidasi recall BAHAYA &amp; Macro-F1 SNI 8228.4:2015 sebelum promosi atomik atau 1-klik rollback.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded border border-line">
            <div className="font-semibold text-ink mb-1">Dual-OTA ESP32 &amp; Rollback 60 Detik</div>
            <p className="text-[12px] text-muted">
              Protokol <code>banyuwening.ota.v1</code> (WS + HTTP Fallback <code>/api/http/ota/*</code>) mengirim signed manifest HMAC-SHA256 dan mengaktifkan rollback otomatis bila health-check 60s gagal.
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 4: Failsafe Lokal, Edge Watchdog & Tata Kelola Anti-Bricking */}
      <section id="failsafe" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            4. Pemisahan WiFi Mati vs Gangguan Daya, Anti-Bricking &amp; Ketahanan Edge
          </h2>
        </div>

        <div className="p-4 bg-aman/10 border border-aman/20 rounded-[6px] flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-aman shrink-0 mt-0.5" />
          <div className="text-[13px]">
            <h4 className="font-semibold text-ink mb-1">Saat WiFi Mati atau SaaS Dijeda : Offline-Plus Rp0 (Anti-Bricking)</h4>
            <p className="text-muted leading-relaxed">
              Perangkat keras adalah milik penuh petambak. Edge Fuzzy + Store-and-Forward (LittleFS + RTC DS3231) tetap menggerakkan aerator/pompa saat pH &lt; 6,0 atau &gt; 8,8, suhu &gt; 33,0 C, atau Float Switch surut, dan tetap aktif gratis permanen walaupun langganan SaaS Smart Guard (Rp150rb/Rp225rb per siklus 3 bulan) dijeda.
            </p>
          </div>
        </div>

        <div className="p-4 bg-waspada/10 border border-waspada/20 rounded-[6px] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-waspada shrink-0 mt-0.5" />
          <div className="text-[13px]">
            <h4 className="font-semibold text-ink mb-1">Saat Listrik PLN Bermasalah : Edge Watchdog &amp; Auto-Resume</h4>
            <p className="text-muted leading-relaxed">
              Edge Watchdog menyimpan rekaman sensor lokal di memori LittleFS hingga 72 jam serta menandai flag status daya pada broker, sehingga Core Hub otomatis melakukan backfill dan pemulihan status relay saat pasokan listrik kembali stabil.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Proyek */}
      <div className="p-4 bg-surface border border-line rounded text-[13px] text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          Arsitektur Sistem BanyuWening : <strong>Smart Aquaculture IoT Multi-Kolam</strong>
        </div>
        <div>
          Sistem Monitoring &amp; Otomasi Kolam Ikan Terpadu
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
