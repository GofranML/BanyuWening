"use client";

import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Clock,
  HeartPulse,
  Fish,
  Zap,
  Info,
} from "lucide-react";

export function PemilikProcessedData() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[12px] font-semibold mb-2">
          <Fish className="w-3.5 h-3.5" />
          <span>Laporan Eksekutif Pemilik Kolam (Data Terproses)</span>
        </div>
        <h1 className="text-[24px] md:text-[28px] font-display text-ink leading-tight">
          Ringkasan Kesehatan & Produktivitas Kolam
        </h1>
        <p className="text-[13px] text-muted mt-1 max-w-3xl">
          Laporan cerdas yang telah diolah dari sensor kolam menjadi informasi praktis,
          mudah dipahami, dan berorientasi pada keberhasilan panen ikan Anda.
        </p>
      </div>

      {/* 1. Kartu Skor Kesehatan Kolam (Water Quality Index) */}
      <div className="p-6 bg-surface border border-line rounded-[6px] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">
              Indeks Kualitas Air Keseluruhan (WQI)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-[48px] md:text-[56px] font-bold font-display text-aman leading-none tnum">
                94
              </span>
              <span className="text-[20px] font-semibold text-muted">/ 100</span>
              <span className="px-3 py-1 rounded-full bg-aman/15 text-aman font-bold text-[13px]">
                Kondisi Sangat Prima
              </span>
            </div>
            <p className="text-[14px] text-ink leading-relaxed max-w-xl">
              Air kolam berada dalam performa biologis terbaik. Nafsu makan ikan diperkirakan tinggi
              dan risiko kematian mendadak berada pada tingkat terendah.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line md:w-72 shrink-0 space-y-2 text-[12px]">
            <div className="flex items-center justify-between font-medium">
              <span className="text-muted">Status Risiko Prediktif:</span>
              <span className="text-aman font-bold">100% AMAN</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-muted">Kecukupan Oksigen:</span>
              <span className="text-ink font-semibold">Tercukupi Penuh</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-muted">Kebersihan Kolam:</span>
              <span className="text-ink font-semibold">Ideal (TDS 345 ppm)</span>
            </div>
            <div className="flex items-center justify-between font-medium">
              <span className="text-muted">Keaktifan Petugas Lapangan:</span>
              <span className="text-ink font-semibold">Standby (Operator)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Diagnosis Bahasa Manusiawi (Executive Summary) */}
      <section className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-line">
          <Sparkles className="w-5 h-5 text-brand" />
          <h2 className="text-[17px] font-semibold text-ink">
            Diagnosis Bahasa Manusiawi Hari Ini
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
          <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 className="w-4 h-4 text-aman" />
              <span>Kadar Keasaman (pH) Stabil</span>
            </div>
            <p className="text-muted leading-relaxed">
              Tingkat keasaman air berada di angka <strong>7,12</strong> (netral sempurna). Air tidak
              terlalu asam dan tidak pahit. Kulit dan insang ikan lele terlindungi dari iritasi racun amonia.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 className="w-4 h-4 text-aman" />
              <span>Suhu Air Nyaman</span>
            </div>
            <p className="text-muted leading-relaxed">
              Suhu air rata-rata <strong>28,4 °C</strong>. Ini adalah suhu tropis ideal yang mempercepat
              metabolisme pencernaan lele sehingga bobot panen naik lebih cepat.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 className="w-4 h-4 text-aman" />
              <span>Endapan Pakan Terkontrol</span>
            </div>
            <p className="text-muted leading-relaxed">
              Kekeruhan di angka <strong>43 NTU</strong> menandakan air kaya mikro-organisme pakan alami
              namun tidak berlumpur pekat. Tidak ada pembusukan pakan berlebih di dasar kolam.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Efisiensi Kerja Aerator & Konsumsi Energi */}
      <section className="bg-surface border border-line rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-line">
          <Zap className="w-5 h-5 text-brand" />
          <h2 className="text-[17px] font-semibold text-ink">
            Laporan Kinerja Aerator & Efisiensi Energi Kolam
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
            <h4 className="font-semibold text-ink">Otomasi Cerdas Hemat Daya</h4>
            <p className="text-muted leading-relaxed">
              Hari ini aerator hanya menyala selama <strong>3 jam 20 menit</strong> (terutama di jam 03.00 - 05.30
              pagi saat kadar oksigen alami turun). Sistem BanyuWening menghentikan aerator secara otomatis saat
              kualitas air kembali normal, menghindari pemborosan listrik 24 jam nonstop.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
            <h4 className="font-semibold text-ink">Keamanan Fisik Mandiri</h4>
            <p className="text-muted leading-relaxed">
              Seluruh kendali relay mesin di kolam dijaga oleh pengaman lokal mikrokontroler ESP32 dan operator
              lapangan. Sebagai pemilik, Anda terbebas dari kekhawatiran operasional karena sistem akan langsung
              memberitahu via Telegram jika terdeteksi ancaman darurat.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Rekomendasi Tindakan untuk Pemilik */}
      <section className="p-4 bg-surface border border-line rounded-[6px] flex items-start gap-3 text-[13px]">
        <Info className="w-5 h-5 text-brand shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-ink">Rekomendasi Manajemen Budidaya Minggu Ini</h4>
          <p className="text-muted leading-relaxed">
            Kondisi air yang sangat baik memungkinkan pemberian pakan maksimal (*ad libitum*) pada jadwal jam 09.00
            dan jam 16.00 WIB. Proyeksi pertumbuhan bobot biomassa ikan berjalan sesuai target jadwal panen.
          </p>
        </div>
      </section>
    </div>
  );
}
