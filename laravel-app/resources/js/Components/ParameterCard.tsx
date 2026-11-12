import { Sparkline } from "./Sparkline";
import { StatusBadge } from "./StatusBadge";

interface ParameterCardProps {
  label: string;
  value: number | string | null;
  unit: string;
  status: "normal" | "waspada" | "bahaya";
  statusLabel: string;
  sparklineData: number[];
}

export function ParameterCard({
  label,
  value,
  unit,
  status,
  statusLabel,
  sparklineData,
}: ParameterCardProps) {
  const badgeLevel = status === "normal" ? "aman" : status;
  const isNumberValue = typeof value === "number" && !isNaN(value);

  return (
    <div className="bg-surface border border-line rounded-[6px] p-4 flex flex-col justify-between h-full overflow-hidden transition-shadow hover:shadow-xs">
      <div>
        <div className="text-[13px] leading-[18px] font-medium text-muted mb-1">
          {label}
        </div>

        {isNumberValue ? (
          <>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-[34px] md:text-[40px] leading-[1.1] font-semibold tnum text-ink">
                {new Intl.NumberFormat("id-ID", {
                  minimumFractionDigits: label === "pH" ? 2 : label === "Kekeruhan" ? 1 : 0,
                  maximumFractionDigits: label === "pH" ? 2 : label === "Kekeruhan" ? 1 : 0,
                }).format(value)}
              </span>
              <span className="text-[15px] leading-[20px] font-medium text-muted">
                {unit}
              </span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <StatusBadge level={badgeLevel}>{statusLabel}</StatusBadge>
            </div>
          </>
        ) : (
          <div className="py-2.5">
            <span className="text-[34px] md:text-[40px] leading-[1.1] font-semibold text-muted">—</span>
            <div className="text-[12px] text-muted mt-1">Sensor belum terhubung</div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-line/60 flex items-center justify-between">
        <span className="text-[11px] text-muted font-medium">Tren 6 Jam:</span>
        <Sparkline
          data={sparklineData}
          status={status}
          width={110}
          height={28}
        />
      </div>
    </div>
  );
}
