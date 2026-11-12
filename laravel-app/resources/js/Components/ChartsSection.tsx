import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Table, LineChart as ChartIcon } from "lucide-react";
import type { SensorReading } from "@/Types";

interface ChartsSectionProps {
  allReadings: SensorReading[];
}

type TimeRange = "6h" | "24h" | "7d";

export function ChartsSection({ allReadings }: ChartsSectionProps) {
  const [range, setRange] = useState<TimeRange>("24h");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  const safeReadings = allReadings || [];

  // Filter or aggregate readings according to range
  const filteredData = useMemo(() => {
    if (range === "6h") {
      return safeReadings.slice(-72);
    }
    if (range === "24h") {
      return safeReadings;
    }
    // For 7 days, generate or spread readings
    return safeReadings;
  }, [safeReadings, range]);

  // Format data points for charts
  const chartData = useMemo(() => {
    return filteredData.map((r) => {
      const date = new Date(r.ts);
      const timeStr = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        ts: r.ts,
        time: timeStr,
        ph: r.ph,
        temperature_c: r.temperature_c,
        tds_ppm: r.tds_ppm,
        turbidity_ntu: r.turbidity_ntu,
        aerator_on: r.aerator_on ? 1 : 0,
      };
    });
  }, [filteredData]);

  if (safeReadings.length === 0) {
    return (
      <div className="p-8 text-center bg-surface border border-line rounded-[8px] space-y-3">
        <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
          <ChartIcon className="w-6 h-6" />
        </div>
        <h3 className="text-[16px] font-semibold text-ink">Belum Ada Data Riwayat Sensor</h3>
        <p className="text-[13px] text-muted max-w-md mx-auto leading-relaxed">
          Grafik riwayat parameter (pH, Suhu, TDS, Kekeruhan) akan otomatis terisi dan diperbarui secara berkala setelah Node Sensor ESP32 terhubung dan mengirimkan data telemetri.
        </p>
      </div>
    );
  }

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface border border-line rounded-[6px] p-2.5 shadow-md text-[12px] leading-[17px]">
          <div className="font-semibold text-ink mb-1 tnum">
            {data.time} WIB
          </div>
          <div className="space-y-0.5 text-muted">
            <div>
              pH:{" "}
              <span className="font-semibold text-ink tnum">
                {data.ph !== null ? Number(data.ph).toFixed(2).replace(".", ",") : "—"}
              </span>
            </div>
            <div>
              Suhu:{" "}
              <span className="font-semibold text-ink tnum">
                {data.temperature_c !== null ? `${Number(data.temperature_c).toFixed(1).replace(".", ",")} °C` : "—"}
              </span>
            </div>
            <div>
              TDS:{" "}
              <span className="font-semibold text-ink tnum">
                {data.tds_ppm !== null ? `${data.tds_ppm} ppm` : "—"}
              </span>
            </div>
            <div>
              Kekeruhan:{" "}
              <span className="font-semibold text-ink tnum">
                {data.turbidity_ntu !== null ? `${Number(data.turbidity_ntu).toFixed(1).replace(".", ",")} NTU` : "—"}
              </span>
            </div>
            <div>
              Aerator:{" "}
              <span className="font-semibold text-brand">
                {data.aerator_on ? "Menyala" : "Mati"}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-line rounded-[6px] p-3">
        {/* Segmented Control */}
        <div className="inline-flex rounded-[6px] bg-surface-2 p-1 text-[13px] font-medium text-muted">
          <button
            onClick={() => setRange("6h")}
            className={`px-3 py-1 rounded-[4px] transition-all cursor-pointer ${
              range === "6h"
                ? "bg-surface text-ink font-semibold shadow-xs"
                : "hover:text-ink"
            }`}
          >
            6 Jam
          </button>
          <button
            onClick={() => setRange("24h")}
            className={`px-3 py-1 rounded-[4px] transition-all cursor-pointer ${
              range === "24h"
                ? "bg-surface text-ink font-semibold shadow-xs"
                : "hover:text-ink"
            }`}
          >
            24 Jam
          </button>
          <button
            onClick={() => setRange("7d")}
            className={`px-3 py-1 rounded-[4px] transition-all cursor-pointer ${
              range === "7d"
                ? "bg-surface text-ink font-semibold shadow-xs"
                : "hover:text-ink"
            }`}
          >
            7 Hari
          </button>
        </div>

        {/* View Mode Toggle (Chart vs Table for accessibility) */}
        <button
          onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line rounded-[6px] text-[13px] font-medium text-ink hover:bg-surface-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          {viewMode === "chart" ? (
            <>
              <Table className="w-4 h-4 text-muted" />
              <span>Lihat sebagai tabel</span>
            </>
          ) : (
            <>
              <ChartIcon className="w-4 h-4 text-muted" />
              <span>Lihat sebagai grafik</span>
            </>
          )}
        </button>
      </div>

      {viewMode === "table" ? (
        /* Accessible Table View */
        <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">
              Tabel Riwayat Pembacaan Sensor
            </h3>
            <span className="text-[12px] text-muted">
              {filteredData.length} pembacaan
            </span>
          </div>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead className="bg-surface-2 text-muted sticky top-0 font-semibold border-b border-line">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">pH</th>
                  <th className="py-2.5 px-4">Suhu (°C)</th>
                  <th className="py-2.5 px-4">TDS (ppm)</th>
                  <th className="py-2.5 px-4">Kekeruhan (NTU)</th>
                  <th className="py-2.5 px-4">Aerator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {filteredData.map((row) => {
                  const date = new Date(row.ts);
                  const time = date.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={row.id} className="hover:bg-surface-2/50">
                      <td className="py-2 px-4 tnum">{time} WIB</td>
                      <td className="py-2 px-4 tnum">
                        {row.ph !== null ? Number(row.ph).toFixed(2).replace(".", ",") : "—"}
                      </td>
                      <td className="py-2 px-4 tnum">
                        {row.temperature_c !== null
                          ? Number(row.temperature_c).toFixed(1).replace(".", ",")
                          : "—"}
                      </td>
                      <td className="py-2 px-4 tnum">
                        {row.tds_ppm !== null ? row.tds_ppm : "—"}
                      </td>
                      <td className="py-2 px-4 tnum">
                        {row.turbidity_ntu !== null
                          ? Number(row.turbidity_ntu).toFixed(1).replace(".", ",")
                          : "—"}
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                            row.aerator_on ? "bg-brand" : "bg-muted"
                          }`}
                        />
                        {row.aerator_on ? "Menyala" : "Mati"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Synchronized 4 Charts */
        <div className="space-y-5">
          {/* 1. Grafik pH */}
          <div className="bg-surface border border-line rounded-[6px] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-ink">pH Air</span>
              <span className="text-[12px] text-muted">Rentang ideal: 6,5 – 8,5</span>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="banyuwening-sync" margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis
                    width={48}
                    domain={[5.5, 9.2]}
                    tickCount={4}
                    stroke="var(--muted)"
                    fontSize={11}
                    tickFormatter={(v) => Number(v).toFixed(1).replace(".", ",")}
                  />
                  <Tooltip content={customTooltip} />
                  <ReferenceArea y1={6.5} y2={8.5} fill="var(--surface-2)" fillOpacity={0.7} />
                  <ReferenceLine y={6.0} stroke="var(--bahaya)" strokeDasharray="3 3" />
                  <ReferenceLine y={8.8} stroke="var(--bahaya)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="ph"
                    stroke="var(--brand)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Grafik Suhu */}
          <div className="bg-surface border border-line rounded-[6px] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-ink">Suhu Air (°C)</span>
              <span className="text-[12px] text-muted">Rentang ideal: 26 – 32 °C</span>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="banyuwening-sync" margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis
                    width={48}
                    domain={[22, 35]}
                    tickCount={4}
                    stroke="var(--muted)"
                    fontSize={11}
                    tickFormatter={(v) => `${v}°`}
                  />
                  <Tooltip content={customTooltip} />
                  <ReferenceArea y1={26} y2={32} fill="var(--surface-2)" fillOpacity={0.7} />
                  <ReferenceLine y={33} stroke="var(--bahaya)" strokeDasharray="3 3" />
                  <ReferenceLine y={22} stroke="var(--bahaya)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="temperature_c"
                    stroke="var(--brand)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Grafik TDS */}
          <div className="bg-surface border border-line rounded-[6px] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-ink">TDS — Zat Terlarut (ppm)</span>
              <span className="text-[12px] text-muted">Ideal: &lt; 400 ppm (kritis &gt; 800)</span>
            </div>
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="banyuwening-sync" margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis
                    width={48}
                    domain={[250, 850]}
                    tickCount={4}
                    stroke="var(--muted)"
                    fontSize={11}
                  />
                  <Tooltip content={customTooltip} />
                  <ReferenceArea y1={250} y2={400} fill="var(--surface-2)" fillOpacity={0.7} />
                  <ReferenceLine y={800} stroke="var(--bahaya)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="tds_ppm"
                    stroke="var(--brand)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Grafik Kekeruhan */}
          <div className="bg-surface border border-line rounded-[6px] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-ink">Kekeruhan Air (NTU)</span>
              <span className="text-[12px] text-muted">Ideal: &lt; 50 NTU (kritis &gt; 120)</span>
            </div>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} syncId="banyuwening-sync" margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                  <XAxis
                    dataKey="time"
                    stroke="var(--muted)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    width={48}
                    domain={[20, 130]}
                    tickCount={4}
                    stroke="var(--muted)"
                    fontSize={11}
                  />
                  <Tooltip content={customTooltip} />
                  <ReferenceArea y1={20} y2={50} fill="var(--surface-2)" fillOpacity={0.7} />
                  <ReferenceLine y={120} stroke="var(--bahaya)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="turbidity_ntu"
                    stroke="var(--brand)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
