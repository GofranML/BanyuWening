import { useState } from "react";
import { router } from "@inertiajs/react";
import {
  ShieldCheck,
  Database,
  Lock,
  Download,
  Trash2,
  HardDrive,
  RefreshCw,
  Clock,
  Server,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { BackupItem, SecurityStats } from "@/Types";

interface SuperAdminSecurityBackupProps {
  securityStats?: SecurityStats;
  backups?: BackupItem[];
  onNavigateTab?: (tab: string) => void;
}

export function SuperAdminSecurityBackup({
  securityStats,
  backups = [],
  onNavigateTab,
}: SuperAdminSecurityBackupProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  const handleCreateBackup = () => {
    setIsProcessing(true);
    router.post(
      "/dashboard/backups/create",
      {},
      {
        preserveScroll: true,
        onFinish: () => setIsProcessing(false),
      }
    );
  };

  const handleDeleteBackup = (filename: string) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus file cadangan "${filename}" dari server?`
      )
    ) {
      return;
    }

    setDeletingFilename(filename);
    router.delete(`/dashboard/backups/${filename}`, {
      preserveScroll: true,
      onFinish: () => setDeletingFilename(null),
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-6 bg-surface rounded-[6px] border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>Hak Akses Terproteksi: Super Administrator</span>
          </div>
          <h1 className="text-[22px] leading-[28px] font-display text-ink">
            Pusat Keamanan Sistem & Pencadangan Basis Data
          </h1>
          <p className="text-[13px] text-muted mt-1 max-w-2xl">
            Audit keamanan komprehensif, kepatuhan 2FA, enkripsi telemetri MQTT TLS,
            serta instrumen snapshot backup basis data operasional BanyuWening.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={isProcessing}
          className="h-10 px-4 bg-brand hover:bg-brand-hover active:bg-brand-active text-brand-ink font-semibold rounded-[6px] text-[13px] transition-colors flex items-center gap-2 shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`}
          />
          <span>
            {isProcessing ? "Memproses Snapshot..." : "Buat Backup Sekarang"}
          </span>
        </button>
      </div>

      {/* Grid Status Keamanan Sistem */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 2FA TOTP */}
        <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Autentikasi 2FA
              </span>
              <div className="text-[20px] font-bold text-ink mt-1 font-mono">
                {securityStats?.users_with_2fa || 0} /{" "}
                {securityStats?.total_users || 0}
              </div>
            </div>
            <div className="p-2 bg-brand/10 text-brand rounded-[6px]">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line text-[12px] text-muted flex items-center justify-between">
            <span>RFC 6238 TOTP</span>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("profil")}
                className="text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                Atur 2FA <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Enkripsi MQTT TLS */}
        <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Protokol Sensor
              </span>
              <div className="text-[16px] font-bold text-ink mt-1">
                MQTT TLS 1.3
              </div>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-[6px]">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line text-[12px] text-muted">
            Port 8883 (HiveMQ Cloud SSL)
          </div>
        </div>

        {/* Card 3: Failsafe Hardware */}
        <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Pengaman Kolam
              </span>
              <div className="text-[16px] font-bold text-ink mt-1">
                Failsafe Otomatis
              </div>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-[6px]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line text-[12px] text-muted">
            Relay lokal mandiri tanpa cloud
          </div>
        </div>

        {/* Card 4: Kapasitas Basis Data */}
        <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                Ukuran Basis Data
              </span>
              <div className="text-[20px] font-bold text-ink mt-1 font-mono">
                {securityStats?.db_size || "0 KB"}
              </div>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-[6px]">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line text-[12px] text-muted">
            Driver: {securityStats?.db_driver || "SQLITE"}
          </div>
        </div>
      </div>

      {/* Rincian Spesifikasi Keamanan */}
      <div className="p-5 bg-surface rounded-[6px] border border-line">
        <h2 className="text-[15px] font-semibold text-ink flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-brand" />
          <span>Matriks Kepatuhan & Arsitektur Keamanan BanyuWening</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              Proteksi Sesi & CSRF
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              Setiap formulir dan permintaan mutasi data diverifikasi menggunakan
              XSRF-Token unik dengan enkripsi cookie HttpOnly SameSite.
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              Pemisahan Hak Akses (RBAC)
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              Otorisasi ketat membatasi hak akses berdasar 4 peran: Super Admin
              (Penuh), Operator (Alat), Analis (Riset & Data), Pemilik (Laporan).
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              Enkripsi Kunci & Rahasia
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              Kata sandi dienkripsi menggunakan Bcrypt (Argon2 kompatibel). Kunci
              rahasia 2FA disimpan menggunakan kolom terisolasi di database.
            </p>
          </div>
        </div>
      </div>

      {/* Tabel File Backup */}
      <div className="p-6 bg-surface rounded-[6px] border border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-brand" />
              <span>Daftar Cadangan Basis Data ({backups.length} Berkas)</span>
            </h2>
            <p className="text-[12px] text-muted mt-0.5">
              Berkas snapshot tersimpan di direktori privat server:{" "}
              <code className="text-brand">storage/app/backups/</code>
            </p>
          </div>

          <div className="text-[12px] text-muted flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Cadangan Terakhir: {securityStats?.last_backup || "-"}</span>
          </div>
        </div>

        {backups.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-line rounded-[6px] bg-surface-2/40">
            <Database className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-ink">
              Belum ada berkas cadangan di server.
            </p>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
              Klik tombol di bawah ini untuk membuat snapshot pertama data telemetri,
              akun pengguna, dan model kecerdasan buatan.
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={isProcessing}
              className="px-4 py-2 bg-brand text-brand-ink font-semibold rounded-[6px] text-xs transition-colors hover:bg-brand-hover cursor-pointer"
            >
              Buat Snapshot Pertama Sekarang
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-line rounded-[6px]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Nama Berkas Cadangan</th>
                  <th className="px-4 py-3">Format</th>
                  <th className="px-4 py-3">Ukuran</th>
                  <th className="px-4 py-3">Waktu Pembuatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[12px] text-ink font-semibold flex items-center gap-2">
                      {b.type === "sqlite" ? (
                        <Database className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span>{b.filename}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold uppercase ${
                          b.type === "sqlite"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {b.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted">
                      {b.size_human}
                    </td>
                    <td className="px-4 py-3 text-muted text-[12px]">
                      {b.created_at}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/dashboard/backups/${encodeURIComponent(
                            b.filename
                          )}/download`}
                          className="h-8 px-2.5 bg-brand/10 hover:bg-brand/20 text-brand rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="Unduh berkas cadangan ini ke komputer lokal"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </a>

                        <button
                          onClick={() => handleDeleteBackup(b.filename)}
                          disabled={deletingFilename === b.filename}
                          className="h-8 w-8 text-muted hover:text-bahaya hover:bg-bahaya/10 rounded-[6px] transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                          title="Hapus berkas cadangan dari server"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
