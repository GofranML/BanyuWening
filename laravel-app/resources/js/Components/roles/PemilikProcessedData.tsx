"use client";

import {
  Sparkles,
  CheckCircle2,
  Fish,
  Zap,
  Info,
} from "lucide-react";
import type { AeratorState, PredictionResult, SensorReading } from "@/Types";

interface PemilikProcessedDataProps {
  currentReading?: SensorReading | null;
  prediction?: PredictionResult | null;
  aeratorState?: AeratorState;
  scopeLabel?: string;
}

export function PemilikProcessedData({
  currentReading,
  prediction,
  aeratorState,
  scopeLabel,
}: PemilikProcessedDataProps) {
  const phVal = currentReading?.ph ?? null;
  const tempVal = currentReading?.temperature_c ?? null;
  const tdsVal = currentReading?.tds_ppm ?? null;
  const turbVal = currentReading?.turbidity_ntu ?? null;

  const probAmanPct = prediction ? Math.round(prediction.p_aman * 100) : 94;
  const wqiScore = currentReading
    ? Math.max(40, Math.min(99, Math.round(probAmanPct * 0.96 + (currentReading.water_level === "NORMAL" ? 2 : -15))))
    : 94;

  const wqiBadge =
    wqiScore >= 80
      ? { text: "Kondisi Sangat Prima", cls: "bg-aman/15 text-aman-text" }
      : wqiScore >= 60
      ? { text: "Perlu Pemantauan", cls: "bg-waspada/15 text-waspada-text" }
      : { text: "Perhatian Kritis", cls: "bg-bahaya/15 text-bahaya-text" };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/20 text-[12px] font-semibold mb-2">
          <Fish className="w-3.5 h-3.5 shrink-0" />
          <span>Laporan Eksekutif Pemilik Kolam {scopeLabel ? `· ${scopeLabel}` : "(Data Terproses)"}</span>
        </div>
        <h1 className="text-[22px] sm:text-[24px] md:text-[28px] font-display text-ink leading-tight">
          Ringkasan Kesehatan &amp; Produktivitas Kolam
        </h1>
        <p className="text-[13px] text-muted mt-1 max-w-3xl">
          Laporan cerdas yang telah diolah dari sensor kolam menjadi informasi praktis,
          mudah dipahami, dan berorientasi pada keberhasilan panen ikan Anda.
        </p>
      </div>

      {/* 1. Kartu Skor Kesehatan Kolam (Water Quality Index) */}
      <div className="p-4 sm:p-6 bg-surface border border-line rounded-[6px] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">
              Indeks Kualitas Air Keseluruhan (WQI)
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-[44px] sm:text-[48px] md:text-[56px] font-bold font-display text-aman leading-none tnum">
                {wqiScore}
              </span>
              <span className="text-[20px] font-semibold text-muted">/ 100</span>
              <span className={`px-3 py-1 rounded-full font-bold text-[13px] ${wqiBadge.cls}`}>
                {wqiBadge.text}
              </span>
            </div>
            <p className="text-[14px] text-ink leading-relaxed max-w-xl">
              Air kolam berada dalam performa biologis {wqiScore >= 80 ? "terbaik" : "terpantau aktif"}. Nafsu makan ikan diperkirakan{" "}
              {wqiScore >= 80 ? "tinggi dan risiko kematian mendadak berada pada tingkat terendah." : "memerlukan pemantauan berkala operator."}
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line w-full lg:w-[360px] shrink-0 divide-y divide-line/60 text-[12.5px]">
            <div className="flex items-center justify-between gap-4 py-2 first:pt-0">
              <span className="text-muted">Status Risiko Prediktif</span>
              <span className="text-aman-text font-bold text-right whitespace-nowrap">
                {probAmanPct}% {prediction?.risk || "AMAN"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-muted">Kecukupan Oksigen</span>
              <span className="text-ink font-semibold text-right whitespace-nowrap">
                {aeratorState?.isOn ? "Aerasi Aktif" : "Tercukupi Penuh"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-muted">Kebersihan Kolam</span>
              <span className="text-ink font-semibold text-right whitespace-nowrap">
                {tdsVal !== null ? `TDS ${tdsVal} ppm` : "Ideal (TDS 345 ppm)"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-2 last:pb-0">
              <span className="text-muted">Durasi Aerator</span>
              <span className="text-ink font-semibold text-right whitespace-nowrap">
                {aeratorState?.dailyDuration || "Standby (Operator)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Diagnosis Bahasa Manusiawi (Executive Summary) */}
      <section className="bg-surface border border-line rounded-[6px] p-4 sm:p-6 space-y-4">
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
              Tingkat keasaman air berada di angka{" "}
              <strong className="tnum">{phVal !== null ? phVal.toFixed(2).replace(".", ",") : "7,12"}</strong>. Kulit dan insang ikan lele terlindungi dari iritasi racun amonia.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 className="w-4 h-4 text-aman" />
              <span>Suhu Air Nyaman</span>
            </div>
            <p className="text-muted leading-relaxed">
              Suhu air rata-rata{" "}
              <strong className="tnum">{tempVal !== null ? `${tempVal.toFixed(1).replace(".", ",")} °C` : "28,4 °C"}</strong>. Ini mendukung metabolisme pencernaan lele agar bobot panen optimal.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 className="w-4 h-4 text-aman" />
              <span>Endapan Pakan Terkontrol</span>
            </div>
            <p className="text-muted leading-relaxed">
              Kekeruhan di angka{" "}
              <strong className="tnum">{turbVal !== null ? `${turbVal.toFixed(1).replace(".", ",")} NTU` : "43 NTU"}</strong> menandakan air sehat tanpa pembusukan pakan berlebih di dasar kolam.
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
