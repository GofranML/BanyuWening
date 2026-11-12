import { useState, useEffect } from "react";
import { Link } from "@inertiajs/react";
import { motion } from "motion/react";
import { SimulatorSection } from "@/Components/SimulatorSection";
import { ContactEmailLink } from "@/Components/ContactEmailLink";
import type { LandingContentSettings } from "@/Types";
import {
  ArrowRight,
  ChevronDown,
  Sparkles,
  MessageCircle,
  ExternalLink,
} from "lucide-react";

const spring = { type: "spring" as const, bounce: 0, duration: 0.5 };

interface HomeProps {
  landingContent?: LandingContentSettings;
}

export default function Home({ landingContent }: HomeProps) {
  const [hoveredPanel, setHoveredPanel] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const defaultCapabilities = [
    {
      title: "Pemantauan Kontinu 24/7",
      desc: "Sensor pH, suhu DS18B20, TDS, dan turbiditas membaca setiap 30 detik tanpa jeda melebihi 2 menit.",
      tag: "Hardware ESP32",
    },
    {
      title: "Failsafe Mandiri Tanpa Internet",
      desc: "Mikrokontroler memiliki aturan deterministik lokal. Jika pH < 6.0 atau suhu > 33°C, aerator seketika aktif walau koneksi WiFi kolam terputus.",
      tag: "Keandalan Lokal",
    },
    {
      title: "Prediksi Dini Risiko 1–3 Jam",
      desc: "Model Random Forest mengevaluasi pola laju perubahan air (dpH/dt, dTemp/dt) untuk mendeteksi potensi krisis sebelum ikan mengalami stres.",
      tag: "Machine Learning",
    },
    {
      title: "Otomasi Relay Cepat",
      desc: "Perintah aktivasi relay aerator dieksekusi kurang dari 5 detik setelah anomali air terdeteksi di kolam.",
      tag: "Kendali Aktuator",
    },
    {
      title: "Peringatan Dini Telegram",
      desc: "Notifikasi darurat terkirim ke smartphone petambak dalam 10 detik dengan rekomendasi tindakan lapangan praktis.",
      tag: "Telegram Bot",
    },
    {
      title: "Arsitektur Terbuka & Modular",
      desc: "Komponen mikrokontroler dan probe sensor modular yang mudah dirawat, dikalibrasi, dan diperluas sesuai volume kolam.",
      tag: "Skalabilitas",
    },
  ];

  const steps = [
    {
      verb: "Ukur",
      phase: "01",
      title: "Pengukuran Sensor Kontinu",
      desc: "Sensor pH, suhu DS18B20, TDS, dan turbiditas membaca kondisi air kolam tiap 30 detik menggunakan metode multisampling 10x untuk meredam derau sinyal analog.",
      img: landingContent?.step_1_img || "/pics/ph-meter.jpg",
    },
    {
      verb: "Kirim",
      phase: "02",
      title: "Telemetri Cloud Terenkripsi",
      desc: "ESP32 DevKit V1 mempublikasikan data telemetri JSON secara aman ke HiveMQ Cloud melalui protokol MQTT TLS (Port 8883) dengan pengidentifikasi unik perangkat.",
      img: landingContent?.step_2_img || "/pics/esp32.jpg",
    },
    {
      verb: "Prediksi",
      phase: "03",
      title: "Inferensi Tren Machine Learning",
      desc: "Model Machine Learning Random Forest memproyeksikan laju perubahan parameter kualitas air dalam horizon waktu 1–3 jam ke depan guna mencegah kematian massal ikan.",
      img: landingContent?.step_3_img || "/pics/lele-1.jpg",
    },
    {
      verb: "Nyalakan",
      phase: "04",
      title: "Aktuasi Aerator Otomatis",
      desc: "Relay aerator dinyalakan otomatis seketika saat parameter melewati ambang batas aman (pH < 6.0 atau suhu > 33°C) melalui logika cloud maupun failsafe lokal.",
      img: landingContent?.step_4_img || "/pics/aerasi.jpg",
    },
    {
      verb: "Kabari",
      phase: "05",
      title: "Peringatan Dini ke Petambak",
      desc: "Bot Telegram mengirimkan notifikasi darurat ke ponsel petambak dalam waktu kurang dari 10 detik lengkap dengan parameter pemicu dan panduan penanganan.",
      img: landingContent?.step_5_img || "/pics/tjipanas.jpg",
    },
  ];

  const showcasePanels = [
    {
      title: "Budidaya Lele Indonesia",
      desc: "Tradisi budidaya air tawar yang menopang ekonomi rakyat di Nusantara.",
      img: landingContent?.showcase_1_img || "/pics/takeran.jpg",
      flex: 5,
    },
    {
      title: "Node Sensor ESP32",
      desc: "Perangkat mikrokontroler dengan enclosure kedap air dan transmisi MQTT TLS.",
      img: landingContent?.showcase_2_img || "/pics/esp32.jpg",
      flex: 2,
    },
    {
      title: "Aerasi Oksigen Kolam",
      desc: "Suplai gelembung oksigen otomatis saat tengah malam hingga fajar.",
      img: landingContent?.showcase_3_img || "/pics/aerasi.jpg",
      flex: 3,
    },
    {
      title: "Probe pH & Kekeruhan",
      desc: "Pengukuran multisampling per siklus untuk meredam derau sinyal analog.",
      img: landingContent?.showcase_4_img || "/pics/ph-meter.jpg",
      flex: 2,
    },
  ];

  const defaultFaqs = [
    {
      q: "Apakah sistem tetap bekerja jika koneksi WiFi atau internet di kolam terputus?",
      a: "Ya. ESP32 dilengkapi aturan keselamatan deterministik (Failsafe Lokal). Walaupun jaringan internet atau cloud terputus, mikrokontroler secara mandiri akan langsung menyalakan relay aerator jika pH anjlok di bawah 6,0 atau suhu melewati 33°C.",
    },
    {
      q: "Mengapa BanyuWening tidak menggunakan sensor Dissolved Oxygen (DO)?",
      a: "Sensor Dissolved Oxygen (DO) industri berkualitas memerlukan kalibrasi larutan elektrolit yang rumit bagi pembudidaya kolam air tawar. BanyuWening mengombinasikan sensor pH, suhu, TDS, dan turbiditas dengan algoritma prediksi ML sebagai indikator komprehensif kesehatan ekosistem air.",
    },
    {
      q: "Berapa lama waktu yang dibutuhkan hingga notifikasi Telegram tiba?",
      a: "Berdasarkan pengujian arsitektur sistem, notifikasi Telegram terkirim kurang dari 10 detik sejak anomali parameter dibaca oleh sensor di kolam.",
    },
    {
      q: "Jenis komoditas budidaya apa saja yang didukung?",
      a: "Prototype saat ini dikhususkan dan dikalibrasi untuk kolam terpal budidaya ikan lele (Clarias batrachus). Ambang batas juga dapat disesuaikan untuk komoditas ikan patin dan nila.",
    },
    {
      q: "Bagaimana cara kerja prediksi risiko 1–3 jam ke depan?",
      a: "Laravel memproses fitur time-series akuakultur (deviasi pH, deviasi suhu, rasio TDS, Water Stress Index). Model Random Forest (Scikit-learn) kemudian mengklasifikasikan kemungkinan status air akan memburuk dalam 1 hingga 3 jam mendatang.",
    },
  ];

  const capabilities = landingContent?.capabilities || defaultCapabilities;
  const faqs = landingContent?.faqs || defaultFaqs;

  return (
    <div className="bg-[#0F2321] text-[#E8ECE9] min-h-screen selection:bg-[#8CC2BA] selection:text-[#0F2321] font-sans">
      {/* Header navigasi atas — Warna Asli Gelap */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-3.5 flex items-center justify-between backdrop-blur-md bg-[#0F2321]/85 border-b border-[#1c3e3a]">
        <div className="flex items-center gap-3">
          <img
            src="/brand/logogram-gelap.svg"
            alt="Logo BanyuWening"
            width={28}
            height={36}
            className="opacity-95"
          />
          <span className="text-[13px] font-semibold tracking-[0.2em] text-[#E8ECE9]">
            BANYUWENING
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/demo"
            className="text-[13px] text-[#8CC2BA] hover:underline font-medium hidden sm:inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Versi Demo</span>
          </Link>
          <Link
            href="/dashboard"
            className="bg-[#8CC2BA] text-[#0F2321] px-5 py-2 rounded-[6px] text-[13px] font-semibold hover:bg-[#7FB8B0] transition-colors shadow-xs"
          >
            Masuk Dashboard
          </Link>
        </div>
      </header>

      {/* ======================================================== */}
      {/* HERO SECTION — Gambar Memenuhi Seluruh Hero Section &     */}
      {/* Tulisan BANYUWENING Tepat di Tengah-Tengah                */}
      {/* ======================================================== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 md:px-8 text-center overflow-hidden">
        {/* Fullscreen Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={landingContent?.hero_bg_image || "/pics/aerasi.jpg"}
            alt="Aerasi Air Kolam BanyuWening"
            className="w-full h-full object-cover"
          />
          {/* Moody Dark Overlays untuk Kontras Tajam */}
          <div className="absolute inset-0 bg-[#0F2321]/72" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F2321] via-transparent to-[#0F2321]/80" />
        </div>

        {/* Content Tepat di Tengah-Tengah Hero Section */}
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-center pt-16 pb-12">
          {/* Top Pill Tag */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#142f2b]/85 border border-[#234b46] text-[12px] font-medium text-[#8CC2BA] mb-6 shadow-lg backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[#8CC2BA] animate-pulse" />
            <span>{landingContent?.hero_tag || "Sistem Monitoring & Otomasi Kualitas Air Kolam"}</span>
          </motion.div>

          {/* Tulisan BANYUWENING Full di Tengah */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="font-display text-[clamp(44px,8.5vw,96px)] leading-[1.05] tracking-[0.16em] md:tracking-[0.24em] text-center mb-6 text-[#E8ECE9] uppercase font-bold drop-shadow-md select-none"
          >
            {landingContent?.hero_title || "BANYUWENING"}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="font-serif text-[clamp(17px,2.2vw,24px)] leading-[1.45] text-center max-w-2xl text-[#9DB0AB] drop-shadow-sm"
          >
            {landingContent?.hero_subtitle ||
              "Pemantauan kualitas air kolam 24/7 dengan prediksi risiko dini, otomasi aerator, dan pengaman lokal tanpa internet"}
          </motion.p>
        </div>
      </section>

      {/* Intro — Staircase statement */}
      <section className="min-h-[70vh] flex items-center px-4 md:px-[6vw] py-20 border-t border-[#183935] bg-[#0F2321]">
        <div className="w-full max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={spring}
            className="space-y-1.5"
          >
            <p className="text-[clamp(28px,3.8vw,50px)] leading-[1.1] font-bold text-[#E8ECE9]">
              {landingContent?.intro_statement_1 || "Jaga kolam lele 500 ekor"}
            </p>
            <p className="text-[clamp(28px,3.8vw,50px)] leading-[1.1] font-bold text-[#9DB0AB]" style={{ paddingLeft: "5vw" }}>
              {landingContent?.intro_statement_2 || "walau tengah malam,"}
            </p>
            <p className="text-[clamp(28px,3.8vw,50px)] leading-[1.1] font-bold text-[#8CC2BA]" style={{ paddingLeft: "10vw" }}>
              {landingContent?.intro_statement_3 || "saat pH turun tajam"}
            </p>
            <p className="text-[clamp(28px,3.8vw,50px)] leading-[1.1] font-bold text-[#7FB8B0]" style={{ paddingLeft: "15vw" }}>
              {landingContent?.intro_statement_4 || "dan oksigen menipis."}
            </p>
            <p className="text-[clamp(28px,3.8vw,50px)] leading-[1.1] font-bold text-[#6FA89F]" style={{ paddingLeft: "20vw" }}>
              {landingContent?.intro_statement_5 || "BanyuWening tidak tidur."}
            </p>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.2 }}
            className="text-[15px] leading-[25px] text-[#9DB0AB] mt-12 max-w-lg"
          >
            {landingContent?.intro_desc ||
              "Sistem IoT pemantauan kualitas air yang membaca pH, suhu, TDS, dan kekeruhan tiap 30 detik untuk kolam budidaya lele, patin, dan nila."}
          </motion.p>
        </div>
      </section>

      {/* Video Time-lapse Section */}
      <section className="py-20 px-4 md:px-8 border-t border-[#183935] bg-[#0c1f1c]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-[12px] font-semibold tracking-wider text-[#8CC2BA] uppercase block mb-2">
              Pengamatan Ekosistem
            </span>
            <h2 className="font-display text-[26px] md:text-[34px] leading-tight text-[#E8ECE9]">
              Siklus 24 Jam Dinamika Air Kolam
            </h2>
            <p className="text-[14px] text-[#9DB0AB] mt-2 max-w-xl mx-auto">
              Fluktuasi pH dan kenaikan suhu terjadi dinamis dari siang hingga fajar.
              Pengawasan otomatis memitigasi risiko kematian ikan akibat stres mendadak.
            </p>
          </div>

          <div className="relative rounded-[10px] overflow-hidden border border-[#234b46] shadow-2xl aspect-video max-w-3xl mx-auto">
            <video
              src={landingContent?.video_url || "/pics/kolam-timelapse.webm"}
              poster={landingContent?.video_poster || "/pics/kolam-timelapse-poster.jpg"}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 right-4 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded text-[11px] text-[#9DB0AB]">
              Time-lapse Ekosistem Kolam
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator ("One Live Thing") */}
      <SimulatorSection />

      {/* ======================================================== */}
      {/* HOW IT WORKS — Smooth Scroll Reveal Animation            */}
      {/* ======================================================== */}
      <section id="cara-kerja" className="border-t border-[#183935] bg-[#0a1715]">
        <div className="py-16 text-center max-w-3xl mx-auto px-4">
          <span className="text-[12px] font-semibold tracking-wider text-[#8CC2BA] uppercase block mb-2">
            Alur Kerja Sistem
          </span>
          <h2 className="font-display text-[28px] md:text-[38px] text-[#E8ECE9]">
            5 Tahap Otomasi BanyuWening
          </h2>
          <p className="text-[14px] text-[#9DB0AB] mt-2">
            Dari sensor di pinggir kolam hingga tindakan nyata pengamanan aerator.
          </p>
        </div>

        {steps.map((step) => (
          <div
            key={step.verb}
            className="relative h-[90vh] md:h-screen sticky top-0 overflow-hidden flex items-center justify-center"
          >
            {/* Background Image with subtle zoom */}
            <motion.div
              initial={{ scale: 1.08, opacity: 0.4 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 z-0"
            >
              <img
                src={step.img}
                alt={step.title}
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.55)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F2321] via-[#0F2321]/40 to-[#0F2321]/80" />
            </motion.div>

            {/* Giant Verb Title with Smooth Reveal */}
            <div className="relative z-10 text-center select-none pointer-events-none px-4">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="inline-block px-3 py-1 rounded-full bg-[#8CC2BA]/20 border border-[#8CC2BA]/40 text-[#8CC2BA] text-[12px] font-semibold tracking-widest uppercase mb-2">
                  TAHAP {step.phase}
                </span>
                <h2 className="text-[clamp(68px,14vw,180px)] font-black text-white tracking-tight leading-none mix-blend-overlay">
                  {step.verb}
                </h2>
              </motion.div>
            </div>

            {/* Detail Floating Card at Bottom with Slide-up */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
              className="absolute bottom-10 left-4 right-4 md:left-12 md:right-auto md:max-w-md z-20"
            >
              <div className="bg-[#0F2321]/90 backdrop-blur-md p-6 rounded-[8px] border border-[#27504a] shadow-2xl">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#8CC2BA] uppercase tracking-wider mb-1">
                  <span>{step.phase}</span>
                  <span>·</span>
                  <span>{step.title}</span>
                </div>
                <p className="text-[14px] md:text-[15px] leading-[23px] text-[#E8ECE9]">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          </div>
        ))}
      </section>

      {/* Features — Capability Columns */}
      <section className="py-24 px-6 md:px-12 border-t border-[#183935] bg-[#0c1f1c]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="text-[12px] font-semibold tracking-wider text-[#8CC2BA] uppercase block mb-2">
              Spesifikasi Sistem
            </span>
            <h2 className="font-display text-[28px] md:text-[38px] leading-tight text-[#E8ECE9]">
              Keandalan di Pinggir Kolam
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                className="bg-[#142e2b] border border-[#214a45] rounded-[8px] p-6 hover:border-[#8CC2BA]/50 transition-all group"
              >
                <div className="text-[11px] font-semibold tracking-wider text-[#8CC2BA] uppercase mb-2">
                  {cap.tag}
                </div>
                <h3 className="text-[17px] font-semibold text-[#E8ECE9] mb-2 group-hover:text-[#8CC2BA] transition-colors">
                  {cap.title}
                </h3>
                <p className="text-[14px] leading-[22px] text-[#9DB0AB]">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase — Band of Unequal Panels */}
      <section className="py-24 px-4 md:px-8 border-t border-[#183935]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <span className="text-[12px] font-semibold tracking-wider text-[#8CC2BA] uppercase block mb-1">
              Dokumentasi & Aset
            </span>
            <h2 className="font-display text-[28px] md:text-[36px] text-[#E8ECE9]">
              Koleksi & Instrumen Lapangan
            </h2>
          </div>

          {/* Unequal Panels */}
          <div className="flex flex-col md:flex-row gap-4 h-auto md:h-[420px]">
            {showcasePanels.map((panel, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredPanel(idx)}
                onMouseLeave={() => setHoveredPanel(null)}
                className="relative rounded-[8px] overflow-hidden border border-[#234b46] min-h-[220px] transition-all duration-300 ease-out flex-col justify-end p-6 flex"
                style={{ flexGrow: hoveredPanel === idx ? 6 : hoveredPanel === null ? panel.flex : 1.5 }}
              >
                <img
                  src={panel.img}
                  alt={panel.title}
                  className="w-full h-full object-cover absolute inset-0"
                  style={{ filter: "brightness(0.65)" }}
                />
                <div className="relative z-10 bg-[#0F2321]/80 backdrop-blur-xs p-3.5 rounded border border-[#27504a]/70">
                  <h4 className="text-[15px] font-bold text-[#E8ECE9] mb-1">
                    {panel.title}
                  </h4>
                  <p className="text-[12px] leading-[17px] text-[#9DB0AB]">
                    {panel.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats — Figures inside a sentence */}
      <section className="min-h-[45vh] flex items-center px-4 md:px-[10%] py-20 border-t border-[#183935]">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={spring}
          className="text-[clamp(24px,3.8vw,52px)] leading-[1.2] text-[#9DB0AB]"
        >
          Sensor membaca tiap{" "}
          <span className="text-[#E8ECE9] font-semibold tnum">30 detik</span>,
          prediksi risiko sampai{" "}
          <span className="text-[#E8ECE9] font-semibold tnum">1–3 jam</span> ke depan,
          memantau{" "}
          <span className="text-[#E8ECE9] font-semibold tnum">5 parameter</span> kualitas air
          tanpa henti secara kontinu 24/7.
        </motion.p>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6 md:px-12 border-t border-[#183935] bg-[#0c1f1c]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <span className="text-[12px] font-semibold tracking-wider text-[#8CC2BA] uppercase block mb-2">
              Tanya Jawab
            </span>
            <h2 className="font-display text-[28px] md:text-[38px] text-[#E8ECE9]">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-[#142e2b] border border-[#214a45] rounded-[8px] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-[15px] md:text-[16px] text-[#E8ECE9] cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#8CC2BA] transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-[14px] leading-[23px] text-[#9DB0AB] border-t border-[#1f4540]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section — Versi Demo */}
      <section className="min-h-[45vh] flex flex-col items-center justify-center px-4 py-20 border-t border-[#183935] text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={spring}
          className="text-[17px] md:text-[20px] leading-[1.5] max-w-[36ch] mb-6 text-[#E8ECE9]"
        >
          {landingContent?.cta_text ||
            "Sistem ini dikembangkan oleh mahasiswa Institut Teknologi dan Bisnis PalComTech untuk membantu pembudidaya ikan air tawar di Indonesia."}
        </motion.p>
        <Link
          href="/demo"
          className="bg-[#8CC2BA] text-[#0F2321] px-8 h-12 rounded-[6px] text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-[#7FB8B0] transition-colors shadow-lg"
        >
          <span>{landingContent?.cta_button_text || "Masuk ke Versi Demo"}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Footer — Navigasi Dihapus, Tampilan Pas & Bersih */}
      <footer className="relative min-h-[60vh] bg-[#132220] flex flex-col justify-between p-8 md:p-12 border-t border-[#183935] overflow-hidden">
        <img
          src={landingContent?.footer_bg_image || "/pics/takeran.jpg"}
          alt="Arsip Kolam Takeran Java"
          className="w-full h-full object-cover absolute inset-0"
          style={{ filter: "brightness(0.38)" }}
        />

        {/* Top Info */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between text-[14px] leading-[24px] gap-8">
          <div>
            <span className="text-[11px] font-semibold text-[#8CC2BA] uppercase tracking-wider block mb-2">
              Kontak & Kolaborasi
            </span>
            <div className="space-y-2">
              <ContactEmailLink
                email={landingContent?.contact_email || "BanyuWening@example.com"}
                showIcon={true}
                className="text-[#E8ECE9] hover:text-[#8CC2BA]"
              />

              {/* WhatsApp Hotline */}
              {(() => {
                const rawPhone = landingContent?.contact_phone || "+62 8566-9548-964";
                const cleanDigits = rawPhone.replace(/\D/g, "");
                const waNumber = cleanDigits.startsWith("0")
                  ? "62" + cleanDigits.slice(1)
                  : cleanDigits.startsWith("62")
                  ? cleanDigits
                  : "62" + cleanDigits;
                const displayPhone = rawPhone.trim().startsWith("+62")
                  ? rawPhone.trim()
                  : rawPhone.trim().startsWith("0")
                  ? "+62 " + rawPhone.trim().slice(1)
                  : "+62 " + rawPhone.trim();

                return (
                  <a
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#E8ECE9] hover:text-[#8CC2BA] transition-colors group"
                    title={`Hubungi WhatsApp BanyuWening (${displayPhone})`}
                  >
                    <MessageCircle className="w-4 h-4 text-[#8CC2BA] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-mono text-[13px]">{displayPhone}</span>
                  </a>
                );
              })()}
            </div>

            {/* Hyperlink Kampus / Institusi */}
            <div className="mt-3">
              <a
                href={landingContent?.institution_url || "https://palcomtech.ac.id/"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-[#9DB0AB] hover:text-[#8CC2BA] transition-colors group"
                title={`Kunjungi Halaman Resmi ${landingContent?.institution_name || "Institut Teknologi dan Bisnis PalComTech"}`}
              >
                <span className="underline-offset-2 group-hover:underline">
                  {landingContent?.institution_name || "Institut Teknologi dan Bisnis PalComTech"}
                </span>
                <ExternalLink className="w-3 h-3 text-[#9DB0AB] group-hover:text-[#8CC2BA] transition-colors shrink-0" />
              </a>
            </div>
          </div>

          <div className="text-[#9DB0AB] space-y-1">
            <span className="text-[11px] font-semibold text-[#8CC2BA] uppercase tracking-wider block mb-1">
              Tim Pengembang
            </span>
            <p className="text-[#E8ECE9] font-medium">
              Gofran Muttaqi Likhan <span className="text-[12px] text-[#9DB0AB]">(Super Administrator / IoT)</span>
            </p>
            <p className="text-[#E8ECE9] font-medium">
              M. Ilham Nandari <span className="text-[12px] text-[#9DB0AB]">(Fullstack / PM)</span>
            </p>
            <p className="text-[#E8ECE9] font-medium">
              Monika Lisbet Lase <span className="text-[12px] text-[#9DB0AB]">(Admin / QA)</span>
            </p>
          </div>
        </div>

        {/* Bottom Wordmark & Legal */}
        <div className="relative z-10 pt-10">
          <h2 className="font-display text-[clamp(28px,4.5vw,52px)] leading-[1.1] tracking-[0.2em] text-[#E8ECE9] opacity-90 select-none text-left">
            BANYUWENING
          </h2>

          <div className="pt-4 border-t border-white/10 mt-4 flex flex-col md:flex-row justify-between items-start md:items-center text-[12px] leading-[18px] text-[#9DB0AB] gap-2">
            <p>
              {landingContent?.copyright_text ||
                "© 2026 BanyuWening · Institut Teknologi dan Bisnis PalComTech."}
            </p>
            <p>
              Foto arsip: <em>Vijver te Takeran op Java</em> (KITLV 166000, CC BY 4.0 via Wikimedia Commons) · Video: <em>TLSVideos</em> (CC BY 3.0).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
