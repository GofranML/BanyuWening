import type {
  AlertItem,
  DeviceInfo,
  PredictionResult,
  RealtimeConfig,
  RealtimeTransportMode,
  SensorReading,
} from "@/Types";

export interface RealtimeCallbacks {
  onModeChange?: (mode: RealtimeTransportMode, reason?: string) => void;
  onTelemetry?: (reading: SensorReading, device?: Partial<DeviceInfo>) => void;
  onPrediction?: (prediction: PredictionResult, alert?: AlertItem | null) => void;
  onAlertsRefresh?: (alerts: AlertItem[]) => void;
  onControlUpdate?: (payload: { aerator_on?: boolean; mode?: DeviceInfo["mode"] }) => void;
}

/**
 * Klien Realtime Hybrid BanyuWening:
 * 1. Mencoba koneksi WebSocket multi-kanal (telemetry, control, alerts, heartbeat) terlebih dahulu.
 * 2. Jika WebSocket gagal connect atau terputus, otomatis beralih ke protokol HTTP Fallback
 *    (GET /api/latest + GET /api/alerts/recent) sambil mencoba reconnect WebSocket di latar belakang.
 */
export class BanyuWeningRealtimeClient {
  private ws: WebSocket | null = null;
  private mode: RealtimeTransportMode = "CONNECTING";
  private destroyed = false;
  private connectTimeoutId: number | null = null;
  private pingIntervalId: number | null = null;
  private httpPollIntervalId: number | null = null;
  private reconnectTimerId: number | null = null;
  private reconnectAttempts = 0;

  constructor(
    private readonly config: RealtimeConfig,
    private readonly callbacks: RealtimeCallbacks
  ) {}

  public start(): void {
    this.destroyed = false;
    this.connectWebSocket();
  }

