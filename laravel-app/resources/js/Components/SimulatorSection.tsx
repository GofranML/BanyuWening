import { useState, useId } from "react";
import { Fan, CheckCircle2, TriangleAlert, OctagonX, RotateCcw } from "lucide-react";

export function SimulatorSection() {
  const [ph, setPh] = useState<number>(7.2);
  const [temp, setTemp] = useState<number>(28.5);
  const [tds, setTds] = useState<number>(360);
  const phId = useId();
  const tempId = useId();
  const tdsId = useId();

  // Evaluate rules
  const isPhCritical = ph < 6.0 || ph > 8.8;
  const isPhWarning = !isPhCritical && (ph < 6.5 || ph > 8.5);

  const isTempCritical = temp > 33.0 || temp < 22.0;
  const isTempWarning = !isTempCritical && (temp > 32.0 || temp < 26.0);

  const isTdsCritical = tds > 800;
  const isTdsWarning = !isTdsCritical && tds > 600;

  const isCritical = isPhCritical || isTempCritical || isTdsCritical;
  const isWarning = !isCritical && (isPhWarning || isTempWarning || isTdsWarning);

  // Aerator turns ON automatically if critical or warning
  const aeratorActive = isCritical || isWarning;

  const getExplanation = () => {
    if (isCritical) {
      if (isPhCritical) {
        return `Aturan F-08: pH ${ph.toFixed(1).replace(".", ",")} berada di luar batas aman (<6,0 atau >8,8). Relay aerator seketika ON (failsafe lokal).`;
      }
      if (isTempCritical) {
        return `Aturan F-08: Suhu ${temp.toFixed(1).replace(".", ",")} °C ekstrem (>33 °C atau <22 °C). Relay aerator dinyalakan untuk sirkulasi air.`;
      }
      return `Aturan PRD: TDS ${tds} ppm melebihi 800 ppm. Peringatan bahaya dikirim ke Telegram.`;
    }
    if (isWarning) {
      return "Kondisi mendekati batas toleransi. Sistem cloud bersiap menyalakan aerator pencegahan.";
    }
    return "Semua parameter dalam rentang ideal kolam lele (pH 6,5–8,5, Suhu 26–32 °C). Aerator mode hemat energi.";
  };

  const handleReset = () => {
    setPh(7.2);
    setTemp(28.5);
    setTds(360);
  };

  return (
    <section className="py-24 px-4 md:px-8 border-t border-line/40 bg-[#0c1c1a]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[#8CC2BA] block mb-2">
            Simulator Interaktif
          </span>
          <h2 className="font-display text-[28px] md:text-[38px] leading-[1.2] text-[#E8ECE9] mb-3">
            Uji Respon Failsafe Kolam
          </h2>
          <p className="text-[15px] leading-[24px] text-[#9DB0AB] max-w-xl mx-auto">
            Geser nilai sensor untuk melihat bagaimana aturan deterministik ESP32
            menentukan status air dan menyalakan aerator secara otomatis.
          </p>
        </div>

        {/* Interactive Box */}
        <div className="bg-[#142e2b] border border-[#234b46] rounded-[8px] p-6 md:p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Sliders */}
            <div className="space-y-6">
              {/* Slider pH */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor={phId} className="text-[14px] font-medium text-[#E8ECE9]">
                    Tingkat Keasaman (pH)
                  </label>
                  <span className="text-[16px] font-bold tnum text-[#8CC2BA]">
                    {ph.toFixed(1).replace(".", ",")}
                  </span>
                </div>
                <input
                  id={phId}
                  type="range"
                  min="5.0"
                  max="9.5"
                  step="0.1"
                  value={ph}
                  onChange={(e) => setPh(parseFloat(e.target.value))}
                  aria-label="Tingkat Keasaman pH"
                  className="w-full h-2 bg-[#1b3d39] rounded-lg appearance-none cursor-pointer accent-[#8CC2BA]"
                />
                <div className="flex justify-between text-[11px] text-[#6b8984] mt-1">
                  <span>5.0 (Sangat Asam)</span>
                  <span className="text-[#8CC2BA]">Ideal 6.5 - 8.5</span>
                  <span>9.5 (Basa)</span>
                </div>
              </div>

              {/* Slider Suhu */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor={tempId} className="text-[14px] font-medium text-[#E8ECE9]">
                    Suhu Air (°C)
                  </label>
                  <span className="text-[16px] font-bold tnum text-[#8CC2BA]">
                    {temp.toFixed(1).replace(".", ",")} °C
                  </span>
                </div>
                <input
                  id={tempId}
                  type="range"
                  min="20.0"
                  max="36.0"
                  step="0.5"
                  value={temp}
                  onChange={(e) => setTemp(parseFloat(e.target.value))}
                  aria-label="Suhu Air dalam Celsius"
                  className="w-full h-2 bg-[#1b3d39] rounded-lg appearance-none cursor-pointer accent-[#8CC2BA]"
                />
                <div className="flex justify-between text-[11px] text-[#6b8984] mt-1">
                  <span>20 °C (Dingin)</span>
                  <span className="text-[#8CC2BA]">Ideal 26 - 32 °C</span>
                  <span>36 °C (Panas)</span>
                </div>
              </div>

              {/* Slider TDS */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor={tdsId} className="text-[14px] font-medium text-[#E8ECE9]">
                    TDS — Zat Terlarut (ppm)
                  </label>
                  <span className="text-[16px] font-bold tnum text-[#8CC2BA]">
                    {tds} ppm
                  </span>
                </div>
                <input
                  id={tdsId}
                  type="range"
                  min="200"
                  max="900"
                  step="10"
                  value={tds}
                  onChange={(e) => setTds(parseInt(e.target.value))}
                  aria-label="TDS Zat Terlarut ppm"
                  className="w-full h-2 bg-[#1b3d39] rounded-lg appearance-none cursor-pointer accent-[#8CC2BA]"
                />
                <div className="flex justify-between text-[11px] text-[#6b8984] mt-1">
                  <span>200 ppm</span>
                  <span className="text-[#8CC2BA]">Ideal &lt; 400</span>
                  <span>900 ppm (Tinggi)</span>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-[13px] text-[#9DB0AB] hover:text-[#E8ECE9] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kembalikan ke Nilai Normal</span>
              </button>
            </div>

            {/* Right: Real-time Response Card */}
            <div className="bg-[#0e2220] border border-[#1f433f] rounded-[8px] p-6 text-center flex flex-col justify-between h-full">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#9DB0AB] block mb-2">
                  Status Respon Kolam
                </span>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[14px] font-bold mb-4">
                  {isCritical ? (
                    <span className="inline-flex items-center gap-1.5 bg-[#FF9C92]/15 text-[#FF9C92] px-3 py-1 rounded-full border border-[#FF9C92]/30">
                      <OctagonX className="w-4 h-4" />
                      KONDISI BAHAYA
                    </span>
                  ) : isWarning ? (
                    <span className="inline-flex items-center gap-1.5 bg-[#F2C46B]/15 text-[#F2C46B] px-3 py-1 rounded-full border border-[#F2C46B]/30">
                      <TriangleAlert className="w-4 h-4" />
                      WASPADA
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 bg-[#7FD3A0]/15 text-[#7FD3A0] px-3 py-1 rounded-full border border-[#7FD3A0]/30">
                      <CheckCircle2 className="w-4 h-4" />
                      KONDISI AMAN
                    </span>
                  )}
                </div>

                {/* Aerator Fan Graphic */}
                <div className="my-4 flex flex-col items-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      aeratorActive
                        ? "bg-[#8CC2BA]/20 text-[#8CC2BA] border border-[#8CC2BA]"
                        : "bg-[#183935] text-[#55645F] border border-[#254b46]"
                    }`}
                  >
                    <Fan
                      className={`w-8 h-8 ${aeratorActive ? "animate-spin" : ""}`}
                      style={{ animationDuration: "1.2s" }}
                    />
                  </div>
                  <span className="text-[13px] font-semibold text-[#E8ECE9] mt-2">
                    Relay Aerator:{" "}
                    <span className={aeratorActive ? "text-[#8CC2BA]" : "text-[#9DB0AB]"}>
                      {aeratorActive ? "MENYALA (ON)" : "MATI (OFF)"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Explanation Text */}
              <div className="p-3 bg-[#132c29] border border-[#214742] rounded-[6px] text-[12px] leading-[18px] text-[#9DB0AB] text-left mt-2">
                {getExplanation()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
