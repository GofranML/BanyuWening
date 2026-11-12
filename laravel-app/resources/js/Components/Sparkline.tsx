import { useId } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  status?: "normal" | "waspada" | "bahaya";
}

export function Sparkline({
  data,
  width = 110,
  height = 28,
  color = "var(--brand)",
  status = "normal",
}: SparklineProps) {
  const gradientId = useId();

  if (!data || data.length < 2) return null;

  const paddingY = 3;
  const paddingX = 2;
  const usableHeight = height - paddingY * 2;
  const usableWidth = width - paddingX * 2;

  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const dataRange = Math.max(dataMax - dataMin, 0.05);

  const domainMin = dataMin - dataRange * 0.1;
  const domainMax = dataMax + dataRange * 0.1;
  const domainRange = domainMax - domainMin || 1;

  const getY = (val: number) => {
    const clamped = Math.max(domainMin, Math.min(domainMax, val));
    const ratio = (clamped - domainMin) / domainRange;
    return paddingY + usableHeight - ratio * usableHeight;
  };

  const getX = (i: number) => paddingX + (i / (data.length - 1)) * usableWidth;

  const points = data.map((val, i) => ({
    x: getX(i),
    y: getY(val),
  }));

  // Build smooth cubic bezier curve
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  const strokeColor =
    status === "bahaya"
      ? "var(--bahaya)"
      : status === "waspada"
      ? "var(--waspada)"
      : color;

  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible inline-block shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Area under curve */}
      <path
        d={`${pathD} L ${usableWidth + paddingX} ${height} L ${paddingX} ${height} Z`}
        fill={`url(#${gradientId})`}
      />

      {/* Line path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pulse current endpoint */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}
