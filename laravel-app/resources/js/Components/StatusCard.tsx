import { CircleCheck, TriangleAlert, OctagonX, WifiOff, Clock } from "lucide-react";
import type { RiskLevel } from "../Types";

interface StatusCardProps {
  level: RiskLevel | "offline" | "basi";
  title: string;
  subtitle: string;
  prediction?: {
    risk: RiskLevel;
    timeframe: string;
  };
  recommendations?: string[];
  lastUpdate?: string;
}

const icons = {
  AMAN: CircleCheck,
  WASPADA: TriangleAlert,
  BAHAYA: OctagonX,
  offline: WifiOff,
  basi: Clock,
};

export function StatusCard({
  level,
  title,
  subtitle,
  prediction,
  recommendations,
  lastUpdate,
}: StatusCardProps) {
  const Icon = icons[level];

  const bgClass =
    level === "AMAN" ? "bg-aman-bg" :
    level === "WASPADA" ? "bg-waspada-bg" :
    level === "BAHAYA" ? "bg-bahaya-bg" :
    level === "offline" ? "bg-offline-bg" :
    "bg-surface";

  const textClass =
    level === "AMAN" ? "text-aman-text" :
    level === "WASPADA" ? "text-waspada-text" :
    level === "BAHAYA" ? "text-bahaya-text" :
    level === "offline" ? "text-offline-text" :
    "text-muted";

  const iconClass =
    level === "AMAN" ? "text-aman" :
    level === "WASPADA" ? "text-waspada" :
    level === "BAHAYA" ? "text-bahaya" :
    level === "offline" ? "text-offline" :
    "text-muted";

  return (
    <div
      role="status"
      aria-live={level === "BAHAYA" ? "assertive" : "polite"}
      className={`rounded-[6px] border border-line p-6 md:p-8 transition-colors duration-200 ${bgClass}`}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="shrink-0 mt-1">
            <Icon className={`w-8 h-8 ${iconClass}`} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] md:text-[36px] font-display font-semibold tracking-tight text-ink leading-tight">
            {title}
          </h1>
          <p className={`text-[13px] md:text-[14px] mt-1 ${textClass}`}>
            {subtitle}
          </p>
        </div>
      </div>

      {prediction && (
        <div className={`mt-4 pt-4 border-t ${level === "BAHAYA" ? "border-bahaya/20" : level === "WASPADA" ? "border-waspada/20" : "border-aman/20"}`}>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted">Proyeksi Model Machine Learning:</span>
            <span className="font-semibold text-ink">
              Risiko {prediction.risk} dalam {prediction.timeframe}
            </span>
          </div>
        </div>
      )}

      {level === "BAHAYA" && recommendations && recommendations.length > 0 && (
        <div className="mt-4 p-3 bg-surface rounded border border-line text-[13px] space-y-1">
          <div className="font-semibold text-bahaya">Tindakan Cepat Lapangan:</div>
          <ul className="list-disc list-inside text-muted text-[12px] space-y-0.5">
            {recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
