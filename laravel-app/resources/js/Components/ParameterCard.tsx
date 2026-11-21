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
    <div className="bg-surface border border-line rounded-[6px] p-3.5 sm:p-4 flex flex-col justify-between h-full overflow-hidden">
      <div className="min-w-0">
        <div className="text-[12px] sm:text-[13px] leading-[17px] font-medium text-muted mb-1 truncate" title={label}>
          {label}
        </div>

        {isNumberValue ? (
          <>
            <div className="flex items-baseline gap-1 sm:gap-1.5 mb-2">
              <span className="text-[26px] sm:text-[34px] md:text-[40px] leading-[1.1] font-semibold tnum text-ink">
                {new Intl.NumberFormat("id-ID", {
                  minimumFractionDigits: label === "pH" ? 2 : label === "Kekeruhan" ? 1 : 0,
                  maximumFractionDigits: label === "pH" ? 2 : label === "Kekeruhan" ? 1 : 0,
                }).format(value)}
              </span>
              <span className="text-[13px] sm:text-[15px] leading-[20px] font-medium text-muted">
                {unit}
              </span>
            </div>

            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <StatusBadge level={badgeLevel}>{statusLabel}</StatusBadge>
            </div>
          </>
        ) : (
          <div className="py-2 sm:py-2.5">
            <span className="text-[26px] sm:text-[34px] md:text-[40px] leading-[1.1] font-semibold text-muted">-</span>
            <div className="text-[11px] sm:text-[12px] text-muted mt-1">Sensor belum terhubung</div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
        <span className="text-[10.5px] sm:text-[11px] text-muted font-medium truncate">
          <span className="sm:hidden">6 Jam</span>
          <span className="hidden sm:inline">Tren 6 Jam:</span>
        </span>
        <div className="shrink-0">
          <Sparkline
            data={sparklineData}
            status={status}
            width={80}
            height={24}
          />
        </div>
      </div>
    </div>
  );
}
