"use client";

import {
  Wrench,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  Thermometer,
  Zap,
  Activity,
  Flame,
} from "lucide-react";

export function OperatorTutorial() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[12px] font-semibold mb-2">
          <Wrench className="w-3.5 h-3.5" />
          <span>Panduan Teknis & SOP Lapangan</span>
        </div>
        <h1 className="text-[24px] md:text-[28px] font-display text-ink leading-tight">
          Tutorial Penggunaan Alat & Cara Membaca Data
        </h1>
        <p className="text-[13px] text-muted mt-1 max-w-3xl">
          Instruksi kerja resmi untuk operator kolam dalam mengoperasikan node sensor ESP32,
          merawat probe sensor, dan membaca peringatan kualitas air di kolam.
        </p>
      </div>

      {/* Bagian 1: SOP Rutin Harian */}
      <section className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Activity className="w-5 h-5 text-brand" />
          <h2 className="text-[17px] font-semibold text-ink">
            1. Prosedur Operasional Standar (SOP) Harian Operator
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <div className="font-semibold text-ink flex items-center gap-1.5 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-brand text-brand-ink text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <span>Pemeriksaan Pagi (05.30 – 06.30 WIB)</span>
            </div>
            <p className="text-muted leading-relaxed">
              Cek nilai pH dan status aerator di dashboard. Jam subuh adalah waktu paling kritis
              karena respirasi alga semalaman menyerap oksigen dan memicu penurunan pH. Pastikan
              aerator otomatis bekerja bila pH mendekati batas 6.5.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <div className="font-semibold text-ink flex items-center gap-1.5 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-brand text-brand-ink text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <span>Pemeriksaan Siang (12.00 – 13.30 WIB)</span>
            </div>
            <p className="text-muted leading-relaxed">
              Pantau kenaikan suhu air akibat terik matahari. Suhu di atas 31°C menurunkan kelarutan
              oksigen secara drastis. Jika prediksi risiko menunjukkan <em>WASPADA</em>, buka kran air
              masuk perlahan dan nyalakan aerator 30 menit.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <div className="font-semibold text-ink flex items-center gap-1.5 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-brand text-brand-ink text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <span>Pemeriksaan Sore (16.30 – 17.30 WIB)</span>
            </div>
            <p className="text-muted leading-relaxed">
              Periksa nilai Kekeruhan (Turbidity) dan TDS 30 menit setelah pemberian pakan sore. Jika
              kekeruhan melonjak tajam &gt; 80 NTU, kurangi dosis pakan berikutnya untuk mencegah
              penumpukan amonia beracun di dasar kolam.
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 2: Kalibrasi & Perawatan Sensor */}
      <section className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Droplets className="w-5 h-5 text-brand" />
          <h2 className="text-[17px] font-semibold text-ink">
            2. Panduan Kalibrasi & Perawatan Probe Sensor
          </h2>
        </div>

        <div className="space-y-4 text-[13px]">
          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <h4 className="font-semibold text-ink mb-1.5 flex items-center gap-2">
              <span className="text-brand font-bold">●</span>
              <span>Kalibrasi Sensor pH (Setiap 2 Minggu Sekali)</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-muted pl-1">
              <li>Angkat probe pH dari air kolam dan bilas dengan air suling/aquades bersih.</li>
              <li>Celupkan ujung kaca bohlam probe ke dalam larutan kalibrasi standar <strong>pH 6.86</strong>.</li>
              <li>Tunggu 60 detik hingga pembacaan di LCD stabil pada 6.86 (atur potensiometer modul jika ada selisih).</li>
              <li>Bilas kembali dengan aquades, lalu celupkan ke larutan asam <strong>pH 4.01</strong> untuk memvalidasi kemiringan respon (*slope*).</li>
              <li>Pastikan spons pelindung probe tidak dibiarkan kering saat disimpan.</li>
            </ol>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line">
            <h4 className="font-semibold text-ink mb-1.5 flex items-center gap-2">
              <span className="text-brand font-bold">●</span>
              <span>Pembersihan Probe Kekeruhan & TDS (Seminggu Sekali)</span>
            </h4>
            <p className="text-muted leading-relaxed">
              Sensor kekeruhan optik menggunakan transmisi cahaya inframerah. Bila sensor tertutup
              lapisan lumut tipis, sensor akan salah membaca air sebagai air keruh pekat. Usap ujung
              kaca optik sensor menggunakan lap mikrofiber basah berbusa lembut, jangan gunakan sikat
              kawat yang dapat menggores kaca prisma optik.
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 3: Pengoperasian Aerator */}
      <section className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <Zap className="w-5 h-5 text-brand" />
          <h2 className="text-[17px] font-semibold text-ink">
            3. Panduan Pengoperasian Aerator Manual & Aturan Mesin
          </h2>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Sebagai operator, Anda dapat mengaktifkan aerator secara manual melalui menu <strong>Kontrol Aerator</strong>.
          Namun perhatikan ketentuan operasional berikut:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <div className="p-4 bg-aman/10 border border-aman/20 rounded-[6px]">
            <h4 className="font-semibold text-ink mb-1">Pilihan Durasi Timer (Auto-Off):</h4>
            <p className="text-muted mb-2">
              Gunakan durasi sesuai kebutuhan agar motor aerator DC 12V tidak terbakar akibat lupa dimatikan:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink font-medium">
              <li><strong>15 Menit</strong>: Penambahan aerasi cepat pasca pemberian pakan.</li>
              <li><strong>30 Menit</strong>: Penurunan stres panas saat terik siang hari.</li>
              <li><strong>1 Jam / 2 Jam</strong>: Pemulihan darurat kondisi drop pH dini hari.</li>
            </ul>
          </div>

          <div className="p-4 bg-waspada/10 border border-waspada/20 rounded-[6px]">
            <h4 className="font-semibold text-ink mb-1">Perlindungan Dinamo Motor:</h4>
            <p className="text-muted leading-relaxed">
              Jika aerator sudah menyala kontinu selama 2 jam, berikan jeda istirahat dinamo selama 15–20 menit
              (kecuali jika kondisi air berada pada status <em>BAHAYA</em> di mana aerator wajib hidup terus
              demi menyelamatkan komoditas ikan lele).
            </p>
          </div>
        </div>
      </section>

      {/* Bagian 4: Cara Membaca Kode Peringatan */}
      <section className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <AlertTriangle className="w-5 h-5 text-brand" />
          <h2 className="text-[17px] font-semibold text-ink">
            4. Cara Membaca Status Peringatan & Tindakan Cepat Darurat
          </h2>
        </div>

        <div className="overflow-x-auto text-[13px]">
          <table className="w-full text-left border border-line rounded">
            <thead className="bg-surface-2 text-ink font-semibold">
              <tr>
                <th className="p-3 border-b border-line">Status</th>
                <th className="p-3 border-b border-line">Arti Kondisi Air</th>
                <th className="p-3 border-b border-line">Tindakan Lapangan yang Harus Diambil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-muted">
              <tr>
                <td className="p-3 font-semibold text-aman">✓ AMAN</td>
                <td className="p-3">Semua parameter berada pada rentang ideal SNI budidaya.</td>
                <td className="p-3">Tidak perlu tindakan khusus. Lanjutkan jadwal pemberian pakan normal.</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-waspada">⚠ WASPADA</td>
                <td className="p-3">Ada kecenderungan parameter mendekati batas (misal pH 6.30 atau suhu 31.8°C).</td>
                <td className="p-3">
                  Aktifkan aerator selama 30 menit. Cek apakah ada pakan mengendap atau saluran masuk tersumbat.
                  Konfirmasi peringatan di dashboard.
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-bahaya">⨯ BAHAYA</td>
                <td className="p-3">Kondisi kritis (pH &lt; 6.00, suhu &gt; 33°C, atau float switch surut).</td>
                <td className="p-3">
                  <strong>SEGERA KE KOLAM!</strong> Aerator akan menyala otomatis lewat failsafe. Taburkan kapur
                  dolomit bertahap (bila air asam), buka kran sirkulasi air baru, dan jangan berikan pakan sampai
                  air stabil.
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-muted">⚡ DATA BASI / OFFLINE</td>
                <td className="p-3">Tidak ada data masuk lebih dari 2 menit / koneksi WiFi kolam putus.</td>
                <td className="p-3">
                  Cek catu daya adaptor 12V di kotak panel kolam. Periksa apakah lampu indikator LED ESP32 menyala
                  biru dan sinyal router WiFi kolam aktif.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
