import { useState } from "react";
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
  ShieldAlert,
  SlidersHorizontal,
  Fish,
  Wrench,
  FileSpreadsheet,
  Lock,
  Check,
  X,
  UserCheck,
  Mail,
  KeyRound,
} from "lucide-react";
import { SuperAdminApiDocs } from "@/Components/roles/SuperAdminApiDocs";

type DocSubTab = "arsitektur" | "peran-akun" | "api";

export function SuperAdminDocs() {
  const [activeSubTab, setActiveSubTab] = useState<DocSubTab>("arsitektur");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[12px] font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Dokumentasi Terpadu: Arsitektur Sistem, Hak Akses Akun & Spesifikasi API</span>
        </div>
        <h1 className="text-[26px] md:text-[30px] font-display text-ink leading-tight">
          Dokumentasi Lengkap Sistem BanyuWening
        </h1>
        <p className="text-[14px] text-muted mt-1 max-w-3xl">
          Spesifikasi teknis menyeluruh proyek sistem cerdas pemantau kualitas air kolam ikan
          berbasis IoT, Machine Learning, dan REST API oleh mahasiswa Institut Teknologi dan Bisnis
          PalComTech.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-line pb-1 text-[13px] flex-wrap">
        <button
          onClick={() => setActiveSubTab("arsitektur")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === "arsitektur"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Arsitektur & Spesifikasi Sistem</span>
        </button>

        <button
          onClick={() => setActiveSubTab("peran-akun")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === "peran-akun"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Matriks Hak Akses & Peran Akun (RBAC)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("api")}
          className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === "api"
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>3. Dokumentasi REST API & Playground IoT</span>
        </button>
      </div>

      {activeSubTab === "api" ? (
        <SuperAdminApiDocs />
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
              dan mengunci seluruh konfigurasi sensitif hanya untuk Super Administrator.
            </p>
          </div>

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
                    <td className="p-3 text-center text-muted font-normal">—</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Prediksi Risiko Machine Learning (Random Forest)</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-muted font-normal">—</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Ya</td>
                    <td className="p-3 text-center text-muted font-normal">—</td>
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
                    <td className="p-3 text-center text-muted font-normal">—</td>
                    <td className="p-3 text-center text-muted font-normal">—</td>
                    <td className="p-3 text-center text-muted font-normal">—</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Utama</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-ink">Tutorial SOP Lapangan & Kalibrasi</td>
                    <td className="p-3 text-center text-muted font-normal">—</td>
                    <td className="p-3 text-center text-aman font-bold">✓ Utama</td>
                    <td className="p-3 text-center text-muted font-normal">—</td>
                    <td className="p-3 text-center text-muted font-normal">—</td>
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
            <span>1. Node IoT & Wiring</span>
          </div>
          <p className="text-[12px] text-muted">
            Pinout GPIO ESP32, 4 sensor analog-digital, dan modul relay.
          </p>
        </a>

        <a
          href="#mqtt"
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors block"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1">
            <Server className="w-4 h-4 text-brand" />
            <span>2. Protokol MQTT TLS</span>
          </div>
          <p className="text-[12px] text-muted">
            Broker HiveMQ Cloud port 8883, skema topik, dan format payload JSON.
          </p>
        </a>

        <a
          href="#ml"
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors block"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1">
            <FileCode2 className="w-4 h-4 text-brand" />
            <span>3. Machine Learning</span>
          </div>
          <p className="text-[12px] text-muted">
            Model klasifikasi Random Forest, rekayasa fitur rolling window, dan akurasi.
          </p>
        </a>

        <a
          href="#failsafe"
          className="p-4 bg-surface border border-line rounded-[6px] hover:border-brand/60 transition-colors block"
        >
          <div className="flex items-center gap-2 font-semibold text-[14px] text-ink mb-1">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>4. Aturan Failsafe</span>
          </div>
          <p className="text-[12px] text-muted">
            Jaminan keselamatan lokal mikrokontroler saat koneksi cloud terputus.
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

      {/* Bagian 1: Hardware & Wiring */}
      <section id="hardware" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Cpu className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            1. Arsitektur Node Sensor & Wiring GPIO (ESP32)
          </h2>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Sistem menggunakan mikrokontroler <strong>ESP32 NodeMCU-32S</strong> dengan arsitektur
          dual-core Xtensa LX6 240 MHz. Mikrokontroler ini membaca 4 sensor kualitas air dan 1 float
          switch digital setiap 30 detik menggunakan metode ADC Multisampling 10× averaging untuk
          meredam noise elektrikal air.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border border-line rounded">
            <thead className="bg-surface-2 text-ink font-semibold">
              <tr>
                <th className="p-3 border-b border-line">Komponen / Sensor</th>
                <th className="p-3 border-b border-line">Pin GPIO</th>
                <th className="p-3 border-b border-line">Tipe Sinyal</th>
                <th className="p-3 border-b border-line">Rentang Fisik</th>
                <th className="p-3 border-b border-line">Fungsi Teknis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-muted">
              <tr>
                <td className="p-3 font-medium text-ink">Sensor pH Probe (E-201-C)</td>
                <td className="p-3 font-mono text-[12px]">GPIO 34 (ADC1_CH6)</td>
                <td className="p-3">Analog (0 - 3.3V)</td>
                <td className="p-3">0.00 – 14.00 pH</td>
                <td className="p-3">Mendeteksi keasaman air akibat dekomposisi pakan / respirasi alga.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Sensor Suhu (DS18B20 Waterproof)</td>
                <td className="p-3 font-mono text-[12px]">GPIO 4 (OneWire)</td>
                <td className="p-3">Digital 1-Wire</td>
                <td className="p-3">-10°C – +85°C</td>
                <td className="p-3">Memantau fluktuasi suhu harian kolam (pull-up 4.7kΩ ke 3.3V).</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Sensor TDS Meter Analog</td>
                <td className="p-3 font-mono text-[12px]">GPIO 35 (ADC1_CH7)</td>
                <td className="p-3">Analog (0 - 2.3V)</td>
                <td className="p-3">0 – 1000 ppm</td>
                <td className="p-3">Mengukur total zat padat terlarut & mineral air kolam.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Sensor Kekeruhan (Turbidity)</td>
                <td className="p-3 font-mono text-[12px]">GPIO 32 (ADC1_CH4)</td>
                <td className="p-3">Analog (0 - 4.5V via divider)</td>
                <td className="p-3">0 – 1000 NTU</td>
                <td className="p-3">Mendeteksi kekeruhan suspensi partikel pakan dan lumpur.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Water Level Float Switch</td>
                <td className="p-3 font-mono text-[12px]">GPIO 18</td>
                <td className="p-3">Digital (Active LOW)</td>
                <td className="p-3">Normal / Surut</td>
                <td className="p-3">Deteksi surut air kolam bocor atau meluap akibat hujan lebat.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Relay Optocoupler Aerator</td>
                <td className="p-3 font-mono text-[12px]">GPIO 25</td>
                <td className="p-3">Digital Output</td>
                <td className="p-3">HIGH (ON) / LOW (OFF)</td>
                <td className="p-3">Menggerakkan saklar dinamo aerator oksigen darurat DC 12V.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-ink">Layar LCD 16×2 I2C</td>
                <td className="p-3 font-mono text-[12px]">GPIO 21 (SDA), GPIO 22 (SCL)</td>
                <td className="p-3">I2C Bus (0x27)</td>
                <td className="p-3">Teks 16x2 karakter</td>
                <td className="p-3">Menampilkan nilai sensor dan status offline di pinggir kolam.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Bagian 2: Protokol Komunikasi MQTT */}
      <section id="mqtt" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Server className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            2. Protokol Komunikasi Cloud & Broker MQTT TLS
          </h2>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Koneksi IoT ke cloud menggunakan broker <strong>HiveMQ Cloud</strong> terenkripsi penuh
          dengan <strong>TLS Port 8883</strong> dan sertifikat X.509 untuk mencegah manipulasi
          paket di jaringan nirkabel terbuka.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <h4 className="text-[13px] font-semibold text-ink mb-2">Topik MQTT yang Digunakan:</h4>
            <ul className="space-y-2 text-[12px] text-muted">
              <li>
                <strong className="text-ink">banyuwening/telemetry</strong> (QoS 1):
                <br />
                Node ESP32 mem-publish telemetry sensor per 30 detik.
              </li>
              <li>
                <strong className="text-ink">banyuwening/control</strong> (QoS 1):
                <br />
                Backend/operator mengirim perintah manual relay (ON/OFF/AUTO).
              </li>
              <li>
                <strong className="text-ink">banyuwening/status</strong> (QoS 1, Retained):
                <br />
                Last Will and Testament (LWT) jika node mati mendadak (Offline).
              </li>
            </ul>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <h4 className="text-[13px] font-semibold text-ink mb-2">Contoh Payload JSON:</h4>
            <pre className="text-[11px] font-mono text-ink bg-surface p-2.5 rounded border border-line overflow-x-auto">
{`{
  "device_id": "BANYUWENING-01",
  "ts": "2026-11-12T08:30:00Z",
  "seq": 18452,
  "ph": 7.12,
  "temperature_c": 28.4,
  "tds_ppm": 345,
  "turbidity_ntu": 43.0,
  "water_level": "NORMAL",
  "aerator_on": true,
  "mode": "AUTO"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Bagian 3: Machine Learning Random Forest */}
      <section id="ml" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <FileCode2 className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            3. Model Prediktif Machine Learning (Random Forest Classifier)
          </h2>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Algoritma Machine Learning yang digunakan adalah <strong>Random Forest (Scikit-learn)</strong>.
          Model ini bertugas memprediksi risiko perburukan kualitas air kolam <strong>1–3 jam ke depan</strong>
          sebelum ikan mengalami stres atau kematian massal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div className="p-4 bg-surface-2 rounded border border-line">
            <div className="font-semibold text-ink mb-1">Rekayasa Fitur (Aquaculture Features)</div>
            <p className="text-[12px] text-muted">
              Model mengevaluasi deviasi pH ideal (7.2), deviasi suhu ideal (28.5°C), rasio TDS,
              dan Water Stress Index multivariat.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded border border-line">
            <div className="font-semibold text-ink mb-1">Klasifikasi 3 Kelas Risiko</div>
            <p className="text-[12px] text-muted">
              Output berupa probabilitas multikelas: <strong>AMAN</strong> (kondisi stabil),
              <strong>WASPADA</strong> (tren mendekati batas kritis), dan <strong>BAHAYA</strong>
              (ancaman kematian massal).
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded border border-line">
            <div className="font-semibold text-ink mb-1">Akurasi & Target Evaluasi</div>
            <p className="text-[12px] text-muted">
              Skor evaluasi pada data validasi kolam: <strong>F1-Score 1.00</strong>, <strong>Precision 1.00</strong>,
              dan <strong>Recall 1.00</strong> pada dataset bootstrap kalibrasi akuakultur.
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 4: Failsafe Lokal */}
      <section id="failsafe" className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <h2 className="text-[18px] font-semibold text-ink">
            4. Aturan Failsafe Lokal ESP32 (PRD F-08 & F-08a)
          </h2>
        </div>

        <div className="p-4 bg-aman/10 border border-aman/20 rounded-[6px] flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-aman shrink-0 mt-0.5" />
          <div className="text-[13px]">
            <h4 className="font-semibold text-ink mb-1">Prioritas Tertinggi: Keselamatan Fisik Ikan</h4>
            <p className="text-muted leading-relaxed">
              Mikrokontroler ESP32 memprogram aturan deterministik lokal di dalam memori firmware flash.
              Bahkan jika koneksi internet WiFi, cloud broker, atau server backend mengalami gangguan,
              ESP32 <strong>secara otonom menyalakan relay aerator</strong> jika:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 font-medium text-ink">
              <li>Nilai pH drop &lt; 6.00 atau melonjak &gt; 8.80</li>
              <li>Suhu air melampaui &gt; 33.0 °C</li>
              <li>Pelampung level air terpicu SURUT (Float Switch aktif)</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-waspada/10 border border-waspada/20 rounded-[6px] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-waspada shrink-0 mt-0.5" />
          <div className="text-[13px]">
            <h4 className="font-semibold text-ink mb-1">Aturan Penolakan Perintah Cloud (Override Protection)</h4>
            <p className="text-muted leading-relaxed">
              Jika mikrokontroler lokal sedang memicu status BAHAYA (Failsafe ON), segala perintah OFF dari
              dashboard web atau operator dari jauh <strong>akan otomatis ditolak</strong> sampai kondisi
              fisik parameter air kembali ke ambang batas normal. Hal ini mencegah human error yang dapat
              mematikan pasokan oksigen lele saat darurat.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Proyek */}
      <div className="p-4 bg-surface border border-line rounded text-[13px] text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          Proyek Tugas Pemrograman Web Lanjutan — <strong>Institut Teknologi dan Bisnis PalComTech</strong>
        </div>
        <div>
          Tim Pengembang: Gofran Muttaqi Likhan (Super Admin), M. Ilham Nandari, Monika Lisbet Lase
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
