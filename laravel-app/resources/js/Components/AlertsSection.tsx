import { useState } from "react";
import {
  TriangleAlert,
  OctagonX,
  Info,
  CheckCircle2,
  Send,
  Check,
  Clock,
} from "lucide-react";
import type { AlertItem } from "../Types";
import { formatRelativeTime } from "../lib/formatters";

interface AlertsSectionProps {
  initialAlerts: AlertItem[];
  currentUserName?: string;
  canAcknowledge?: boolean;
}

type FilterChip = "ALL" | "UNACK" | "BAHAYA" | "WASPADA";

export function AlertsSection({
  initialAlerts,
  currentUserName = "Ilham (Operator)",
  canAcknowledge = true,
}: AlertsSectionProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [filter, setFilter] = useState<FilterChip>("ALL");

  const handleAcknowledge = (id: number) => {
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            acknowledged_by: currentUserName,
            acknowledged_at: new Date().toISOString(),
          };
        }
        return a;
      })
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "UNACK") return !a.acknowledged_by;
    if (filter === "BAHAYA") return a.level === "BAHAYA";
    if (filter === "WASPADA") return a.level === "WASPADA";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "ALL" as FilterChip, label: "Semua" },
          { key: "UNACK" as FilterChip, label: "Belum Ditangani" },
          { key: "BAHAYA" as FilterChip, label: "Bahaya" },
          { key: "WASPADA" as FilterChip, label: "Waspada" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-[6px] text-[13px] font-semibold border transition-all ${
              filter === f.key
                ? "bg-brand text-brand-ink border-brand"
                : "bg-surface text-muted border-line hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-surface border border-line rounded-[6px] p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-aman mx-auto mb-2 opacity-80" />
          <h4 className="text-[16px] font-semibold text-ink mb-1">
            Belum ada peringatan
          </h4>
          <p className="text-[13px] text-muted max-w-sm mx-auto">
            Kolam berjalan normal. Seluruh sensor pH, suhu, TDS, dan kekeruhan berada
            dalam rentang ideal.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((item) => {
            const isBahaya = item.level === "BAHAYA";
            const isWaspada = item.level === "WASPADA";
            const isAcked = !!item.acknowledged_by;

            const Icon = isBahaya ? OctagonX : isWaspada ? TriangleAlert : Info;

            return (
              <div
                key={item.id}
                className={`bg-surface border border-line rounded-[6px] p-4 transition-opacity ${
                  isAcked ? "opacity-75" : "opacity-100"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Icon & Description */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isBahaya
                          ? "bg-bahaya-bg text-bahaya"
                          : isWaspada
                          ? "bg-waspada-bg text-waspada"
                          : "bg-surface-2 text-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[12px] font-bold px-2 py-0.5 rounded-[4px] ${
                            isBahaya
                              ? "bg-bahaya-bg text-bahaya-text"
                              : isWaspada
                              ? "bg-waspada-bg text-waspada-text"
                              : "bg-surface-2 text-muted"
                          }`}
                        >
                          {item.level}
                        </span>
                        <span className="text-[12px] text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.ts)}
                        </span>
                        <span className="text-[12px] text-muted">
                          • Parameter:{" "}
                          <span className="font-medium text-ink">
                            {item.param}
                          </span>
                        </span>
                      </div>

                      <p className="text-[14px] font-medium text-ink leading-[20px] mb-2">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
                        {item.value !== null && (
                          <span>
                            Nilai:{" "}
                            <strong className="text-ink tnum">
                              {new Intl.NumberFormat("id-ID", {
                                minimumFractionDigits: 1,
                              }).format(item.value)}
                            </strong>
                          </span>
                        )}
                        {item.telegram_sent && (
                          <span className="inline-flex items-center gap-1 text-[#229ED9]">
                            <Send className="w-3 h-3" />
                            Notifikasi Telegram terkirim
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Ack status / button */}
                  <div className="sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                    {isAcked ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-2 rounded text-[12px] text-muted">
                        <Check className="w-3.5 h-3.5 text-aman" />
                        <span>
                          Ditangani oleh {item.acknowledged_by}
                        </span>
                      </div>
                    ) : canAcknowledge ? (
                      <button
                        onClick={() => handleAcknowledge(item.id)}
                        className="h-9 px-3 border border-line rounded-[6px] text-[13px] font-semibold text-ink hover:bg-surface-2 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-muted" />
                        <span>Tandai sudah ditangani</span>
                      </button>
                    ) : (
                      <span className="text-[12px] text-muted italic">
                        Menunggu operator
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
