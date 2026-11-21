import { useState } from "react";
import {
  Code2,
  Terminal,
  Send,
  Copy,
  Check,
  Radio,
  KeyRound,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  Plus,
  Trash2,
  ExternalLink,
  Wifi,
  WifiOff,
  FileJson,
  Layers,
  AlertTriangle,
} from "lucide-react";
import type { ManagedDevice, RealtimeConfig, RealtimeTransportMode, User } from "@/Types";

type SubTab = "swagger" | "asyncapi" | "tokens" | "protocols" | "snippets";
type SnippetLang = "esp32" | "python" | "curl";

interface SuperAdminApiDocsProps {
  users?: User[];
  devices?: ManagedDevice[];
  realtimeConfig?: RealtimeConfig;
  activeTransport?: RealtimeTransportMode;
  transportReason?: string;
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "";
}

export function SuperAdminApiDocs({
  users = [],
  devices: initialDevices = [],
  realtimeConfig,
  activeTransport = "HTTP_FALLBACK",
  transportReason,
}: SuperAdminApiDocsProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("swagger");
  const [activeLang, setActiveLang] = useState<SnippetLang>("esp32");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [swaggerRefreshKey, setSwaggerRefreshKey] = useState(0);

  // Device & Token Management State
  const [devices, setDevices] = useState<ManagedDevice[]>(initialDevices);
  const [newDeviceCode, setNewDeviceCode] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newPondName, setNewPondName] = useState("Kolam Terpal Sangkuriang 02");
  const [newFirmware, setNewFirmware] = useState("v1.4.2-failsafe");
  const [newHardwareProfile, setNewHardwareProfile] = useState("ESP32-WROOM-CoreHub-v2");
  const [newTenantCode, setNewTenantCode] = useState("");
  const [newOwnerUserId, setNewOwnerUserId] = useState<number | "">("");
  const [newGrantOtaPerm, setNewGrantOtaPerm] = useState(true);
  const [deviceBusyId, setDeviceBusyId] = useState<number | "new" | null>(null);
  const [deviceNotice, setDeviceNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [issuedTokenBanner, setIssuedTokenBanner] = useState<{
    device_code: string;
    token: string;
  } | null>(null);

  // Live Tester State
  const [testDeviceToken, setTestDeviceToken] = useState("");
  const [testDeviceCode, setTestDeviceCode] = useState(
    initialDevices[0]?.device_code || "ESP32-NODE-01"
  );
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    status: number | string;
    loading: boolean;
    data: any;
  } | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8000";
  const wsBase = realtimeConfig?.ws_base_url || "ws://127.0.0.1:8081";

  let wsHost = "127.0.0.1";
  let wsPort = 8081;
  let wsUseTls = false;
  try {
    const parsedWs = new URL(wsBase);
    wsHost = parsedWs.hostname || "127.0.0.1";
    wsUseTls = parsedWs.protocol === "wss:";
    wsPort = parsedWs.port ? Number(parsedWs.port) : wsUseTls ? 443 : 80;
  } catch {
    // gunakan default lokal
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- Device Token CRUD Actions ---
  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceCode.trim() || !newDeviceName.trim() || !newPondName.trim()) return;
    setDeviceBusyId("new");
    setDeviceNotice(null);

    try {
      const res = await fetch("/dashboard/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          device_code: newDeviceCode.trim().toUpperCase(),
          name: newDeviceName.trim(),
          pond_name: newPondName.trim(),
          firmware_version: newFirmware.trim() || "v1.4.2-failsafe",
          hardware_profile: newHardwareProfile,
          tenant_code: newTenantCode.trim() || undefined,
          owner_user_id: newOwnerUserId ? Number(newOwnerUserId) : undefined,
          assigned_user_ids: newOwnerUserId ? [Number(newOwnerUserId)] : [],
          grant_ota_permission: newGrantOtaPerm,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDeviceNotice({
          type: "err",
          text: json?.message || "Gagal mendaftarkan perangkat baru.",
        });
      } else {
        setDevices((prev) => [...prev, json.device]);
        setIssuedTokenBanner({
          device_code: json.device.device_code,
          token: json.plain_token,
        });
        setTestDeviceToken(json.plain_token);
        setTestDeviceCode(json.device.device_code);
        setSwaggerRefreshKey((k) => k + 1);
        setNewDeviceCode("");
        setNewDeviceName("");
        setNewTenantCode("");
        setNewOwnerUserId("");
        setDeviceNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setDeviceNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setDeviceBusyId(null);
    }
  };

  const handleRotateToken = async (device: ManagedDevice) => {
    setDeviceBusyId(device.id);
    setDeviceNotice(null);
    try {
      const res = await fetch(`/dashboard/devices/${device.id}/rotate-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setDeviceNotice({ type: "err", text: json?.message || "Gagal merotasi token." });
      } else {
        setDevices((prev) => prev.map((d) => (d.id === device.id ? json.device : d)));
        setIssuedTokenBanner({
          device_code: json.device.device_code,
          token: json.plain_token,
        });
        setTestDeviceToken(json.plain_token);
        setTestDeviceCode(json.device.device_code);
        setSwaggerRefreshKey((k) => k + 1);
        setDeviceNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setDeviceNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setDeviceBusyId(null);
    }
  };

  const handleToggleToken = async (device: ManagedDevice) => {
    setDeviceBusyId(device.id);
    setDeviceNotice(null);
    try {
      const res = await fetch(`/dashboard/devices/${device.id}/toggle-token`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (res.ok) {
        setDevices((prev) => prev.map((d) => (d.id === device.id ? json.device : d)));
        setSwaggerRefreshKey((k) => k + 1);
        setDeviceNotice({ type: "ok", text: json.message });
      } else {
        setDeviceNotice({ type: "err", text: json?.message || "Gagal mengubah status token." });
      }
    } catch (err: any) {
      setDeviceNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setDeviceBusyId(null);
    }
  };

  const handleDeleteDevice = async (device: ManagedDevice) => {
    if (!window.confirm(`Hapus perangkat ${device.device_code} beserta tokennya?`)) return;
    setDeviceBusyId(device.id);
    setDeviceNotice(null);
    try {
      const res = await fetch(`/dashboard/devices/${device.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== device.id));
        setSwaggerRefreshKey((k) => k + 1);
        setDeviceNotice({ type: "ok", text: json.message });
      } else {
        setDeviceNotice({ type: "err", text: json?.message || "Gagal menghapus perangkat." });
      }
    } catch (err: any) {
      setDeviceNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setDeviceBusyId(null);
    }
  };

  // --- Live HTTP Fallback & WebSocket Tester ---
  const runHttpTest = async (
    endpoint: string,
    method: "GET" | "POST",
    requiresDeviceToken: boolean,
    payload?: any
  ) => {
    setTestResult({
      endpoint: `${method} ${endpoint}`,
      status: "Mengirim...",
      loading: true,
      data: null,
    });

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (payload) headers["Content-Type"] = "application/json";
      if (requiresDeviceToken && testDeviceToken.trim()) {
        headers["Authorization"] = `Bearer ${testDeviceToken.trim()}`;
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const json = await res.json();
      setTestResult({
        endpoint: `${method} ${endpoint}`,
        status: res.status,
        loading: false,
        data: json,
      });
    } catch (err: any) {
      setTestResult({
        endpoint: `${method} ${endpoint}`,
        status: "Error Jaringan",
        loading: false,
        data: { error: err?.message || "Gagal menghubungi endpoint API" },
      });
    }
  };

  const runWsPingTest = () => {
    if (!testDeviceToken.trim()) {
      setTestResult({
        endpoint: `WS ${wsBase}/ws/heartbeat`,
        status: "Perlu Token",
        loading: false,
        data: {
          hint: "Masukkan token alat pada kolom di atas (atau klik Rotasi Token di tab Token Per Alat) terlebih dahulu.",
        },
      });
      return;
    }

    const wsUrl = `${wsBase}/ws/heartbeat?token=${encodeURIComponent(testDeviceToken.trim())}`;
    setTestResult({
      endpoint: `WS ${wsBase}/ws/heartbeat [banyuwening.heartbeat.v1]`,
      status: "Menghubungkan WS...",
      loading: true,
      data: null,
    });

    try {
      const ws = new WebSocket(wsUrl, ["banyuwening.heartbeat.v1"]);
      const started = performance.now();
      let settled = false;

      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            ws.close();
          } catch {
            // noop
          }
          setTestResult({
            endpoint: `WS ${wsBase}/ws/heartbeat`,
            status: "WS Timeout → Gunakan HTTP Fallback",
            loading: false,
            data: {
              fallback_triggered: true,
              fallback_endpoint: `${origin}/api/http/heartbeat`,
              note: "Jalankan `php artisan ws:serve` untuk mengaktifkan server WebSocket multi-protokol, atau biarkan alat memakai HTTP Fallback otomatis.",
            },
          });
        }
      }, 3000);

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "heartbeat",
            rssi: -58,
            uptime_s: 3600,
            free_heap: 210400,
          })
        );
      };

      ws.onmessage = (ev) => {
        const parsed = JSON.parse(String(ev.data));
        if (parsed.type === "heartbeat.pong" && !settled) {
          settled = true;
          window.clearTimeout(timer);
          const rttMs = Math.round(performance.now() - started);
          ws.close();
          setTestResult({
            endpoint: `WS ${wsBase}/ws/heartbeat [banyuwening.heartbeat.v1]`,
            status: `101 Connected (${rttMs} ms)`,
            loading: false,
            data: parsed,
          });
        }
      };

      ws.onerror = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          setTestResult({
            endpoint: `WS ${wsBase}/ws/heartbeat`,
            status: "WS Gagal → HTTP Fallback Siap",
            loading: false,
            data: {
              ws_connected: false,
              fallback_endpoint: `${origin}/api/http/heartbeat`,
              instruction:
                "Server WebSocket belum aktif di host ini atau token ditolak (401). Client ESP32 akan otomatis beralih ke POST /api/http/heartbeat.",
            },
          });
        }
      };
    } catch (err: any) {
      setTestResult({
        endpoint: `WS ${wsBase}/ws/heartbeat`,
        status: "Error",
        loading: false,
        data: { error: err?.message || "WebSocket gagal dibuat" },
      });
    }
  };

  const sampleToken = testDeviceToken.trim() || "bw_dev_MASUKKAN_TOKEN_ALAT_DISINI";
  const sampleCode = testDeviceCode || "ESP32-NODE-01";

  const esp32Example = `#include <WiFi.h>
#include <WebSocketsClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* DEVICE_CODE  = "${sampleCode}";
const char* DEVICE_TOKEN = "${sampleToken}";
const char* WS_HOST      = "${wsHost}";
const uint16_t WS_PORT   = ${wsPort};
const char* HTTP_FALLBACK_TELEMETRY = "${origin}/api/http/telemetry";
const char* HTTP_FALLBACK_COMMANDS  = "${origin}/api/http/commands";

WebSocketsClient wsTelemetry;
bool wsConnected = false;

void setupRealtime() {
  String path = String("/ws/telemetry?token=") + DEVICE_TOKEN;
  ${
    wsUseTls
      ? 'wsTelemetry.beginSSL(WS_HOST, WS_PORT, path.c_str(), "", "banyuwening.telemetry.v1");'
      : 'wsTelemetry.begin(WS_HOST, WS_PORT, path.c_str(), "banyuwening.telemetry.v1");'
  }
  wsTelemetry.setExtraHeaders((String("X-Device-Token: ") + DEVICE_TOKEN).c_str());
  wsTelemetry.onEvent([](WStype_t type, uint8_t* payload, size_t len) {
    if (type == WStype_CONNECTED)    wsConnected = true;
    if (type == WStype_DISCONNECTED) wsConnected = false;
  });
  wsTelemetry.setReconnectInterval(5000);
}

void sendReadingHybrid(float ph, float temp, float tds, float turb) {
  StaticJsonDocument<320> doc;
  doc["type"] = "telemetry";
  doc["device_code"] = DEVICE_CODE;
  doc["ph"] = ph;
  doc["temperature_c"] = temp;
  doc["tds_ppm"] = tds;
  doc["turbidity_ntu"] = turb;
  doc["water_level"] = "NORMAL";
  doc["mode"] = "AUTO";

  String body;
  serializeJson(doc, body);

  // 1. Jalur Utama: WebSocket kecepatan tinggi (banyuwening.telemetry.v1)
  if (wsConnected) {
    wsTelemetry.sendTXT(body);
    return;
  }

  // 2. Jalur Otomatis HTTP Fallback saat WebSocket gagal connect
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(HTTP_FALLBACK_TELEMETRY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
    http.addHeader("X-Transport-Mode", "http-fallback");
    int code = http.POST(body);
    Serial.printf("[HTTP Fallback] status=%d\\n", code);
    http.end();
  }
}`;

  const pythonExample = `import asyncio, json, requests, websockets

DEVICE_CODE  = "${sampleCode}"
DEVICE_TOKEN = "${sampleToken}"
WS_URL       = "${wsBase}/ws/telemetry"
HTTP_URL     = "${origin}/api/http/telemetry"

payload = {
    "type": "telemetry",
    "device_code": DEVICE_CODE,
    "ph": 7.15,
    "temperature_c": 28.4,
    "tds_ppm": 355.0,
    "turbidity_ntu": 36.2,
    "water_level": "NORMAL",
    "mode": "AUTO",
}

async def send_hybrid():
    headers = {"Authorization": f"Bearer {DEVICE_TOKEN}"}
    try:
        # 1. Coba jalur WebSocket multi-protokol dulu
        async with websockets.connect(
            WS_URL,
            subprotocols=["banyuwening.telemetry.v1"],
            additional_headers=headers,
            open_timeout=3,
        ) as ws:
            await ws.send(json.dumps(payload))
            ack = await ws.recv()
            print("[WebSocket ACK]", ack)
            return
    except Exception as exc:
        print(f"[WS gagal: {exc}] -> beralih ke HTTP Fallback")

    # 2. HTTP Fallback otomatis dengan Token Per Alat
    resp = requests.post(HTTP_URL, json=payload, headers=headers, timeout=5)
    print("[HTTP Fallback]", resp.status_code, resp.json())

asyncio.run(send_hybrid())`;

  const curlExample = `# 1. Kirim Telemetri via HTTP Fallback (Wajib Token Per Alat)
curl -X POST ${origin}/api/http/telemetry \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${sampleToken}" \\
  -d '{
    "device_code": "${sampleCode}",
    "ph": 7.15,
    "temperature_c": 28.4,
    "tds_ppm": 355,
    "turbidity_ntu": 36.2,
    "water_level": "NORMAL",
    "mode": "AUTO"
  }'

# 2. Heartbeat HTTP Fallback (saat WS banyuwening.heartbeat.v1 gagal)
curl -X POST ${origin}/api/http/heartbeat \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Token: ${sampleToken}" \\
  -d '{"rssi": -61, "uptime_s": 86400, "battery_v": 4.15}'

# 3. Polling Perintah Relay HTTP Fallback (saat WS banyuwening.control.v1 gagal)
curl -X GET ${origin}/api/http/commands \\
  -H "Authorization: Bearer ${sampleToken}"`;

  const protocolRows = Object.values(realtimeConfig?.protocols || {});

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-6 bg-surface rounded-[6px] border border-line flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
            <Code2 className="w-4 h-4 text-brand" />
            <span>Standar OpenAPI 3.0.3 · WebSocket Multi-Protokol · Token Per Alat</span>
          </div>
          <h1 className="text-[22px] leading-[28px] font-display text-ink">
            Dokumentasi API (Swagger UI) & Manajemen Token Perangkat
          </h1>
          <p className="text-[13px] text-muted mt-1 max-w-3xl">
            Standar dokumentasi REST API interaktif berbasis <strong>Swagger UI</strong>, jalur
            realtime kecepatan tinggi melalui <strong>5 protokol WebSocket</strong> (termasuk Dual-OTA), jalur{" "}
            <strong>HTTP Fallback</strong> otomatis bila WebSocket gagal terhubung, serta{" "}
            <strong>token autentikasi unik per alat</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-[6px] border border-line">
            {activeTransport === "WEBSOCKET" ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="text-xs font-mono font-semibold text-ink">
              {activeTransport === "WEBSOCKET"
                ? "WS Realtime Aktif"
                : activeTransport === "HTTP_FALLBACK"
                ? "HTTP Fallback Aktif"
                : "Menghubungkan..."}
            </span>
          </div>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Swagger UI</span>
          </a>
          <a
            href="/api/docs/asyncapi"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Wifi className="w-3.5 h-3.5 text-brand" />
            <span>AsyncAPI Studio</span>
          </a>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-line pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: "swagger" as SubTab, label: "Swagger UI (HTTP)", icon: FileJson },
          { id: "asyncapi" as SubTab, label: "AsyncAPI Studio (WebSocket)", icon: Wifi },
          { id: "tokens" as SubTab, label: `Token Per Alat (${devices.length})`, icon: KeyRound },
          { id: "protocols" as SubTab, label: "Matriks Protokol & Fallback", icon: Layers },
          { id: "snippets" as SubTab, label: "Kode ESP32 / Python / cURL", icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`min-h-[40px] px-3.5 py-2 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? "bg-brand text-brand-ink"
                  : "bg-surface border border-line text-ink hover:bg-surface-2"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: SWAGGER UI EMBEDDED (OPENAPI 3.0.3)                        */}
      {/* ================================================================= */}
      {activeSubTab === "swagger" && (
        <div className="space-y-4">
          <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[12px] text-muted">
              Spesifikasi standar{" "}
              <code className="font-mono text-brand font-semibold">OpenAPI 3.0.3</code>{" "}
              mendukung tombol <strong>Authorize</strong> (Bearer / <code>X-Device-Token</code>)
              dan <strong>Try it out</strong> langsung terhadap endpoint HTTP &amp; HTTP Fallback.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="/api/docs/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5 text-brand" />
                <span>OpenAPI JSON</span>
              </a>
              <a
                href="/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-brand" />
                <span>Layar Penuh</span>
              </a>
            </div>
          </div>

          <div className="rounded-[6px] border border-line overflow-hidden bg-white">
            <iframe
              key={swaggerRefreshKey}
              src={`/api/docs?v=${swaggerRefreshKey}`}
              title="Swagger UI: BanyuWening OpenAPI 3.0.3"
              className="w-full h-[65dvh] md:h-[780px] border-0"
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1B: ASYNCAPI STUDIO 3.0 & WEBSOCKET SIMULATOR                 */}
      {/* ================================================================= */}
      {activeSubTab === "asyncapi" && (
        <div className="space-y-4">
          <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[12px] text-muted">
              Spesifikasi standar{" "}
              <code className="font-mono text-brand font-semibold">AsyncAPI 3.0.0</code> +{" "}
              <strong>Simulator WebSocket Multi-Protokol</strong> (auto-login token per alat untuk
              Super Admin) serta tombol buka langsung ke{" "}
              <code className="font-mono">studio.asyncapi.com</code>.
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href="/api/docs/asyncapi.yaml"
                download="banyuwening-asyncapi-3.0.yaml"
                className="h-8 px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <FileJson className="w-3.5 h-3.5 text-brand" />
                <span>Unduh YAML</span>
              </a>
              <a
                href="/api/docs/asyncapi"
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-brand" />
                <span>Layar Penuh</span>
              </a>
            </div>
          </div>

          <div className="rounded-[6px] border border-line overflow-hidden bg-white">
            <iframe
              key={`asyncapi-${swaggerRefreshKey}`}
              src={`/api/docs/asyncapi?v=${swaggerRefreshKey}`}
              title="AsyncAPI Studio 3.0 & WebSocket Simulator: BanyuWening"
              className="w-full h-[65dvh] md:h-[800px] border-0"
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: MANAJEMEN TOKEN PER ALAT                                   */}
      {/* ================================================================= */}
      {activeSubTab === "tokens" && (
        <div className="space-y-5">
          {/* One-Time Plaintext Token Display */}
          {issuedTokenBanner && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-[6px] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                  <KeyRound className="w-4 h-4" />
                  <span>
                    Token Baru Diterbitkan untuk {issuedTokenBanner.device_code} (Simpan sekarang,
                    hanya ditampilkan sekali!)
                  </span>
                </div>
                <button
                  onClick={() => setIssuedTokenBanner(null)}
                  className="text-xs text-muted hover:text-ink cursor-pointer"
                >
                  Tutup
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <code className="flex-1 p-2.5 bg-surface rounded-[4px] border border-line font-mono text-xs text-ink break-all">
                  {issuedTokenBanner.token}
                </code>
                <button
                  onClick={() => copyToClipboard(issuedTokenBanner.token, "issued-token")}
                  className="h-9 px-3 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {copiedKey === "issued-token" ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Token</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted">
                Token hanya disimpan sebagai hash SHA-256 di database. Token ini juga otomatis
                diisikan ke kotak <em>Live Tester</em> dan tab contoh kode ESP32/Python/cURL.
              </p>
            </div>
          )}

          {deviceNotice && (
            <div
              className={`p-3 rounded-[6px] border text-xs font-medium ${
                deviceNotice.type === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                  : "bg-red-500/10 border-red-500/30 text-red-700"
              }`}
            >
              {deviceNotice.text}
            </div>
          )}

          {/* Form Daftarkan Alat Baru */}
          <form
            onSubmit={handleCreateDevice}
            className="p-5 bg-surface rounded-[6px] border border-line space-y-4"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-semibold text-ink">
                Daftarkan Alat IoT Baru &amp; Terbitkan Token Unik
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Kode Alat (device_code)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ESP32-NODE-02"
                  value={newDeviceCode}
                  onChange={(e) => setNewDeviceCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Nama Perangkat
                </label>
                <input
                  type="text"
                  required
                  placeholder="Node Sensor Kolam 02"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Nama Kolam
                </label>
                <input
                  type="text"
                  required
                  value={newPondName}
                  onChange={(e) => setNewPondName(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Versi Firmware
                </label>
                <input
                  type="text"
                  value={newFirmware}
                  onChange={(e) => setNewFirmware(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Profil Hardware ESP32
                </label>
                <select
                  value={newHardwareProfile}
                  onChange={(e) => setNewHardwareProfile(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink cursor-pointer"
                >
                  <option value="ESP32-WROOM-CoreHub-v2">ESP32-WROOM-CoreHub-v2</option>
                  <option value="ESP32-WROOM-Entry1K-v1">ESP32-WROOM-Entry1K-v1</option>
                  <option value="ESP32-S3-Juragan4K-v2">ESP32-S3-Juragan4K-v2</option>
                  <option value="ESP32-C3-MiniNode-v1">ESP32-C3-MiniNode-v1</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Kode Tenant (Isolasi Toko)
                </label>
                <input
                  type="text"
                  placeholder="TENANT-PETAMBAK-B"
                  value={newTenantCode}
                  onChange={(e) => setNewTenantCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Beri Akses Eksklusif ke Akun Peternak (Tenant Pemilik)
                </label>
                <select
                  value={newOwnerUserId}
                  onChange={(e) => {
                    const uid = e.target.value ? Number(e.target.value) : "";
                    setNewOwnerUserId(uid);
                    const picked = users.find((u) => Number(u.id) === Number(uid));
                    if (picked?.tenant_code) setNewTenantCode(picked.tenant_code);
                  }}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink cursor-pointer"
                >
                  <option value="">-- Pilih Akun Peternak Pemilik Alat --</option>
                  {users
                    .filter((u) => u.role !== "ADMIN")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} · {u.tenant_code || "TENANT-UTAMA"})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={newGrantOtaPerm}
                onChange={(e) => setNewGrantOtaPerm(e.target.checked)}
                className="rounded border-line"
              />
              <span>Izinkan akun peternak pemilik untuk update &amp; uji simulasi firmware alat ini secara mandiri</span>
            </label>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted">
                Setiap alat otomatis mendapat token berprefiks <code>bw_dev_</code> yang terikat
                ketat pada <code>device_code</code> miliknya (anti-spoofing antar-alat).
              </span>
              <button
                type="submit"
                disabled={deviceBusyId === "new"}
                className="h-9 px-4 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{deviceBusyId === "new" ? "Menerbitkan..." : "Buat Alat & Token"}</span>
              </button>
            </div>
          </form>

          {/* Tabel Daftar Alat & Status Token */}
          <div className="bg-surface rounded-[6px] border border-line overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">
                Daftar Node Alat &amp; Token Autentikasi Aktif
              </h2>
              <span className="text-[11px] text-muted">
                Validasi SHA-256 · 1 Token = 1 Perangkat
              </span>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-line">
              {devices.map((d) => (
                <div key={`m-dev-${d.id}`} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-ink text-[13px] truncate">{d.device_code}</div>
                      <div className="text-[11px] text-muted truncate">
                        {d.name} · {d.pond_name}
                      </div>
                    </div>
                    {d.token_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-700 font-semibold text-[11px] shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-red-500/10 text-red-700 font-semibold text-[11px] shrink-0">
                        <ShieldOff className="w-3 h-3" />
                        Dicabut
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono text-brand">{d.api_token_prefix || "(belum diterbitkan)"}</span>
                    <span className="font-mono px-2 py-0.5 rounded bg-surface-2 text-muted">
                      {d.transport_protocol || "STANDBY"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleRotateToken(d)}
                      disabled={deviceBusyId === d.id}
                      className="flex-1 min-h-[40px] px-3 bg-brand/10 hover:bg-brand/20 text-brand rounded-[6px] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Rotasi Token</span>
                    </button>
                    <button
                      onClick={() => handleToggleToken(d)}
                      disabled={deviceBusyId === d.id}
                      className="min-h-[40px] px-3 bg-surface-2 text-ink rounded-[6px] border border-line text-[12px] font-semibold cursor-pointer"
                    >
                      {d.token_active ? "Cabut" : "Aktifkan"}
                    </button>
                    {devices.length > 1 && (
                      <button
                        onClick={() => handleDeleteDevice(d)}
                        disabled={deviceBusyId === d.id}
                        className="min-h-[40px] min-w-[40px] px-2.5 text-bahaya bg-bahaya/10 rounded-[6px] inline-flex items-center justify-center cursor-pointer"
                        aria-label={`Hapus ${d.device_code}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {devices.length === 0 && (
                <div className="p-6 text-center text-muted text-xs">Belum ada perangkat terdaftar.</div>
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Alat &amp; Kolam</th>
                    <th className="px-4 py-2.5">Protokol Aktif</th>
                    <th className="px-4 py-2.5">Prefix Token</th>
                    <th className="px-4 py-2.5">Status Token</th>
                    <th className="px-4 py-2.5">Terakhir Dipakai</th>
                    <th className="px-4 py-2.5 text-right">Aksi Token</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {devices.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-ink">{d.device_code}</div>
                        <div className="text-[11px] text-muted">
                          {d.name} · {d.pond_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.2 rounded bg-surface-2 border border-line font-mono text-[10px] text-brand font-semibold">
                            {d.tenant_code || "TENANT-UTAMA"}
                          </span>
                          {d.owner_name && (
                            <span className="text-[10px] text-muted">Pemilik: {d.owner_name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-semibold ${
                            d.transport_protocol === "WEBSOCKET"
                              ? "bg-emerald-500/10 text-emerald-700"
                              : d.transport_protocol === "HTTP_FALLBACK"
                              ? "bg-amber-500/10 text-amber-700"
                              : "bg-surface-2 text-muted"
                          }`}
                        >
                          {d.transport_protocol || "STANDBY"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-brand">
                        {d.api_token_prefix || "(belum diterbitkan)"}
                      </td>
                      <td className="px-4 py-3">
                        {d.token_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-emerald-500/10 text-emerald-700 font-semibold text-[11px]">
                            <ShieldCheck className="w-3 h-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-red-500/10 text-red-700 font-semibold text-[11px]">
                            <ShieldOff className="w-3 h-3" />
                            Dicabut
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted font-mono">
                        {d.token_last_used_at
                          ? new Date(d.token_last_used_at).toLocaleString("id-ID")
                          : "Belum dipakai"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleRotateToken(d)}
                            disabled={deviceBusyId === d.id}
                            className="h-7 px-2.5 bg-brand/10 hover:bg-brand/20 text-brand rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="Buat token baru (token lama otomatis mati)"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Rotasi</span>
                          </button>
                          <button
                            onClick={() => handleToggleToken(d)}
                            disabled={deviceBusyId === d.id}
                            className="h-7 px-2.5 bg-surface-2 hover:bg-amber-500/15 text-ink rounded-[4px] border border-line text-[11px] font-semibold cursor-pointer"
                          >
                            {d.token_active ? "Cabut" : "Aktifkan"}
                          </button>
                          {devices.length > 1 && (
                            <button
                              onClick={() => handleDeleteDevice(d)}
                              disabled={deviceBusyId === d.id}
                              className="h-7 px-2 text-muted hover:text-red-600 rounded-[4px] cursor-pointer"
                              title="Hapus perangkat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted">
                        Belum ada perangkat terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: PROTOKOL WEBSOCKET MULTI-CHANNEL & HTTP FALLBACK + TESTER  */}
      {/* ================================================================= */}
      {activeSubTab === "protocols" && (
        <div className="space-y-5">
          {/* Status Transport & Failover Explainer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface rounded-[6px] border border-line">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Server WebSocket Multi-Protokol
              </span>
              <code className="text-brand text-[13px] font-mono font-semibold block break-all">
                {wsBase}
              </code>
              <p className="text-[11px] text-muted mt-1.5">
                Jalankan: <code>php artisan ws:serve</code>
              </p>
            </div>

            <div className="p-4 bg-surface rounded-[6px] border border-line">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Jalur Cadangan (HTTP Fallback)
              </span>
              <code className="text-ink text-[13px] font-mono font-semibold block break-all">
                {origin}/api/http/*
              </code>
              <p className="text-[11px] text-muted mt-1.5">
                Aktif otomatis jika handshake WS gagal/timeout (
                {(realtimeConfig?.ws_connect_timeout_ms || 3000) / 1000}s).
              </p>
            </div>

            <div className="p-4 bg-surface rounded-[6px] border border-line">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                Status Koneksi Dashboard Saat Ini
              </span>
              <div className="text-ink font-semibold text-[13px]">
                {activeTransport === "WEBSOCKET"
                  ? "WebSocket Realtime (Push)"
                  : "HTTP Fallback (Auto-Polling + WS Reconnect)"}
              </div>
              <p className="text-[11px] text-muted mt-1.5">
                {transportReason || "Failover otomatis tanpa kehilangan data."}
              </p>
            </div>
          </div>

          {/* Matriks 4 Protokol WebSocket + Pemetaan HTTP Fallback */}
          <div className="bg-surface rounded-[6px] border border-line overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line">
              <h2 className="text-sm font-semibold text-ink">
                Matriks 5 Sub-Protokol WebSocket &amp; Pasangan HTTP Fallback
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Sub-Protokol WebSocket</th>
                    <th className="px-4 py-2.5">Endpoint WS</th>
                    <th className="px-4 py-2.5">Fungsi Kecepatan Tinggi</th>
                    <th className="px-4 py-2.5">HTTP Fallback (Jika WS Gagal)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {protocolRows.map((p) => (
                    <tr key={p.channel}>
                      <td className="px-4 py-3 font-mono font-semibold text-brand">
                        {p.subprotocol}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink">{p.ws_url}</td>
                      <td className="px-4 py-3 text-muted max-w-sm">{p.purpose}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink space-y-1">
                        {Object.entries(p.http_fallback).map(([k, ep]) => (
                          <div key={k}>
                            <span className="text-muted">{k}:</span> <code>{ep}</code>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Protocol & HTTP Fallback Tester */}
          <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">
                Uji Langsung Token Alat, WebSocket &amp; HTTP Fallback
              </h2>
              <span className="text-[11px] text-muted">
                Tanpa token valid → server wajib menolak 401
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Token Alat (Authorization: Bearer ...)
                </label>
                <input
                  type="text"
                  placeholder="Tempel token bw_dev_... dari tab Token Per Alat"
                  value={testDeviceToken}
                  onChange={(e) => setTestDeviceToken(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  device_code target
                </label>
                <input
                  type="text"
                  value={testDeviceCode}
                  onChange={(e) => setTestDeviceCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={runWsPingTest}
                className="h-8 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Uji WS Heartbeat</span>
              </button>

              <button
                onClick={() =>
                  runHttpTest("/api/http/telemetry", "POST", true, {
                    device_code: testDeviceCode,
                    ph: 7.15,
                    temperature_c: 28.4,
                    tds_ppm: 350,
                    turbidity_ntu: 36.5,
                    water_level: "NORMAL",
                    aerator_on: false,
                    mode: "AUTO",
                  })
                }
                className="h-8 px-3 bg-brand/10 hover:bg-brand/20 text-brand rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Uji POST /api/http/telemetry</span>
              </button>

              <button
                onClick={() =>
                  runHttpTest("/api/http/heartbeat", "POST", true, {
                    rssi: -61,
                    uptime_s: 4200,
                    battery_v: 4.12,
                    fallback_reason: "manual_test",
                  })
                }
                className="h-8 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Radio className="w-3 h-3" />
                <span>Uji POST /api/http/heartbeat</span>
              </button>

              <button
                onClick={() => runHttpTest("/api/http/commands", "GET", true)}
                className="h-8 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3 h-3" />
                <span>Uji GET /api/http/commands</span>
              </button>

              <button
                onClick={() => runHttpTest("/api/realtime/config", "GET", false)}
                className="h-8 px-3 bg-surface-2 hover:bg-brand/10 border border-line text-ink rounded-[6px] text-xs font-semibold cursor-pointer"
              >
                GET /api/realtime/config
              </button>
            </div>

            {!testDeviceToken.trim() && (
              <div className="flex items-center gap-2 text-[11px] text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Tip: Klik <strong>Rotasi</strong> pada salah satu perangkat di tab{" "}
                  <strong>Token Per Alat</strong> untuk menerbitkan dan mengisi token otomatis ke
                  penguji ini.
                </span>
              </div>
            )}

            {testResult && (
              <div className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-2">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="text-xs font-mono font-bold text-ink">
                    {testResult.endpoint}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-surface border border-line font-semibold text-ink">
                      {testResult.status}
                    </span>
                    <button
                      onClick={() => setTestResult(null)}
                      className="text-xs text-muted hover:text-ink cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
                <pre className="p-3 bg-surface rounded-[4px] border border-line text-[11px] font-mono text-ink overflow-x-auto max-h-64">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: CONTOH CLIENT (ESP32 C++, PYTHON, CURL)                    */}
      {/* ================================================================= */}
      {activeSubTab === "snippets" && (
        <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-1.5">
              {(
                [
                  ["esp32", "ESP32 (WS + HTTP Fallback)"],
                  ["python", "Python (WS + Fallback)"],
                  ["curl", "cURL (HTTP Fallback)"],
                ] as [SnippetLang, string][]
              ).map(([lang, label]) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] cursor-pointer transition-colors ${
                    activeLang === lang
                      ? "bg-brand text-brand-ink"
                      : "bg-surface-2 text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                copyToClipboard(
                  activeLang === "esp32"
                    ? esp32Example
                    : activeLang === "python"
                    ? pythonExample
                    : curlExample,
                  "code-snippet"
                )
              }
              className="text-xs text-muted hover:text-brand inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === "code-snippet" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 bg-surface-2 rounded-[6px] border border-line text-[12px] font-mono text-ink overflow-x-auto leading-relaxed">
            {activeLang === "esp32" && esp32Example}
            {activeLang === "python" && pythonExample}
            {activeLang === "curl" && curlExample}
          </pre>
        </div>
      )}
    </div>
  );
}
