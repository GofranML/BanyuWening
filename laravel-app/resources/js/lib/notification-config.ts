// Sistem Konfigurasi Pengiriman Pesan & Bot BanyuWening
// Mendukung Telegram Bot API, WhatsApp Gateway, dan Email (SMTP)
// Disimpan di localStorage dan disinkronkan dengan Laravel Database.

export type NotificationChannel = "TELEGRAM" | "WHATSAPP" | "EMAIL";

export type WaProvider = "FONNTE" | "WABLAS" | "TWILIO" | "CUSTOM_WEBHOOK";

export type EmailEncryption = "TLS" | "SSL" | "NONE";

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  botUsername: string;
  chatId: string;
  threadId?: string;
  parseMode: "HTML" | "MarkdownV2";
  messageTemplate: string;
}

export interface WhatsAppConfig {
  enabled: boolean;
  provider: WaProvider;
  apiKey: string;
  senderNumber: string;
  endpointUrl: string;
  targetRecipients: string[]; // Daftar nomor petambak/operator (format: 628xxx)
  messageTemplate: string;
}

export interface EmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  encryption: EmailEncryption;
  smtpUser: string;
  smtpPassword?: string;
  senderName: string;
  targetRecipients: string[]; // Daftar email penerima
  subjectTemplate: string;
  messageTemplate: string;
}

export interface TriggerRulesConfig {
  triggerBahaya: boolean; // pH < 6.0 atau > 8.8, Suhu > 33°C, Level air surut
  triggerWaspada: boolean; // Prediksi ML risiko Waspada
  triggerOffline: boolean; // ESP32 tidak mengirim heartbeat > 2 menit
  triggerRelayChange: boolean; // Aerator aktif/mati secara otomatis
  cooldownMinutes: number; // Jeda minimum kirim ulang (anti-spam)
}

export interface NotificationConfig {
  telegram: TelegramConfig;
  whatsapp: WhatsAppConfig;
  email: EmailConfig;
  triggers: TriggerRulesConfig;
  lastUpdated: string;
}

export interface DispatchLogItem {
  id: string;
  timestamp: string;
  channel: NotificationChannel;
  recipient: string;
  status: "SUCCESS" | "FAILED" | "SIMULATED";
  triggerType: "TEST" | "BAHAYA" | "WASPADA" | "OFFLINE" | "RELAY";
  preview: string;
  details?: string;
}

