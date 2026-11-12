import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, Power } from "lucide-react";

interface AeratorControlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: {
    isOn: boolean;
    mode: "AUTO" | "MANUAL" | "FAILSAFE";
    dailyDuration: string;
  };
  isWaterCritical: boolean;
  criticalReason?: string;
  onApplyControl: (action: "ON" | "OFF" | "AUTO", durationMin: number) => Promise<boolean>;
}

export function AeratorControlDialog({
  isOpen,
  onClose,
  currentState,
  isWaterCritical,
  criticalReason = "pH di luar batas aman",
  onApplyControl,
}: AeratorControlDialogProps) {
  const [selectedAction, setSelectedAction] = useState<"ON" | "OFF" | "AUTO">("ON");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedAction(currentState.isOn ? "OFF" : "ON");
      setStatusMessage(null);
      setLoading(false);
    }
  }, [isOpen, currentState.isOn]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Check Failsafe rule if user tries to turn off during critical water conditions
    if (selectedAction === "OFF" && isWaterCritical) {
      setStatusMessage({
        type: "error",
        text: `Aerator tidak bisa dimatikan sekarang karena ${criticalReason}. Aturan pengaman lokal di ESP32 menjaganya tetap aktif demi keselamatan ikan.`,
      });
      return;
    }

    setLoading(true);
    setStatusMessage({
      type: "info",
      text: "Menghubungkan ke broker MQTT dan menunggu konfirmasi perangkat…",
    });

    try {
      const ok = await onApplyControl(selectedAction, durationMin);
      if (ok) {
        const endTime = new Date(Date.now() + durationMin * 60000);
        const timeStr = endTime.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setStatusMessage({
          type: "success",
          text:
            selectedAction === "AUTO"
              ? "Perangkat dikembalikan ke mode Otomatis."
              : `Aerator ${selectedAction === "ON" ? "menyala" : "mati"} · otomatis kembali ke mode normal pukul ${timeStr} WIB.`,
        });
        setTimeout(() => {
          onClose();
        }, 1600);
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Perangkat tidak merespons dalam 15 detik. Periksa koneksi WiFi di kolam.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Memproses perintah…";
    if (selectedAction === "AUTO") return "Kembalikan ke mode otomatis";
    const durLabel =
      durationMin >= 60 ? `${durationMin / 60} jam` : `${durationMin} menit`;
    return `${selectedAction === "ON" ? "Nyalakan" : "Matikan"} aerator ${durLabel}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Modal Surface */}
      <div
        className="w-full sm:max-w-lg bg-surface border border-line rounded-t-[12px] sm:rounded-[8px] p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <h3 id="dialog-title" className="text-[16px] font-semibold text-ink">
                Kontrol Aerator Kolam
              </h3>
              <p className="text-[12px] text-muted">
                Status saat ini: {currentState.isOn ? "Menyala" : "Mati"} (
                {currentState.mode === "AUTO"
                  ? "Otomatis"
                  : currentState.mode === "MANUAL"
                  ? "Manual"
                  : "Pengaman perangkat"}
                )
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded text-muted hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Selection */}
        <div className="space-y-4">
          <div>
            <label className="text-[13px] font-medium text-muted block mb-2">
              Pilih Aksi Kendali
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAction("ON")}
                disabled={loading}
                className={`py-2.5 px-3 rounded-[6px] border text-[13px] font-semibold transition-all ${
                  selectedAction === "ON"
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-line bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                Nyalakan
              </button>
              <button
                type="button"
                onClick={() => setSelectedAction("OFF")}
                disabled={loading}
                className={`py-2.5 px-3 rounded-[6px] border text-[13px] font-semibold transition-all ${
                  selectedAction === "OFF"
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-line bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                Matikan
              </button>
              <button
                type="button"
                onClick={() => setSelectedAction("AUTO")}
                disabled={loading}
                className={`py-2.5 px-3 rounded-[6px] border text-[13px] font-semibold transition-all ${
                  selectedAction === "AUTO"
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-line bg-surface text-ink hover:bg-surface-2"
                }`}
              >
                Otomatis
              </button>
            </div>
          </div>

          {/* Duration selection (only for manual ON / OFF) */}
          {selectedAction !== "AUTO" && (
            <div>
              <label className="text-[13px] font-medium text-muted block mb-2">
                Durasi Kendali Manual (Otomatis kembali setelah waktu habis)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "15 m", val: 15 },
                  { label: "30 m", val: 30 },
                  { label: "1 jam", val: 60 },
                  { label: "2 jam", val: 120 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDurationMin(item.val)}
                    disabled={loading}
                    className={`py-2 px-2 text-center rounded-[6px] border text-[13px] font-medium tnum transition-all ${
                      durationMin === item.val
                        ? "border-brand bg-brand/10 text-brand font-semibold"
                        : "border-line bg-surface text-muted hover:bg-surface-2"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-[6px] text-[13px] leading-[19px] flex items-start gap-2.5 ${
                statusMessage.type === "error"
                  ? "bg-bahaya-bg text-bahaya-text border border-bahaya/30"
                  : statusMessage.type === "success"
                  ? "bg-aman-bg text-aman-text border border-aman/30"
                  : "bg-surface-2 text-muted border border-line"
              }`}
            >
              {statusMessage.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-bahaya flex-shrink-0 mt-0.5" />
              ) : statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-aman flex-shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-4 h-4 text-brand animate-spin flex-shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Failsafe Notice */}
          <div className="p-3 bg-surface-2/60 border border-line rounded-[6px] text-[12px] text-muted leading-[17px]">
            <p>
              <strong>Keamanan Perangkat:</strong> Perintah manual memiliki batas waktu
              (TTL). Bila koneksi terputus atau batas waktu habis, ESP32 akan kembali ke
              mode otomatis demi menjaga kesehatan kolam.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-11 px-4 border border-line rounded-[6px] text-[14px] font-medium text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="h-11 px-5 bg-brand text-brand-ink rounded-[6px] text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{getButtonText()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
