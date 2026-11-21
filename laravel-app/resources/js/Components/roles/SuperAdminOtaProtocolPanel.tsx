import { useState, useEffect } from "react";
import {
  Cpu,
  ShieldCheck,
  Upload,
  Rocket,
  RotateCcw,
  RefreshCw,
  Trash2,
  Power,
  Check,
  Copy,
  Terminal,
  AlertTriangle,
  Lock,
  HardDrive,
  ArrowRight,
  Wifi,
  KeyRound,
  Eye,
  EyeOff,
  Play,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Sparkles,
  Users,
  Plus,
  Building2,
} from "lucide-react";
import type {
  OtaOverview,
  OtaOverviewDevice,
  OtaSimulationResult,
  RealtimeConfig,
  FirmwareReleaseItem,
  User,
} from "@/Types";

interface SuperAdminOtaProtocolPanelProps {
  initialOverview?: OtaOverview | null;
  realtimeConfig?: RealtimeConfig;
  users?: User[];
  isTenantMode?: boolean;
}

const HARDWARE_PROFILES = [
  { value: "ESP32-WROOM-CoreHub-v2", label: "ESP32-WROOM CoreHub v2 (2-3x ADS1115 + MCP23017)" },
  { value: "ESP32-WROOM-Entry1K-v1", label: "ESP32-WROOM Entry 1K v1 (1 Kolam Relay 4-Ch)" },
  { value: "ESP32-S3-Juragan4K-v2", label: "ESP32-S3 Juragan 4K v2 (PSRAM + DO Pro Expansion)" },
  { value: "ESP32-C3-MiniNode-v1", label: "ESP32-C3 Mini Node v1 (Sensor Satelit Ringkas)" },
];

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "";
}

function parseWsOrigin(wsBase: string): { host: string; port: number; tls: boolean } {
  try {
    const u = new URL(wsBase);
    const tls = u.protocol === "wss:";
    const port = u.port ? Number(u.port) : tls ? 443 : 80;
    return { host: u.hostname, port, tls };
  } catch {
    return { host: "127.0.0.1", port: 8081, tls: false };
  }
}

function normalizeSemver(ver?: string | null): [number, number, number] {
  if (!ver) return [0, 0, 0];
  const m = ver.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3] || 0)];
}

