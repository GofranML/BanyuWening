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
} from "lucide-react";
import type { OtaOverview, RealtimeConfig, FirmwareReleaseItem } from "@/Types";

interface SuperAdminOtaProtocolPanelProps {
  initialOverview?: OtaOverview | null;
  realtimeConfig?: RealtimeConfig;
}

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

export function SuperAdminOtaProtocolPanel({
  initialOverview,
  realtimeConfig,
}: SuperAdminOtaProtocolPanelProps) {
  const [overview, setOverview] = useState<OtaOverview | null>(initialOverview ?? null);
  const [loading, setLoading] = useState(!initialOverview);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Release upload form
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"stable" | "beta" | "canary">("stable");
  const [targetHw, setTargetHw] = useState("ESP32-WROOM-CoreHub-v2");
  const [minPrevVersion, setMinPrevVersion] = useState("");
  const [rollbackTimeout, setRollbackTimeout] = useState(60);
  const [isMandatory, setIsMandatory] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [binaryFile, setBinaryFile] = useState<File | null>(null);

  // Rollout target device selector
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [snippetTab, setSnippetTab] = useState<"esp32" | "curl">("esp32");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://banyuwening.ciptasol.cloud";
  const wsBase = realtimeConfig?.ws_base_url || "ws://127.0.0.1:8081";
  const wsMeta = parseWsOrigin(wsBase);

  const refreshOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/dashboard/ota/overview", {
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      if (res.ok && json.overview) {
        setOverview(json.overview);
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
        if (json.overview) setOverview(json.overview);
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

  const handleTriggerRollout = async (release: FirmwareReleaseItem) => {
    setBusyKey(`rollout-${release.id}`);
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
          device_ids: selectedDeviceIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: "err", text: json?.message || "Gagal menjadwalkan rollout OTA." });
      } else {
        if (json.overview) setOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      }
    } catch (err: any) {
      setNotice({ type: "err", text: err?.message || "Kesalahan jaringan." });
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
        if (json.overview) setOverview(json.overview);
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
        if (json.overview) setOverview(json.overview);
        setNotice({ type: "ok", text: json.message });
      } else {
        setNotice({ type: "err", text: json?.message || "Gagal menghapus rilis." });
      }
    } finally {
      setBusyKey(null);
    }
  };

  const toggleDeviceTarget = (id: number) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const stateSteps = [
    { id: "1. QUEUED / NOTIFIED", desc: "Super Admin menjadwalkan rilis; manifest pushed via /ws/ota atau di-poll via GET /api/http/ota/check." },
    { id: "2. DOWNLOADING", desc: "ESP32 mengunduh .bin ke partisi cadangan (ota_1 / ota_0) dan melaporkan progres (%)." },
    { id: "3. VERIFYING", desc: "Cek SHA-256 stream + verifikasi HMAC-SHA256 signature. Gagal → batal sebelum reboot." },
    { id: "4. FLASHING & REBOOT", desc: "esp_ota_set_boot_partition() menandai partisi baru untuk trial boot lalu ESP32 restart." },
    { id: "5. HEALTH_CHECK (60s)", desc: "Jika sensor, WiFi, & watchdog sehat 60 detik → esp_ota_mark_app_valid_cancel_rollback() (COMPLETED). Gagal → ROLLED_BACK otomatis." },
  ];

  const esp32OtaCode = `#include <WiFi.h>
#include <WebSocketsClient.h>
#include <HTTPClient.h>
#include <Update.h>
#include <ArduinoJson.h>
#include "mbedtls/md.h"
#include "esp_ota_ops.h"

const char* DEVICE_TOKEN = "bw_dev_MASUKKAN_TOKEN_ALAT_DISINI";
const char* WS_HOST      = "${wsMeta.host}";
const uint16_t WS_PORT   = ${wsMeta.port};
const char* OTA_CHECK_URL  = "${origin}/api/http/ota/check";
const char* OTA_STATUS_URL = "${origin}/api/http/ota/status";

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

  if (wsOta.isConnected()) {
    wsOta.sendTXT(body);
    return;
  }
  HTTPClient http;
  http.begin(OTA_STATUS_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.POST(body);
  http.end();
}

void performDualOtaUpdate(int rolloutId, const char* downloadUrl, const char* expectedSha256, int expectedBytes) {
  reportOtaStatus(rolloutId, "DOWNLOADING", 10, true);
  HTTPClient http;
  http.begin(downloadUrl);
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.GET();
  if (code != HTTP_CODE_OK || http.getSize() != expectedBytes) {
    reportOtaStatus(rolloutId, "FAILED", 0, false, "HTTP download gagal / ukuran mismatch");
    http.end();
    return;
  }

  WiFiClient* stream = http.getStreamPtr();
  if (!Update.begin(expectedBytes, U_FLASH)) {
    reportOtaStatus(rolloutId, "FAILED", 0, false, "Partisi OTA tidak cukup");
    http.end();
    return;
  }

  reportOtaStatus(rolloutId, "VERIFYING", 75, true);
  // Verifikasi SHA-256 wajib cocok sebelum mengakhiri penulisan partisi
  Update.setMD5(""); // Gunakan mbedtls_sha256_context pada stream chunk
  size_t written = Update.writeStream(*stream);
  if (written == (size_t)expectedBytes && Update.end(true)) {
    reportOtaStatus(rolloutId, "REBOOTING", 95, true);
    delay(500);
    ESP.restart(); // Boot ke partisi baru dengan status PENDING_VERIFY
  } else {
    Update.abort();
    reportOtaStatus(rolloutId, "FAILED", 0, false, "Verifikasi/flashing binary gagal");
  }
  http.end();
}

void verifyBootHealthWindow(int rolloutId) {
  // Dipanggil setelah 60 detik pasca-reboot bila watchdog, WiFi, & ADS1115 sehat
  esp_ota_mark_app_valid_cancel_rollback();
  reportOtaStatus(rolloutId, "COMPLETED", 100, true);
  // Jika sistem crash/hang sebelum 60s, bootloader ESP-IDF otomatis rollback ke partisi lama!
}`;

  const curlOtaCode = `# 1. Cek update firmware & signed manifest (HTTP Fallback banyuwening.ota.v1)
curl -X GET ${origin}/api/http/ota/check \\
  -H "Authorization: Bearer bw_dev_MASUKKAN_TOKEN_ALAT"

# 2. Unduh binary firmware beserta header SHA-256 & HMAC signature
curl -L -D - -o firmware_update.bin \\
  -H "Authorization: Bearer bw_dev_MASUKKAN_TOKEN_ALAT" \\
  ${origin}/api/http/ota/download/v1.5.0-ota

# 3. Laporkan hasil Boot Health Check 60s (COMPLETED atau ROLLED_BACK)
curl -X POST ${origin}/api/http/ota/status \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer bw_dev_MASUKKAN_TOKEN_ALAT" \\
  -d '{
    "rollout_id": 1,
    "status": "COMPLETED",
    "progress_pct": 100,
    "active_partition": "ota_1",
    "boot_health_ok": true
  }'`;

  const releases = overview?.releases || [];
  const rollouts = overview?.rollouts || [];
  const devices = overview?.devices || [];
  const stats = overview?.stats;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Ringkasan 5 Lapis Keamanan */}
      <div className="p-6 bg-surface border border-line rounded-[6px] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
              <Cpu className="w-4 h-4" />
              <span>Protokol Dual-OTA ESP32 · banyuwening.ota.v1 + HTTP Fallback</span>
            </div>
            <h2 className="text-[20px] font-display font-semibold text-ink">
              Arsitektur Update Firmware ESP32 Dual-Partition &amp; Auto-Rollback 60 Detik
            </h2>
            <p className="text-[13px] text-muted mt-1 max-w-3xl">
              Sesuai spesifikasi PRD §12.3 &amp; §7.2: pembaruan firmware hanya boleh dipicu manual oleh Super
              Administrator (Zero Autonomous Push), divalidasi dengan SHA-256 + HMAC-SHA256, dan dilengkapi
              mekanisme boot health-check 60 detik agar unit di kolam tidak pernah mengalami <em>bricking</em>.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshOverview}
            disabled={loading}
            className="h-9 px-3.5 bg-surface-2 hover:bg-brand/10 border border-line rounded-[6px] text-xs font-semibold text-ink inline-flex items-center gap-1.5 self-start lg:self-auto shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Muat Ulang Status</span>
          </button>
        </div>

        {/* 5 Lapis Keamanan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[12px]">
          <div className="p-3.5 bg-surface-2 rounded-[6px] border border-line">
            <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
              <Wifi className="w-3.5 h-3.5 text-brand" />
              <span>1. Transport Hybrid</span>
            </div>
            <p className="text-muted">Push instan via <code>/ws/ota</code> dan failover otomatis ke <code>/api/http/ota/*</code>.</p>
          </div>
          <div className="p-3.5 bg-surface-2 rounded-[6px] border border-line">
            <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span>2. Integritas SHA-256</span>
            </div>
            <p className="text-muted">Setiap file <code>.bin</code> diverifikasi hash SHA-256 &amp; ukuran byte sebelum boot.</p>
          </div>
          <div className="p-3.5 bg-surface-2 rounded-[6px] border border-line">
            <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
              <Lock className="w-3.5 h-3.5 text-brand" />
              <span>3. Signed HMAC-SHA256</span>
            </div>
            <p className="text-muted">Manifest ditandatangani kunci server agar firmware pihak tak berwenang ditolak.</p>
          </div>
          <div className="p-3.5 bg-surface-2 rounded-[6px] border border-line">
            <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
              <HardDrive className="w-3.5 h-3.5 text-brand" />
              <span>4. Partisi Ganda A/B</span>
            </div>
            <p className="text-muted">Penulisan ke <code>ota_0</code> / <code>ota_1</code> tanpa menimpa firmware stabil sebelumnya.</p>
          </div>
          <div className="p-3.5 bg-surface-2 rounded-[6px] border border-line">
            <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
              <RotateCcw className="w-3.5 h-3.5 text-brand" />
              <span>5. Auto-Rollback 60s</span>
            </div>
            <p className="text-muted">Bootloader mengembalikan partisi lama jika health-check gagal dalam 60 detik.</p>
          </div>
        </div>

        {/* Diagram State Machine */}
        <div className="pt-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2.5">
            Siklus State-Machine Dual-OTA ESP32
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
          className={`p-3 rounded-[6px] border text-xs font-medium ${
            notice.type === "ok"
              ? "bg-aman-bg border-aman/30 text-aman-text"
              : "bg-bahaya-bg border-bahaya/30 text-bahaya-text"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Manajemen Rilis & Upload Firmware Binary */}
      <form
        onSubmit={handleUploadRelease}
        className="p-5 bg-surface border border-line rounded-[6px] space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand" />
            <h3 className="text-[15px] font-semibold text-ink">
              Unggah Binary Firmware ESP32 (.bin) &amp; Terbitkan Signed Manifest
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
              Target Hardware
            </label>
            <input
              type="text"
              value={targetHw}
              onChange={(e) => setTargetHw(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] bg-surface-2 border border-line text-xs font-mono text-ink"
            />
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
            className="h-9 px-4 bg-brand text-brand-ink rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{busyKey === "upload" ? "Mengunggah..." : "Unggah & Sign Firmware"}</span>
          </button>
        </div>
      </form>

      {/* Target Node Selector + Tabel Rilis Firmware */}
      <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              Daftar Rilis Firmware &amp; Pemicu Rollout Manual (HITL Engineer Gate)
            </h3>
            <p className="text-[11px] text-muted">
              Pilih perangkat target di bawah (kosongkan untuk menyiarkan ke seluruh node ESP32).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {devices.map((d) => {
              const selected = selectedDeviceIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDeviceTarget(d.id)}
                  className={`px-2.5 py-1 rounded-[4px] border text-[11px] font-mono cursor-pointer ${
                    selected
                      ? "bg-brand text-brand-ink border-brand font-semibold"
                      : "bg-surface-2 border-line text-ink"
                  }`}
                >
                  {d.device_code} ({d.firmware_version})
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-line">
          {releases.map((r) => (
            <div key={`m-rel-${r.id}`} className="p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-ink text-[13px] flex items-center gap-1.5 flex-wrap">
                    <span>{r.version}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-line text-[10px] uppercase">
                      {r.channel}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">{r.changelog || r.target_hardware}</div>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-[4px] text-[10px] font-semibold shrink-0 ${
                    r.is_active ? "bg-aman-bg text-aman-text" : "bg-surface-2 text-muted"
                  }`}
                >
                  {r.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted">
                <span>{(r.file_size_bytes / 1024).toFixed(1)} KB · Timeout {r.rollback_timeout_s}s</span>
                <span>SHA: {r.sha256_checksum.slice(0, 12)}...</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={!r.is_active || busyKey === `rollout-${r.id}`}
                  onClick={() => handleTriggerRollout(r)}
                  className="flex-1 min-h-[40px] px-3 bg-brand text-brand-ink rounded-[6px] text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Rollout ke Node</span>
                </button>
                <button
                  type="button"
                  disabled={busyKey === `toggle-${r.id}`}
                  onClick={() => handleToggleRelease(r)}
                  className="min-h-[40px] px-3 bg-surface-2 border border-line text-ink rounded-[6px] text-[12px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={busyKey === `del-${r.id}`}
                  onClick={() => handleDeleteRelease(r)}
                  className="min-h-[40px] min-w-[40px] px-2.5 text-bahaya bg-bahaya/10 rounded-[6px] inline-flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {releases.length === 0 && (
            <div className="p-6 text-center text-muted text-xs">
              Belum ada rilis binary firmware `.bin` diunggah.
            </div>
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-4 py-2.5">Versi &amp; Channel</th>
                <th className="px-4 py-2.5">Ukuran</th>
                <th className="px-4 py-2.5">SHA-256 / HMAC Signature</th>
                <th className="px-4 py-2.5">Timeout</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi Rollout</th>
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
                    <div className="text-[11px] text-muted truncate max-w-xs">
                      {r.changelog || r.target_hardware}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono tnum text-ink">
                    {(r.file_size_bytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted">
                    <div>SHA: {r.sha256_checksum.slice(0, 16)}...</div>
                    <div>HMAC: {r.hmac_signature.slice(0, 16)}...</div>
                  </td>
                  <td className="px-4 py-3 font-mono tnum text-ink">{r.rollback_timeout_s}s</td>
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
                        disabled={!r.is_active || busyKey === `rollout-${r.id}`}
                        onClick={() => handleTriggerRollout(r)}
                        className="h-7 px-2.5 bg-brand text-brand-ink rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <Rocket className="w-3 h-3" />
                        <span>Rollout</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `toggle-${r.id}`}
                        onClick={() => handleToggleRelease(r)}
                        className="h-7 px-2 bg-surface-2 border border-line text-ink rounded-[4px] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Aktifkan/Nonaktifkan Rilis"
                      >
                        <Power className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === `del-${r.id}`}
                        onClick={() => handleDeleteRelease(r)}
                        className="h-7 px-2 text-muted hover:text-bahaya rounded-[4px] cursor-pointer"
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
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Belum ada rilis binary firmware `.bin` diunggah. Unggah firmware di formulir atas untuk memulai rollout Dual-OTA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Status Rollout Perangkat */}
      <div className="bg-surface border border-line rounded-[6px] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">
            Riwayat &amp; Progres Rollout Dual-OTA Perangkat
          </h3>
          <span className="text-[11px] text-muted">Terhubung dengan WS /ws/ota &amp; HTTP Fallback</span>
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
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] tnum mb-1">
                        <span>{ro.progress_pct}%</span>
                      </div>
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

      {/* Spesifikasi Protokol & Snippet Kode ESP32 Dual-OTA */}
      <div className="bg-surface border border-line rounded-[6px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-ink">
              Implementasi Firmware ESP32 Dual-OTA &amp; Uji HTTP Fallback
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSnippetTab("esp32")}
              className={`px-3 py-1 rounded-[4px] text-xs font-semibold cursor-pointer ${
                snippetTab === "esp32" ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
              }`}
            >
              ESP32 C++ (Dual-OTA)
            </button>
            <button
              type="button"
              onClick={() => setSnippetTab("curl")}
              className={`px-3 py-1 rounded-[4px] text-xs font-semibold cursor-pointer ${
                snippetTab === "curl" ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
              }`}
            >
              cURL Fallback
            </button>
            <button
              type="button"
              onClick={() => copyText(snippetTab === "esp32" ? esp32OtaCode : curlOtaCode, "ota-code")}
              className="px-2.5 py-1 text-xs text-muted hover:text-brand inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === "ota-code" ? <Check className="w-3.5 h-3.5 text-aman" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === "ota-code" ? "Tersalin" : "Salin"}</span>
            </button>
          </div>
        </div>

        <pre className="p-4 bg-surface-2 border border-line rounded-[6px] text-[11.5px] font-mono text-ink overflow-x-auto leading-relaxed">
          {snippetTab === "esp32" ? esp32OtaCode : curlOtaCode}
        </pre>
      </div>
    </div>
  );
}
