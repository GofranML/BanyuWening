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
            'a' => 'Sensor DO optik/galvanik industri beserta probe amonia (NH3) menambah biaya di atas Rp2-4 juta dan menuntut perawatan membran rumit bagi UMKM. Untuk keterjangkauan, kami memakai proxy multivariat (suhu, turbiditas, TDS, pH, siklus diurnal) dengan Sensor Health Watchdog dan menyediakan slot ekspansi I2C/GX16 untuk add-on Modul DO Pro. Khusus bias perilaku naik ke permukaan akibat organ labirin lele, kalibrasi dilakukan memakai DO Meter Portabel dan Test Kit Amonia/Nitrit.',
        ],
        [
            'q' => 'Bagaimana ketahanan sistem jika WiFi kolam atau jaringan internet terputus tengah malam?',
            'a' => 'Core Hub menjalankan inferensi Edge Fuzzy langsung pada mikrokontroler ESP32-WROOM bersama RTC DS3231 dan penyimpanan LittleFS Store-and-Forward 72 jam. Saat WiFi terputus, log pembacaan tetap tersimpan lokal sementara relay aerator maupun pompa tetap dikendalikan dengan batas aman duty-cycle secara permanen tanpa ketergantungan cloud (Mode Offline-Plus Rp0).',
        ],
        [
            'q' => 'Bagaimana pemisahan garansi perangkat keras dan probe kaca pH di lapangan?',
            'a' => 'Kami memisahkan secara tegas antara garansi elektronik Core Hub dan modul kering IP65 selama 12 bulan dengan probe kaca pH (PH-4502C) dan elektroda TDS sebagai komponen habis pakai (consumable). Umur pakai riil probe di air budidaya adalah 4-6 bulan dengan garansi DOA 30 hari, sedangkan probe pengganti resmi tersedia secara transparan Rp195.000/probe.',
        ],
        [
            'q' => 'Apa jaminan arsitektur agar perangkat petambak tidak pernah terkunci saat langganan berakhir?',
            'a' => 'Perangkat keras BanyuWening dibeli penuh oleh petambak dengan kebijakan Anti-Bricking: Mode Offline-Plus Rp0 permanen memastikan pembacaan sensor lokal, layar diagnostik kolam, relay keselamatan aerator, dan kontrol pompa tetap aktif walaupun langganan SaaS Smart Guard dijeda.',
        ],
        [
            'q' => 'Bagaimana efisiensi layanan cloud dan notifikasi WeningBot WhatsApp untuk banyak kolam?',
            'a' => 'Lebih dari 90% interaksi harian WeningBot WhatsApp memakai Rule-Based Engine lokal yang cepat dan hemat biaya tanpa pemborosan kueri AI. Broker EMQX TLS dan FastAPI hanya mengirimkan peringatan kritis serta ringkasan kondisi kualitas air langsung ke nomor WhatsApp petambak.',
        ],
    ];

    public const DEFAULT_HERO_PASSAGE_BEATS = [
        [
            'num' => '01 UKUR',
            'title' => 'Multi-ADC 16-bit',
            'desc' => 'Isolasi pH, suhu, TDS, dan kekeruhan lewat 2-3x ADS1115 & MOSFET.',
        ],
        [
            'num' => '02 ISOLASI',
            'title' => 'Watchdog & LittleFS',
            'desc' => 'Menahan anomali probe & menyimpan telemetri 72 jam tanpa WiFi.',
        ],
        [
            'num' => '03 AKTUASI',
            'title' => 'Edge Fuzzy <15 ms',
            'desc' => 'Menyalakan aerator & pompa kolam secara otonom di Core Hub.',
        ],
    ];

    public const DEFAULT_INTRO_STATS = [
        ['val' => '<15 ms', 'label' => 'Inferensi Edge Fuzzy'],
        ['val' => '72 Jam', 'label' => 'Log LittleFS Offline'],
        ['val' => 'Rp0', 'label' => 'Mode Offline-Plus'],
    ];

    public const DEFAULT_DIURNAL_PHASES = [
        [
            'time' => '06:00 Pagi',
            'title' => 'Stabilitas Suhu & Aerasi Pagi',
            'detail' => 'DS18B20 mendeteksi penurunan suhu malam; Edge Fuzzy menyesuaikan durasi aerasi tanpa boros listrik.',
        ],
        [
            'time' => '13:00 Siang',
            'title' => 'Puncak Radiasi & Fluktuasi pH',
            'detail' => 'Fotosintesis fitoplankton menaikkan pH permukaan; ADS1115 16-bit mengawal ambang aman 6,5-8,5.',
        ],
        [
            'time' => '19:00 Malam',
            'title' => 'Evaluasi Sisa Pakan & TDS',
            'detail' => 'MOSFET switch menyalakan elektroda TDS sesaat agar terhindar dari korosi sambil membaca lonjakan organik.',
        ],
        [
            'time' => '02:00 Dini Hari',
            'title' => 'Siaga Oksigen Terlarut Menurun',
            'detail' => 'Fase paling kritis kolam terpal dijaga penuh Edge Fuzzy lokal + LittleFS Store-and-Forward 72 jam.',
        ],
    ];

    public const DEFAULT_PIPELINE_STEPS = [
        [
            'num' => '01',
            'verb' => 'Ukur',
            'title' => 'Multi-ADC 16-bit & Stilling Well',
            'detail' => 'Sensor pH, DS18B20, TDS dengan MOSFET power-switch anti-korosi, Turbidity potting epoxy dalam stilling well PVC, serta Float Switch membaca 1-4 kolam melalui 2-3x ADS1115 dan kabel shielded maks 3-5 m.',
            'spec' => '2-3x ADS1115 (8-12 kanal ADC) + MCP23017 + Filter EMI',
            'img' => '/pics/ph-meter.jpg',
        ],
        [
            'num' => '02',
            'verb' => 'Isolasi',
            'title' => 'Sensor Health Watchdog',
            'detail' => 'Watchdog mendeteksi nilai flatline atau lensa turbidity jenuh lumut (SATURATED/FAULT) agar tidak memicu alarm palsu, sementara LittleFS + RTC DS3231 menyimpan log lokal hingga 72 jam saat WiFi kolam terputus.',
            'spec' => 'Graceful degradation otomatis + LittleFS 72 Jam + Auto-Resume',
            'img' => '/pics/esp32.jpg',
        ],
        [
            'num' => '03',
            'verb' => 'Prediksi',
            'title' => 'Cold-Start & Random Forest',
            'detail' => 'Dataset kalibrasi kolam budidaya memakai DO Meter Portabel dan Test Kit Amonia/Nitrit guna mengatasi bias organ labirin ikan lele sebelum model Random Forest memproyeksi risiko 1-3 jam ke depan.',
            'spec' => 'EMQX TLS + FastAPI Always-On + Supabase Pro per pond_id',
            'img' => '/pics/lele-1.jpg',
        ],
        [
            'num' => '04',
            'verb' => 'Aktuasi',
            'title' => 'Edge Fuzzy & Relay Aman',
            'detail' => 'Relay 4-Ch/8-Ch menggerakkan aerator dan pompa AC 220V secara lokal saat WiFi terputus (Offline-Plus Rp0). Pembaruan parameter JSON AI dan Dual-OTA rollback 60 detik wajib lolos HITL Engineer Gate.',
            'spec' => 'Hard Safety Bounds + Duty-Cycle Clamp + Zero Autonomous Push',
            'img' => '/pics/aerasi.jpg',
        ],
        [
            'num' => '05',
            'verb' => 'Kabari WA',
            'title' => 'WeningBot WhatsApp-First',
            'detail' => 'Peringatan kritis kualitas air, notifikasi pemulihan Edge Watchdog, pengingat bilas probe mingguan 1-klik, dan ringkasan kondisi kolam dikirim langsung ke WhatsApp petambak.',
            'spec' => '>90% Rule-Based Engine Rp0 LLM + Telegram & Dashboard Web',
            'img' => '/pics/tjipanas.jpg',
        ],
    ];

    public const DEFAULT_ARCH_PHASES = [
        [
            'phase' => 0,
            'num' => '01',
            'short_name' => 'Topologi',
            'label' => 'Topologi Modular 1 Core Hub : 1-4 Modul Kolam',
            'summary' => 'Satu Core Hub melayani hingga 4 kolam terpal berdempetan milik satu petambak via soket kedap air GX16 dan kabel shielded maksimal 3-5 meter guna menjaga kejernihan sinyal ADC dan kestabilan kelistrikan.',
            'specs' => '4 Port GX16 Shielded · 1-4 Stilling Well PVC · Jangkauan 3-5 meter',
        ],
        [
            'phase' => 1,
            'num' => '02',
            'short_name' => 'Susunan PCB',
            'label' => 'Susunan PCB Berlapis & Pemisahan Jalur Daya',
            'summary' => 'Carrier PCB menggabungkan ESP32-WROOM, 2-3x ADS1115 16-bit (8-12 kanal ADC), MCP23017, Level Shifter 3.3V/5V, MOSFET power-switch TDS anti-korosi, serta Relay 4-Ch / 8-Ch Optocoupler dengan filter EMI terisolasi.',
            'specs' => 'ESP32-WROOM · Multi-ADS1115 16-bit · Relay Optocoupler 4/8-Ch',
        ],
        [
            'phase' => 2,
            'num' => '03',
            'short_name' => 'Anti-Lumpur',
            'label' => 'Ketahanan Lumpur & Sensor Health Watchdog',
            'summary' => 'Probe ditempatkan di dalam stilling well PVC pelindung tubrukan ikan. Sensor Health Watchdog otomatis mengisolasi nilai flatline atau lensa turbidity jenuh lumut (SATURATED/FAULT) dan mengirim pengingat bilas ke WhatsApp.',
            'specs' => 'Stilling Well PVC · Isolasi SATURATED/FAULT · Garansi Hub IP65 12 Bln',
        ],
        [
            'phase' => 3,
            'num' => '04',
            'short_name' => 'Hybrid Cloud',
            'label' => 'Always-On Cloud & HITL AI Safety Gate',
            'summary' => 'Broker EMQX TLS Port 8883, FastAPI Always-On, dan Supabase Pro memproses proyeksi Random Forest 1-3 jam per pond_id. Pembaruan parameter JSON wajib melalui Human-in-the-Loop Engineer Gate + Dual-OTA 60s rollback.',
            'specs' => 'EMQX TLS 8883 · Random Forest 1-3 Jam · WeningBot WhatsApp-First',
        ],
    ];

    public const DEFAULT_PACKAGES = [
        [
            'num' => '01',
            'badge' => 'Skala Uji Awal',
            'name' => 'Paket Entry 1K',
            'config' => '1 Core Hub + 1 Modul Kolam',
            'price' => 'Rp1.650.000',
            'saas' => 'Opsional Smart Guard Rp150rb / 3 bln',
            'highlights' => [
                '2x ADS1115 (8-Ch ADC 16-bit)',
                'Relay 4-Ch Optocoupler + Stilling Well PVC',
                'Edge Fuzzy & Mode Offline-Plus Rp0 permanen',
            ],
            'featured' => false,
        ],
        [
            'num' => '02',
            'badge' => 'Paling Populer UMKM',
            'name' => 'Paket Starter 2K',
            'config' => '1 Core Hub + 2 Modul Kolam',
            'price' => 'Rp2.450.000',
            'saas' => 'Smart Guard Rp150rb / siklus 3 bln',
            'highlights' => [
                'Dual-Kolam sinkron via soket GX16 IP65',
                'Sensor Health Watchdog & WeningBot WhatsApp',
                'Siap ekspansi tambah hingga 4 Modul Kolam',
            ],
            'featured' => true,
        ],
        [
            'num' => '03',
            'badge' => 'Klaster Produktif',
            'name' => 'Paket Juragan 4K',
            'config' => '1 Core Hub + 4 Modul Kolam',
            'price' => 'Rp4.150.000',
            'saas' => 'Smart Guard Rp225rb / siklus 3 bln',
            'highlights' => [
                '3x ADS1115 (12-Ch ADC) + MCP23017',
                'Relay 8-Ch (aerator + pompa sirkulasi / kolam)',
                'Prediksi Random Forest 1-3 jam per pond_id',
            ],
            'featured' => false,
        ],
    ];

    public const DEFAULT_DEVELOPER_TEAM = [
        [
            'name' => 'Gofran Muttaqi Likhan',
            'url' => 'https://portofolio-gofran.vercel.app',
        ],
        [
            'name' => 'M. Ilham Nandari',
            'url' => 'https://www.instagram.com/muhammadilhamnandari?jplx=dm5hcXBsZDY5bWdx',
        ],
        [
            'name' => 'Monika Lisbet Lase',
            'url' => 'https://www.instagram.com/monciii_19?jplx=MjBtZDJzeDA2cDFk',
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
        $stepImages = [
            static::getValue('step_1_img', '/pics/ph-meter.jpg'),
            static::getValue('step_2_img', '/pics/esp32.jpg'),
            static::getValue('step_3_img', '/pics/lele-1.jpg'),
            static::getValue('step_4_img', '/pics/aerasi.jpg'),
            static::getValue('step_5_img', '/pics/tjipanas.jpg'),
        ];
        $storedPipelineSteps = static::getValue('pipeline_steps', null);
        if (!is_array($storedPipelineSteps) || count($storedPipelineSteps) === 0) {
            $pipelineSteps = array_map(function ($step, $idx) use ($stepImages) {
                $step['img'] = $stepImages[$idx] ?? $step['img'];
                return $step;
            }, self::DEFAULT_PIPELINE_STEPS, array_keys(self::DEFAULT_PIPELINE_STEPS));
        } else {
            $pipelineSteps = $storedPipelineSteps;
        }

        return [
            'hero_tag' => static::getValue('hero_tag', 'SMART AQUACULTURE STUDIO'),
            'hero_right_tag' => static::getValue('hero_right_tag', 'EDGE FUZZY & IOT HARDWARE'),
            'hero_title' => static::getValue('hero_title', 'BANYUWENING'),
            'hero_headline_1' => static::getValue('hero_headline_1', 'Buat kualitas air'),
            'hero_headline_2' => static::getValue('hero_headline_2', 'kolam selalu terkendali'),
            'hero_subtitle' => static::getValue('hero_subtitle', 'Platform IoT akuakultur presisi dengan kecerdasan Edge Fuzzy lokal dan kontrol pompa otomatis untuk menjaga kualitas air kolam lele 24 jam penuh.'),
            'hero_stage2_kicker' => static::getValue('hero_stage2_kicker', '02 / LORONG TOPOLOGI CORE HUB'),
            'hero_stage2_title_1' => static::getValue('hero_stage2_title_1', 'Satu inti hardware'),
            'hero_stage2_title_2' => static::getValue('hero_stage2_title_2', 'menyatukan empat kolam'),
            'hero_stage2_desc' => static::getValue('hero_stage2_desc', 'Jalur kabel shielded GX16 mengisolasi pembacaan ADC 16-bit tiap kolam sekaligus mempertahankan efisiensi instalasi petambak UMKM.'),
            'hero_passage_beats' => static::getValue('hero_passage_beats', self::DEFAULT_HERO_PASSAGE_BEATS),
            'hero_stage3_kicker' => static::getValue('hero_stage3_kicker', '03 / OTONOMI PENUH PINGGIR KOLAM'),
            'hero_stage3_title_1' => static::getValue('hero_stage3_title_1', 'Dibuat untuk eksplorasi.'),
            'hero_stage3_title_2' => static::getValue('hero_stage3_title_2', 'Siap bekerja otomatis.'),
            'hero_stage3_desc' => static::getValue('hero_stage3_desc', 'Tetap menjaga pH, suhu, kekeruhan, dan pompa aerasi walaupun WiFi kolam terputus melalui Edge Fuzzy & Mode Offline-Plus Rp0.'),

            'intro_statement_1' => static::getValue('intro_statement_1', 'Satu Core Hub pintar'),
            'intro_statement_2' => static::getValue('intro_statement_2', 'menjaga hingga 4 kolam lele,'),
            'intro_statement_3' => static::getValue('intro_statement_3', 'saat WiFi kolam terputus,'),
            'intro_statement_4' => static::getValue('intro_statement_4', 'atau cuaca buruk tengah malam.'),
            'intro_statement_5' => static::getValue('intro_statement_5', 'Tanpa mengunci alat petambak.'),
            'intro_principle_kicker' => static::getValue('intro_principle_kicker', 'PRINSIP DESAIN'),
            'intro_principle_title' => static::getValue('intro_principle_title', 'Anti-Bricking & Otomasi Lokal'),
            'intro_desc' => static::getValue('intro_desc', 'Arsitektur 1 Core Hub untuk 1-4 Modul Kolam dengan Edge Fuzzy + LittleFS Store-and-Forward, Sensor Health Watchdog, dan WeningBot WhatsApp-First. Mode Offline-Plus Rp0 aktif permanen.'),
            'intro_stats' => static::getValue('intro_stats', self::DEFAULT_INTRO_STATS),
            'video_section_title' => static::getValue('video_section_title', 'Siklus 24 jam kolam terpal'),
            'diurnal_phases' => static::getValue('diurnal_phases', self::DEFAULT_DIURNAL_PHASES),

            'pipeline_heading' => static::getValue('pipeline_heading', 'Lima tahap otomasi'),
            'pipeline_steps' => $pipelineSteps,

            'arch_heading_1' => static::getValue('arch_heading_1', 'Fungsional.'),
            'arch_heading_2' => static::getValue('arch_heading_2', 'Dari desain.'),
            'arch_aside' => static::getValue('arch_aside', 'Empat lapisan sistem BanyuWening dari kolam hingga cloud. Gulir halaman atau klik salah satu lapisan untuk memutar dan membedah model 3D secara interaktif.'),
            'arch_phases' => static::getValue('arch_phases', self::DEFAULT_ARCH_PHASES),

            'packages_heading' => static::getValue('packages_heading', 'Skala modular sesuai kebutuhan kolam'),
            'packages_subtitle' => static::getValue('packages_subtitle', 'Perangkat dibeli penuh petambak, dilindungi Mode Offline-Plus Rp0 permanen.'),
            'packages' => static::getValue('packages', self::DEFAULT_PACKAGES),

            'faq_heading' => static::getValue('faq_heading', 'Pertanyaan teknis & operasional'),
            'faqs' => static::getValue('faqs', self::DEFAULT_FAQS),

            'footer_kicker' => static::getValue('footer_kicker', 'Sistem Monitoring & Otomasi Kolam Ikan BanyuWening'),
            'footer_heading' => static::getValue('footer_heading', 'Mari bangun kolam presisi bersama.'),
            'developer_team' => static::getValue('developer_team', self::DEFAULT_DEVELOPER_TEAM),
            'contact_email' => static::getValue('contact_email', 'banyuwening@example.id'),
            'contact_phone' => static::getValue('contact_phone', '+62 8566-9548-964'),
            'institution_name' => static::getValue('institution_name', 'Institut Teknologi dan Bisnis PalComTech'),
            'institution_url' => static::getValue('institution_url', 'https://palcomtech.ac.id/'),
            'cta_text' => static::getValue('cta_text', 'Uji langsung respons Edge Fuzzy multi-kolam, Sensor Health Watchdog, dan simulasi pemantauan kualitas air kolam lele secara real-time.'),
            'cta_button_text' => static::getValue('cta_button_text', 'Buka Versi Demo'),
            'copyright_text' => static::getValue('copyright_text', '© 2026 BanyuWening · Smart Aquaculture for a Sustainable Future.'),
            'capabilities' => static::getValue('capabilities', self::DEFAULT_CAPABILITIES),

            // Media (Images & Videos)
            'hero_bg_image' => static::getValue('hero_bg_image', '/pics/aerasi.jpg'),
            'video_url' => static::getValue('video_url', '/pics/kolam-timelapse.webm'),
            'video_poster' => static::getValue('video_poster', '/pics/kolam-timelapse-poster.jpg'),
            'step_1_img' => $stepImages[0],
            'step_2_img' => $stepImages[1],
            'step_3_img' => $stepImages[2],
            'step_4_img' => $stepImages[3],
            'step_5_img' => $stepImages[4],
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
