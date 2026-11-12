import { useState } from "react";
import {
  Code2,
  Terminal,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  Radio,
  Server,
  Cpu,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

type SnippetLang = "curl" | "python" | "esp32";

export function SuperAdminApiDocs() {
  const [activeLang, setActiveLang] = useState<SnippetLang>("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Tester State
  const [testResult, setTestResult] = useState<{
    endpoint: string;
    status: number | string;
    loading: boolean;
    data: any;
  } | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runLiveTest = async (endpoint: string, method: "GET" | "POST", payload?: any) => {
    setTestResult({
      endpoint,
      status: "Mengirim permintaan...",
      loading: true,
      data: null,
    });

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      const json = await res.json();
      setTestResult({
        endpoint,
        status: res.status,
        loading: false,
        data: json,
      });
    } catch (err: any) {
      setTestResult({
        endpoint,
        status: "Error Jaringan",
        loading: false,
        data: { error: err.message || "Gagal menghubungi endpoint API" },
      });
    }
  };

  const curlExample = `curl -X POST http://127.0.0.1:8000/api/telemetry \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "ESP32-NODE-01",
    "ph": 6.85,
    "temperature_c": 28.3,
    "tds_ppm": 340,
    "turbidity_ntu": 38.5,
    "water_level": "NORMAL",
    "aerator_on": false,
    "mode": "AUTO"
  }'`;

  const pythonExample = `import requests

url = "http://127.0.0.1:8000/api/telemetry"
headers = {"Content-Type": "application/json"}

payload = {
    "device_id": "ESP32-NODE-01",
    "ph": 6.85,
    "temperature_c": 28.3,
    "tds_ppm": 340,
    "turbidity_ntu": 38.5,
    "water_level": "NORMAL",
    "aerator_on": False,
    "mode": "AUTO"
}

response = requests.post(url, json=payload, headers=headers)
print("Status:", response.status_code)
print("Response:", response.json())`;

  const esp32Example = `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverUrl = "http://127.0.0.1:8000/api/telemetry";

void sendTelemetry(float ph, float temp, float tds, float turb) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["device_id"] = "ESP32-NODE-01";
    doc["ph"] = ph;
    doc["temperature_c"] = temp;
    doc["tds_ppm"] = tds;
    doc["turbidity_ntu"] = turb;
    doc["water_level"] = "NORMAL";
    doc["aerator_on"] = false;
    doc["mode"] = "AUTO";

    String jsonString;
    serializeJson(doc, jsonString);

    int httpCode = http.POST(jsonString);
    if (httpCode == 201) {
      Serial.println("Telemetri berhasil terkirim!");
    } else {
      Serial.printf("Gagal kirim: %d\\n", httpCode);
    }
    http.end();
  }
}`;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-6 bg-surface rounded-[6px] border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
            <Code2 className="w-4 h-4 text-brand" />
            <span>Hak Akses Terproteksi: Super Administrator</span>
          </div>
          <h1 className="text-[22px] leading-[28px] font-display text-ink">
            Spesifikasi & Dokumentasi REST API BanyuWening
          </h1>
          <p className="text-[13px] text-muted mt-1 max-w-2xl">
            Panduan teknis antarmuka REST API dan protokol IoT MQTT untuk
            menghubungkan node sensor ESP32, gateway lapangan, sistem SCADA,
            serta otomasi Machine Learning.
          </p>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-surface-2 rounded-[6px] border border-line shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-ink">
            REST API v2.0 · Aktif
          </span>
        </div>
      </div>

      {/* Ringkasan Base URL & Protokol */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-surface rounded-[6px] border border-line">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
            REST API Base URL
          </span>
          <code className="text-brand text-[13px] font-mono font-semibold block break-all">
            {typeof window !== "undefined"
              ? `${window.location.origin}/api`
              : "http://127.0.0.1:8000/api"}
          </code>
          <p className="text-[11px] text-muted mt-2">
            Format: JSON · Header: Content-Type: application/json
          </p>
        </div>

        <div className="p-4 bg-surface rounded-[6px] border border-line">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
            Broker MQTT Kolam
          </span>
          <div className="text-ink font-semibold text-[13px]">
            HiveMQ Cloud TLS (Port 8883)
          </div>
          <p className="text-[11px] text-muted mt-2">
            Topik: <code>banyuwening/kolam1/telemetry</code> (QoS 1)
          </p>
        </div>

        <div className="p-4 bg-surface rounded-[6px] border border-line">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1">
            Interval Pengiriman IoT
          </span>
          <div className="text-ink font-semibold text-[13px]">
            Setiap 30 Detik
          </div>
          <p className="text-[11px] text-muted mt-2">
            Batas ambang failsafe lokal: 120 detik tanpa koneksi
          </p>
        </div>
      </div>

      {/* Endpoint 1: POST /api/telemetry */}
      <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 font-mono font-bold text-xs rounded-[4px]">
              POST
            </span>
            <code className="font-mono text-[15px] font-semibold text-ink">
              /api/telemetry
            </code>
          </div>
          <span className="text-xs text-muted">Ingesti Telemetri Sensor ESP32</span>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Menerima data pembacaan probe fisik dari mikrokontroler ESP32 setiap 30 detik.
          Data disimpan ke tabel <code>sensor_readings</code>, memicu evaluasi Machine
          Learning risiko kualitas air, dan memeriksa keselamatan relay kolam.
        </p>

        {/* Tabel Parameter */}
        <div className="overflow-x-auto border border-line rounded-[6px]">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-surface-2 border-b border-line text-muted uppercase text-[10px] font-semibold">
              <tr>
                <th className="px-3 py-2">Parameter</th>
                <th className="px-3 py-2">Tipe</th>
                <th className="px-3 py-2">Sifat</th>
                <th className="px-3 py-2">Deskripsi & Rentang Valid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono">
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">device_id</td>
                <td className="px-3 py-2 text-muted">string</td>
                <td className="px-3 py-2 text-bahaya font-sans">Wajib</td>
                <td className="px-3 py-2 font-sans text-muted">
                  ID Node mikrokontroler (contoh: <code>"ESP32-NODE-01"</code>).
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">ph</td>
                <td className="px-3 py-2 text-muted">number</td>
                <td className="px-3 py-2 text-bahaya font-sans">Wajib</td>
                <td className="px-3 py-2 font-sans text-muted">
                  Derajat keasaman air kolam (Rentang: 0.0 – 14.0).
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">temperature_c</td>
                <td className="px-3 py-2 text-muted">number</td>
                <td className="px-3 py-2 text-bahaya font-sans">Wajib</td>
                <td className="px-3 py-2 font-sans text-muted">
                  Suhu air sensor DS18B20 dalam Celsius (Rentang: 0.0 – 50.0).
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">tds_ppm</td>
                <td className="px-3 py-2 text-muted">number</td>
                <td className="px-3 py-2 text-bahaya font-sans">Wajib</td>
                <td className="px-3 py-2 font-sans text-muted">
                  Total padatan terlarut dalam PPM (Rentang: 0 – 2000).
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">turbidity_ntu</td>
                <td className="px-3 py-2 text-muted">number</td>
                <td className="px-3 py-2 text-bahaya font-sans">Wajib</td>
                <td className="px-3 py-2 font-sans text-muted">
                  Kekeruhan air kolam dalam NTU (Rentang: 0.0 – 500.0).
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">water_level</td>
                <td className="px-3 py-2 text-muted">string</td>
                <td className="px-3 py-2 text-muted font-sans">Opsional</td>
                <td className="px-3 py-2 font-sans text-muted">
                  Status pelampung: <code>"SURUT"</code>, <code>"NORMAL"</code>, <code>"MELIMPAH"</code>.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">aerator_on</td>
                <td className="px-3 py-2 text-muted">boolean</td>
                <td className="px-3 py-2 text-muted font-sans">Opsional</td>
                <td className="px-3 py-2 font-sans text-muted">
                  Kondisi relay pompa aerator fisik: <code>true</code> / <code>false</code>.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-semibold text-brand">mode</td>
                <td className="px-3 py-2 text-muted">string</td>
                <td className="px-3 py-2 text-muted font-sans">Opsional</td>
                <td className="px-3 py-2 font-sans text-muted">
                  Mode kerja relay: <code>"AUTO"</code> atau <code>"MANUAL"</code>.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Code Snippet Tabs */}
        <div>
          <div className="flex items-center justify-between border-b border-line mb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveLang("curl")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-[4px] cursor-pointer transition-colors ${
                  activeLang === "curl"
                    ? "bg-surface-2 text-brand border-t border-x border-line"
                    : "text-muted hover:text-ink"
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveLang("python")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-[4px] cursor-pointer transition-colors ${
                  activeLang === "python"
                    ? "bg-surface-2 text-brand border-t border-x border-line"
                    : "text-muted hover:text-ink"
                }`}
              >
                Python (requests)
              </button>
              <button
                onClick={() => setActiveLang("esp32")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-[4px] cursor-pointer transition-colors ${
                  activeLang === "esp32"
                    ? "bg-surface-2 text-brand border-t border-x border-line"
                    : "text-muted hover:text-ink"
                }`}
              >
                ESP32 (Arduino C++)
              </button>
            </div>

            <button
              onClick={() =>
                copyToClipboard(
                  activeLang === "curl"
                    ? curlExample
                    : activeLang === "python"
                    ? pythonExample
                    : esp32Example,
                  "snippet"
                )
              }
              className="text-xs text-muted hover:text-brand flex items-center gap-1 cursor-pointer py-1"
            >
              {copiedKey === "snippet" ? (
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
            {activeLang === "curl" && curlExample}
            {activeLang === "python" && pythonExample}
            {activeLang === "esp32" && esp32Example}
          </pre>
        </div>

        {/* Live Test Trigger */}
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={() =>
              runLiveTest("/api/telemetry", "POST", {
                device_id: "ESP32-NODE-01",
                ph: 6.85,
                temperature_c: 28.3,
                tds_ppm: 340,
                turbidity_ntu: 38.5,
                water_level: "NORMAL",
                aerator_on: false,
                mode: "AUTO",
              })
            }
            className="h-8 px-3 bg-brand/10 hover:bg-brand/20 text-brand rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Uji Coba POST Telemetri Sample</span>
          </button>
          <span className="text-[11px] text-muted">
            Mengirim telemetri sampel untuk memastikan endpoint menerima payload dengan benar.
          </span>
        </div>
      </div>

      {/* Endpoint 2: GET /api/latest */}
      <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 font-mono font-bold text-xs rounded-[4px]">
              GET
            </span>
            <code className="font-mono text-[15px] font-semibold text-ink">
              /api/latest
            </code>
          </div>
          <span className="text-xs text-muted">Data Telemetri & Prediksi Terkini</span>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Mengembalikan data telemetri pembacaan terakhir beserta hasil inferensi
          Machine Learning terkini (status risiko: <code>AMAN</code>, <code>WASPADA</code>, <code>BAHAYA</code> dan probabilitas terkait).
        </p>

        <div className="pt-1 flex items-center gap-3">
          <button
            onClick={() => runLiveTest("/api/latest", "GET")}
            className="h-8 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Radio className="w-3 h-3" />
            <span>Uji Coba GET /api/latest</span>
          </button>
          <span className="text-[11px] text-muted">
            Memuat telemetri real-time yang sedang aktif di sistem BanyuWening.
          </span>
        </div>
      </div>

      {/* Endpoint 3: GET /api/history */}
      <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 font-mono font-bold text-xs rounded-[4px]">
              GET
            </span>
            <code className="font-mono text-[15px] font-semibold text-ink">
              /api/history?limit=10
            </code>
          </div>
          <span className="text-xs text-muted">Data Time-Series Riwayat Sensor</span>
        </div>

        <p className="text-[13px] text-muted leading-relaxed">
          Mengembalikan deret waktu historis pembacaan parameter fisik kolam.
          Parameter query: <code>limit</code> (default: 50, maks: 500) dan{" "}
          <code>device_id</code> (opsional).
        </p>

        <div className="pt-1 flex items-center gap-3">
          <button
            onClick={() => runLiveTest("/api/history?limit=5", "GET")}
            className="h-8 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-3 h-3" />
            <span>Uji Coba GET /api/history?limit=5</span>
          </button>
          <span className="text-[11px] text-muted">
            Mengambil 5 rekaman deret waktu historis terakhir.
          </span>
        </div>
      </div>

      {/* Live Test Response Modal/Box */}
      {testResult && (
        <div className="p-5 bg-surface-2 rounded-[6px] border border-line space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand" />
              <span className="text-xs font-bold text-ink">
                Hasil Uji Coba: {testResult.endpoint}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-[4px] font-semibold ${
                  testResult.status === 200 || testResult.status === 201
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                Status: {testResult.status}
              </span>
              <button
                onClick={() => setTestResult(null)}
                className="text-xs text-muted hover:text-ink cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

          <pre className="p-3 bg-surface rounded-[4px] border border-line text-[11px] font-mono text-ink overflow-x-auto max-h-60">
            {JSON.stringify(testResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