  public stop(): void {
    this.destroyed = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {
        // abaikan error saat penutupan socket
      }
      this.ws = null;
    }
  }

  public getMode(): RealtimeTransportMode {
    return this.mode;
  }

  private setMode(next: RealtimeTransportMode, reason?: string): void {
    if (this.mode !== next || reason) {
      this.mode = next;
      this.callbacks.onModeChange?.(next, reason);
    }
  }

  private clearTimers(): void {
    if (this.connectTimeoutId !== null) {
      window.clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    if (this.pingIntervalId !== null) {
      window.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    if (this.httpPollIntervalId !== null) {
      window.clearInterval(this.httpPollIntervalId);
      this.httpPollIntervalId = null;
    }
    if (this.reconnectTimerId !== null) {
      window.clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
  }

  private connectWebSocket(): void {
    if (this.destroyed || typeof window === "undefined" || typeof WebSocket === "undefined") {
      this.activateHttpFallback("WebSocket tidak didukung browser");
      return;
    }

    if (!this.config.dashboard_ticket || !this.config.ws_stream_url) {
      this.activateHttpFallback("Tiket stream WebSocket belum tersedia");
      return;
    }

    if (this.mode !== "HTTP_FALLBACK") {
      this.setMode("CONNECTING");
    }

    const url = `${this.config.ws_stream_url}?channels=telemetry,control,alerts,heartbeat&ticket=${encodeURIComponent(
      this.config.dashboard_ticket
    )}`;

    try {
      const socket = new WebSocket(url, [this.config.dashboard_subprotocol]);
      this.ws = socket;

      const timeoutMs = this.config.ws_connect_timeout_ms || 3000;
      this.connectTimeoutId = window.setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          try {
            socket.close();
          } catch {
            // abaikan
          }
          this.activateHttpFallback("Timeout koneksi WebSocket, beralih ke HTTP Fallback");
        }
      }, timeoutMs);

      socket.onopen = () => {
        if (this.destroyed) {
          socket.close();
          return;
        }
        if (this.connectTimeoutId !== null) {
          window.clearTimeout(this.connectTimeoutId);
          this.connectTimeoutId = null;
        }
        this.stopHttpFallback();
        this.reconnectAttempts = 0;
        this.setMode("WEBSOCKET", "Terhubung ke server WebSocket multi-protokol");

        // Keepalive ping tiap 25 detik
        this.pingIntervalId = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping", ts: Date.now() }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          this.handleWsEnvelope(msg);
        } catch {
          // abaikan frame non-JSON
        }
      };

      socket.onerror = () => {
        // onclose akan segera dipicu setelah onerror
      };

      socket.onclose = () => {
        if (this.connectTimeoutId !== null) {
          window.clearTimeout(this.connectTimeoutId);
          this.connectTimeoutId = null;
        }
        if (this.pingIntervalId !== null) {
          window.clearInterval(this.pingIntervalId);
          this.pingIntervalId = null;
        }
        if (!this.destroyed) {
          this.activateHttpFallback("WebSocket tidak terjangkau, protokol HTTP Fallback aktif");
          this.scheduleWsReconnect();
        }
      };
    } catch {
      this.activateHttpFallback("Gagal inisialisasi WebSocket, beralih ke HTTP Fallback");
      this.scheduleWsReconnect();
    }
  }

  private handleWsEnvelope(msg: any): void {
    const event = msg?.event;
    const payload = msg?.payload;
    if (!event || !payload) return;

    if (event === "telemetry.update" && payload.reading) {
      this.callbacks.onTelemetry?.(payload.reading, payload.device);
      return;
    }

    if (event === "prediction.update" && payload.prediction) {
      this.callbacks.onPrediction?.(payload.prediction, payload.alert || null);
      return;
    }

    if ((event === "control.command" || event === "control.ack") && payload) {
      this.callbacks.onControlUpdate?.({
        aerator_on: typeof payload.aerator_on === "boolean" ? payload.aerator_on : undefined,
        mode: payload.mode,
      });
    }
  }

  private activateHttpFallback(reason: string): void {
    this.setMode("HTTP_FALLBACK", reason);

    if (this.httpPollIntervalId !== null || this.destroyed) {
      return;
    }

    const intervalMs = Math.max(2000, this.config.http_fallback?.poll_interval_ms || 5000);
    // Ambil snapshot awal segera lalu polling berkala
    void this.pollHttpSnapshot();
    this.httpPollIntervalId = window.setInterval(() => {
      void this.pollHttpSnapshot();
    }, intervalMs);
  }

  private stopHttpFallback(): void {
    if (this.httpPollIntervalId !== null) {
      window.clearInterval(this.httpPollIntervalId);
      this.httpPollIntervalId = null;
    }
  }

  private scheduleWsReconnect(): void {
    if (this.destroyed || this.reconnectTimerId !== null) {
      return;
    }
    const backoffMs = Math.min(30000, 5000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts = Math.min(this.reconnectAttempts + 1, 4);

    this.reconnectTimerId = window.setTimeout(() => {
      this.reconnectTimerId = null;
      if (!this.destroyed) {
        this.connectWebSocket();
      }
    }, backoffMs);
  }

  private async pollHttpSnapshot(): Promise<void> {
    if (this.destroyed) return;

    try {
      const [latestRes, alertsRes] = await Promise.all([
        fetch("/api/latest", { headers: { Accept: "application/json" } }),
        fetch("/api/alerts/recent?limit=25", { headers: { Accept: "application/json" } }),
      ]);

      if (latestRes.ok) {
        const latestJson = await latestRes.json();
        if (latestJson?.reading) {
          const r = latestJson.reading;
          const mappedReading: SensorReading = {
            id: r.id,
            ts: r.recorded_at || r.ts || new Date().toISOString(),
            ph: r.ph !== null && r.ph !== undefined ? Number(r.ph) : null,
            temperature_c:
              r.temperature_c !== null && r.temperature_c !== undefined
                ? Number(r.temperature_c)
                : null,
            tds_ppm: r.tds_ppm !== null && r.tds_ppm !== undefined ? Number(r.tds_ppm) : null,
            turbidity_ntu:
              r.turbidity_ntu !== null && r.turbidity_ntu !== undefined
                ? Number(r.turbidity_ntu)
                : null,
            water_level: r.water_level || "NORMAL",
            aerator_on: Boolean(r.aerator_on),
            mode: r.mode || "AUTO",
            battery_v: r.battery_v ?? null,
            transport: r.transport || "HTTP_FALLBACK",
          };
          this.callbacks.onTelemetry?.(mappedReading, latestJson.device || undefined);
        }

        if (latestJson?.prediction) {
          const p = latestJson.prediction;
          this.callbacks.onPrediction?.({
            risk: p.risk,
            p_aman: Number(p.p_aman),
            p_waspada: Number(p.p_waspada),
            p_bahaya: Number(p.p_bahaya),
            model_version: p.model_version,
            timeframe: p.timeframe,
            triggers: Array.isArray(p.triggers) ? p.triggers : [],
            recommended_action: p.recommended_action,
            failsafe_active: Boolean(p.failsafe_active),
            predicted_at: p.predicted_at,
          });
        }
      }

      if (alertsRes.ok) {
        const alertsJson = await alertsRes.json();
        if (Array.isArray(alertsJson?.alerts)) {
          this.callbacks.onAlertsRefresh?.(alertsJson.alerts);
        }
      }
    } catch {
      // tetap tenang jika polling gagal sementara
    }
  }
}
