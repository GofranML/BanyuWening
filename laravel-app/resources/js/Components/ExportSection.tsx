import { useState } from "react";
import { Download, FileSpreadsheet, CheckCircle2, ShieldAlert } from "lucide-react";
import type { SensorReading, UserRole } from "@/Types";

interface ExportSectionProps {
  readings: SensorReading[];
  userRole: UserRole;
}

export function ExportSection({ readings, userRole }: ExportSectionProps) {
  const [rangeOption, setRangeOption] = useState<"24h" | "all">("24h");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const canExport = userRole === "ANALIS" || userRole === "ADMIN";

  const handleExportCSV = () => {
    if (!canExport) return;

    const exportRows = rangeOption === "24h" ? readings.slice(-288) : readings;

    // Header dengan UTF-8 BOM dan pemisah titik-koma (Excel Indonesia locale)
    const header = [
      "Waktu (ISO)",
      "Waktu (WIB)",
      "ID Perangkat",
      "pH",
      "Suhu (C)",
      "TDS (ppm)",
      "Kekeruhan (NTU)",
      "Level Air",
      "Aerator",
      "Mode",
    ].join(";");

    const lines = exportRows.map((r) => {
      const date = new Date(r.ts);
      const wibStr = date.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "medium",
      });

      return [
        r.ts,
        `"${wibStr}"`,
        r.device_id,
        r.ph !== null ? String(r.ph).replace(".", ",") : "",
        r.temperature_c !== null ? String(r.temperature_c).replace(".", ",") : "",
        r.tds_ppm !== null ? String(r.tds_ppm) : "",
        r.turbidity_ntu !== null ? String(r.turbidity_ntu).replace(".", ",") : "",
        r.water_level,
        r.aerator_on ? "MENYALA" : "MATI",
        r.mode,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [header, ...lines].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `banyuwening_telemetri_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  if (!canExport) {
    return (
      <div className="bg-surface border border-line rounded-[6px] p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-waspada mx-auto mb-3 opacity-80" />
        <h4 className="text-[16px] font-semibold text-ink mb-1">
          Akses Terbatas
        </h4>
        <p className="text-[13px] text-muted max-w-md mx-auto">
          Fitur ekspor data telemetri mentah ke CSV dikhususkan untuk peran{" "}
          <strong>Analis Akuakultur</strong> dan <strong>Super Administrator</strong>.
          Gunakan tombol ganti peran di navigasi untuk menguji fitur ini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-[6px] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-[6px] bg-brand/10 text-brand flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-ink">
            Ekspor Data Historis Sensor
          </h3>
          <p className="text-[13px] text-muted">
            Unduh dataset telemetri kolam terpal dalam format CSV untuk analisis di
            Excel, Python, atau R.
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-lg mb-6">
        <div>
          <label className="text-[13px] font-medium text-muted block mb-2">
            Pilih Rentang Data
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRangeOption("24h")}
              className={`p-3 rounded-[6px] border text-left text-[13px] transition-all cursor-pointer ${
                rangeOption === "24h"
                  ? "border-brand bg-brand/10 text-brand font-semibold"
                  : "border-line bg-surface text-ink hover:bg-surface-2"
              }`}
            >
              <div className="font-semibold">24 Jam Terakhir</div>
              <div className="text-[12px] opacity-80">288 pembacaan (interval 5 menit)</div>
            </button>
            <button
              onClick={() => setRangeOption("all")}
              className={`p-3 rounded-[6px] border text-left text-[13px] transition-all cursor-pointer ${
                rangeOption === "all"
                  ? "border-brand bg-brand/10 text-brand font-semibold"
                  : "border-line bg-surface text-ink hover:bg-surface-2"
              }`}
            >
              <div className="font-semibold">Seluruh Data Tersimpan</div>
              <div className="text-[12px] opacity-80">{readings.length} pembacaan</div>
            </button>
          </div>
        </div>

        <div className="p-3 bg-surface-2/60 border border-line rounded-[6px] text-[12px] text-muted leading-[18px]">
          <strong>Catatan Format:</strong> CSV menggunakan encoding UTF-8 dengan BOM dan
          pemisah titik-koma (<code>;</code>) sehingga angka desimal berkoma langsung
          terbaca rapi di Microsoft Excel versi Indonesia tanpa error pemisahan kolom.
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleExportCSV}
          className="h-11 px-5 bg-brand text-brand-ink rounded-[6px] text-[14px] font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Unduh File CSV (.csv)</span>
        </button>

        {downloadSuccess && (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-aman font-medium">
            <CheckCircle2 className="w-4 h-4" />
            File berhasil diunduh
          </span>
        )}
      </div>
    </div>
  );
}