function compareSemverGte(currentVer?: string | null, minVer?: string | null): boolean {
  if (!minVer || !minVer.trim()) return true;
  const a = normalizeSemver(currentVer);
  const b = normalizeSemver(minVer);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

function checkClientCompat(
  device: OtaOverviewDevice,
  release: FirmwareReleaseItem
): { compatible: boolean; authorized: boolean; reasons: string[] } {
  const devHw = (device.hardware_profile || "ESP32-WROOM-CoreHub-v2").trim().toLowerCase();
  const targetHw = (release.target_hardware || "*").trim().toLowerCase();
  const hwMatch = targetHw === "*" || targetHw === "all" || devHw === targetHw;
  const verOk = compareSemverGte(device.firmware_version, release.min_previous_version);
  const authorized = (release.allowed_device_ids || []).includes(device.id);
  const reasons: string[] = [];

  if (!hwMatch) {
    reasons.push(`Hardware alat (${device.hardware_profile}) ≠ target (${release.target_hardware})`);
  }
  if (!verOk) {
    reasons.push(`Versi ${device.firmware_version} < min (${release.min_previous_version})`);
  }
  if (!authorized) {
    reasons.push("Token alat belum diberi akses versi ini");
  }

  return { compatible: hwMatch && verOk, authorized, reasons };
}

export function SuperAdminOtaProtocolPanel({
  initialOverview,
  realtimeConfig,
  users = [],
  isTenantMode = false,
}: SuperAdminOtaProtocolPanelProps) {
  const [overview, setOverview] = useState<OtaOverview | null>(initialOverview ?? null);
  const [loading, setLoading] = useState(!initialOverview);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Quick device registration + tenant/account assignment (Super Admin)
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [regDeviceCode, setRegDeviceCode] = useState("");
  const [regDeviceName, setRegDeviceName] = useState("");
  const [regPondName, setRegPondName] = useState("");
  const [regHardwareProfile, setRegHardwareProfile] = useState("ESP32-WROOM-CoreHub-v2");
  const [regTenantCode, setRegTenantCode] = useState("");
  const [regUserIds, setRegUserIds] = useState<number[]>([]);
  const [regGrantOta, setRegGrantOta] = useState(true);
  const [issuedDeviceBanner, setIssuedDeviceBanner] = useState<{ code: string; token: string } | null>(null);

  // Per-device tenant/user assignment inline editor
  const [editingAssignId, setEditingAssignId] = useState<number | null>(null);
  const [assignTenantCode, setAssignTenantCode] = useState("");
  const [assignUserIds, setAssignUserIds] = useState<number[]>([]);
  const [assignGrantOta, setAssignGrantOta] = useState(true);

  // Release upload form
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"stable" | "beta" | "canary">("stable");
  const [targetHw, setTargetHw] = useState("ESP32-WROOM-CoreHub-v2");
  const [minPrevVersion, setMinPrevVersion] = useState("");
  const [rollbackTimeout, setRollbackTimeout] = useState(60);
  const [isMandatory, setIsMandatory] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [binaryFile, setBinaryFile] = useState<File | null>(null);
  const [uploadAllowedDeviceIds, setUploadAllowedDeviceIds] = useState<number[]>(
    (initialOverview?.devices || []).map((d) => d.id)
  );

  // Per-device token visibility + hardware editing
  const [revealedTokens, setRevealedTokens] = useState<Record<number, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Simulator state
  const [simDeviceId, setSimDeviceId] = useState<number>(initialOverview?.devices?.[0]?.id || 1);
  const [simReleaseId, setSimReleaseId] = useState<number>(initialOverview?.releases?.[0]?.id || 0);
  const [simScenario, setSimScenario] = useState<
    "NORMAL_SUCCESS" | "INCOMPATIBLE_BLOCKED" | "CHECKSUM_TAMPERED" | "WATCHDOG_ROLLBACK_60S"
  >("NORMAL_SUCCESS");
  const [simResult, setSimResult] = useState<OtaSimulationResult | null>(null);

  // Code snippet tab
  const [snippetTab, setSnippetTab] = useState<"esp32" | "cirkit" | "curl">("esp32");

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://banyuwening.ciptasol.cloud";
  const wsBase = realtimeConfig?.ws_base_url || "ws://127.0.0.1:8081";
  const wsMeta = parseWsOrigin(wsBase);

  const syncSelectionsFromOverview = (ov: OtaOverview) => {
    setOverview(ov);
    if (ov.devices.length > 0 && !ov.devices.some((d) => d.id === simDeviceId)) {
      setSimDeviceId(ov.devices[0].id);
    }
    if (ov.releases.length > 0 && !ov.releases.some((r) => r.id === simReleaseId)) {
      setSimReleaseId(ov.releases[0].id);
    }
  };

  const refreshOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/dashboard/ota/overview", {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      if (res.ok && json.overview) {
        syncSelectionsFromOverview(json.overview);
      }
    } catch {
      // Abaikan jika gagal sementara
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOverview) {
      void refreshOverview();
    }
  }, [initialOverview]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleQuickRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDeviceCode.trim() || !regDeviceName.trim() || !regPondName.trim()) {
      setNotice({ type: "err", text: "Lengkapi kode alat, nama perangkat, dan nama kolam." });
      return;
    }

    setBusyKey("register-device");
    setNotice(null);
    try {
      const ownerId = regUserIds[0] || null;
      const res = await fetch("/dashboard/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          device_code: regDeviceCode.trim().toUpperCase(),
          name: regDeviceName.trim(),
          pond_name: regPondName.trim(),
          hardware_profile: regHardwareProfile,
          tenant_code: regTenantCode.trim() || undefined,
          owner_user_id: ownerId,
          assigned_user_ids: regUserIds,
          grant_ota_permission: regGrantOta,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal mendaftarkan alat IoT baru." });
      } else {
        setIssuedDeviceBanner({ code: json.device.device_code, token: json.plain_token });
        setRegDeviceCode("");
        setRegDeviceName("");
        setRegPondName("");
        setRegTenantCode("");
        setRegUserIds([]);
        setShowAddDevice(false);
        await refreshOverview();
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyKey(null);
    }
  };

  const openDeviceAssignEditor = (dev: OtaOverviewDevice) => {
    if (editingAssignId === dev.id) {
      setEditingAssignId(null);
      return;
    }
    setEditingAssignId(dev.id);
    setAssignTenantCode(dev.tenant_code || "TENANT-UTAMA");
    setAssignUserIds(dev.assigned_user_ids || []);
    setAssignGrantOta(true);
  };

  const handleSaveDeviceAssignment = async (dev: OtaOverviewDevice) => {
    setBusyKey(`assign-${dev.id}`);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/devices/${dev.id}/assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          tenant_code: assignTenantCode.trim() || "TENANT-UTAMA",
          owner_user_id: assignUserIds[0] || null,
          assigned_user_ids: assignUserIds,
          grant_ota_permission: assignGrantOta,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menyimpan penugasan tenant alat." });
      } else {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        setEditingAssignId(null);
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyKey(null);
    }
  };

  const handleUploadRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim() || !binaryFile) {
      setNotice({ type: "err", text: "Isi versi firmware dan pilih file .bin terlebih dahulu." });
      return;
    }

    setBusyKey("upload");
    setNotice(null);

    try {
      const fd = new FormData();
      fd.append("version", version.trim());
      fd.append("channel", channel);
      fd.append("target_hardware", targetHw.trim());
      if (minPrevVersion.trim()) fd.append("min_previous_version", minPrevVersion.trim());
      fd.append("rollback_timeout_s", String(rollbackTimeout));
      fd.append("is_mandatory", isMandatory ? "1" : "0");
      if (changelog.trim()) fd.append("changelog", changelog.trim());
      uploadAllowedDeviceIds.forEach((id) => fd.append("allowed_device_ids[]", String(id)));
      fd.append("firmware_file", binaryFile);

      const res = await fetch("/dashboard/ota/releases", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal mengunggah rilis firmware." });
      } else {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        if (json.release?.id) setSimReleaseId(json.release.id);
        setVersion("");
        setChangelog("");
        setBinaryFile(null);
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan saat mengunggah binary." });
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateSampleRelease = async (
    targetHardwareProfile: string,
    sampleVersion: string,
    allowedIds: number[]
  ) => {
    setBusyKey("sample-" + sampleVersion);
    setNotice(null);
    try {
      const res = await fetch("/dashboard/ota/releases/sample", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          version: sampleVersion,
          channel: "beta",
          target_hardware: targetHardwareProfile,
          allowed_device_ids: allowedIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal membuat sampel rilis uji." });
      } else {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        if (json.release?.id) setSimReleaseId(json.release.id);
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateDeviceProfile = async (
    device: OtaOverviewDevice,
    nextHardware: string
  ) => {
    setBusyKey(`hw-${device.id}`);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/ota/devices/${device.id}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          hardware_profile: nextHardware,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      } else {
        setNotice({ type: "err", text: json?.message || "Gagal memperbarui profil alat." });
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleDeviceReleaseAccess = async (
    release: FirmwareReleaseItem,
    deviceId: number
  ) => {
    const currentAllowed = release.allowed_device_ids || [];
    const exists = currentAllowed.includes(deviceId);
    const nextAllowed = exists
      ? currentAllowed.filter((id) => id !== deviceId)
      : [...currentAllowed, deviceId];

    setBusyKey(`acc-${release.id}-${deviceId}`);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/ota/releases/${release.id}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({ allowed_device_ids: nextAllowed }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      } else {
        setNotice({ type: "err", text: json?.message || "Gagal memperbarui hak akses perangkat." });
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleRolloutSingleDevice = async (
    release: FirmwareReleaseItem,
    device: OtaOverviewDevice
  ) => {
    setBusyKey(`rollout-${release.id}-${device.id}`);
    setNotice(null);
    try {
      const res = await fetch("/dashboard/ota/rollout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          release_id: release.id,
          device_ids: [device.id],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Rollout ditolak oleh validasi kompatibilitas." });
      } else {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        setNotice({
          type: "ok",
          text: `Rollout ${release.version} berhasil dikirim khusus ke ${device.device_code} (${device.pond_name}).`,
        });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRunSimulation = async () => {
    if (!simDeviceId || !simReleaseId) {
      setNotice({
        type: "err",
        text: "Pilih alat IoT dan rilis firmware terlebih dahulu (atau klik 'Buat Sampel Firmware Uji').",
      });
      return;
    }

    setBusyKey("simulate");
    setNotice(null);
    try {
      const res = await fetch("/dashboard/ota/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          device_id: simDeviceId,
          release_id: simReleaseId,
          scenario: simScenario,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Simulasi gagal dijalankan." });
      } else {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        if (json.simulation) setSimResult(json.simulation);
        setNotice({
          type: json.simulation?.passed ? "ok" : "err",
          text: json.simulation?.summary || "Simulasi selesai.",
        });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan saat menjalankan simulasi." });
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleRelease = async (release: FirmwareReleaseItem) => {
    setBusyKey(`toggle-${release.id}`);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/ota/releases/${release.id}/toggle`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (res.ok) {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      } else {
        setNotice({ type: "err", text: json?.message || "Gagal mengubah status rilis." });
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteRelease = async (release: FirmwareReleaseItem) => {
    if (!window.confirm(`Hapus rilis firmware ${release.version}?`)) return;
    setBusyKey(`del-${release.id}`);
    setNotice(null);
    try {
      const res = await fetch(`/dashboard/ota/releases/${release.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
      });
      const json = await res.json();
      if (res.ok) {
        if (json.overview) syncSelectionsFromOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      } else {
        setNotice({ type: "err", text: json?.message || "Gagal menghapus rilis." });
      }
    } finally {
      setBusyKey(null);
    }
  };

  const releases = overview?.releases || [];
  const rollouts = overview?.rollouts || [];
  const devices = overview?.devices || [];
  const stats = overview?.stats;

  const activeSimDevice = devices.find((d) => d.id === simDeviceId) || devices[0];
  const sampleToken =
    activeSimDevice?.plain_token ||
    activeSimDevice?.api_token_prefix ||
    "bw_dev_MASUKKAN_TOKEN_ALAT_DISINI";
  const sampleCode = activeSimDevice?.device_code || "ESP32-NODE-01";
  const sampleHw = activeSimDevice?.hardware_profile || "ESP32-WROOM-CoreHub-v2";

  const stateSteps = [
    {
      id: "1. ACL & COMPAT GATE",
      desc: "Server memvalidasi token alat (bw_dev_...), izin per-device (allowed_device_ids), kecocokan target_hardware, & versi minimum.",
    },
    {
      id: "2. SIGNED MANIFEST",
      desc: "Alat memeriksa pembaruan via /ws/ota atau GET /api/http/ota/check dan memverifikasi tanda tangan HMAC-SHA256.",
    },
    {
      id: "3. DOWNLOAD KE ota_1",
      desc: "Binary .bin diunduh ke partisi cadangan sambil menghitung stream SHA-256. Mismatch -> dibatalkan seketika.",
    },
    {
      id: "4. FLASH & TRIAL BOOT",
      desc: "esp_ota_set_boot_partition() menjadwalkan partisi baru sebagai trial boot lalu ESP32 restart.",
    },
    {
      id: "5. WATCHDOG 60s",
      desc: "Jika sensor, WiFi, & heap sehat 60 detik -> COMPLETED. Jika crash/timeout -> bootloader rollback otomatis ke ota_0.",
    },
  ];

  const esp32OtaCode = `#include <WiFi.h>
#include <WebSocketsClient.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include "esp_ota_ops.h"

// Terikat ketat pada 1 alat & profil hardware tertentu
const char* DEVICE_CODE      = "${sampleCode}";
const char* HARDWARE_PROFILE = "${sampleHw}";
const char* DEVICE_TOKEN     = "${sampleToken}";
const char* WS_HOST          = "${wsMeta.host}";
const uint16_t WS_PORT       = ${wsMeta.port};
const char* OTA_CHECK_URL    = "${origin}/api/http/ota/check";
const char* OTA_STATUS_URL   = "${origin}/api/http/ota/status";

WebSocketsClient wsOta;

void reportOtaStatus(int rolloutId, const char* status, int pct, bool healthOk, const char* err = nullptr) {
  StaticJsonDocument<256> doc;
  doc["type"] = "ota.status";
  doc["rollout_id"] = rolloutId;
  doc["status"] = status;
  doc["progress_pct"] = pct;
  doc["active_partition"] = esp_ota_get_running_partition()->label;
  doc["boot_health_ok"] = healthOk;
  if (err) doc["error_message"] = err;

  String body;
  serializeJson(doc, body);
  if (wsOta.isConnected()) { wsOta.sendTXT(body); return; }

  HTTPClient http;
  http.begin(OTA_STATUS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.POST(body);
  http.end();
}`;

  const cirkitSimulationCode = `// ============================================================================
// BANYUWENING DUAL-OTA SIMULATOR SKETCH (CIRKIT DESIGNER / WOKWI ESP32)
// Perangkat Target : ${sampleCode} (${sampleHw})
// Endpoint Server  : ${origin}
// ============================================================================
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID    = "Wokwi-GUEST";   // Ganti jika di Cirkit/WiFi lokal
const char* WIFI_PASS    = "";
const char* DEVICE_TOKEN = "${sampleToken}";
const char* OTA_CHECK    = "${origin}/api/http/ota/check";
const char* OTA_STATUS   = "${origin}/api/http/ota/status";

String currentPartition = "ota_0";
String currentFirmware  = "${activeSimDevice?.firmware_version || "v1.4.2-failsafe"}";

void sendStatus(int rolloutId, const char* st, int pct, bool ok, const char* err = nullptr) {
  HTTPClient http;
  http.begin(OTA_STATUS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  StaticJsonDocument<256> doc;
  doc["rollout_id"] = rolloutId;
  doc["status"] = st;
  doc["progress_pct"] = pct;
  doc["active_partition"] = currentPartition;
  doc["boot_health_ok"] = ok;
  if (err) doc["error_message"] = err;
  String out; serializeJson(doc, out);
  int code = http.POST(out);
  Serial.printf("[OTA STATUS] %s (%d%%) -> HTTP %d\\n", st, pct, code);
  http.end();
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print("."); }
  Serial.printf("\\n[READY] %s (${sampleHw}) Ver=%s\\n", "${sampleCode}", currentFirmware.c_str());

  // 1. Cek update firmware khusus token alat ini
  HTTPClient http;
  http.begin(OTA_CHECK);
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.GET();
  String payload = http.getString();
  http.end();

  Serial.printf("[CHECK] HTTP %d -> %s\\n", code, payload.c_str());
  StaticJsonDocument<1024> res;
  if (deserializeJson(res, payload) == DeserializationError::Ok && res["update_available"] == true) {
    int rolloutId = res["manifest"]["rollout_id"];
    String nextVer = res["manifest"]["version"].as<String>();
    String dlUrl   = res["manifest"]["download_url"].as<String>();

    sendStatus(rolloutId, "DOWNLOADING", 35, true);
    HTTPClient dl;
    dl.begin(dlUrl);
    dl.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
    int dlCode = dl.GET();
    dl.end();

    if (dlCode == 200) {
      sendStatus(rolloutId, "VERIFYING", 75, true);
      currentPartition = "ota_1";
      sendStatus(rolloutId, "HEALTH_CHECK", 90, true);
      delay(1500); // Simulasi boot health window
      currentFirmware = nextVer;
      sendStatus(rolloutId, "COMPLETED", 100, true);
      Serial.println("[OTA SUKSES] Firmware aktif: " + currentFirmware);
    } else {
      sendStatus(rolloutId, "FAILED", 0, false, "Download ditolak gerbang kompatibilitas/token");
    }
  }
}

void loop() { delay(10000); }`;

  const curlOtaCode = `# Target Alat IoT: ${sampleCode} (${sampleHw})
# 1. Cek manifest update khusus token alat ini:
curl -X GET ${origin}/api/http/ota/check \\
  -H "Authorization: Bearer ${sampleToken}"

# 2. Unduh binary (otomatis 403 bila token tidak diberi akses, atau 422 bila hardware tidak cocok):
curl -L -D - -o firmware_${sampleCode}.bin \\
  -H "Authorization: Bearer ${sampleToken}" \\
  ${origin}/api/http/ota/download/${releases[0]?.version || "v1.5.0-ota"}

# 3. Laporkan Boot Health Check 60s:
curl -X POST ${origin}/api/http/ota/status \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${sampleToken}" \\
  -d '{"rollout_id": 1, "status": "COMPLETED", "progress_pct": 100, "active_partition": "ota_1", "boot_health_ok": true}'`;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Ringkasan 5 Lapis Keamanan */}
      <div className="p-4 sm:p-6 bg-surface border border-line rounded-[6px] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
              <Cpu className="w-4 h-4 shrink-0" />
              <span>Dual-OTA Per Alat IoT · Token-Scoped ACL &amp; Compatibility Gate</span>
            </div>
            <h2 className="text-[18px] sm:text-[20px] font-display font-semibold text-ink">
              {isTenantMode
                ? "Update Firmware Alat IoT Saya (Self-OTA Terisolasi Tenant)"
                : "Manajemen Update Firmware ESP32 Per Perangkat IoT & Simulator OTA"}
            </h2>
            <p className="text-[13px] text-muted mt-1 max-w-3xl">
              {isTenantMode
                ? "Halaman ini terisolasi khusus untuk tenant/tambak Anda. Anda hanya melihat alat IoT yang ditugaskan kepada akun Anda dan dapat menjalankan pembaruan firmware maupun uji simulasi secara mandiri."
                : "Setiap alat IoT terisolasi ke tenant & akun peternak masing-masing, memiliki token unik (bw_dev_...) dan profil hardware tersendiri. Super Admin menentukan peternak penerima alat, versi firmware yang diizinkan, serta dapat menguji OTA lewat simulator."}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshOverview}
            disabled={loading}
            className="min-h-[40px] px-3.5 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-xs font-semibold text-ink inline-flex items-center gap-1.5 self-start lg:self-auto shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Muat Ulang Status</span>
          </button>
        </div>

        {/* Diagram State Machine */}
        <div className="pt-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5">
            5 Tahap Pengamanan &amp; Validasi Dual-OTA Per-Alat
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {stateSteps.map((s, idx) => (
              <div key={s.id} className="relative p-3 bg-bg border border-line rounded-[6px]">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono text-[11px] font-bold text-brand">{s.id}</span>
                  {idx < stateSteps.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted hidden md:block shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Statistik OTA */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "Total Rilis", val: stats.total_releases },
            { label: "Rilis Aktif", val: stats.active_releases },
            { label: "Total Rollout", val: stats.total_rollouts },
            { label: "Sedang Berjalan", val: stats.in_progress_rollouts },
            { label: "Selesai (Valid)", val: stats.completed_rollouts },
            { label: "Auto-Rollback", val: stats.rolled_back_rollouts },
          ].map((k) => (
            <div key={k.label} className="p-3.5 bg-surface border border-line rounded-[6px]">
              <div className="text-[11px] text-muted font-medium">{k.label}</div>
              <div className="text-[22px] font-semibold tnum text-ink mt-0.5">{k.val}</div>
            </div>
          ))}
        </div>
      )}

      {notice && (
        <div
          className={`p-3.5 rounded-[6px] border text-xs font-medium flex items-start gap-2 ${
            notice.type === "ok"
              ? "bg-aman-bg border-aman/30 text-aman-text"
              : "bg-bahaya-bg border-bahaya/30 text-bahaya-text"
          }`}
        >
          {notice.type === "ok" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* BAGIAN UTAMA BARU: KONTROL FIRMWARE & TOKEN PER ALAT IOT          */}
      {/* ================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand" />
              <span>Manajemen Akses &amp; Update Firmware Per Alat IoT ({devices.length} Node)</span>
            </h3>
            <p className="text-[12px] text-muted">
              Atur profil hardware tiap node, lihat token autentikasinya, pilih versi firmware mana yang boleh diakses
              alat tersebut, lalu kirim update khusus ke alat yang diinginkan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isTenantMode && (
              <button
                type="button"
                onClick={() => setShowAddDevice(!showAddDevice)}
                className="min-h-[36px] px-3 bg-brand text-brand-ink rounded-[6px] text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddDevice ? "Tutup Form Alat Baru" : "+ Daftarkan Alat IoT & Assign Akun"}</span>
              </button>
            )}
            {!isTenantMode && (
              <>
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    handleCreateSampleRelease(
                      "ESP32-WROOM-CoreHub-v2",
                      "v1.5.0-corehub",
                      devices.filter((d) => (d.hardware_profile || "ESP32-WROOM-CoreHub-v2") === "ESP32-WROOM-CoreHub-v2").map((d) => d.id)
                    )
                  }
                  className="min-h-[36px] px-3 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/25 rounded-[6px] text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Sampel Firmware CoreHub v2</span>
                </button>
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() =>
                    handleCreateSampleRelease(
                      "ESP32-S3-Juragan4K-v2",
                      "v2.0.0-s3-only",
                      devices.filter((d) => d.hardware_profile === "ESP32-S3-Juragan4K-v2").map((d) => d.id)
                    )
                  }
                  className="min-h-[36px] px-3 bg-surface-2 hover:bg-brand/10 text-ink border border-line rounded-[6px] text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-waspada" />
                  <span>+ Sampel Firmware Khusus ESP32-S3</span>
                </button>
              </>
            )}
          </div>
        </div>

        {issuedDeviceBanner && (
          <div className="p-3.5 rounded-[6px] bg-aman-bg border border-aman/30 text-xs space-y-1.5">
            <div className="font-semibold text-aman-text">
              Alat IoT {issuedDeviceBanner.code} berhasil didaftarkan &amp; diterbitkan token uniknya:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="px-2.5 py-1 rounded bg-surface border border-line font-mono text-ink break-all">
                {issuedDeviceBanner.token}
              </code>
              <button
                type="button"
                onClick={() => copyText(issuedDeviceBanner.token, "quick-dev-tok")}
                className="min-h-[32px] px-2.5 bg-brand text-brand-ink rounded text-[11px] font-semibold cursor-pointer"
              >
                {copiedKey === "quick-dev-tok" ? "Tersalin" : "Salin Token"}
              </button>
            </div>
          </div>
        )}

        {!isTenantMode && showAddDevice && (
          <form
            onSubmit={handleQuickRegisterDevice}
            className="p-4 sm:p-5 bg-surface border border-brand/35 rounded-[8px] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h4 className="text-[14px] font-semibold text-ink flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand" />
                <span>Daftarkan Alat IoT Baru &amp; Tentukan Akun Peternak Pemilik (Isolasi Tenant)</span>
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Kode Alat *</label>
                <input
                  type="text"
                  required
                  placeholder="ESP32-TAMBAK-B01"
                  value={regDeviceCode}
                  onChange={(e) => setRegDeviceCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Nama Perangkat *</label>
                <input
                  type="text"
                  required
                  placeholder="Node Tambak Pak Budi 01"
                  value={regDeviceName}
                  onChange={(e) => setRegDeviceName(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Nama Kolam *</label>
                <input
                  type="text"
                  required
                  placeholder="Kolam Bioflok B1"
                  value={regPondName}
                  onChange={(e) => setRegPondName(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Profil Hardware</label>
                <select
                  value={regHardwareProfile}
                  onChange={(e) => setRegHardwareProfile(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink cursor-pointer"
                >
                  {HARDWARE_PROFILES.map((hp) => (
                    <option key={hp.value} value={hp.value}>
                      {hp.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">Kode Tenant / Toko</label>
                <input
                  type="text"
                  placeholder="Otomatis mengikuti akun peternak"
                  value={regTenantCode}
                  onChange={(e) => setRegTenantCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
                />
              </div>
            </div>

            {users.filter((u) => u.role !== "ADMIN").length > 0 && (
              <div className="p-3 rounded-[6px] bg-surface-2 border border-line space-y-2">
                <div className="text-[11px] font-semibold text-ink">
                  Pilih Akun Peternak yang Diberi Akses Alat Ini (Peternak lain tidak akan melihat alat ini):
                </div>
                <div className="flex flex-wrap gap-2">
                  {users
                    .filter((u) => u.role !== "ADMIN")
                    .map((u) => {
                      const uid = Number(u.id);
                      const checked = regUserIds.includes(uid);
                      return (
                        <label
                          key={`reg-u-${uid}`}
                          className={`min-h-[34px] px-2.5 py-1 rounded-[6px] border text-[11.5px] inline-flex items-center gap-1.5 cursor-pointer ${
                            checked
                              ? "bg-brand/10 border-brand/40 text-ink font-semibold"
                              : "bg-surface border-line text-muted"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setRegUserIds((prev) =>
                                e.target.checked ? [...prev, uid] : prev.filter((x) => x !== uid)
                              );
                              if (e.target.checked && !regTenantCode && u.tenant_code) {
                                setRegTenantCode(u.tenant_code);
                              }
                            }}
                          />
                          <span>
                            {u.name} ({u.role} · {u.tenant_code || "TENANT-UTAMA"})
                          </span>
                        </label>
                      );
                    })}
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-ink pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regGrantOta}
                    onChange={(e) => setRegGrantOta(e.target.checked)}
                  />
                  <span>Beri izin akun terpilih untuk melakukan Update Firmware Mandiri (Self-OTA)</span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDevice(false)}
                className="h-9 px-3 border border-line rounded-[6px] text-xs font-medium text-muted cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busyKey === "register-device"}
                className="h-9 px-4 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {busyKey === "register-device" ? "Mendaftarkan..." : "Simpan Alat & Terbitkan Token"}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {devices.map((dev) => {
            const showFull = Boolean(revealedTokens[dev.id]);
            const tokenValue = showFull
              ? dev.plain_token || dev.api_token_prefix || "(token belum diterbitkan)"
              : dev.api_token_prefix || "(token belum diterbitkan)";

            return (
              <div
                key={dev.id}
                className="bg-surface border border-line rounded-[8px] p-4 sm:p-5 space-y-4 shadow-xs"
              >
                {/* Header Perangkat + Status */}
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-line">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[15px] text-ink">{dev.device_code}</span>
                      <span className="px-2 py-0.5 rounded bg-brand/10 text-brand font-mono text-[11px] font-semibold">
                        {dev.firmware_version}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                          dev.status === "ONLINE"
                            ? "bg-aman-bg text-aman-text"
                            : "bg-surface-2 text-muted"
                        }`}
                      >
                        {dev.status}
                      </span>
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {dev.name} · {dev.pond_name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-2 border border-line font-mono text-brand font-semibold">
                        <Building2 className="w-3 h-3" />
                        <span>{dev.tenant_code || "TENANT-UTAMA"}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-2 border border-line text-muted">
                        <Users className="w-3 h-3" />
                        <span>
                          {(dev.assigned_user_ids || []).length > 0
                            ? `${(dev.assigned_user_ids || []).length} akun diberi akses`
                            : "Khusus Super Admin"}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!isTenantMode && (
                      <button
                        type="button"
                        onClick={() => openDeviceAssignEditor(dev)}
                        className="min-h-[34px] px-2.5 rounded-[6px] text-[11px] font-semibold border border-line bg-surface-2 text-ink hover:border-brand/50 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Users className="w-3 h-3 text-brand" />
                        <span>Atur Tenant &amp; Akun</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSimDeviceId(dev.id)}
                      className={`min-h-[34px] px-2.5 rounded-[6px] text-[11px] font-semibold border cursor-pointer inline-flex items-center gap-1 ${
                        simDeviceId === dev.id
                          ? "bg-brand text-brand-ink border-brand"
                          : "bg-surface-2 text-ink border-line hover:border-brand/50"
                      }`}
                    >
                      <FlaskConical className="w-3 h-3" />
                      <span>{simDeviceId === dev.id ? "Terpilih di Simulator" : "Uji Alat Ini"}</span>
                    </button>
                  </div>
                </div>

                {/* Editor Penugasan Akun Peternak & Tenant untuk Alat Ini */}
                {!isTenantMode && editingAssignId === dev.id && (
                  <div className="p-3 rounded-[6px] bg-brand/5 border border-brand/30 space-y-2.5 text-xs">
                    <div className="font-semibold text-ink">
                      Atur Tenant &amp; Akun Peternak untuk {dev.device_code}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10.5px] font-semibold text-muted mb-1">
                          Kode Tenant
                        </label>
                        <input
                          type="text"
                          value={assignTenantCode}
                          onChange={(e) => setAssignTenantCode(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-[6px] bg-surface border border-line font-mono text-xs text-ink"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-[11.5px] text-ink pt-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignGrantOta}
                          onChange={(e) => setAssignGrantOta(e.target.checked)}
                        />
                        <span>Izinkan update firmware mandiri</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {users
                        .filter((u) => u.role !== "ADMIN")
                        .map((u) => {
                          const uid = Number(u.id);
                          const checked = assignUserIds.includes(uid);
                          return (
                            <label
                              key={`asgn-${dev.id}-${uid}`}
                              className={`px-2 py-1 rounded border text-[11px] inline-flex items-center gap-1.5 cursor-pointer ${
                                checked
                                  ? "bg-brand/15 border-brand text-ink font-semibold"
                                  : "bg-surface border-line text-muted"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setAssignUserIds((prev) =>
                                    e.target.checked ? [...prev, uid] : prev.filter((x) => x !== uid)
                                  )
                                }
                              />
                              <span>
                                {u.name} ({u.role})
                              </span>
                            </label>
                          );
                        })}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAssignId(null)}
                        className="h-8 px-2.5 rounded border border-line text-[11px] text-muted cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `assign-${dev.id}`}
                        onClick={() => handleSaveDeviceAssignment(dev)}
                        className="h-8 px-3 rounded bg-brand text-brand-ink text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {busyKey === `assign-${dev.id}` ? "Menyimpan..." : "Simpan Akses Tenant"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Token Unik Alat + Profil Hardware */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-[6px] bg-surface-2 border border-line space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-muted">
                      <span>Token Unik Alat ({dev.token_active ? "Aktif" : "Dicabut"})</span>
                      <div className="flex items-center gap-1.5">
                        {dev.plain_token && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedTokens((prev) => ({ ...prev, [dev.id]: !prev[dev.id] }))
                            }
                            className="text-muted hover:text-brand cursor-pointer p-0.5"
                            title={showFull ? "Sembunyikan token" : "Tampilkan token lengkap"}
                          >
                            {showFull ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {dev.plain_token && (
                          <button
                            type="button"
                            onClick={() => copyText(dev.plain_token!, `tok-${dev.id}`)}
                            className="text-muted hover:text-brand cursor-pointer p-0.5"
                            title="Salin token alat"
                          >
                            {copiedKey === `tok-${dev.id}` ? (
                              <Check className="w-3.5 h-3.5 text-aman" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-ink break-all">
                      {tokenValue}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-muted">
                      Profil Hardware IoT
                    </label>
                    <select
                      value={dev.hardware_profile}
                      disabled={busyKey === `hw-${dev.id}`}
                      onChange={(e) => handleUpdateDeviceProfile(dev, e.target.value)}
                      className="w-full min-h-[42px] px-2.5 rounded-[6px] bg-surface-2 border border-line text-[11.5px] font-medium text-ink cursor-pointer"
                    >
                      {HARDWARE_PROFILES.map((hp) => (
                        <option key={hp.value} value={hp.value}>
                          {hp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Matriks Versi Firmware yang Boleh Diakses Alat Ini */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Versi Firmware Tersedia &amp; Hak Akses Alat Ini
                  </div>
                  {releases.length === 0 ? (
                    <div className="p-3 rounded-[6px] border border-dashed border-line text-[12px] text-muted text-center">
                      Belum ada rilis firmware. Unggah file `.bin` atau klik tombol <strong>+ Sampel Firmware CoreHub v2</strong> di atas.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
                      {releases.map((rel) => {
                        const compat = checkClientCompat(dev, rel);
                        const isCurrent = dev.firmware_version === rel.version;

                        return (
                          <div
                            key={`${dev.id}-${rel.id}`}
                            className={`p-3 rounded-[6px] border text-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                              !compat.compatible
                                ? "bg-bahaya-bg/40 border-bahaya/30"
                                : compat.authorized
                                ? "bg-aman-bg/35 border-aman/30"
                                : "bg-surface-2/70 border-line"
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-ink">{rel.version}</span>
                                <span className="px-1.5 py-0.2 rounded bg-surface border border-line text-[10px] font-mono text-muted">
                                  {rel.target_hardware}
                                </span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded bg-brand text-brand-ink text-[10px] font-semibold">
                                    Terpasang
                                  </span>
                                )}
                              </div>
                              {!compat.compatible ? (
                                <div className="text-[11px] text-bahaya-text flex items-center gap-1 font-medium">
                                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    Tidak Support: {compat.reasons.filter((r) => !r.includes("Token alat")).join(" · ")}
                                  </span>
                                </div>
                              ) : compat.authorized ? (
                                <div className="text-[11px] text-aman-text flex items-center gap-1 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Kompatibel &amp; Token alat ini diberi akses unduh/update.</span>
                                </div>
                              ) : (
                                <div className="text-[11px] text-muted">
                                  Kompatibel dengan hardware ini, namun akses token belum diberikan.
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isTenantMode && (
                                <button
                                  type="button"
                                  disabled={!compat.compatible || busyKey === `acc-${rel.id}-${dev.id}`}
                                  onClick={() => handleToggleDeviceReleaseAccess(rel, dev.id)}
                                  className={`min-h-[36px] px-2.5 rounded-[6px] border text-[11px] font-semibold cursor-pointer disabled:opacity-40 ${
                                    compat.authorized
                                      ? "bg-surface border-line text-ink hover:bg-bahaya/10 hover:text-bahaya"
                                      : "bg-surface border-brand/40 text-brand hover:bg-brand/10"
                                  }`}
                                >
                                  {compat.authorized ? "Cabut Akses" : "Beri Akses"}
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={
                                  !rel.is_active ||
                                  !compat.compatible ||
                                  (isTenantMode && !compat.authorized) ||
                                  busyKey === `rollout-${rel.id}-${dev.id}`
                                }
                                onClick={() => handleRolloutSingleDevice(rel, dev)}
                                className="min-h-[36px] px-2.5 bg-brand text-brand-ink rounded-[6px] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                                title={
                                  !compat.compatible
                                    ? "Tidak dapat rollout karena hardware atau versi minimum tidak cocok"
                                    : `Push firmware ${rel.version} khusus ke ${dev.device_code}`
                                }
                              >
                                <Rocket className="w-3 h-3" />
                                <span>Push Update</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* LABORATORIUM UJI & SIMULATOR UPDATE FIRMWARE DUAL-OTA              */}
      {/* ================================================================= */}
      <div className="p-4 sm:p-6 bg-surface border border-brand/35 rounded-[8px] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <div className="flex items-center gap-2 text-brand text-xs font-semibold uppercase tracking-wider mb-1">
              <FlaskConical className="w-4 h-4" />
              <span>Laboratorium Uji &amp; Simulasi Protokol OTA ESP32</span>
            </div>
            <h3 className="text-[16px] font-semibold text-ink">
              Uji End-to-End Update Firmware, Proteksi Kompatibilitas, SHA-256 &amp; Rollback 60s
            </h3>
            <p className="text-[12px] text-muted mt-0.5">
              Simulasi ini menguji alur protokol <code>banyuwening.ota.v1</code> secara langsung dengan token alat asli untuk mendeteksi bug sebelum deployment lapangan.
            </p>
          </div>
          <button
            type="button"
            disabled={busyKey === "simulate" || releases.length === 0 || devices.length === 0}
            onClick={handleRunSimulation}
            className="min-h-[42px] px-4 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{busyKey === "simulate" ? "Menjalankan Simulasi..." : "Jalankan Simulasi OTA"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              1. Pilih Alat IoT Target (Beserta Token-nya)
            </label>
            <select
              value={simDeviceId}
              onChange={(e) => setSimDeviceId(Number(e.target.value))}
              className="w-full min-h-[42px] px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink cursor-pointer"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.device_code} ({d.hardware_profile} · {d.firmware_version})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              2. Pilih Versi Firmware Target
            </label>
            <select
              value={simReleaseId}
              onChange={(e) => setSimReleaseId(Number(e.target.value))}
              className="w-full min-h-[42px] px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink cursor-pointer"
            >
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.version} ({r.target_hardware})
                </option>
              ))}
              {releases.length === 0 && <option value={0}>Belum ada rilis firmware</option>}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              3. Pilih Skenario Pengujian Bug/Error
            </label>
            <select
              value={simScenario}
              onChange={(e) => setSimScenario(e.target.value as any)}
              className="w-full min-h-[42px] px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink cursor-pointer"
            >
              <option value="NORMAL_SUCCESS">1. Update Normal sampai Selesai (COMPLETED)</option>
              <option value="INCOMPATIBLE_BLOCKED">2. Uji Blokir Alat Tidak Support / Tanpa Akses (403/422)</option>
              <option value="CHECKSUM_TAMPERED">3. Uji File .bin Corrupt / SHA-256 Mismatch (Batal Flash)</option>
              <option value="WATCHDOG_ROLLBACK_60S">4. Uji Gagal Boot 60s -&gt; Auto-Rollback Partisi ota_0</option>
            </select>
          </div>
        </div>

        {simResult && (
          <div className="p-4 rounded-[6px] bg-surface-2 border border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-line">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                {simResult.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-aman shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-bahaya shrink-0" />
                )}
                <span>{simResult.summary}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-surface border border-line">
                  HTTP {simResult.http_status}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface border border-line">
                  Partisi: {simResult.active_partition}
                </span>
                <span className="px-2 py-0.5 rounded bg-brand/10 text-brand font-bold">
                  Ver Akhir: {simResult.final_device_version}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {simResult.steps.map((st) => (
                <div key={st.step} className="p-2.5 rounded-[4px] bg-surface border border-line text-[11.5px]">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-mono font-bold text-brand">{st.step}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold ${
                        st.status === "OK"
                          ? "bg-aman-bg text-aman-text"
                          : st.status === "ROLLED_BACK"
                          ? "bg-waspada-bg text-waspada-text"
                          : "bg-bahaya-bg text-bahaya-text"
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>
                  <p className="text-muted leading-snug">{st.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manajemen Rilis & Upload Firmware Binary (Khusus Super Admin) */}
      {!isTenantMode && (
      <form
        onSubmit={handleUploadRelease}
        className="p-4 sm:p-5 bg-surface border border-line rounded-[6px] space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand" />
            <h3 className="text-[15px] font-semibold text-ink">
              Unggah Binary Firmware ESP32 (.bin) &amp; Tentukan Alat Penerima
            </h3>
          </div>
          <span className="text-[11px] text-muted">Maks. 16 MB · SHA-256 &amp; HMAC otomatis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Versi Firmware
            </label>
            <input
              type="text"
              required
              placeholder="v1.5.0-ota"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "stable" | "beta" | "canary")}
              className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            >
              <option value="stable">stable (Produksi)</option>
              <option value="beta">beta (Pilot Kolam)</option>
              <option value="canary">canary (Uji Terbatas)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Target Hardware yang Didukung
            </label>
            <select
              value={targetHw}
              onChange={(e) => setTargetHw(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
            >
              {HARDWARE_PROFILES.map((hp) => (
                <option key={hp.value} value={hp.value}>
                  {hp.value}
                </option>
              ))}
              <option value="*">* (Universal Semua Hardware)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Batas Rollback Watchdog (detik)
            </label>
            <input
              type="number"
              min={15}
              max={300}
              value={rollbackTimeout}
              onChange={(e) => setRollbackTimeout(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs tnum text-ink"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              File Binary (.bin)
            </label>
            <input
              type="file"
              accept=".bin,application/octet-stream"
              onChange={(e) => setBinaryFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-ink file:mr-3 file:py-1.5 file:px-3 file:rounded-[4px] file:border file:border-line file:text-xs file:font-semibold file:bg-surface-2 file:text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Versi Minimum Sebelumnya (Opsional)
            </label>
            <input
              type="text"
              placeholder="v1.4.0-failsafe"
              value={minPrevVersion}
              onChange={(e) => setMinPrevVersion(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Catatan Rilis (Changelog)
            </label>
            <input
              type="text"
              placeholder="Perbaikan watchdog ADS1115 & retry HTTP OTA"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs text-ink"
            />
          </div>
        </div>

        {/* Checklist Perangkat yang Diberi Akses Rilis Baru Ini */}
        <div className="p-3 rounded-[6px] bg-surface-2 border border-line space-y-2">
          <div className="text-[11px] font-semibold text-ink">
            Pilih Alat IoT yang Diberi Akses ke Firmware Ini (Token Scoped):
          </div>
          <div className="flex flex-wrap gap-2">
            {devices.map((d) => {
              const checked = uploadAllowedDeviceIds.includes(d.id);
              const hwMatches =
                targetHw === "*" ||
                (d.hardware_profile || "ESP32-WROOM-CoreHub-v2").toLowerCase() === targetHw.toLowerCase();
              return (
                <label
                  key={`up-${d.id}`}
                  className={`min-h-[36px] px-3 py-1.5 rounded-[6px] border text-[11.5px] font-mono inline-flex items-center gap-2 cursor-pointer ${
                    !hwMatches
                      ? "bg-bahaya-bg/30 border-bahaya/30 text-muted"
                      : checked
                      ? "bg-brand/10 border-brand/40 text-ink font-semibold"
                      : "bg-surface border-line text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setUploadAllowedDeviceIds((prev) =>
                        e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                      )
                    }
                  />
                  <span>
                    {d.device_code} ({d.hardware_profile})
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="rounded border-line"
            />
            <span>Rilis wajib (Mandatory Security/Safety Patch)</span>
          </label>
          <button
            type="submit"
            disabled={busyKey === "upload"}
            className="min-h-[40px] px-4 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{busyKey === "upload" ? "Mengunggah..." : "Unggah & Sign Firmware"}</span>
          </button>
        </div>
      </form>
      )}

      {/* Tabel Daftar Rilis Firmware & Status Rollout (Khusus Super Admin) */}
      {!isTenantMode && (
      <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">
            Daftar Rilis Firmware &amp; Alat Terotorisasi ({releases.length})
          </h3>
          <span className="text-[11px] text-muted">Klik tombol Aktif/Nonaktif atau Hapus rilis</span>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-line">
          {releases.map((r) => (
            <div key={`m-rel-${r.id}`} className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-ink">{r.version}</div>
                  <div className="text-[11px] text-muted">
                    {r.target_hardware} · {(r.allowed_device_ids || []).length} alat diizinkan
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyKey === `toggle-${r.id}`}
                    onClick={() => handleToggleRelease(r)}
                    className="min-h-[36px] px-2.5 bg-surface-2 border border-line text-ink rounded-[4px] text-[11px] font-semibold cursor-pointer"
                  >
                    {r.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === `del-${r.id}`}
                    onClick={() => handleDeleteRelease(r)}
                    className="min-h-[36px] px-2 text-bahaya bg-bahaya/10 rounded-[4px] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-4 py-2.5">Versi &amp; Target Hardware</th>
                <th className="px-4 py-2.5">Alat Diizinkan</th>
                <th className="px-4 py-2.5">Ukuran &amp; SHA-256</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {releases.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/40">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-ink">
                      {r.version}{" "}
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-2 border border-line text-[10px] uppercase">
                        {r.channel}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-brand mt-0.5">{r.target_hardware}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink">
                    {(r.allowed_device_ids || []).length} / {devices.length} node
                  </td>
                  <td className="px-4 py-3 font-mono text-[10.5px] text-muted">
                    <div>{(r.file_size_bytes / 1024).toFixed(1)} KB · {r.rollback_timeout_s}s</div>
                    <div>SHA: {r.sha256_checksum.slice(0, 16)}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-[4px] text-[10px] font-semibold ${
                        r.is_active ? "bg-aman-bg text-aman-text" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {r.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyKey === `toggle-${r.id}`}
                        onClick={() => handleToggleRelease(r)}
                        className="h-8 px-2.5 bg-surface-2 border border-line text-ink rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Power className="w-3 h-3" />
                        <span>{r.is_active ? "Nonaktifkan" : "Aktifkan"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `del-${r.id}`}
                        onClick={() => handleDeleteRelease(r)}
                        className="h-8 px-2 text-muted hover:text-bahaya rounded-[4px] cursor-pointer"
                        title="Hapus Rilis"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {releases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    Belum ada rilis binary firmware `.bin` diunggah.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Tabel Riwayat Rollout Perangkat */}
      <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-line flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">
            Riwayat &amp; Progres Rollout Dual-OTA Perangkat
          </h3>
          <span className="text-[11px] text-muted">WS /ws/ota, HTTP Fallback &amp; Simulator</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-4 py-2.5">Perangkat</th>
                <th className="px-4 py-2.5">Transisi Versi</th>
                <th className="px-4 py-2.5">Partisi &amp; Transport</th>
                <th className="px-4 py-2.5">Progres</th>
                <th className="px-4 py-2.5">Status &amp; Boot Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rollouts.map((ro) => {
                const isBad = ro.status === "ROLLED_BACK" || ro.status === "FAILED";
                const isDone = ro.status === "COMPLETED";
                return (
                  <tr key={ro.id} className="hover:bg-surface-2/40">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-ink">{ro.device_code}</div>
                      <div className="text-[11px] text-muted">{ro.pond_name}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink">
                      {ro.from_version || "-"} → <strong>{ro.to_version}</strong>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">
                      <div>Partisi: {ro.active_partition || "-"}</div>
                      <div>Transport: {ro.transport}</div>
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="text-[11px] tnum mb-1">{ro.progress_pct}%</div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isBad ? "bg-bahaya" : isDone ? "bg-aman" : "bg-brand"
                          }`}
                          style={{ width: `${ro.progress_pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-semibold ${
                          isDone
                            ? "bg-aman-bg text-aman-text"
                            : isBad
                            ? "bg-bahaya-bg text-bahaya-text"
                            : "bg-waspada-bg text-waspada-text"
                        }`}
                      >
                        {isBad && <AlertTriangle className="w-3 h-3" />}
                        {ro.status}
                      </span>
                      {ro.error_message && (
                        <div className="text-[11px] text-bahaya-text mt-1">{ro.error_message}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rollouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    Belum ada riwayat rollout firmware OTA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kode Firmware ESP32 & Sketch Simulasi Cirkit Designer / Wokwi */}
      <div className="bg-surface border border-line rounded-[6px] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-brand shrink-0" />
            <h3 className="text-sm font-semibold text-ink">
              Kode ESP32 &amp; Sketch Simulasi Cirkit / Wokwi (Otomatis Memakai Token {sampleCode})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSnippetTab("esp32")}
              className={`min-h-[36px] px-3 py-1 rounded-[4px] text-xs font-semibold cursor-pointer whitespace-nowrap ${
                snippetTab === "esp32" ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
              }`}
            >
              ESP32 C++ (Dual-OTA)
            </button>
            <button
              type="button"
              onClick={() => setSnippetTab("cirkit")}
              className={`min-h-[36px] px-3 py-1 rounded-[4px] text-xs font-semibold cursor-pointer whitespace-nowrap ${
                snippetTab === "cirkit" ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
              }`}
            >
              Simulasi Cirkit / Wokwi
            </button>
            <button
              type="button"
              onClick={() => setSnippetTab("curl")}
              className={`min-h-[36px] px-3 py-1 rounded-[4px] text-xs font-semibold cursor-pointer whitespace-nowrap ${
                snippetTab === "curl" ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
              }`}
            >
              cURL Fallback
            </button>
            <button
              type="button"
              onClick={() =>
                copyText(
                  snippetTab === "esp32"
                    ? esp32OtaCode
                    : snippetTab === "cirkit"
                    ? cirkitSimulationCode
                    : curlOtaCode,
                  "ota-code"
                )
              }
              className="min-h-[36px] px-2.5 py-1 text-xs text-muted hover:text-brand inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              {copiedKey === "ota-code" ? (
                <Check className="w-3.5 h-3.5 text-aman" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === "ota-code" ? "Tersalin" : "Salin"}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 bg-surface-2 border border-line rounded-[6px] text-[11.5px] font-mono text-ink overflow-x-auto leading-relaxed">
          {snippetTab === "esp32"
            ? esp32OtaCode
            : snippetTab === "cirkit"
            ? cirkitSimulationCode
            : curlOtaCode}
        </pre>
      </div>
    </div>
  );
}
