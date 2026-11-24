<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingContent extends Model
{
    protected $fillable = ['key', 'value'];

    public const DEFAULT_CAPABILITIES = [
        [
            'title' => 'Arsitektur 1 Core Hub : 1-4 Kolam',
            'desc' => 'Satu Core Hub (ESP32-WROOM, 2-3x ADS1115 16-bit, MCP23017, Box IP65) memantau hingga 4 kolam berdempetan milik satu pemilik via kabel shielded maksimal 3-5 m dan soket GX16.',
            'tag' => 'Modular Multi-Kolam',
        ],
        [
            'title' => 'Edge Fuzzy & Anti-Bricking Rp0',
            'desc' => 'Saat WiFi kolam terputus, Edge Fuzzy, RTC DS3231, dan LittleFS Store-and-Forward tetap menggerakkan aerator atau pompa. Mode Offline-Plus aktif permanen Rp0 walau SaaS dijeda.',
            'tag' => 'Offline-Plus',
        ],
        [
            'title' => 'Edge Watchdog & Auto-Resume',
            'desc' => 'Watchdog perangkat keras menjaga siklus pemantauan tetap konsisten, menyimpan log sementara di memori LittleFS 72 jam saat koneksi terputus, dan mengirim notifikasi ke WhatsApp ketika daya maupun jaringan kembali pulih.',
            'tag' => 'Edge Autonomy',
        ],
        [
            'title' => 'Sensor Health Watchdog & Stilling Well',
            'desc' => 'Mendeteksi nilai flatline atau lensa turbidity jenuh lumut (SATURATED/FAULT), mengisolasi parameter rusak otomatis, serta melindungi probe dalam pipa PVC dengan MOSFET power-switch TDS.',
            'tag' => 'Ketahanan Lumpur',
        ],
        [
            'title' => 'Cloud Random Forest & HITL Safety Gate',
            'desc' => 'EMQX TLS, FastAPI Always-On, dan Supabase Pro memprediksi risiko air 1-3 jam ke depan. Setiap usulan JSON AI maupun Dual-OTA rollback 60 detik wajib lolos Human-in-the-Loop Engineer Gate.',
            'tag' => 'Always-On AI',
        ],
        [
            'title' => 'WeningBot WhatsApp-First & Paket Panen',
            'desc' => 'Entry Rp1,65 jt, Starter 2K Rp2,45 jt, Juragan 4K Rp4,15 jt (PO DP 50% + Lunas 50%). SaaS Smart Guard Rp150rb/Rp225rb per siklus 3 bulan; >90% bot WA memakai Rule-Based Engine Rp0 LLM.',
            'tag' => 'Ekonomi UMKM',
        ],
    ];

    public const DEFAULT_FAQS = [
        [
            'q' => 'Mengapa tidak menyertakan sensor DO dan Amonia di paket Rp2,45 juta, serta bagaimana mengatasi organ labirin ikan lele?',
            'a' => 'Sensor DO optik/galvanik industri beserta probe amonia (NH3) menambah biaya di atas Rp2-4 juta dan menuntut perawatan membran rumit bagi UMKM. Untuk keterjangkauan, kami memakai proxy multivariat (suhu, turbiditas, TDS, pH, siklus diurnal) dengan Sensor Health Watchdog dan menyediakan slot ekspansi I2C/GX16 untuk add-on Modul DO Pro. Khusus bias perilaku naik ke permukaan akibat organ labirin lele, kalibrasi dilakukan dengan alat ukur DO Portabel dan Test Kit Amonia/Nitrit.',
        ],
        [
            'q' => 'Bagaimana ketahanan sistem jika WiFi kolam atau jaringan internet terputus tengah malam?',
            'a' => 'Core Hub menjalankan inferensi Edge Fuzzy langsung di mikrokontroler lokal bersama RTC DS3231 dan penyimpanan LittleFS Store-and-Forward. Saat WiFi terputus, log pembacaan tetap terekam hingga ribuan entri sementara relay aerator maupun pompa tetap dikendalikan secara lokal dengan batas pengaman duty-cycle tanpa memicu ketergantungan cloud (Mode Offline-Plus Rp0 permanen).',
        ],
        [
            'q' => 'Bagaimana pemisahan garansi perangkat keras dan probe kaca pH di lapangan?',
            'a' => 'Kami memisahkan secara tegas antara garansi elektronik Core Hub dan modul kering IP65 selama 12 bulan dengan probe kaca pH (PH-4502C) dan elektroda TDS sebagai komponen habis pakai (consumable). Umur pakai riil probe di air budidaya adalah 4-6 bulan dengan garansi DOA 30 hari, sedangkan probe pengganti resmi tersedia secara transparan Rp195.000/probe.',
        ],
        [
            'q' => 'Apa jaminan arsitektur agar perangkat petambak tidak pernah terkunci?',
            'a' => 'Perangkat keras BanyuWening dibeli penuh oleh petambak dan berjalan dengan kebijakan Anti-Bricking: mode Offline-Plus Rp0 permanen memastikan pembacaan sensor lokal, relay keselamatan aerator, dan kontrol pompa tetap aktif walaupun langganan SaaS Smart Guard dijeda.',
        ],
        [
            'q' => 'Bagaimana biaya infrastruktur cloud & WeningBot WhatsApp tetap efisien untuk banyak kolam?',
            'a' => 'Lebih dari 90% interaksi harian WeningBot WhatsApp memakai Rule-Based Engine lokal tanpa beban biaya LLM tambahan, dipadukan dengan broker EMQX TLS dan FastAPI yang hanya mengirim ringkasan telemetri dan peringatan kritis langsung ke WhatsApp petambak.',
        ],
    ];

    /**
     * Ambil satu nilai setting dengan default.
     */
    public static function getValue(string $key, $default = null)
    {
        $item = static::where('key', $key)->first();
        if (!$item || $item->value === null) {
            return $default;
        }

        $decoded = json_decode($item->value, true);
        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : $item->value;
    }

    /**
     * Sanitisasi nilai landing (hanya string dibiarkan; tag lain dibuang).
     * Mencegah stored-XSS pada konten landing.
     */
    public static function sanitizeValue($value)
    {
        if (is_string($value)) {
            return strip_tags($value);
        }
        if (is_array($value)) {
            return array_map([static::class, 'sanitizeValue'], $value);
        }
        return $value;
    }

    /**
     * Simpan satu setting.
     */
    public static function setValue(string $key, $value): void
    {
        $value = static::sanitizeValue($value);
        $serialized = is_array($value) || is_object($value) ? json_encode($value) : (string) $value;
        static::updateOrCreate(['key' => $key], ['value' => $serialized]);
    }

    /**
     * Ambil seluruh konfigurasi konten landing page.
     */
    public static function getAllSettings(): array
    {
        return [
            'hero_tag' => static::getValue('hero_tag', 'Sistem Monitoring & Otomasi Kualitas Air Kolam'),
            'hero_title' => static::getValue('hero_title', 'BANYUWENING'),
            'hero_subtitle' => static::getValue('hero_subtitle', 'Platform IoT akuakultur presisi dengan kecerdasan Edge Fuzzy lokal dan kontrol pompa otomatis untuk menjaga kualitas air kolam lele 24 jam penuh.'),
            'intro_statement_1' => static::getValue('intro_statement_1', 'Satu Core Hub pintar'),
            'intro_statement_2' => static::getValue('intro_statement_2', 'menjaga hingga 4 kolam lele,'),
            'intro_statement_3' => static::getValue('intro_statement_3', 'saat WiFi kolam terputus,'),
            'intro_statement_4' => static::getValue('intro_statement_4', 'atau cuaca buruk tengah malam.'),
            'intro_statement_5' => static::getValue('intro_statement_5', 'Tanpa mengunci alat petambak.'),
            'intro_desc' => static::getValue('intro_desc', 'Arsitektur 1 Core Hub untuk 1-4 Modul Kolam dengan Edge Fuzzy + LittleFS Store-and-Forward, Sensor Health Watchdog, dan WeningBot WhatsApp-First. Mode Offline-Plus Rp0 aktif permanen.'),
            'contact_email' => static::getValue('contact_email', 'banyuwening@example.id'),
            'contact_phone' => static::getValue('contact_phone', '+62 8566-9548-964'),
            'institution_name' => static::getValue('institution_name', 'Institut Teknologi dan Bisnis PalComTech'),
            'institution_url' => static::getValue('institution_url', 'https://palcomtech.ac.id/'),
            'cta_text' => static::getValue('cta_text', 'Uji langsung respons Edge Fuzzy multi-kolam, Sensor Health Watchdog, dan simulasi pemantauan kualitas air kolam lele secara real-time.'),
            'cta_button_text' => static::getValue('cta_button_text', 'Buka Versi Demo'),
            'copyright_text' => static::getValue('copyright_text', '© 2026 BanyuWening · Smart Aquaculture for a Sustainable Future.'),
            'capabilities' => static::getValue('capabilities', self::DEFAULT_CAPABILITIES),
            'faqs' => static::getValue('faqs', self::DEFAULT_FAQS),

            // Media (Images & Videos)
            'hero_bg_image' => static::getValue('hero_bg_image', '/pics/aerasi.jpg'),
            'video_url' => static::getValue('video_url', '/pics/kolam-timelapse.webm'),
            'video_poster' => static::getValue('video_poster', '/pics/kolam-timelapse-poster.jpg'),
            'step_1_img' => static::getValue('step_1_img', '/pics/ph-meter.jpg'),
            'step_2_img' => static::getValue('step_2_img', '/pics/esp32.jpg'),
            'step_3_img' => static::getValue('step_3_img', '/pics/lele-1.jpg'),
            'step_4_img' => static::getValue('step_4_img', '/pics/aerasi.jpg'),
            'step_5_img' => static::getValue('step_5_img', '/pics/tjipanas.jpg'),
            'showcase_1_img' => static::getValue('showcase_1_img', '/pics/takeran.jpg'),
            'showcase_2_img' => static::getValue('showcase_2_img', '/pics/esp32.jpg'),
            'showcase_3_img' => static::getValue('showcase_3_img', '/pics/aerasi.jpg'),
            'showcase_4_img' => static::getValue('showcase_4_img', '/pics/ph-meter.jpg'),
            'footer_bg_image' => static::getValue('footer_bg_image', '/pics/takeran.jpg'),
        ];
    }

    /**
     * Simpan banyak setting sekaligus.
     */
    public static function setMany(array $settings): void
    {
        foreach ($settings as $key => $val) {
            static::setValue($key, $val);
        }
    }
}
