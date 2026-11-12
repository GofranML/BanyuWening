"use client";

import { useState, useEffect } from "react";
import {
  Send,
  MessageSquare,
  Mail,
  Sliders,
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Play,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Bot,
  Copy,
  Info,
  Clock,
  Check,
  Wifi,
  Sparkles,
  Smartphone,
  Server,
  Layers,
} from "lucide-react";

import {
  getNotificationConfig,
  saveNotificationConfig,
  resetNotificationConfig,
  getDispatchLogs,
  clearDispatchLogs,
  executeTestSend,
  renderTemplate,
  type NotificationConfig,
  type NotificationChannel,
  type DispatchLogItem,
  type TestSendResult,
  type TemplateVariables,
  type WaProvider,
  type EmailEncryption,
} from "@/lib/notification-config";

type SubTabId = "telegram" | "whatsapp" | "email" | "triggers" | "logs";

export function SuperAdminNotificationConfig() {
  const [config, setConfig] = useState<NotificationConfig>(getNotificationConfig());
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("telegram");
  const [logs, setLogs] = useState<DispatchLogItem[]>([]);
  
  // UI helper states
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showWaApiKey, setShowWaApiKey] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "error">("success");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestSendResult | null>(null);
  const [testScenario, setTestScenario] = useState<"BAHAYA" | "WASPADA" | "NORMAL">("BAHAYA");

  // Inputs for adding recipients
  const [newWaNumber, setNewWaNumber] = useState("");
  const [newEmailAddress, setNewEmailAddress] = useState("");

  // Filter logs
  const [logFilter, setLogFilter] = useState<"ALL" | NotificationChannel>("ALL");

  useEffect(() => {
    setConfig(getNotificationConfig());
    setLogs(getDispatchLogs());
  }, []);

  const showToast = (msg: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const handleSaveConfig = () => {
    saveNotificationConfig(config);
    setConfig(getNotificationConfig());
    showToast("Konfigurasi notifikasi berhasil disimpan ke sistem!", "success");
  };

  const handleResetDefaults = () => {
    if (confirm("Kembalikan semua konfigurasi notifikasi ke standar bawaan BanyuWening?")) {
      const reset = resetNotificationConfig();
      setConfig(reset);
      showToast("Konfigurasi telah direset ke nilai standar.", "info");
    }
  };

  const handleRunTest = async (channel: NotificationChannel) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await executeTestSend(channel, testScenario, config);
      setTestResult(res);
      setLogs(getDispatchLogs());
      if (res.success) {
        showToast(`Uji coba pengiriman ${channel} berhasil dieksekusi!`, "success");
      } else {
        showToast(`Uji coba ${channel} gagal: ${res.message}`, "error");
      }
    } catch {
      showToast(`Terjadi kesalahan saat menguji pengiriman ${channel}.`, "error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestAllChannels = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await executeTestSend("TELEGRAM", testScenario, config);
      await executeTestSend("WHATSAPP", testScenario, config);
      const emailRes = await executeTestSend("EMAIL", testScenario, config);
      setTestResult(emailRes);
      setLogs(getDispatchLogs());
      showToast("Pengujian serentak (Telegram, WhatsApp, & Email) selesai dijalankan!", "success");
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddWaNumber = () => {
    const clean = newWaNumber.replace(/[^0-9]/g, "");
    if (!clean) return;
    if (config.whatsapp.targetRecipients.includes(clean)) {
      showToast("Nomor WhatsApp ini sudah ada di daftar penerima.", "info");
      return;
    }
    setConfig({
      ...config,
      whatsapp: {
        ...config.whatsapp,
        targetRecipients: [...config.whatsapp.targetRecipients, clean],
      },
    });
    setNewWaNumber("");
  };

  const handleRemoveWaNumber = (num: string) => {
    setConfig({
      ...config,
      whatsapp: {
        ...config.whatsapp,
        targetRecipients: config.whatsapp.targetRecipients.filter((n) => n !== num),
      },
    });
  };

  const handleAddEmail = () => {
    const clean = newEmailAddress.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      showToast("Format alamat email tidak valid.", "error");
      return;
    }
    if (config.email.targetRecipients.includes(clean)) {
      showToast("Alamat email ini sudah ada di daftar penerima.", "info");
      return;
    }
    setConfig({
      ...config,
      email: {
        ...config.email,
        targetRecipients: [...config.email.targetRecipients, clean],
      },
    });
    setNewEmailAddress("");
  };

  const handleRemoveEmail = (em: string) => {
    setConfig({
      ...config,
      email: {
        ...config.email,
        targetRecipients: config.email.targetRecipients.filter((e) => e !== em),
      },
    });
  };

  const handleClearLogs = () => {
    if (confirm("Hapus seluruh catatan riwayat pengiriman notifikasi?")) {
      clearDispatchLogs();
      setLogs([]);
      showToast("Riwayat log pengiriman telah dibersihkan.", "info");
    }
  };

  // Variabel simulasi untuk pratinjau live
  const sampleVars: TemplateVariables = {
    nama_kolam: "Kolam Terpal Sangkuriang 01",
    status: testScenario === "BAHAYA" ? "BAHAYA (KRITIS)" : testScenario === "WASPADA" ? "WASPADA" : "NORMAL",
    ph: testScenario === "BAHAYA" ? "5.82" : testScenario === "WASPADA" ? "6.45" : "7.20",
    suhu: testScenario === "BAHAYA" ? "33.8" : testScenario === "WASPADA" ? "31.2" : "28.5",
    tds: testScenario === "BAHAYA" ? "820" : testScenario === "WASPADA" ? "580" : "340",
    kekeruhan: testScenario === "BAHAYA" ? "135" : testScenario === "WASPADA" ? "62" : "38",
    level_air: testScenario === "BAHAYA" ? "SURUT (LOW)" : "NORMAL",
    aerator: testScenario === "BAHAYA" ? "AKTIF OTOMATIS (100%)" : testScenario === "WASPADA" ? "SIAGA / SIRKULASI" : "STANDBY (AUTO)",
    waktu: new Date().toLocaleTimeString("id-ID") + " WIB",
    rekomendasi:
      testScenario === "BAHAYA"
        ? "Segera taburkan kapur dolomit 50-100 g/m³, hidupkan aerator darurat, dan tambahkan air bersih segar."
        : testScenario === "WASPADA"
        ? "Kurangi pakan 30%, periksa filter sirkulasi, dan amati tanda ikan menggantung."
        : "Seluruh parameter stabil sesuai SNI akuakultur lele. Lanjutkan perawatan normal.",
  };

  const renderedTelegramPreview = renderTemplate(config.telegram.messageTemplate, sampleVars);
  const renderedWaPreview = renderTemplate(config.whatsapp.messageTemplate, sampleVars);
  const renderedEmailSubject = renderTemplate(config.email.subjectTemplate, sampleVars);
  const renderedEmailBody = renderTemplate(config.email.messageTemplate, sampleVars);

  const filteredLogs = logs.filter((l) => logFilter === "ALL" || l.channel === logFilter);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-[6px] border text-[13px] font-medium flex items-center justify-between gap-3 shadow-sm transition-all animate-fadeIn ${
            toastType === "success"
              ? "bg-aman/15 border-aman text-ink"
              : toastType === "error"
              ? "bg-bahaya/15 border-bahaya text-ink"
              : "bg-surface-2 border-line text-ink"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastType === "success" && <CheckCircle2 className="w-4 h-4 text-aman shrink-0" />}
            {toastType === "error" && <AlertTriangle className="w-4 h-4 text-bahaya shrink-0" />}
            {toastType === "info" && <Info className="w-4 h-4 text-brand shrink-0" />}
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-muted hover:text-ink text-xs underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-surface border border-line rounded-[8px] p-5 md:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[12px] font-semibold mb-2">
              <Bot className="w-3.5 h-3.5" />
              <span>Pusat Integrasi Bot & Notifikasi Otomatis</span>
            </div>
            <h1 className="text-[24px] md:text-[28px] font-display text-ink leading-tight">
              Konfigurasi Bot Telegram, WhatsApp & Email
            </h1>
            <p className="text-[13px] md:text-[14px] text-muted mt-1 max-w-2xl leading-relaxed">
              Atur kredensial API, webhook gateway, dan susunan template pesan darurat.
              Pesan dikirim secara otomatis saat anomali kualitas air terdeteksi atau relay aerator aktif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleResetDefaults}
              className="h-10 px-3.5 border border-line bg-surface-2 hover:bg-line/40 text-muted hover:text-ink rounded-[6px] text-[13px] font-medium transition-colors flex items-center gap-2"
              title="Reset ke pengaturan awal bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Bawaan</span>
            </button>

            <button
              onClick={handleTestAllChannels}
              disabled={isTesting}
              className="h-10 px-4 border border-brand/40 bg-brand/10 hover:bg-brand/20 text-brand rounded-[6px] text-[13px] font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Kirim pesan uji coba serentak ke semua saluran"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTesting ? "Menguji..." : "Uji Coba Semua"}</span>
            </button>

            <button
              onClick={handleSaveConfig}
              className="h-10 px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-95 transition-opacity flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi</span>
            </button>
          </div>
        </div>

        {/* Status Ringkas Saluran */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-line text-[12px]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                config.telegram.enabled ? "bg-aman animate-pulse" : "bg-muted"
              }`}
            />
            <span className="text-muted">Bot Telegram:</span>
            <strong className={config.telegram.enabled ? "text-aman" : "text-muted"}>
              {config.telegram.enabled ? "Aktif" : "Nonaktif"}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                config.whatsapp.enabled ? "bg-aman animate-pulse" : "bg-muted"
              }`}
            />
            <span className="text-muted">WhatsApp GW:</span>
            <strong className={config.whatsapp.enabled ? "text-aman" : "text-muted"}>
              {config.whatsapp.enabled ? "Aktif" : "Nonaktif"}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                config.email.enabled ? "bg-aman animate-pulse" : "bg-muted"
              }`}
            />
            <span className="text-muted">Email SMTP:</span>
            <strong className={config.email.enabled ? "text-aman" : "text-muted"}>
              {config.email.enabled ? "Aktif" : "Nonaktif"}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 text-muted">
            <Clock className="w-3.5 h-3.5" />
            <span className="truncate">Diperbarui: {config.lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-line gap-2 pb-px scrollbar-none">
        <button
          onClick={() => setActiveSubTab("telegram")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeSubTab === "telegram"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-ink hover:border-line"
          }`}
        >
          <Send className="w-4 h-4 text-[#229ED9]" />
          <span>Bot Telegram</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
              config.telegram.enabled ? "bg-aman/20 text-aman" : "bg-surface-2 text-muted"
            }`}
          >
            {config.telegram.enabled ? "ON" : "OFF"}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("whatsapp")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeSubTab === "whatsapp"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-ink hover:border-line"
          }`}
        >
          <MessageSquare className="w-4 h-4 text-[#25D366]" />
          <span>WhatsApp Gateway</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
              config.whatsapp.enabled ? "bg-aman/20 text-aman" : "bg-surface-2 text-muted"
            }`}
          >
            {config.whatsapp.enabled ? "ON" : "OFF"}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("email")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeSubTab === "email"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-ink hover:border-line"
          }`}
        >
          <Mail className="w-4 h-4 text-purple-500" />
          <span>Email (SMTP)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
              config.email.enabled ? "bg-aman/20 text-aman" : "bg-surface-2 text-muted"
            }`}
          >
            {config.email.enabled ? "ON" : "OFF"}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("triggers")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeSubTab === "triggers"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-ink hover:border-line"
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Aturan Pemicu</span>
        </button>

        <button
          onClick={() => setActiveSubTab("logs")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeSubTab === "logs"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-ink hover:border-line"
          }`}
        >
          <History className="w-4 h-4 text-muted" />
          <span>Riwayat Log ({logs.length})</span>
        </button>
      </div>

      {/* Skenario Uji Coba Bar */}
      <div className="bg-surface-2 border border-line rounded-[6px] p-3 flex flex-wrap items-center justify-between gap-3 text-[12px]">
        <div className="flex items-center gap-2 text-ink">
          <Play className="w-3.5 h-3.5 text-brand" />
          <span className="font-semibold">Simulasi Parameter Uji Coba:</span>
          <div className="flex items-center gap-1.5 ml-1">
            <button
              type="button"
              onClick={() => setTestScenario("BAHAYA")}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                testScenario === "BAHAYA"
                  ? "bg-bahaya-bg text-bahaya-text border border-bahaya/50 shadow-xs ring-1 ring-bahaya/30 font-bold"
                  : "bg-surface border border-line text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${testScenario === "BAHAYA" ? "bg-bahaya animate-pulse" : "bg-bahaya/50"}`} />
              Status Kritis / Bahaya (pH 5.82)
            </button>
            <button
              type="button"
              onClick={() => setTestScenario("WASPADA")}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                testScenario === "WASPADA"
                  ? "bg-waspada-bg text-waspada-text border border-waspada/50 shadow-xs ring-1 ring-waspada/30 font-bold"
                  : "bg-surface border border-line text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${testScenario === "WASPADA" ? "bg-waspada animate-pulse" : "bg-waspada/50"}`} />
              Waspada ML (pH 6.45)
            </button>
            <button
              type="button"
              onClick={() => setTestScenario("NORMAL")}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                testScenario === "NORMAL"
                  ? "bg-aman-bg text-aman-text border border-aman/50 shadow-xs ring-1 ring-aman/30 font-bold"
                  : "bg-surface border border-line text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${testScenario === "NORMAL" ? "bg-aman" : "bg-aman/50"}`} />
              Normal (pH 7.20)
            </button>
          </div>
        </div>

        <div className="text-muted text-[11px]">
          Target: <strong>Kolam Terpal Sangkuriang 01</strong>
        </div>
      </div>

      {/* Detail Hasil Uji Coba Terakhir jika ada */}
      {testResult && (
        <div
          className={`p-4 rounded-[6px] border text-[13px] space-y-2 animate-fadeIn ${
            testResult.success
              ? "bg-aman/10 border-aman text-ink"
              : "bg-bahaya/10 border-bahaya text-ink"
          }`}
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-aman" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-bahaya" />
              )}
              {testResult.message}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-surface border border-line text-muted">
              Saluran: {testResult.channel}
            </span>
          </div>
          <p className="text-[12px] text-muted">{testResult.details}</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. SUB-TAB: TELEGRAM BOT                                 */}
      {/* ======================================================== */}
      {activeSubTab === "telegram" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Konfigurasi (Col 7) */}
          <div className="lg:col-span-7 space-y-5 bg-surface border border-line rounded-[8px] p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#229ED9]" />
                  <span>Kredensial & Pengaturan Telegram Bot</span>
                </h3>
                <p className="text-[12px] text-muted mt-0.5">
                  Gunakan bot Telegram resmi untuk mengirimkan notifikasi instan &lt; 10 detik.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.telegram.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      telegram: { ...config.telegram, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                <span className="ml-2 text-[12px] font-medium text-ink">
                  {config.telegram.enabled ? "Aktif" : "Mati"}
                </span>
              </label>
            </div>

            <div className="space-y-4 text-[13px]">
              {/* Bot Token */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-ink">
                    Bot Token API (Dari @BotFather)
                  </label>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Buka @BotFather</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showTelegramToken ? "text" : "password"}
                    value={config.telegram.botToken}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        telegram: { ...config.telegram, botToken: e.target.value },
                      })
                    }
                    placeholder="Contoh: 7182938491:AAH8eK9mZ0Q1w2e3r4t..."
                    className="w-full h-10 px-3 pr-10 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    className="absolute right-3 top-2.5 text-muted hover:text-ink"
                  >
                    {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Token rahasia yang diberikan oleh Telegram saat membuat bot.
                </p>
              </div>

              {/* Bot Username & Chat ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Username Bot
                  </label>
                  <input
                    type="text"
                    value={config.telegram.botUsername}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        telegram: { ...config.telegram, botUsername: e.target.value },
                      })
                    }
                    placeholder="@BanyuWeningAlert_bot"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Chat ID / Grup ID Tujuan
                  </label>
                  <input
                    type="text"
                    value={config.telegram.chatId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        telegram: { ...config.telegram, chatId: e.target.value },
                      })
                    }
                    placeholder="-1002345678901 atau @channel"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Thread ID & Parse Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Message Thread ID (Opsional)
                  </label>
                  <input
                    type="text"
                    value={config.telegram.threadId || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        telegram: { ...config.telegram, threadId: e.target.value },
                      })
                    }
                    placeholder="Kosongkan jika bukan forum topik"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Format Parse Mode
                  </label>
                  <select
                    value={config.telegram.parseMode}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        telegram: {
                          ...config.telegram,
                          parseMode: e.target.value as "HTML" | "MarkdownV2",
                        },
                      })
                    }
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 text-[12px] focus:outline-none focus:border-brand"
                  >
                    <option value="HTML">HTML (Direkomendasikan: &lt;b&gt;, &lt;i&gt;)</option>
                    <option value="MarkdownV2">MarkdownV2 (*bold*, _italic_)</option>
                  </select>
                </div>
              </div>

              {/* Template Pesan */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-ink">
                    Template Format Pesan Telegram
                  </label>
                  <span className="text-[11px] text-muted">Mendukung placeholder dinamis</span>
                </div>
                <textarea
                  rows={8}
                  value={config.telegram.messageTemplate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      telegram: { ...config.telegram, messageTemplate: e.target.value },
                    })
                  }
                  className="w-full p-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand leading-relaxed"
                />

                {/* Variable chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "{nama_kolam}",
                    "{status}",
                    "{ph}",
                    "{suhu}",
                    "{tds}",
                    "{kekeruhan}",
                    "{level_air}",
                    "{aerator}",
                    "{waktu}",
                    "{rekomendasi}",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setConfig({
                          ...config,
                          telegram: {
                            ...config.telegram,
                            messageTemplate: config.telegram.messageTemplate + ` ${chip}`,
                          },
                        });
                      }}
                      className="px-2 py-0.5 bg-surface border border-line hover:border-brand text-muted hover:text-brand text-[11px] rounded transition-colors font-mono"
                      title="Klik untuk menambahkan ke template"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleRunTest("TELEGRAM")}
                  disabled={isTesting || !config.telegram.enabled}
                  className="h-10 px-4 bg-[#229ED9] text-white rounded-[6px] font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isTesting ? "Mengirim..." : "Kirim Uji Coba Telegram"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="h-10 px-4 bg-brand text-brand-ink rounded-[6px] font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Telegram</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pratinjau Chat Telegram (Col 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface border border-line rounded-[8px] p-4">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-brand" />
                  <span className="font-semibold text-ink text-[13px]">
                    Pratinjau Tampilan Pesan Telegram
                  </span>
                </div>
                <span className="text-[11px] text-muted">Resolusi Smartphone</span>
              </div>

              {/* Telegram Phone Simulator Frame */}
              <div className="bg-[#0e1621] text-white rounded-[12px] p-3.5 shadow-inner border border-[#17212b] space-y-3 font-sans">
                {/* Header Chat */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                  <div className="w-8 h-8 rounded-full bg-[#229ED9] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    BW
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">
                      {config.telegram.botUsername || "BanyuWening Alert Bot"}
                    </div>
                    <div className="text-[10px] text-[#229ED9]">bot • online</div>
                  </div>
                </div>

                {/* Message Bubble */}
                <div className="bg-[#182533] rounded-[10px] p-3 text-[12px] leading-relaxed border border-[#2b5278]/40 space-y-2">
                  <div
                    className="whitespace-pre-wrap font-sans break-words"
                    dangerouslySetInnerHTML={{
                      __html: renderedTelegramPreview,
                    }}
                  />
                  <div className="text-right text-[10px] text-white/50 flex items-center justify-end gap-1">
                    <span>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>✓✓</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-surface-2 rounded border border-line text-[11px] text-muted flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>
                  Placeholder seperti <code>{`{ph}`}</code>, <code>{`{status}`}</code>, dan <code>{`{rekomendasi}`}</code> akan otomatis terisi nilai riil sensor saat dikirim ke grup/channel.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUB-TAB: WHATSAPP GATEWAY                             */}
      {/* ======================================================== */}
      {activeSubTab === "whatsapp" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Konfigurasi (Col 7) */}
          <div className="lg:col-span-7 space-y-5 bg-surface border border-line rounded-[8px] p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#25D366]" />
                  <span>Konfigurasi WhatsApp Gateway</span>
                </h3>
                <p className="text-[12px] text-muted mt-0.5">
                  Kirimkan notifikasi darurat langsung ke WhatsApp pribadi petambak & operator kolam.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.whatsapp.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      whatsapp: { ...config.whatsapp, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                <span className="ml-2 text-[12px] font-medium text-ink">
                  {config.whatsapp.enabled ? "Aktif" : "Mati"}
                </span>
              </label>
            </div>

            <div className="space-y-4 text-[13px]">
              {/* Provider Gateway & Nomor Pengirim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Penyedia Gateway WhatsApp
                  </label>
                  <select
                    value={config.whatsapp.provider}
                    onChange={(e) => {
                      const prov = e.target.value as WaProvider;
                      let endp = config.whatsapp.endpointUrl;
                      if (prov === "FONNTE") endp = "https://api.fonnte.com/send";
                      else if (prov === "WABLAS") endp = "https://kudus.wablas.com/api/send-message";
                      else if (prov === "TWILIO") endp = "https://api.twilio.com/2010-04-01/Accounts";
                      setConfig({
                        ...config,
                        whatsapp: {
                          ...config.whatsapp,
                          provider: prov,
                          endpointUrl: endp,
                        },
                      });
                    }}
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 text-[12px] focus:outline-none focus:border-brand"
                  >
                    <option value="FONNTE">Fonnte (Populer di Indonesia)</option>
                    <option value="WABLAS">Wablas Official API</option>
                    <option value="TWILIO">Twilio WhatsApp Business</option>
                    <option value="CUSTOM_WEBHOOK">Custom Webhook / Baileys Node.js</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Nomor Pengirim (Sender Number)
                  </label>
                  <input
                    type="text"
                    value={config.whatsapp.senderNumber}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        whatsapp: { ...config.whatsapp, senderNumber: e.target.value },
                      })
                    }
                    placeholder="Contoh: 6281278901122"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* API Key / Token */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-ink">
                    API Key / Secret Token WhatsApp
                  </label>
                  <span className="text-[11px] text-muted">Disediakan oleh provider gateway</span>
                </div>
                <div className="relative">
                  <input
                    type={showWaApiKey ? "text" : "password"}
                    value={config.whatsapp.apiKey}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        whatsapp: { ...config.whatsapp, apiKey: e.target.value },
                      })
                    }
                    placeholder="Contoh: bw_live_token_fonnte_..."
                    className="w-full h-10 px-3 pr-10 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWaApiKey(!showWaApiKey)}
                    className="absolute right-3 top-2.5 text-muted hover:text-ink"
                  >
                    {showWaApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  URL Endpoint Pengiriman (API URL)
                </label>
                <input
                  type="text"
                  value={config.whatsapp.endpointUrl}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      whatsapp: { ...config.whatsapp, endpointUrl: e.target.value },
                    })
                  }
                  placeholder="https://api.fonnte.com/send"
                  className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                />
              </div>

              {/* Daftar Penerima WhatsApp */}
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Daftar Nomor WhatsApp Penerima Notifikasi
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newWaNumber}
                    onChange={(e) => setNewWaNumber(e.target.value)}
                    placeholder="Masukkan nomor (contoh: 628123456789)"
                    className="flex-1 h-9 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddWaNumber();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddWaNumber}
                    className="h-9 px-3 bg-surface border border-line hover:border-brand text-ink rounded-[6px] text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {config.whatsapp.targetRecipients.map((num) => (
                    <span
                      key={num}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-line rounded-full text-xs font-mono text-ink"
                    >
                      <span>+{num}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWaNumber(num)}
                        className="text-muted hover:text-bahaya"
                        title="Hapus nomor"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Template WhatsApp */}
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Template Format Pesan WhatsApp (*bold*, _italic_)
                </label>
                <textarea
                  rows={8}
                  value={config.whatsapp.messageTemplate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      whatsapp: { ...config.whatsapp, messageTemplate: e.target.value },
                    })
                  }
                  className="w-full p-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleRunTest("WHATSAPP")}
                  disabled={isTesting || !config.whatsapp.enabled}
                  className="h-10 px-4 bg-[#25D366] text-white rounded-[6px] font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isTesting ? "Mengirim..." : "Kirim Uji Coba WhatsApp"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="h-10 px-4 bg-brand text-brand-ink rounded-[6px] font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pratinjau WhatsApp (Col 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface border border-line rounded-[8px] p-4">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-ink text-[13px]">
                    Pratinjau Balon Pesan WhatsApp
                  </span>
                </div>
                <span className="text-[11px] text-muted">WhatsApp Web / Mobile</span>
              </div>

              {/* WhatsApp Mockup Bubble */}
              <div className="bg-[#EFEAE2] dark:bg-[#0b141a] rounded-[12px] p-4 shadow-inner border border-line space-y-3">
                {/* Header WA Bar */}
                <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/10 text-ink">
                  <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-xs">
                    BW
                  </div>
                  <div className="text-xs font-semibold truncate">
                    BanyuWening IoT Monitor ({config.whatsapp.senderNumber})
                  </div>
                </div>

                {/* Chat Bubble WA */}
                <div className="max-w-[92%] bg-[#D9FDD3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-[8px] p-3 text-[12px] leading-relaxed shadow-sm font-sans space-y-1.5 ml-auto">
                  <div className="whitespace-pre-wrap font-sans">
                    {renderedWaPreview}
                  </div>
                  <div className="text-right text-[10px] text-black/50 dark:text-white/60 flex items-center justify-end gap-1">
                    <span>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-[#53bdeb]">✓✓</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-surface-2 rounded border border-line text-[11px] text-muted">
                Pesan akan dikirim serentak ke {config.whatsapp.targetRecipients.length} nomor tujuan yang terdaftar saat trigger terpenuhi.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SUB-TAB: EMAIL (SMTP)                                 */}
      {/* ======================================================== */}
      {activeSubTab === "email" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Konfigurasi (Col 7) */}
          <div className="lg:col-span-7 space-y-5 bg-surface border border-line rounded-[8px] p-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-500" />
                  <span>Pengaturan Server Email (SMTP)</span>
                </h3>
                <p className="text-[12px] text-muted mt-0.5">
                  Kirimkan ringkasan formal, laporan insiden, dan data tabel sensor ke email pemangku kepentingan.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.email.enabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      email: { ...config.email, enabled: e.target.checked },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                <span className="ml-2 text-[12px] font-medium text-ink">
                  {config.email.enabled ? "Aktif" : "Mati"}
                </span>
              </label>
            </div>

            <div className="space-y-4 text-[13px]">
              {/* Host & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-ink block mb-1.5">
                    SMTP Host Server
                  </label>
                  <input
                    type="text"
                    value={config.email.smtpHost}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        email: { ...config.email, smtpHost: e.target.value },
                      })
                    }
                    placeholder="smtp.gmail.com atau mail.banyuwening.id"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Port
                  </label>
                  <input
                    type="number"
                    value={config.email.smtpPort}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        email: { ...config.email, smtpPort: parseInt(e.target.value) || 587 },
                      })
                    }
                    placeholder="587"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Encryption & Sender Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Protokol Enkripsi
                  </label>
                  <select
                    value={config.email.encryption}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        email: {
                          ...config.email,
                          encryption: e.target.value as EmailEncryption,
                        },
                      })
                    }
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 text-[12px] focus:outline-none focus:border-brand"
                  >
                    <option value="TLS">TLS / STARTTLS (Port 587 - Standar)</option>
                    <option value="SSL">SSL (Port 465)</option>
                    <option value="NONE">None / Plain (Port 25)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Nama Pengirim (Display Name)
                  </label>
                  <input
                    type="text"
                    value={config.email.senderName}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        email: { ...config.email, senderName: e.target.value },
                      })
                    }
                    placeholder="BanyuWening Smart Pond Alert"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* User & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Email Pengirim / Username SMTP
                  </label>
                  <input
                    type="text"
                    value={config.email.smtpUser}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        email: { ...config.email, smtpUser: e.target.value },
                      })
                    }
                    placeholder="notifikasi@banyuwening.id"
                    className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="font-semibold text-ink block mb-1.5">
                    Password / App Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? "text" : "password"}
                      value={config.email.smtpPassword || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          email: { ...config.email, smtpPassword: e.target.value },
                        })
                      }
                      placeholder="••••••••••••••••"
                      className="w-full h-10 px-3 pr-10 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-2.5 text-muted hover:text-ink"
                    >
                      {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Daftar Email Penerima */}
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Daftar Email Penerima Laporan
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={newEmailAddress}
                    onChange={(e) => setNewEmailAddress(e.target.value)}
                    placeholder="nama@domain.com"
                    className="flex-1 h-9 px-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="h-9 px-3 bg-surface border border-line hover:border-brand text-ink rounded-[6px] text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {config.email.targetRecipients.map((em) => (
                    <span
                      key={em}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 border border-line rounded-full text-xs font-mono text-ink"
                    >
                      <span>{em}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(em)}
                        className="text-muted hover:text-bahaya"
                        title="Hapus email"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Subject Template */}
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Subjek Email Template
                </label>
                <input
                  type="text"
                  value={config.email.subjectTemplate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      email: { ...config.email, subjectTemplate: e.target.value },
                    })
                  }
                  className="w-full h-10 px-3 border border-line rounded-[6px] bg-surface-2 text-[12px] focus:outline-none focus:border-brand"
                />
              </div>

              {/* Body HTML Template */}
              <div>
                <label className="font-semibold text-ink block mb-1.5">
                  Body Template Email (Format HTML & Markdown)
                </label>
                <textarea
                  rows={8}
                  value={config.email.messageTemplate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      email: { ...config.email, messageTemplate: e.target.value },
                    })
                  }
                  className="w-full p-3 border border-line rounded-[6px] bg-surface-2 font-mono text-[12px] focus:outline-none focus:border-brand leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleRunTest("EMAIL")}
                  disabled={isTesting || !config.email.enabled}
                  className="h-10 px-4 bg-purple-600 text-white rounded-[6px] font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isTesting ? "Mengirim..." : "Kirim Uji Coba Email"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="h-10 px-4 bg-brand text-brand-ink rounded-[6px] font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Email</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pratinjau Email Mockup (Col 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface border border-line rounded-[8px] p-4">
              <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold text-ink text-[13px]">
                    Pratinjau Tampilan Email Masuk
                  </span>
                </div>
                <span className="text-[11px] text-muted">Webmail Client</span>
              </div>

              {/* Webmail client window */}
              <div className="bg-surface border border-line rounded-[8px] overflow-hidden shadow-sm">
                {/* Email Header */}
                <div className="bg-surface-2 p-3 border-b border-line space-y-1.5 text-[12px]">
                  <div className="font-bold text-ink truncate">
                    {renderedEmailSubject}
                  </div>
                  <div className="text-[11px] text-muted flex items-center gap-1.5">
                    <span>Dari:</span>
                    <strong className="text-ink">
                      {config.email.senderName} &lt;{config.email.smtpUser}&gt;
                    </strong>
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    Kepada: {config.email.targetRecipients.join(", ")}
                  </div>
                </div>

                {/* Email HTML Body Render */}
                <div className="p-4 bg-surface max-h-[460px] overflow-y-auto">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderedEmailBody,
                    }}
                  />
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-surface-2 rounded border border-line text-[11px] text-muted">
                Dapat terhubung dengan penyedia email umum seperti Gmail, Zoho Mail, Mailgun, Brevo, maupun server SMTP lokal kampus/perusahaan.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SUB-TAB: ATURAN PEMICU (TRIGGERS)                     */}
      {/* ======================================================== */}
      {activeSubTab === "triggers" && (
        <div className="bg-surface border border-line rounded-[8px] p-6 space-y-6">
          <div className="border-b border-line pb-4">
            <h3 className="text-[18px] font-semibold text-ink flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              <span>Aturan Kondisi & Pemicu Pengiriman Otomatis</span>
            </h3>
            <p className="text-[13px] text-muted mt-1 max-w-3xl leading-relaxed">
              Tentukan kapan sistem IoT BanyuWening harus mengirimkan pesan darurat secara otomatis ke Telegram, WhatsApp, dan Email.
              Sesuai spesifikasi PRD Bab 5.5, notifikasi darurat wajib terkirim dalam waktu &lt; 10 detik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Trigger Bahaya */}
            <label className="p-4 rounded-[6px] border border-line bg-surface-2/60 hover:bg-surface-2 flex items-start gap-3 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.triggers.triggerBahaya}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    triggers: { ...config.triggers, triggerBahaya: e.target.checked },
                  })
                }
                className="mt-1 rounded text-brand focus:ring-brand"
              />
              <div className="space-y-1">
                <div className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-bahaya" />
                  <span>Kondisi Bahaya (Status Kritis)</span>
                </div>
                <p className="text-[12px] text-muted leading-relaxed">
                  Kirim pesan seketika saat parameter melanggar batas ekstrim: <strong>pH &lt; 6.0</strong> atau <strong>pH &gt; 8.8</strong>, <strong>Suhu &gt; 33 °C</strong>, atau <strong>Level air surut</strong>.
                </p>
              </div>
            </label>

            {/* Trigger Waspada ML */}
            <label className="p-4 rounded-[6px] border border-line bg-surface-2/60 hover:bg-surface-2 flex items-start gap-3 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.triggers.triggerWaspada}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    triggers: { ...config.triggers, triggerWaspada: e.target.checked },
                  })
                }
                className="mt-1 rounded text-brand focus:ring-brand"
              />
              <div className="space-y-1">
                <div className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-waspada" />
                  <span>Kondisi Waspada & Prediksi Machine Learning</span>
                </div>
                <p className="text-[12px] text-muted leading-relaxed">
                  Kirim pesan peringatan dini saat model XGBoost memproyeksikan penurunan mutu air dalam horizon 1–3 jam ke depan.
                </p>
              </div>
            </label>

            {/* Trigger Offline */}
            <label className="p-4 rounded-[6px] border border-line bg-surface-2/60 hover:bg-surface-2 flex items-start gap-3 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.triggers.triggerOffline}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    triggers: { ...config.triggers, triggerOffline: e.target.checked },
                  })
                }
                className="mt-1 rounded text-brand focus:ring-brand"
              />
              <div className="space-y-1">
                <div className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-muted" />
                  <span>Node ESP32 Hilang Sinyal (Offline &gt; 2 Menit)</span>
                </div>
                <p className="text-[12px] text-muted leading-relaxed">
                  Beri tahu tim lapangan bila broker MQTT tidak menerima paket telemetri dari kolam selama lebih dari 2 menit (indikasi listrik padam / WiFi putus).
                </p>
              </div>
            </label>

            {/* Trigger Relay Aerator */}
            <label className="p-4 rounded-[6px] border border-line bg-surface-2/60 hover:bg-surface-2 flex items-start gap-3 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.triggers.triggerRelayChange}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    triggers: { ...config.triggers, triggerRelayChange: e.target.checked },
                  })
                }
                className="mt-1 rounded text-brand focus:ring-brand"
              />
              <div className="space-y-1">
                <div className="text-[14px] font-semibold text-ink flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-brand" />
                  <span>Perubahan Status Relay Aerator DC 12V</span>
                </div>
                <p className="text-[12px] text-muted leading-relaxed">
                  Catat dan kirim notifikasi saat aerator otomatis menyala atau dimatikan oleh aturan mikrokontroler.
                </p>
              </div>
            </label>
          </div>

          {/* Jeda Cooldown Anti-Spam */}
          <div className="p-4 rounded-[6px] bg-surface-2 border border-line space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[14px] font-semibold text-ink">
                  Batas Waktu Jeda Anti-Spam (Notification Cooldown)
                </div>
                <p className="text-[12px] text-muted">
                  Mencegah spam pesan berulang jika kondisi buruk berlangsung terus-menerus selama beberapa jam.
                </p>
              </div>

              <select
                value={config.triggers.cooldownMinutes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    triggers: {
                      ...config.triggers,
                      cooldownMinutes: parseInt(e.target.value) || 15,
                    },
                  })
                }
                className="h-10 px-3 bg-surface border border-line rounded-[6px] text-[13px] font-medium text-ink focus:outline-none focus:border-brand"
              >
                <option value={5}>5 Menit (Sensitif / Uji Coba)</option>
                <option value={15}>15 Menit (Standar PRD BanyuWening)</option>
                <option value={30}>30 Menit (Operasional Biasa)</option>
                <option value={60}>60 Menit (Hemat Kuota API)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="h-10 px-6 bg-brand text-brand-ink rounded-[6px] font-semibold text-[13px] hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Aturan Pemicu</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SUB-TAB: RIWAYAT LOG PENGIRIMAN                       */}
      {/* ======================================================== */}
      {activeSubTab === "logs" && (
        <div className="bg-surface border border-line rounded-[8px] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                <History className="w-4 h-4 text-brand" />
                <span>Log Pengiriman & Audit Notifikasi</span>
              </h3>
              <p className="text-[12px] text-muted mt-0.5">
                Riwayat pesan bot dan email yang dikirimkan oleh sistem ke petambak dan pengelola kolam.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter */}
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as "ALL" | NotificationChannel)}
                className="h-9 px-3 bg-surface-2 border border-line rounded-[6px] text-[12px] font-medium text-ink focus:outline-none"
              >
                <option value="ALL">Semua Saluran</option>
                <option value="TELEGRAM">Telegram Saja</option>
                <option value="WHATSAPP">WhatsApp Saja</option>
                <option value="EMAIL">Email Saja</option>
              </select>

              <button
                type="button"
                onClick={handleClearLogs}
                className="h-9 px-3 bg-surface-2 hover:bg-bahaya/10 text-muted hover:text-bahaya border border-line rounded-[6px] text-[12px] font-medium transition-colors flex items-center gap-1.5"
                title="Hapus riwayat log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted space-y-2 border border-dashed border-line rounded-[6px]">
              <History className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-[13px]">Belum ada catatan log pengiriman untuk filter ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2.5 px-3 font-semibold">Waktu</th>
                    <th className="py-2.5 px-3 font-semibold">Saluran</th>
                    <th className="py-2.5 px-3 font-semibold">Target / Penerima</th>
                    <th className="py-2.5 px-3 font-semibold">Pemicu</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Ringkasan Pesan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-muted">
                        {item.timestamp}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.channel === "TELEGRAM"
                              ? "bg-[#229ED9]/15 text-[#229ED9]"
                              : item.channel === "WHATSAPP"
                              ? "bg-[#25D366]/15 text-[#1e9949]"
                              : "bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300"
                          }`}
                        >
                          {item.channel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-ink max-w-[200px] truncate">
                        {item.recipient}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.triggerType === "BAHAYA"
                              ? "bg-bahaya/15 text-bahaya"
                              : item.triggerType === "WASPADA"
                              ? "bg-waspada/15 text-waspada"
                              : "bg-surface-2 text-muted"
                          }`}
                        >
                          {item.triggerType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            item.status === "SUCCESS"
                              ? "text-aman"
                              : item.status === "SIMULATED"
                              ? "text-brand"
                              : "text-bahaya"
                          }`}
                        >
                          {item.status === "SUCCESS" ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Info className="w-3.5 h-3.5" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted max-w-[320px] truncate">
                        {item.preview}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
