<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingContent extends Model
{
    protected $fillable = ['key', 'value'];

    public const DEFAULT_CAPABILITIES = [
        [
            'title' => 'Pemantauan Kontinu 24/7',
            'desc' => 'Sensor pH, suhu DS18B20, TDS, dan turbiditas membaca setiap 30 detik tanpa jeda melebihi 2 menit.',
            'tag' => 'Hardware ESP32',
        ],
        [
            'title' => 'Failsafe Mandiri Tanpa Internet',
            'desc' => 'Mikrokontroler memiliki aturan deterministik lokal. Jika pH < 6.0 atau suhu > 33°C, aerator seketika aktif walau koneksi WiFi kolam terputus.',
            'tag' => 'Keandalan Lokal',
        ],
        [
            'title' => 'Prediksi Dini Risiko 1–3 Jam',
            'desc' => 'Model Random Forest mengevaluasi pola laju perubahan air (dpH/dt, dTemp/dt) untuk mendeteksi potensi krisis sebelum ikan mengalami stres.',
            'tag' => 'Machine Learning',
        ],
        [
            'title' => 'Otomasi Relay Cepat',
            'desc' => 'Perintah aktivasi relay aerator dieksekusi kurang dari 5 detik setelah anomali air terdeteksi di kolam.',
            'tag' => 'Kendali Aktuator',
        ],
        [
            'title' => 'Peringatan Dini Telegram',
            'desc' => 'Notifikasi darurat terkirim ke smartphone petambak dalam 10 detik dengan rekomendasi tindakan lapangan praktis.',
            'tag' => 'Telegram Bot',
        ],
        [
            'title' => 'Arsitektur Terbuka & Modular',
            'desc' => 'Komponen mikrokontroler dan probe sensor modular yang mudah dirawat, dikalibrasi, dan diperluas sesuai volume kolam.',
            'tag' => 'Skalabilitas',
        ],
    ];

    public const DEFAULT_FAQS = [
        [
            'q' => 'Apakah sistem tetap bekerja jika koneksi WiFi atau internet di kolam terputus?',
            'a' => 'Ya. ESP32 dilengkapi aturan keselamatan deterministik (Failsafe Lokal). Walaupun jaringan internet atau cloud terputus, mikrokontroler secara mandiri akan langsung menyalakan relay aerator jika pH anjlok di bawah 6,0 atau suhu melewati 33°C.',
        ],
        [
            'q' => 'Mengapa BanyuWening tidak menggunakan sensor Dissolved Oxygen (DO)?',
            'a' => 'Sensor Dissolved Oxygen (DO) industri berkualitas memerlukan kalibrasi larutan elektrolit yang rumit bagi pembudidaya kolam air tawar. BanyuWening mengombinasikan sensor pH, suhu, TDS, dan turbiditas dengan algoritma prediksi ML sebagai indikator komprehensif kesehatan ekosistem air.',
        ],
        [
            'q' => 'Berapa lama waktu yang dibutuhkan hingga notifikasi Telegram tiba?',
            'a' => 'Berdasarkan pengujian arsitektur sistem, notifikasi Telegram terkirim kurang dari 10 detik sejak anomali parameter dibaca oleh sensor di kolam.',
        ],
        [
            'q' => 'Jenis komoditas budidaya apa saja yang didukung?',
            'a' => 'Prototype saat ini dikhususkan dan dikalibrasi untuk kolam terpal budidaya ikan lele (Clarias batrachus). Ambang batas juga dapat disesuaikan untuk komoditas ikan patin dan nila.',
        ],
        [
            'q' => 'Bagaimana cara kerja prediksi risiko 1–3 jam ke depan?',
            'a' => 'Laravel memproses fitur time-series akuakultur (deviasi pH, deviasi suhu, rasio TDS, Water Stress Index). Model Random Forest (Scikit-learn) kemudian mengklasifikasikan kemungkinan status air akan memburuk dalam 1 hingga 3 jam mendatang.',
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
     * Simpan satu setting.
     */
    public static function setValue(string $key, $value): void
    {
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
            'hero_subtitle' => static::getValue('hero_subtitle', 'Pemantauan kualitas air kolam 24/7 dengan prediksi risiko dini, otomasi aerator, dan pengaman lokal tanpa internet'),
            'intro_statement_1' => static::getValue('intro_statement_1', 'Jaga kolam lele 500 ekor'),
            'intro_statement_2' => static::getValue('intro_statement_2', 'walau tengah malam,'),
            'intro_statement_3' => static::getValue('intro_statement_3', 'saat pH turun tajam'),
            'intro_statement_4' => static::getValue('intro_statement_4', 'dan oksigen menipis.'),
            'intro_statement_5' => static::getValue('intro_statement_5', 'BanyuWening tidak tidur.'),
            'intro_desc' => static::getValue('intro_desc', 'Sistem IoT pemantauan kualitas air yang membaca pH, suhu, TDS, dan kekeruhan tiap 30 detik untuk kolam budidaya lele, patin, dan nila.'),
            'contact_email' => static::getValue('contact_email', 'BanyuWening@example.com'),
            'contact_phone' => static::getValue('contact_phone', '+62 8566-9548-964'),
            'institution_name' => static::getValue('institution_name', 'Institut Teknologi dan Bisnis PalComTech'),
            'institution_url' => static::getValue('institution_url', 'https://palcomtech.ac.id/'),
            'cta_text' => static::getValue('cta_text', 'Sistem ini dikembangkan oleh mahasiswa Institut Teknologi dan Bisnis PalComTech untuk membantu pembudidaya ikan air tawar di Indonesia.'),
            'cta_button_text' => static::getValue('cta_button_text', 'Masuk ke Versi Demo'),
            'copyright_text' => static::getValue('copyright_text', '© 2026 BanyuWening · Institut Teknologi dan Bisnis PalComTech.'),
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