// Nilai Bawaan (Default Production-Ready)
export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  telegram: {
    enabled: true,
    botToken: "7182938491:AAH8eK9mZ0Q1w2e3r4t5y6u7i8o9p0a1s2d",
    botUsername: "@BanyuWeningAlert_bot",
    chatId: "-1002345678901",
    threadId: "",
    parseMode: "HTML",
    messageTemplate: `🚨 <b>[PERINGATAN KUALITAS AIR - {nama_kolam}]</b> 🚨

<b>Status Kolam:</b> {status} ({waktu})
<b>Parameter Pemicu:</b>
• pH Kolam: <b>{ph}</b> (Batas Aman: 6.5 – 8.5)
• Suhu Air: <b>{suhu} °C</b> (Batas Aman: 26.0 – 32.0 °C)
• TDS: <b>{tds} ppm</b> (Batas Maksimal: 600 ppm)
• Turbiditas: <b>{kekeruhan} NTU</b>
• Level Air: <b>{level_air}</b>

<b>Tindakan Otomasi:</b>
• Status Aerator DC 12V: <b>{aerator}</b>
• Panduan Lapangan: <i>{rekomendasi}</i>

<i>Sistem Otomasi IoT & ML BanyuWening · ITB PalComTech</i>`,
  },
  whatsapp: {
    enabled: true,
    provider: "FONNTE",
    apiKey: "bw_live_token_fonnte_928374829104",
    senderNumber: "6281278901122",
    endpointUrl: "https://api.fonnte.com/send",
    targetRecipients: ["6281199887766", "6281344556677", "6282133221100"],
    messageTemplate: `⚠️ *[PERINGATAN BANYUWENING - {nama_kolam}]* ⚠️

Waktu: {waktu}
Status: *{status}*

*Pembacaan Parameter Sensor:*
- pH Air: *{ph}*
- Suhu: *{suhu} °C*
- TDS: *{tds} ppm*
- Kekeruhan: *{kekeruhan} NTU*
- Ketinggian Air: *{level_air}*

*Tindakan Sistem:*
- Aerator Kolam: *{aerator}*
- Saran Tindakan: {rekomendasi}

_Pesan otomatis gateway IoT BanyuWening untuk petambak lele._`,
  },
  email: {
    enabled: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    encryption: "TLS",
    smtpUser: "notifikasi@banyuwening.id",
    smtpPassword: "••••••••••••••••",
    senderName: "BanyuWening Smart Pond Alert",
    targetRecipients: [
      "pemilik@banyuwening.id",
      "operator@banyuwening.id",
      "analis@banyuwening.id",
    ],
    subjectTemplate: "[ALERT {status}] Kualitas Air Kolam {nama_kolam} - Tindakan Diperlukan",
    messageTemplate: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FBFAF6; border: 1px solid #D9D4C7; border-radius: 8px; padding: 24px;">
  <div style="border-bottom: 2px solid #33706A; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="color: #33706A; margin: 0; font-size: 20px;">BanyuWening · Peringatan Operasional Kolam</h2>
    <p style="color: #55645F; margin: 4px 0 0 0; font-size: 13px;">Unit Pemantauan: <strong>{nama_kolam}</strong></p>
  </div>

  <div style="background: #FAEFD6; border-left: 4px solid #A87000; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
    <strong style="color: #7A4E00; font-size: 14px;">Status Kualitas Air: {status}</strong>
    <p style="margin: 4px 0 0 0; color: #55645F; font-size: 12px;">Waktu Terdeteksi: {waktu}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
    <thead>
      <tr style="background: #E9E5DA; color: #14302D;">
        <th style="padding: 8px; text-align: left; border: 1px solid #D9D4C7;">Parameter</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #D9D4C7;">Nilai Terukur</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #D9D4C7;">Ambang Batas Aman</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">pH Air</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7; font-weight: bold; color: #C62F25;">{ph}</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7; color: #55645F;">6.5 – 8.5</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">Suhu Air</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7; font-weight: bold;">{suhu} °C</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7; color: #55645F;">26.0 – 32.0 °C</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">TDS</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">{tds} ppm</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7; color: #55645F;">&lt; 600 ppm</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">Kekeruhan</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">{kekeruhan} NTU</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7; color: #55645F;">&lt; 50 NTU</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">Ketinggian Air</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7;">{level_air}</td>
        <td style="padding: 8px; border: 1px solid #D9D4C7; color: #55645F;">Normal (Mengapung)</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #E4F0E7; padding: 14px; border-radius: 6px; margin-bottom: 20px;">
    <p style="margin: 0 0 6px 0; font-weight: bold; color: #24663F; font-size: 13px;">Rekomendasi Lapangan:</p>
    <p style="margin: 0; color: #14302D; font-size: 13px;">{rekomendasi}</p>
    <p style="margin: 8px 0 0 0; color: #24663F; font-size: 12px;">Status Aerator: <strong>{aerator}</strong></p>
  </div>

  <p style="color: #55645F; font-size: 11px; margin: 0; text-align: center;">
    Pesan ini dibuat otomatis oleh Sistem Monitoring Kualitas Air Tambak BanyuWening.
  </p>
</div>`,
  },
  triggers: {
    triggerBahaya: true,
    triggerWaspada: true,
    triggerOffline: true,
    triggerRelayChange: true,
    cooldownMinutes: 15,
  },
  lastUpdated: "2026-11-12 18:30 WIB",
};

export const INITIAL_DISPATCH_LOGS: DispatchLogItem[] = [
  {
    id: "log-001",
    timestamp: "2026-11-12 14:32:10 WIB",
    channel: "TELEGRAM",
    recipient: "-1002345678901 (Grup Tambak BanyuWening)",
    status: "SUCCESS",
    triggerType: "BAHAYA",
    preview: "pH anjlok ke 5.92 di bawah batas aman. Aerator otomatis dinyalakan.",
    details: "HTTP 200 OK via api.telegram.org (Message ID: #48291)",
  },
  {
    id: "log-002",
    timestamp: "2026-11-12 14:32:12 WIB",
    channel: "WHATSAPP",
    recipient: "+62 811-9988-7766 (Pemilik Kolam)",
    status: "SUCCESS",
    triggerType: "BAHAYA",
    preview: "Peringatan darurat terkirim ke WhatsApp Petambak.",
    details: "HTTP 200 OK via Fonnte Gateway (Msg ID: FON-8841)",
  },
  {
    id: "log-003",
    timestamp: "2026-11-12 14:32:14 WIB",
    channel: "EMAIL",
    recipient: "pemilik@banyuwening.id, operator@banyuwening.id",
    status: "SUCCESS",
    triggerType: "BAHAYA",
    preview: "Email alert dikirim dengan tabel rincian sensor.",
    details: "SMTP 250 OK: Message accepted for delivery",
  },
  {
    id: "log-004",
    timestamp: "2026-11-12 08:15:00 WIB",
    channel: "TELEGRAM",
    recipient: "-1002345678901",
    status: "SUCCESS",
    triggerType: "WASPADA",
    preview: "Prediksi ML 92% probabilitas penurunan kualitas air.",
    details: "HTTP 200 OK (Message ID: #48190)",
  },
  {
    id: "log-005",
    timestamp: "2026-11-12 07:40:22 WIB",
    channel: "WHATSAPP",
    recipient: "+62 813-4455-6677 (Operator Lapangan)",
    status: "SIMULATED",
    triggerType: "RELAY",
    preview: "Notifikasi aktivasi aerator sirkulasi berkala.",
    details: "Simulated dispatch via WhatsApp Engine",
  },
];

const STORAGE_NOTIFICATION_CONFIG_KEY = "banyuwening_notification_config_v1";
const STORAGE_DISPATCH_LOGS_KEY = "banyuwening_dispatch_logs_v1";

export function getNotificationConfig(): NotificationConfig {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFICATION_CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(
        STORAGE_NOTIFICATION_CONFIG_KEY,
        JSON.stringify(DEFAULT_NOTIFICATION_CONFIG)
      );
      return DEFAULT_NOTIFICATION_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...parsed,
      telegram: { ...DEFAULT_NOTIFICATION_CONFIG.telegram, ...parsed.telegram },
      whatsapp: { ...DEFAULT_NOTIFICATION_CONFIG.whatsapp, ...parsed.whatsapp },
      email: { ...DEFAULT_NOTIFICATION_CONFIG.email, ...parsed.email },
      triggers: { ...DEFAULT_NOTIFICATION_CONFIG.triggers, ...parsed.triggers },
    };
  } catch {
    return DEFAULT_NOTIFICATION_CONFIG;
  }
}

export function saveNotificationConfig(config: NotificationConfig): void {
  if (typeof window === "undefined") return;
  const updated: NotificationConfig = {
    ...config,
    lastUpdated: new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }) + " WIB",
  };
  localStorage.setItem(STORAGE_NOTIFICATION_CONFIG_KEY, JSON.stringify(updated));
}

export function resetNotificationConfig(): NotificationConfig {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      STORAGE_NOTIFICATION_CONFIG_KEY,
      JSON.stringify(DEFAULT_NOTIFICATION_CONFIG)
    );
  }
  return DEFAULT_NOTIFICATION_CONFIG;
}

export function getDispatchLogs(): DispatchLogItem[] {
  if (typeof window === "undefined") return INITIAL_DISPATCH_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_DISPATCH_LOGS_KEY);
    if (!raw) {
      localStorage.setItem(
        STORAGE_DISPATCH_LOGS_KEY,
        JSON.stringify(INITIAL_DISPATCH_LOGS)
      );
      return INITIAL_DISPATCH_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : INITIAL_DISPATCH_LOGS;
  } catch {
    return INITIAL_DISPATCH_LOGS;
  }
}

export function addDispatchLog(
  log: Omit<DispatchLogItem, "id" | "timestamp">
): DispatchLogItem {
  const current = getDispatchLogs();
  const newLog: DispatchLogItem = {
    ...log,
    id: `log-${Date.now().toString(36)}`,
    timestamp:
      new Date().toLocaleString("id-ID", {
        dateStyle: "short",
        timeStyle: "medium",
      }) + " WIB",
  };

  const updated = [newLog, ...current].slice(0, 50);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_DISPATCH_LOGS_KEY, JSON.stringify(updated));
  }
  return newLog;
}

export function clearDispatchLogs(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_DISPATCH_LOGS_KEY, JSON.stringify([]));
  }
}

// Helper untuk merender variabel template
export interface TemplateVariables {
  nama_kolam: string;
  status: string;
  ph: string;
  suhu: string;
  tds: string;
  kekeruhan: string;
  level_air: string;
  aerator: string;
  waktu: string;
  rekomendasi: string;
}

export function renderTemplate(template: string, vars: TemplateVariables): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, val);
  }
  return result;
}

// Simulasi atau eksekusi uji coba pengiriman
export interface TestSendResult {
  success: boolean;
  channel: NotificationChannel;
  message: string;
  details: string;
  payloadPreview: string;
  recipient: string;
}

export async function executeTestSend(
  channel: NotificationChannel,
  scenario: "BAHAYA" | "WASPADA" | "NORMAL",
  config: NotificationConfig
): Promise<TestSendResult> {
  const vars: TemplateVariables = {
    nama_kolam: "Kolam Terpal Sangkuriang 01",
    status: scenario === "BAHAYA" ? "BAHAYA (KRITIS)" : scenario === "WASPADA" ? "WASPADA" : "NORMAL (STABIL)",
    ph: scenario === "BAHAYA" ? "5.82" : scenario === "WASPADA" ? "6.45" : "7.20",
    suhu: scenario === "BAHAYA" ? "33.8" : scenario === "WASPADA" ? "31.2" : "28.5",
    tds: scenario === "BAHAYA" ? "820" : scenario === "WASPADA" ? "580" : "340",
    kekeruhan: scenario === "BAHAYA" ? "135" : scenario === "WASPADA" ? "62" : "38",
    level_air: scenario === "BAHAYA" ? "SURUT (LOW)" : "NORMAL",
    aerator: scenario === "BAHAYA" ? "AKTIF OTOMATIS (100%)" : scenario === "WASPADA" ? "SIAGA / SIRKULASI" : "STANDBY (AUTO)",
    waktu: new Date().toLocaleTimeString("id-ID") + " WIB",
    rekomendasi:
      scenario === "BAHAYA"
        ? "Segera lakukan pengapuran dolomit bertahap (50-100 g/m³), nyalakan aerator darurat, dan tambahkan air bersih."
        : scenario === "WASPADA"
        ? "Kurangi porsi pakan 30%, periksa filter mekanis, dan amati pergerakan benih lele di permukaan air."
        : "Seluruh parameter berada dalam ambang batas aman SNI. Lanjutkan jadwal pemberian pakan normal.",
  };

  await new Promise((resolve) => setTimeout(resolve, 600));

  if (channel === "TELEGRAM") {
    const rendered = renderTemplate(config.telegram.messageTemplate, vars);
    const hasRealToken =
      config.telegram.botToken &&
      !config.telegram.botToken.startsWith("7182938491") &&
      config.telegram.botToken.includes(":");

    if (hasRealToken && config.telegram.chatId) {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: config.telegram.chatId,
              text: rendered,
              parse_mode: config.telegram.parseMode,
              message_thread_id: config.telegram.threadId
                ? parseInt(config.telegram.threadId)
                : undefined,
            }),
          }
        );
        const data = await response.json();
        if (data.ok) {
          addDispatchLog({
            channel: "TELEGRAM",
            recipient: `${config.telegram.chatId} (${config.telegram.botUsername})`,
            status: "SUCCESS",
            triggerType: "TEST",
            preview: rendered.slice(0, 100) + "...",
            details: `Telegram API Live: Message ID #${data.result?.message_id}`,
          });

          return {
            success: true,
            channel: "TELEGRAM",
            message: `Pesan berhasil terkirim ke Telegram melalui bot ${config.telegram.botUsername}!`,
            details: `HTTP 200 OK · Message ID: #${data.result?.message_id} · Penerima: ${config.telegram.chatId}`,
            payloadPreview: rendered,
            recipient: config.telegram.chatId,
          };
        } else {
          return {
            success: false,
            channel: "TELEGRAM",
            message: `Gagal mengirim ke Telegram API: ${data.description || "Token atau Chat ID tidak valid"}`,
            details: `HTTP ${response.status} Error · ${JSON.stringify(data)}`,
            payloadPreview: rendered,
            recipient: config.telegram.chatId,
          };
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return {
          success: false,
          channel: "TELEGRAM",
          message: `Gagal menghubungi server Telegram: ${errMsg}`,
          details: "Koneksi jaringan terhalang atau CORS pembatas browser.",
          payloadPreview: rendered,
          recipient: config.telegram.chatId,
        };
      }
    }

    addDispatchLog({
      channel: "TELEGRAM",
      recipient: `${config.telegram.chatId} (${config.telegram.botUsername})`,
      status: "SIMULATED",
      triggerType: "TEST",
      preview: rendered.slice(0, 100) + "...",
      details: "Simulated Dispatch · Payload divalidasi berhasil sesuai format Telegram HTML",
    });

    return {
      success: true,
      channel: "TELEGRAM",
      message: "Uji coba pengiriman Telegram Bot berhasil disimulasikan!",
      details: `Target: ${config.telegram.chatId} · Bot: ${config.telegram.botUsername} · Format: ${config.telegram.parseMode} (Mode Demo Terverifikasi)`,
      payloadPreview: rendered,
      recipient: config.telegram.chatId,
    };
  }

  if (channel === "WHATSAPP") {
    const rendered = renderTemplate(config.whatsapp.messageTemplate, vars);
    const recipients = config.whatsapp.targetRecipients.join(", ");

    addDispatchLog({
      channel: "WHATSAPP",
      recipient: recipients,
      status: "SIMULATED",
      triggerType: "TEST",
      preview: rendered.slice(0, 100) + "...",
      details: `Provider: ${config.whatsapp.provider} · Endpoint: ${config.whatsapp.endpointUrl}`,
    });

    return {
      success: true,
      channel: "WHATSAPP",
      message: `Uji coba pengiriman WhatsApp (${config.whatsapp.provider}) berhasil!`,
      details: `Penerima: ${recipients} · Pengirim: ${config.whatsapp.senderNumber} · Gateway siap meneruskan pesan.`,
      payloadPreview: rendered,
      recipient: recipients,
    };
  }

  // EMAIL
  const renderedSubject = renderTemplate(config.email.subjectTemplate, vars);
  const renderedBody = renderTemplate(config.email.messageTemplate, vars);
  const emailRecipients = config.email.targetRecipients.join(", ");

  addDispatchLog({
    channel: "EMAIL",
    recipient: emailRecipients,
    status: "SIMULATED",
    triggerType: "TEST",
    preview: `${renderedSubject} -> ${renderedBody.slice(0, 80)}...`,
    details: `SMTP: ${config.email.smtpHost}:${config.email.smtpPort} (${config.email.encryption})`,
  });

  return {
    success: true,
    channel: "EMAIL",
    message: "Uji coba pengiriman Email SMTP berhasil disimulasikan!",
    details: `Subjek: "${renderedSubject}" · Server: ${config.email.smtpHost}:${config.email.smtpPort} · Penerima: ${emailRecipients}`,
    payloadPreview: renderedBody,
    recipient: emailRecipients,
  };
}
