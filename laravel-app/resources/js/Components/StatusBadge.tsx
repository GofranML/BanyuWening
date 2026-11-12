import React from "react";
import { CircleCheck, TriangleAlert, OctagonX, WifiOff, Clock, Info } from "lucide-react";

type BadgeLevel = "aman" | "waspada" | "bahaya" | "offline" | "basi" | "netral";

interface StatusBadgeProps {
  level: BadgeLevel;
  children: React.ReactNode;
}

const icons = {
  aman: CircleCheck,
  waspada: TriangleAlert,
  bahaya: OctagonX,
  offline: WifiOff,
  basi: Clock,
  netral: Info,
};

export function StatusBadge({ level, children }: StatusBadgeProps) {
  const Icon = icons[level] || Info;
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[13px] leading-[18px] font-semibold
        ${level === "aman" ? "bg-aman-bg text-aman-text" : ""}
        ${level === "waspada" ? "bg-waspada-bg text-waspada-text" : ""}
        ${level === "bahaya" ? "bg-bahaya-bg text-bahaya-text" : ""}
        ${level === "offline" ? "bg-offline-bg text-offline-text" : ""}
        ${level === "basi" ? "bg-surface-2 text-muted" : ""}
        ${level === "netral" ? "bg-surface-2 text-muted border border-line" : ""}`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
      {children}
    </span>
  );
}
