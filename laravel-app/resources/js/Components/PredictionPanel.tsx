import { TriangleAlert, CircleCheck, OctagonX, Info } from "lucide-react";
import type { PredictionResult } from "../Types";

interface PredictionPanelProps {
  prediction: PredictionResult | null;
  isDetailed?: boolean;
}

export function PredictionPanel({ prediction, isDetailed = false }: PredictionPanelProps) {
  if (!prediction) {
    return (
      <div className="bg-surface border border-line rounded-[6px] p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[12px] leading-[16px] font-semibold tracking-[0.08em] uppercase text-muted">
            Prediksi Risiko Machine Learning
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-2 text-muted border border-line">
            Random Forest (v1.0)
          </span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-muted flex-shrink-0" />
          <span className="text-[16px] font-semibold text-ink">
            Status Standby · Menunggu Telemetri Sensor
          </span>
        </div>
        <p className="text-[13px] text-muted leading-relaxed mb-4">
          Model klasifikasi Machine Learning akan otomatis mengevaluasi risiko kualitas air kolam 1–3 jam ke depan segera setelah Node ESP32 mengirimkan data telemetri pertama.
        </p>
        <div className="flex items-start gap-1.5 text-[11px] leading-[15px] text-muted pt-3 border-t border-line/50">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Prediksi probabilistik Machine Learning. Keputusan operasional darurat tetap diprioritaskan oleh aturan deterministik keselamatan lokal ESP32.
          </span>
        </div>
      </div>
    );
  }

  const riskColor =
    prediction.risk === "AMAN"
      ? "text-aman"
      : prediction.risk === "WASPADA"
      ? "text-waspada"
      : "text-bahaya";

  const RiskIcon =
    prediction.risk === "AMAN"
      ? CircleCheck
      : prediction.risk === "WASPADA"
      ? TriangleAlert
      : OctagonX;

  const pctAman = Math.round(prediction.p_aman * 100);
  const pctWaspada = Math.round(prediction.p_waspada * 100);
  const pctBahaya = Math.round(prediction.p_bahaya * 100);

  return (
    <div className="bg-surface border border-line rounded-[6px] p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[12px] leading-[16px] font-semibold tracking-[0.08em] uppercase text-muted">
          Perkiraan 1–3 Jam ke Depan
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-2 text-muted border border-line">
          Random Forest (v1.0)
        </span>
      </div>

      {/* Primary Risk Status */}
      <div className="flex items-center gap-2 mb-4">
        <RiskIcon className={`w-5 h-5 ${riskColor} flex-shrink-0`} strokeWidth={2} />
        <span className={`text-[18px] md:text-[20px] font-semibold ${riskColor}`}>
          {prediction.risk === "AMAN"
            ? "Aman"
            : prediction.risk === "WASPADA"
            ? "Waspada"
            : "Bahaya"}
        </span>
      </div>

      {/* Horizontal Probability Bars */}
      <div className="space-y-2.5 mb-4 text-[13px]">
        {/* Aman */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-muted font-medium">Aman</span>
            <span className="font-semibold tnum text-ink">{pctAman}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-aman transition-all duration-300"
              style={{ width: `${pctAman}%` }}
            />
          </div>
        </div>

        {/* Waspada */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-muted font-medium">Waspada</span>
            <span className="font-semibold tnum text-ink">{pctWaspada}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-waspada transition-all duration-300"
              style={{ width: `${pctWaspada}%` }}
            />
          </div>
        </div>

        {/* Bahaya */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-muted font-medium">Bahaya</span>
            <span className="font-semibold tnum text-ink">{pctBahaya}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-bahaya transition-all duration-300"
              style={{ width: `${pctBahaya}%` }}
            />
          </div>
        </div>
      </div>

      {/* Triggering Factors / Action recommendation */}
      {prediction.triggers && prediction.triggers.length > 0 && (
        <div className="mb-4 pt-3 border-t border-line text-[12px]">
          <span className="font-medium text-muted block mb-1">Pemicu Proyeksi:</span>
          <div className="flex flex-wrap gap-1.5">
            {prediction.triggers.map((trigger, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-2 text-ink border border-line"
              >
                {trigger}
              </span>
            ))}
          </div>
        </div>
      )}

      {prediction.recommended_action && (
        <div className="mb-4 p-3 bg-surface-2 rounded border border-line text-[12px] text-ink leading-relaxed">
          <strong>Rekomendasi Tindakan:</strong>
          <p className="mt-1 text-muted">{prediction.recommended_action}</p>
        </div>
      )}

      {/* Detailed Technical Specs if Requested */}
      {isDetailed && (
        <div className="pt-3 border-t border-line text-[12px] text-muted space-y-1">
          <div>Algoritma: <strong>Scikit-learn Random Forest (100 Trees)</strong></div>
          <div>Horizon Waktu: <strong>1–3 jam ke depan</strong></div>
          <div>Metode: <strong>Feature engineering (deviasi, rasio TDS & stress index)</strong></div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-1.5 text-[11px] leading-[15px] text-muted pt-3 border-t border-line/50">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Prediksi probabilistik Machine Learning. Keputusan operasional darurat tetap diprioritaskan oleh aturan deterministik keselamatan lokal ESP32.
        </span>
      </div>
    </div>
  );
}
