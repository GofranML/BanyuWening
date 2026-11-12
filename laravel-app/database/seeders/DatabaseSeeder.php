<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Device;
use App\Models\SensorReading;
use App\Models\Prediction;
use App\Models\Alert;
use App\Models\RelayLog;
use App\Models\NotificationSetting;
use App\Models\DispatchLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Akun Pengguna BanyuWening
        $users = [
            [
                'name' => 'Gofran Muttaqi Likhan',
                'email' => 'admin@banyuwening.id',
                'password' => Hash::make('admin'),
                'role' => 'ADMIN',
                'title' => 'Super Administrator / Pengembang Sistem',
                'pond_name' => 'Seluruh Unit Kolam BanyuWening',
                'avatar_initials' => 'GM',
                'phone' => '+62 812-7890-1122',
            ],
            [
                'name' => 'Rudi Hartono',
                'email' => 'operator@banyuwening.id',
                'password' => Hash::make('operator'),
                'role' => 'OPERATOR',
                'title' => 'Operator Teknis Lapangan',
                'pond_name' => 'Kolam Produksi Lele 01 (Terpal)',
                'avatar_initials' => 'RH',
                'phone' => '+62 813-4455-6677',
            ],
            [
                'name' => 'Dr. Ir. Hendra Wijaya',
                'email' => 'analis@banyuwening.id',
                'password' => Hash::make('analis'),
                'role' => 'ANALIS',
                'title' => 'Pakar Akuakultur & Kualitas Air',
                'pond_name' => 'Unit Riset & Analisis Tambak',
                'avatar_initials' => 'HW',
                'phone' => '+62 821-3322-1100',
            ],
            [
                'name' => 'H. Bambang Sugiarto',
                'email' => 'pemilik@banyuwening.id',
                'password' => Hash::make('pemilik'),
                'role' => 'PEMILIK',
                'title' => 'Pemilik Budidaya Tambak',
                'pond_name' => 'Kolam Terpal Sangkuriang 1 & 2',
                'avatar_initials' => 'BS',
                'phone' => '+62 811-9988-7766',
            ],
        ];

        foreach ($users as $u) {
            User::updateOrCreate(['email' => $u['email']], $u);
        }

        // 2. Node Perangkat ESP32 (Status Awal Standby Menunggu Sambungan Fisik)
        $device = Device::updateOrCreate(
            ['device_code' => 'ESP32-NODE-01'],
            [
                'name' => 'ESP32 Node Sensor Kolam 01',
                'pond_name' => 'Kolam Terpal Sangkuriang 01',
                'firmware_version' => 'v1.4.2-failsafe',
                'ip_address' => '192.168.1.104',
                'mac_address' => 'A4:CF:12:89:BC:42',
                'mqtt_topic' => 'banyuwening/pond01/telemetry',
                'status' => 'STANDBY',
                'mode' => 'AUTO',
                'aerator_on' => false,
                'last_heartbeat_at' => null,
            ]
        );

        // Catatan: SensorReadings, Predictions, Alerts, dan RelayLogs TIDAK di-seed
        // pada database operasional utama agar dashboard utama bersih dan berada dalam mode Standby.
        // Data simulasi lengkap untuk pengujian telah disediakan secara independen di Mode Demo (/demo).

        // 7. Notification Settings
        NotificationSetting::updateOrCreate(
            ['key' => 'default'],
            [
                'telegram_config' => [
                    'enabled' => true,
                    'botToken' => '7182938491:AAH8eK9mZ0Q1w2e3r4t5y6u7i8o9p0a1s2d',
                    'botUsername' => '@BanyuWeningAlert_bot',
                    'chatId' => '-1002345678901',
                    'threadId' => '',
                    'parseMode' => 'HTML',
                    'messageTemplate' => "🚨 <b>[PERINGATAN KUALITAS AIR - {nama_kolam}]</b> 🚨\n\n<b>Status Kolam:</b> {status} ({waktu})\n<b>Parameter Pemicu:</b>\n• pH Kolam: <b>{ph}</b> (Batas: 6.5 – 8.5)\n• Suhu Air: <b>{suhu} °C</b> (Batas: 26.0 – 32.0 °C)\n• TDS: <b>{tds} ppm</b> (Batas: 600 ppm)\n• Turbiditas: <b>{kekeruhan} NTU</b>\n• Level Air: <b>{level_air}</b>\n\n<b>Tindakan Otomasi:</b>\n• Status Aerator: <b>{aerator}</b>\n• Panduan: <i>{rekomendasi}</i>\n\n<i>Sistem Otomasi IoT & ML BanyuWening</i>",
                ],
                'whatsapp_config' => [
                    'enabled' => true,
                    'provider' => 'FONNTE',
                    'apiKey' => 'bw_live_token_fonnte_928374829104',
                    'senderNumber' => '6281278901122',
                    'endpointUrl' => 'https://api.fonnte.com/send',
                    'targetRecipients' => ['6281199887766', '6281344556677', '6282133221100'],
                    'messageTemplate' => "⚠️ *[PERINGATAN BANYUWENING - {nama_kolam}]* ⚠️\n\nWaktu: {waktu}\nStatus: *{status}*\n\n*Pembacaan Parameter:*\n- pH Air: *{ph}*\n- Suhu: *{suhu} °C*\n- TDS: *{tds} ppm*\n- Kekeruhan: *{kekeruhan} NTU*\n- Level Air: *{level_air}*\n\n*Tindakan:* {rekomendasi}\n- Aerator: *{aerator}*",
                ],
                'email_config' => [
                    'enabled' => true,
                    'smtpHost' => 'smtp.gmail.com',
                    'smtpPort' => 587,
                    'encryption' => 'TLS',
                    'smtpUser' => 'notifikasi@banyuwening.id',
                    'smtpPassword' => '••••••••••••••••',
                    'senderName' => 'BanyuWening Smart Pond Alert',
                    'targetRecipients' => [
                        'pemilik@banyuwening.id',
                        'operator@banyuwening.id',
                        'analis@banyuwening.id',
                    ],
                    'subjectTemplate' => '[ALERT {status}] Kualitas Air Kolam {nama_kolam} - Tindakan Diperlukan',
                    'messageTemplate' => '<div style="font-family: Arial; padding: 20px;"><h2>BanyuWening Alert</h2><p>Status: {status}</p><p>pH: {ph}, Suhu: {suhu} °C, TDS: {tds} ppm</p><p>Rekomendasi: {rekomendasi}</p></div>',
                ],
                'trigger_rules' => [
                    'triggerBahaya' => true,
                    'triggerWaspada' => true,
                    'triggerOffline' => true,
                    'triggerRelayChange' => true,
                    'cooldownMinutes' => 15,
                ],
            ]
        );

        // 8. Dispatch Logs
        $dispatchLogs = [
            [
                'channel' => 'TELEGRAM',
                'recipient' => '-1002345678901 (Grup Tambak BanyuWening)',
                'trigger_type' => 'BAHAYA',
                'status' => 'SUCCESS',
                'preview' => 'pH anjlok ke 5.92 di bawah batas aman. Aerator otomatis dinyalakan.',
                'details' => 'HTTP 200 OK via api.telegram.org (Message ID: #48291)',
                'created_at' => Carbon::now()->subHours(8),
            ],
            [
                'channel' => 'WHATSAPP',
                'recipient' => '+62 811-9988-7766 (Pemilik Kolam)',
                'trigger_type' => 'BAHAYA',
                'status' => 'SUCCESS',
                'preview' => 'Peringatan darurat terkirim ke WhatsApp Petambak.',
                'details' => 'HTTP 200 OK via Fonnte Gateway (Msg ID: FON-8841)',
                'created_at' => Carbon::now()->subHours(8),
            ],
            [
                'channel' => 'EMAIL',
                'recipient' => 'pemilik@banyuwening.id, operator@banyuwening.id',
                'trigger_type' => 'BAHAYA',
                'status' => 'SUCCESS',
                'preview' => 'Email alert dikirim dengan tabel rincian sensor.',
                'details' => 'SMTP 250 OK: Message accepted for delivery',
                'created_at' => Carbon::now()->subHours(8),
            ],
            [
                'channel' => 'TELEGRAM',
                'recipient' => '-1002345678901',
                'trigger_type' => 'WASPADA',
                'status' => 'SUCCESS',
                'preview' => 'Prediksi ML 92% probabilitas penurunan kualitas air.',
                'details' => 'HTTP 200 OK (Message ID: #48190)',
                'created_at' => Carbon::now()->subMinutes(12),
            ],
        ];

        foreach ($dispatchLogs as $dl) {
            DispatchLog::create($dl);
        }
    }
}
