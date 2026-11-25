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
  FileCheck2,
  ShieldAlert,
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
            <span>
              {securityStats?.admins_without_2fa
                ? `${securityStats.admins_without_2fa} admin belum 2FA`
                : "RFC 6238 TOTP + anti-replay"}
            </span>
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
                Broker MQTT
              </div>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-[6px]">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-line text-[12px] text-muted break-words">
            {securityStats?.mqtt_tls || "Konfigurasi broker belum terbaca"}
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
            Driver: {securityStats?.db_driver || "-"}
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
              Sesi, CSRF & Logout
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              Permintaan mutasi memakai token CSRF. Logout hanya lewat POST,
              sesi diregenerasi saat login dan sebelum verifikasi 2FA.
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              Anti Brute-Force & 2FA
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              {securityStats?.login_throttle ||
                "Login dan 2FA dibatasi 5 percobaan per menit"}
              . Kode TOTP yang sudah dipakai ditolak (anti-replay).
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              RBAC Ketat Berbasis Peran
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              Backup, manajemen akun/tenant, notifikasi, dan MLOps hanya untuk
              peran Super Admin. Izin kustom tidak dapat menggantikan peran.
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              Isolasi Tenant & Realtime
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              Data perangkat tenant privat tidak terbaca anonim, dan tiket
              WebSocket hanya mengalirkan perangkat milik tenant pemegangnya.
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              Pipeline Unggahan & URL Eksternal
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              Seluruh unggahan (media, firmware, dokumen tenant) melewati karantina
              privat (0600), inspeksi magic bytes/struktur/polyglot, dan scanner
              fail-closed. URL agen AI &amp; webhook diperiksa terhadap SSRF.
            </p>
          </div>
          <div className="p-3 bg-surface-2 rounded-[6px] border border-line">
            <span className="font-semibold text-ink block mb-1">
              Header Keamanan & Rahasia
            </span>
            <p className="text-muted text-[12px] leading-relaxed">
              {securityStats?.security_headers ||
                "Header keamanan HTTP aktif"}
              . Kata sandi di-hash Bcrypt; rahasia 2FA dan token perangkat
              disimpan terenkripsi/hash.
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Unggahan Aman (Secure File Upload Pipeline) */}
      {securityStats?.upload_pipeline && (() => {
        const up = securityStats.upload_pipeline;
        const driverUpper = up.scanner_driver.toUpperCase();
        const scannerLabel = up.scanner_available
          ? up.scanner_version && up.scanner_version.toLowerCase().includes(up.scanner_driver.toLowerCase())
            ? `${up.scanner_version} · Aktif`
            : `${driverUpper} · Aktif`
          : `${driverUpper} · Tidak Aktif`;

        const metricCells = [
          { label: "Lolos Verifikasi", sub: "CLEAN", value: up.clean_count, tone: "text-emerald-600" },
          { label: "Dalam Antrean", sub: "PENDING", value: up.pending_count, tone: "text-ink" },
          { label: "Dikarantina", sub: "QUARANTINED", value: up.quarantined_count, tone: "text-bahaya" },
          { label: "Ditolak Validasi", sub: "REJECTED", value: up.rejected_count, tone: "text-amber-600" },
          { label: "Gagal Pindai", sub: "FAIL-CLOSED", value: up.scan_failed_count, tone: "text-bahaya", span: "col-span-2 sm:col-span-1" },
        ];

        return (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-brand shrink-0" />
                  <span>Pipeline Unggahan Aman</span>
                </h2>
                <p className="text-[12px] text-muted mt-0.5">
                  Karantina privat, inspeksi struktur &amp; polyglot, serta pemindaian malware fail-closed.
                </p>
              </div>

              <span
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium whitespace-nowrap ${
                  up.scanner_available
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {up.scanner_available ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{scannerLabel}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5 border-y border-line text-[12px] text-muted">
              <span>
                Kebijakan: <strong className="text-ink font-medium">Fail-Closed</strong>
              </span>
              <span>
                Batas Unggah: <strong className="text-ink font-medium font-mono">{up.rate_limit_per_minute}/menit</strong>
              </span>
              <span>
                Retensi Karantina: <strong className="text-ink font-medium font-mono">{up.quarantine_ttl_minutes} menit</strong>
              </span>
              <span>
                Direktori: <code className="text-brand text-[11.5px]">storage/app/private/quarantine/</code>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-line border border-line rounded-[6px] bg-surface-2/40 overflow-hidden">
              {metricCells.map((cell) => (
                <div key={cell.sub} className={`px-4 py-3.5 ${cell.span || ""}`}>
                  <div className="text-[12px] font-medium text-ink">{cell.label}</div>
                  <div className={`text-[20px] font-bold font-mono tabular-nums mt-1 ${cell.tone}`}>
                    {cell.value}
                  </div>
                  <div className="text-[10.5px] font-mono uppercase tracking-wider text-muted mt-0.5">
                    {cell.sub}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-[12px] font-semibold text-ink mb-2">
                Log Audit Unggahan Terbaru
              </h3>
              {up.recent_audit_logs.length === 0 ? (
                <div className="py-5 px-4 border border-line rounded-[6px] bg-surface-2/30 text-center text-[12px] text-muted">
                  Belum ada aktivitas unggahan tercatat di audit log keamanan.
                </div>
              ) : (
                <div className="overflow-x-auto border border-line rounded-[6px]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[10.5px] font-semibold tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">Waktu</th>
                        <th className="px-3 py-2.5">Event</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Tenant</th>
                        <th className="px-3 py-2.5">MIME / Hasil</th>
                        <th className="px-3 py-2.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {up.recent_audit_logs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-2/40">
                          <td className="px-3 py-2 font-mono text-[11px] text-muted whitespace-nowrap">
                            {log.created_at}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-ink">
                            {log.event}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px]">
                            <span className="px-2 py-0.5 rounded-[4px] bg-surface-2 border border-line text-ink">
                              {log.status_to || "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted">
                            {log.tenant_code || "GLOBAL"}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted">
                            {log.detected_mime || "-"} {log.scan_result ? `(${log.scan_result})` : ""}
                          </td>
                          <td className="px-3 py-2 text-muted max-w-xs truncate">
                            {log.rejection_reason || log.promotion_result || "-"}
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
      })()}

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
            <p className="text-[12px] text-muted mt-1 flex items-start gap-1.5 max-w-2xl">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Berkas <code>.sql</code> adalah dump penuh database dan memuat
                hash kata sandi serta rahasia 2FA. Simpan di tempat aman dan
                hapus setelah diunduh. Snapshot <code>.json</code> tidak memuat
                kredensial.
              </span>
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
                      {b.type === "sqlite" || b.type === "sql" ? (
                        <Database className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileJson className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <span>{b.filename}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold uppercase ${
                          b.type === "sqlite" || b.type === "sql"
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
