import { useState, useRef } from "react";
import { router } from "@inertiajs/react";
import {
  Globe,
  Mail,
  Phone,
  Building,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  HelpCircle,
  Layers,
  FileText,
  ExternalLink,
  Info,
  Image as ImageIcon,
  Video,
  Upload,
  Film,
  Box,
  Package,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { validateUploadFile } from "@/lib/upload-validation";
import type {
  LandingArchPhase,
  LandingContentSettings,
  LandingDeveloperMember,
  LandingDiurnalPhase,
  LandingFaq,
  LandingIntroStat,
  LandingPackageItem,
  LandingPassageBeat,
  LandingPipelineStep,
} from "@/Types";

interface SuperAdminContentManagementProps {
  landingContent?: LandingContentSettings;
}

type SubTabId =
  | "hero"
  | "siklus"
  | "otomasi"
  | "arsitektur"
  | "paket"
  | "faq"
  | "kontak";

const PRESET_IMAGES = [
  { label: "Probe pH & Kekeruhan", path: "/pics/ph-meter.jpg" },
  { label: "Mikrokontroler ESP32", path: "/pics/esp32.jpg" },
  { label: "Benih Lele 01", path: "/pics/lele-1.jpg" },
  { label: "Aerasi Kolam", path: "/pics/aerasi.jpg" },
  { label: "Kolam Tjipanas", path: "/pics/tjipanas.jpg" },
  { label: "Kolam Takeran", path: "/pics/takeran.jpg" },
  { label: "Benih Lele 02", path: "/pics/lele-2.jpg" },
  { label: "Kolam Lembang", path: "/pics/lembang.jpg" },
  { label: "Kolam Andir", path: "/pics/andir.jpg" },
  { label: "Aquaculture Underwater", path: "/pics/aquaculture-underwater.jpg" },
  { label: "Permukaan Air", path: "/pics/water-surface.jpg" },
];

const V2_DEFAULTS = {
  hero_tag: "SMART AQUACULTURE STUDIO",
  hero_right_tag: "EDGE FUZZY & IOT HARDWARE",
  hero_title: "BANYUWENING",
  hero_headline_1: "Buat kualitas air",
  hero_headline_2: "kolam selalu terkendali",
  hero_subtitle:
    "Platform IoT akuakultur presisi dengan kecerdasan Edge Fuzzy lokal dan kontrol pompa otomatis untuk menjaga kualitas air kolam lele 24 jam penuh.",
  hero_stage2_kicker: "02 / LORONG TOPOLOGI CORE HUB",
  hero_stage2_title_1: "Satu inti hardware",
  hero_stage2_title_2: "menyatukan empat kolam",
  hero_stage2_desc:
    "Jalur kabel shielded GX16 mengisolasi pembacaan ADC 16-bit tiap kolam sekaligus mempertahankan efisiensi instalasi petambak UMKM.",
  hero_passage_beats: [
    {
      num: "01 UKUR",
      title: "Multi-ADC 16-bit",
      desc: "Isolasi pH, suhu, TDS, dan kekeruhan lewat 2-3x ADS1115 & MOSFET.",
    },
    {
      num: "02 ISOLASI",
      title: "Watchdog & LittleFS",
      desc: "Menahan anomali probe & menyimpan telemetri 72 jam tanpa WiFi.",
    },
    {
      num: "03 AKTUASI",
      title: "Edge Fuzzy <15 ms",
      desc: "Menyalakan aerator & pompa kolam secara otonom di Core Hub.",
    },
  ] as LandingPassageBeat[],
  hero_stage3_kicker: "03 / OTONOMI PENUH PINGGIR KOLAM",
  hero_stage3_title_1: "Dibuat untuk eksplorasi.",
  hero_stage3_title_2: "Siap bekerja otomatis.",
  hero_stage3_desc:
    "Tetap menjaga pH, suhu, kekeruhan, dan pompa aerasi walaupun WiFi kolam terputus melalui Edge Fuzzy & Mode Offline-Plus Rp0.",

  intro_statement_1: "Satu Core Hub pintar",
  intro_statement_2: "menjaga hingga 4 kolam lele,",
  intro_statement_3: "saat WiFi kolam terputus,",
  intro_statement_4: "atau cuaca buruk tengah malam.",
  intro_statement_5: "Tanpa mengunci alat petambak.",
  intro_principle_kicker: "PRINSIP DESAIN",
  intro_principle_title: "Anti-Bricking & Otomasi Lokal",
  intro_desc:
    "Arsitektur 1 Core Hub untuk 1-4 Modul Kolam dengan Edge Fuzzy + LittleFS Store-and-Forward, Sensor Health Watchdog, dan WeningBot WhatsApp-First. Mode Offline-Plus Rp0 aktif permanen.",
  intro_stats: [
    { val: "<15 ms", label: "Inferensi Edge Fuzzy" },
    { val: "72 Jam", label: "Log LittleFS Offline" },
    { val: "Rp0", label: "Mode Offline-Plus" },
  ] as LandingIntroStat[],
  video_section_title: "Siklus 24 jam kolam terpal",
  video_url: "/pics/kolam-timelapse.webm",
  video_poster: "/pics/kolam-timelapse-poster.jpg",
  diurnal_phases: [
    {
      time: "06:00 Pagi",
      title: "Stabilitas Suhu & Aerasi Pagi",
      detail:
        "DS18B20 mendeteksi penurunan suhu malam; Edge Fuzzy menyesuaikan durasi aerasi tanpa boros listrik.",
    },
    {
      time: "13:00 Siang",
      title: "Puncak Radiasi & Fluktuasi pH",
      detail:
        "Fotosintesis fitoplankton menaikkan pH permukaan; ADS1115 16-bit mengawal ambang aman 6,5-8,5.",
    },
    {
      time: "19:00 Malam",
      title: "Evaluasi Sisa Pakan & TDS",
      detail:
        "MOSFET switch menyalakan elektroda TDS sesaat agar terhindar dari korosi sambil membaca lonjakan organik.",
    },
    {
      time: "02:00 Dini Hari",
      title: "Siaga Oksigen Terlarut Menurun",
      detail:
        "Fase paling kritis kolam terpal dijaga penuh Edge Fuzzy lokal + LittleFS Store-and-Forward 72 jam.",
    },
  ] as LandingDiurnalPhase[],

  pipeline_heading: "Lima tahap otomasi",
  pipeline_steps: [
    {
      num: "01",
      verb: "Ukur",
      title: "Multi-ADC 16-bit & Stilling Well",
      detail:
        "Sensor pH, DS18B20, TDS dengan MOSFET power-switch anti-korosi, Turbidity potting epoxy dalam stilling well PVC, serta Float Switch membaca 1-4 kolam melalui 2-3x ADS1115 dan kabel shielded maks 3-5 m.",
      spec: "2-3x ADS1115 (8-12 kanal ADC) + MCP23017 + Filter EMI",
      img: "/pics/ph-meter.jpg",
    },
    {
      num: "02",
      verb: "Isolasi",
      title: "Sensor Health Watchdog",
      detail:
        "Watchdog mendeteksi nilai flatline atau lensa turbidity jenuh lumut (SATURATED/FAULT) agar tidak memicu alarm palsu, sementara LittleFS + RTC DS3231 menyimpan log lokal hingga 72 jam saat WiFi kolam terputus.",
      spec: "Graceful degradation otomatis + LittleFS 72 Jam + Auto-Resume",
      img: "/pics/esp32.jpg",
    },
    {
      num: "03",
      verb: "Prediksi",
      title: "Cold-Start & Random Forest",
      detail:
        "Dataset kalibrasi kolam budidaya memakai DO Meter Portabel dan Test Kit Amonia/Nitrit guna mengatasi bias organ labirin ikan lele sebelum model Random Forest memproyeksi risiko 1-3 jam ke depan.",
      spec: "EMQX TLS + FastAPI Always-On + Supabase Pro per pond_id",
      img: "/pics/lele-1.jpg",
    },
    {
      num: "04",
      verb: "Aktuasi",
      title: "Edge Fuzzy & Relay Aman",
      detail:
        "Relay 4-Ch/8-Ch menggerakkan aerator dan pompa AC 220V secara lokal saat WiFi terputus (Offline-Plus Rp0). Pembaruan parameter JSON AI dan Dual-OTA rollback 60 detik wajib lolos HITL Engineer Gate.",
      spec: "Hard Safety Bounds + Duty-Cycle Clamp + Zero Autonomous Push",
      img: "/pics/aerasi.jpg",
    },
    {
      num: "05",
      verb: "Kabari WA",
      title: "WeningBot WhatsApp-First",
      detail:
        "Peringatan kritis kualitas air, notifikasi pemulihan Edge Watchdog, pengingat bilas probe mingguan 1-klik, dan ringkasan kondisi kolam dikirim langsung ke WhatsApp petambak.",
      spec: ">90% Rule-Based Engine Rp0 LLM + Telegram & Dashboard Web",
      img: "/pics/tjipanas.jpg",
    },
  ] as LandingPipelineStep[],

  arch_heading_1: "Fungsional.",
  arch_heading_2: "Dari desain.",
  arch_aside:
    "Empat lapisan sistem BanyuWening dari kolam hingga cloud. Gulir halaman atau klik salah satu lapisan untuk memutar dan membedah model 3D secara interaktif.",
  arch_phases: [
    {
      phase: 0,
      num: "01",
      short_name: "Topologi",
      label: "Topologi Modular 1 Core Hub : 1-4 Modul Kolam",
      summary:
        "Satu Core Hub melayani hingga 4 kolam terpal berdempetan milik satu petambak via soket kedap air GX16 dan kabel shielded maksimal 3-5 meter guna menjaga kejernihan sinyal ADC dan kestabilan kelistrikan.",
      specs: "4 Port GX16 Shielded · 1-4 Stilling Well PVC · Jangkauan 3-5 meter",
    },
    {
      phase: 1,
      num: "02",
      short_name: "Susunan PCB",
      label: "Susunan PCB Berlapis & Pemisahan Jalur Daya",
      summary:
        "Carrier PCB menggabungkan ESP32-WROOM, 2-3x ADS1115 16-bit (8-12 kanal ADC), MCP23017, Level Shifter 3.3V/5V, MOSFET power-switch TDS anti-korosi, serta Relay 4-Ch / 8-Ch Optocoupler dengan filter EMI terisolasi.",
      specs: "ESP32-WROOM · Multi-ADS1115 16-bit · Relay Optocoupler 4/8-Ch",
    },
    {
      phase: 2,
      num: "03",
      short_name: "Anti-Lumpur",
      label: "Ketahanan Lumpur & Sensor Health Watchdog",
      summary:
        "Probe ditempatkan di dalam stilling well PVC pelindung tubrukan ikan. Sensor Health Watchdog otomatis mengisolasi nilai flatline atau lensa turbidity jenuh lumut (SATURATED/FAULT) dan mengirim pengingat bilas ke WhatsApp.",
      specs: "Stilling Well PVC · Isolasi SATURATED/FAULT · Garansi Hub IP65 12 Bln",
    },
    {
      phase: 3,
      num: "04",
      short_name: "Hybrid Cloud",
      label: "Always-On Cloud & HITL AI Safety Gate",
      summary:
        "Broker EMQX TLS Port 8883, FastAPI Always-On, dan Supabase Pro memproses proyeksi Random Forest 1-3 jam per pond_id. Pembaruan parameter JSON wajib melalui Human-in-the-Loop Engineer Gate + Dual-OTA 60s rollback.",
      specs: "EMQX TLS 8883 · Random Forest 1-3 Jam · WeningBot WhatsApp-First",
    },
  ] as LandingArchPhase[],

  packages_heading: "Skala modular sesuai kebutuhan kolam",
  packages_subtitle:
    "Perangkat dibeli penuh petambak, dilindungi Mode Offline-Plus Rp0 permanen.",
  packages: [
    {
      num: "01",
      badge: "Skala Uji Awal",
      name: "Paket Entry 1K",
      config: "1 Core Hub + 1 Modul Kolam",
      price: "Rp1.650.000",
      saas: "Opsional Smart Guard Rp150rb / 3 bln",
      highlights: [
        "2x ADS1115 (8-Ch ADC 16-bit)",
        "Relay 4-Ch Optocoupler + Stilling Well PVC",
        "Edge Fuzzy & Mode Offline-Plus Rp0 permanen",
      ],
      featured: false,
    },
    {
      num: "02",
      badge: "Paling Populer UMKM",
      name: "Paket Starter 2K",
      config: "1 Core Hub + 2 Modul Kolam",
      price: "Rp2.450.000",
      saas: "Smart Guard Rp150rb / siklus 3 bln",
      highlights: [
        "Dual-Kolam sinkron via soket GX16 IP65",
        "Sensor Health Watchdog & WeningBot WhatsApp",
        "Siap ekspansi tambah hingga 4 Modul Kolam",
      ],
      featured: true,
    },
    {
      num: "03",
      badge: "Klaster Produktif",
      name: "Paket Juragan 4K",
      config: "1 Core Hub + 4 Modul Kolam",
      price: "Rp4.150.000",
      saas: "Smart Guard Rp225rb / siklus 3 bln",
      highlights: [
        "3x ADS1115 (12-Ch ADC) + MCP23017",
        "Relay 8-Ch (aerator + pompa sirkulasi / kolam)",
        "Prediksi Random Forest 1-3 jam per pond_id",
      ],
      featured: false,
    },
  ] as LandingPackageItem[],

  faq_heading: "Pertanyaan teknis & operasional",
  faqs: [
    {
      q: "Mengapa tidak menyertakan sensor DO dan Amonia di paket Rp2,45 juta, serta bagaimana mengatasi organ labirin ikan lele?",
      a: "Sensor DO optik/galvanik industri beserta probe amonia (NH3) menambah biaya di atas Rp2-4 juta dan menuntut perawatan membran rumit bagi UMKM. Untuk keterjangkauan, kami memakai proxy multivariat (suhu, turbiditas, TDS, pH, siklus diurnal) dengan Sensor Health Watchdog dan menyediakan slot ekspansi I2C/GX16 untuk add-on Modul DO Pro. Khusus bias perilaku naik ke permukaan akibat organ labirin lele, kalibrasi dilakukan memakai DO Meter Portabel dan Test Kit Amonia/Nitrit.",
    },
    {
      q: "Bagaimana ketahanan sistem jika WiFi kolam atau jaringan internet terputus tengah malam?",
      a: "Core Hub menjalankan inferensi Edge Fuzzy langsung pada mikrokontroler ESP32-WROOM bersama RTC DS3231 dan penyimpanan LittleFS Store-and-Forward 72 jam. Saat WiFi terputus, log pembacaan tetap tersimpan lokal sementara relay aerator maupun pompa tetap dikendalikan dengan batas aman duty-cycle secara permanen tanpa ketergantungan cloud (Mode Offline-Plus Rp0).",
    },
    {
      q: "Bagaimana pemisahan garansi perangkat keras dan probe kaca pH di lapangan?",
      a: "Kami memisahkan secara tegas antara garansi elektronik Core Hub dan modul kering IP65 selama 12 bulan dengan probe kaca pH (PH-4502C) dan elektroda TDS sebagai komponen habis pakai (consumable). Umur pakai riil probe di air budidaya adalah 4-6 bulan dengan garansi DOA 30 hari, sedangkan probe pengganti resmi tersedia secara transparan Rp195.000/probe.",
    },
    {
      q: "Apa jaminan arsitektur agar perangkat petambak tidak pernah terkunci saat langganan berakhir?",
      a: "Perangkat keras BanyuWening dibeli penuh oleh petambak dengan kebijakan Anti-Bricking: Mode Offline-Plus Rp0 permanen memastikan pembacaan sensor lokal, layar diagnostik kolam, relay keselamatan aerator, dan kontrol pompa tetap aktif walaupun langganan SaaS Smart Guard dijeda.",
    },
    {
      q: "Bagaimana efisiensi layanan cloud dan notifikasi WeningBot WhatsApp untuk banyak kolam?",
      a: "Lebih dari 90% interaksi harian WeningBot WhatsApp memakai Rule-Based Engine lokal yang cepat dan hemat biaya tanpa pemborosan kueri AI. Broker EMQX TLS dan FastAPI hanya mengirimkan peringatan kritis serta ringkasan kondisi kualitas air langsung ke nomor WhatsApp petambak.",
    },
  ] as LandingFaq[],

  footer_kicker: "Sistem Monitoring & Otomasi Kolam Ikan BanyuWening",
  footer_heading: "Mari bangun kolam presisi bersama.",
  developer_team: [
    { name: "Gofran Muttaqi Likhan", url: "https://portofolio-gofran.vercel.app" },
    {
      name: "M. Ilham Nandari",
      url: "https://www.instagram.com/muhammadilhamnandari?jplx=dm5hcXBsZDY5bWdx",
    },
    {
      name: "Monika Lisbet Lase",
      url: "https://www.instagram.com/monciii_19?jplx=MjBtZDJzeDA2cDFk",
    },
  ] as LandingDeveloperMember[],
  contact_email: "banyuwening@example.id",
  contact_phone: "+62 8566-9548-964",
  institution_name: "Institut Teknologi dan Bisnis PalComTech",
  institution_url: "https://palcomtech.ac.id/",
  cta_button_text: "Buka Versi Demo",
  copyright_text: "© 2026 BanyuWening · Smart Aquaculture for a Sustainable Future.",
};

function mergePipelineSteps(initial?: LandingContentSettings): LandingPipelineStep[] {
  const legacyImgs = [
    initial?.step_1_img,
    initial?.step_2_img,
    initial?.step_3_img,
    initial?.step_4_img,
    initial?.step_5_img,
  ];
  return V2_DEFAULTS.pipeline_steps.map((def, idx) => {
    const src = initial?.pipeline_steps?.[idx];
    return {
      num: src?.num || def.num,
      verb: src?.verb || def.verb,
      title: src?.title || def.title,
      detail: src?.detail || def.detail,
      spec: src?.spec || def.spec,
      img: src?.img || legacyImgs[idx] || def.img,
    };
  });
}

function mergeArchPhases(initial?: LandingContentSettings): LandingArchPhase[] {
  return V2_DEFAULTS.arch_phases.map((def, idx) => {
    const src = initial?.arch_phases?.[idx];
    return {
      phase: def.phase,
      num: src?.num || def.num,
      short_name: src?.short_name || def.short_name,
      label: src?.label || def.label,
      summary: src?.summary || def.summary,
      specs: src?.specs || def.specs,
    };
  });
}

function mergePassageBeats(initial?: LandingContentSettings): LandingPassageBeat[] {
  return V2_DEFAULTS.hero_passage_beats.map((def, idx) => {
    const src = initial?.hero_passage_beats?.[idx];
    return {
      num: src?.num || def.num,
      title: src?.title || def.title,
      desc: src?.desc || def.desc,
    };
  });
}

export function SuperAdminContentManagement({
  landingContent: initialContent,
}: SuperAdminContentManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("hero");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadTargetRef = useRef<{
    fieldKey: string;
    setter: (val: string) => void;
  } | null>(null);

  const formatWhatsAppNumber = (val: string): string => {
    if (!val || val.trim() === "") return "+62 ";
    let digits = val.replace(/\D/g, "");
    if (digits.startsWith("62")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 13);
    if (digits.length === 0) return "+62 ";
    const chunks: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      chunks.push(digits.slice(i, i + 4));
    }
    return `+62 ${chunks.join("-")}`;
  };

  // Tab 1: Hero 3D (Stage 01, 02, 03)
  const [heroTag, setHeroTag] = useState(initialContent?.hero_tag || V2_DEFAULTS.hero_tag);
  const [heroRightTag, setHeroRightTag] = useState(
    initialContent?.hero_right_tag || V2_DEFAULTS.hero_right_tag
  );
  const [heroTitle, setHeroTitle] = useState(initialContent?.hero_title || V2_DEFAULTS.hero_title);
  const [heroHeadline1, setHeroHeadline1] = useState(
    initialContent?.hero_headline_1 || V2_DEFAULTS.hero_headline_1
  );
  const [heroHeadline2, setHeroHeadline2] = useState(
    initialContent?.hero_headline_2 || V2_DEFAULTS.hero_headline_2
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    initialContent?.hero_subtitle || V2_DEFAULTS.hero_subtitle
  );
  const [ctaButtonText, setCtaButtonText] = useState(
    initialContent?.cta_button_text || V2_DEFAULTS.cta_button_text
  );
  const [heroStage2Kicker, setHeroStage2Kicker] = useState(
    initialContent?.hero_stage2_kicker || V2_DEFAULTS.hero_stage2_kicker
  );
  const [heroStage2Title1, setHeroStage2Title1] = useState(
    initialContent?.hero_stage2_title_1 || V2_DEFAULTS.hero_stage2_title_1
  );
  const [heroStage2Title2, setHeroStage2Title2] = useState(
    initialContent?.hero_stage2_title_2 || V2_DEFAULTS.hero_stage2_title_2
  );
  const [heroStage2Desc, setHeroStage2Desc] = useState(
    initialContent?.hero_stage2_desc || V2_DEFAULTS.hero_stage2_desc
  );
  const [heroPassageBeats, setHeroPassageBeats] = useState<LandingPassageBeat[]>(() =>
    mergePassageBeats(initialContent)
  );
  const [heroStage3Kicker, setHeroStage3Kicker] = useState(
    initialContent?.hero_stage3_kicker || V2_DEFAULTS.hero_stage3_kicker
  );
  const [heroStage3Title1, setHeroStage3Title1] = useState(
    initialContent?.hero_stage3_title_1 || V2_DEFAULTS.hero_stage3_title_1
  );
  const [heroStage3Title2, setHeroStage3Title2] = useState(
    initialContent?.hero_stage3_title_2 || V2_DEFAULTS.hero_stage3_title_2
  );
  const [heroStage3Desc, setHeroStage3Desc] = useState(
    initialContent?.hero_stage3_desc || V2_DEFAULTS.hero_stage3_desc
  );

  // Tab 2: Intro Tangga & Siklus 24 Jam
  const [introStatement1, setIntroStatement1] = useState(
    initialContent?.intro_statement_1 || V2_DEFAULTS.intro_statement_1
  );
  const [introStatement2, setIntroStatement2] = useState(
    initialContent?.intro_statement_2 || V2_DEFAULTS.intro_statement_2
  );
  const [introStatement3, setIntroStatement3] = useState(
    initialContent?.intro_statement_3 || V2_DEFAULTS.intro_statement_3
  );
  const [introStatement4, setIntroStatement4] = useState(
    initialContent?.intro_statement_4 || V2_DEFAULTS.intro_statement_4
  );
  const [introStatement5, setIntroStatement5] = useState(
    initialContent?.intro_statement_5 || V2_DEFAULTS.intro_statement_5
  );
  const [introPrincipleKicker, setIntroPrincipleKicker] = useState(
    initialContent?.intro_principle_kicker || V2_DEFAULTS.intro_principle_kicker
  );
  const [introPrincipleTitle, setIntroPrincipleTitle] = useState(
    initialContent?.intro_principle_title || V2_DEFAULTS.intro_principle_title
  );
  const [introDesc, setIntroDesc] = useState(initialContent?.intro_desc || V2_DEFAULTS.intro_desc);
  const [introStats, setIntroStats] = useState<LandingIntroStat[]>(
    initialContent?.intro_stats && initialContent.intro_stats.length > 0
      ? initialContent.intro_stats
      : V2_DEFAULTS.intro_stats
  );
  const [videoSectionTitle, setVideoSectionTitle] = useState(
    initialContent?.video_section_title || V2_DEFAULTS.video_section_title
  );
  const [videoUrl, setVideoUrl] = useState(initialContent?.video_url || V2_DEFAULTS.video_url);
  const [videoPoster, setVideoPoster] = useState(
    initialContent?.video_poster || V2_DEFAULTS.video_poster
  );
  const [diurnalPhases, setDiurnalPhases] = useState<LandingDiurnalPhase[]>(
    initialContent?.diurnal_phases && initialContent.diurnal_phases.length > 0
      ? initialContent.diurnal_phases
      : V2_DEFAULTS.diurnal_phases
  );

  // Tab 3: 5 Tahap Otomasi
  const [pipelineHeading, setPipelineHeading] = useState(
    initialContent?.pipeline_heading || V2_DEFAULTS.pipeline_heading
  );
  const [pipelineSteps, setPipelineSteps] = useState<LandingPipelineStep[]>(() =>
    mergePipelineSteps(initialContent)
  );

  // Tab 4: Arsitektur 3D
  const [archHeading1, setArchHeading1] = useState(
    initialContent?.arch_heading_1 || V2_DEFAULTS.arch_heading_1
  );
  const [archHeading2, setArchHeading2] = useState(
    initialContent?.arch_heading_2 || V2_DEFAULTS.arch_heading_2
  );
  const [archAside, setArchAside] = useState(initialContent?.arch_aside || V2_DEFAULTS.arch_aside);
  const [archPhases, setArchPhases] = useState<LandingArchPhase[]>(() =>
    mergeArchPhases(initialContent)
  );

  // Tab 5: Paket & Harga
  const [packagesHeading, setPackagesHeading] = useState(
    initialContent?.packages_heading || V2_DEFAULTS.packages_heading
  );
  const [packagesSubtitle, setPackagesSubtitle] = useState(
    initialContent?.packages_subtitle || V2_DEFAULTS.packages_subtitle
  );
  const [packages, setPackages] = useState<LandingPackageItem[]>(
    initialContent?.packages && initialContent.packages.length > 0
      ? initialContent.packages
      : V2_DEFAULTS.packages
  );

  // Tab 6: FAQ
  const [faqHeading, setFaqHeading] = useState(
    initialContent?.faq_heading || V2_DEFAULTS.faq_heading
  );
  const [faqs, setFaqs] = useState<LandingFaq[]>(
    initialContent?.faqs && initialContent.faqs.length > 0 ? initialContent.faqs : V2_DEFAULTS.faqs
  );

  // Tab 7: Tim, Kontak & Footer
  const [footerKicker, setFooterKicker] = useState(
    initialContent?.footer_kicker || V2_DEFAULTS.footer_kicker
  );
  const [footerHeading, setFooterHeading] = useState(
    initialContent?.footer_heading || V2_DEFAULTS.footer_heading
  );
  const [developerTeam, setDeveloperTeam] = useState<LandingDeveloperMember[]>(
    initialContent?.developer_team && initialContent.developer_team.length > 0
      ? initialContent.developer_team
      : V2_DEFAULTS.developer_team
  );
  const [contactEmail, setContactEmail] = useState(
    initialContent?.contact_email || V2_DEFAULTS.contact_email
  );
  const [contactPhone, setContactPhone] = useState(
    formatWhatsAppNumber(initialContent?.contact_phone || V2_DEFAULTS.contact_phone)
  );
  const [institutionName, setInstitutionName] = useState(
    initialContent?.institution_name || V2_DEFAULTS.institution_name
  );
  const [institutionUrl, setInstitutionUrl] = useState(
    initialContent?.institution_url || V2_DEFAULTS.institution_url
  );
  const [copyrightText, setCopyrightText] = useState(
    initialContent?.copyright_text || V2_DEFAULTS.copyright_text
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const triggerUpload = (
    fieldKey: string,
    setter: (val: string) => void,
    acceptType = ".jpg,.jpeg,.png,.webp,.gif"
  ) => {
    if (uploadingField) return;
    const normalizedAccept =
      acceptType === "image/*"
        ? ".jpg,.jpeg,.png,.webp,.gif"
        : acceptType === "video/*"
        ? ".mp4,.webm,.ogg"
        : acceptType;
    currentUploadTargetRef.current = { fieldKey, setter };
    if (fileInputRef.current) {
      fileInputRef.current.accept = normalizedAccept;
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const pollPendingUpload = async (
    statusUrl: string,
    setter: (val: string) => void,
    originalName: string
  ) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(statusUrl, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const json = await res.json();
      const st = json?.upload?.status;
      if (st === "CLEAN" && json?.upload?.public_url) {
        setter(json.upload.public_url);
        showToast(`Media ${originalName} lolos pemindaian & berhasil dipublikasikan.`);
        return;
      }
      if (st === "REJECTED" || st === "QUARANTINED" || st === "SCAN_FAILED") {
        setUploadError(json?.upload?.rejection_reason || `Unggahan ditolak (${st}).`);
        return;
      }
    }
    setUploadError("Pemindaian keamanan masih berlangsung. Periksa kembali beberapa saat lagi.");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadingField) return;
    const files = e.target.files;
    const file = files?.[0];
    if (!file || !currentUploadTargetRef.current) return;

    const { fieldKey, setter } = currentUploadTargetRef.current;
    const profile = fieldKey === "video" ? "landing_video" : "landing_image";

    setUploadError(null);
    const check = await validateUploadFile(file, profile, files?.length || 1);
    if (!check.ok) {
      setUploadError(check.error || "File tidak memenuhi syarat keamanan.");
      return;
    }

    setUploadingField(fieldKey);
    const formData = new FormData();
    formData.append("file", file);

    const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;

    try {
      const res = await fetch("/dashboard/landing-media/upload", {
        method: "POST",
        headers: {
          ...(token ? { "X-CSRF-TOKEN": token } : {}),
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await res.json();
      if (res.status === 202 && data.pending && data.status_url) {
        showToast(`Media ${file.name} dikarantina untuk pemindaian keamanan...`);
        await pollPendingUpload(data.status_url, setter, file.name);
      } else if (res.ok && data.success && data.url) {
        setter(data.url);
        showToast(`Media ${file.name} berhasil diunggah!`);
      } else {
        setUploadError(
          data.message ||
            data.error ||
            "Gagal mengunggah file. Pastikan format file sesuai dan ukuran maksimal 50MB."
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Terjadi kesalahan jaringan saat mengunggah media.");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!contactEmail.trim()) {
      setActiveSubTab("kontak");
      setSaveError("Alamat email resmi wajib diisi sebelum menyimpan perubahan.");
      return;
    }

    setIsSubmitting(true);
    router.post(
      "/dashboard/landing-content",
      {
        hero_tag: heroTag.trim(),
        hero_right_tag: heroRightTag.trim(),
        hero_title: heroTitle.trim(),
        hero_headline_1: heroHeadline1.trim(),
        hero_headline_2: heroHeadline2.trim(),
        hero_subtitle: heroSubtitle.trim(),
        hero_stage2_kicker: heroStage2Kicker.trim(),
        hero_stage2_title_1: heroStage2Title1.trim(),
        hero_stage2_title_2: heroStage2Title2.trim(),
        hero_stage2_desc: heroStage2Desc.trim(),
        hero_passage_beats: heroPassageBeats.map((b) => ({
          num: b.num.trim(),
          title: b.title.trim(),
          desc: b.desc.trim(),
        })),
        hero_stage3_kicker: heroStage3Kicker.trim(),
        hero_stage3_title_1: heroStage3Title1.trim(),
        hero_stage3_title_2: heroStage3Title2.trim(),
        hero_stage3_desc: heroStage3Desc.trim(),

        intro_statement_1: introStatement1.trim(),
        intro_statement_2: introStatement2.trim(),
        intro_statement_3: introStatement3.trim(),
        intro_statement_4: introStatement4.trim(),
        intro_statement_5: introStatement5.trim(),
        intro_principle_kicker: introPrincipleKicker.trim(),
        intro_principle_title: introPrincipleTitle.trim(),
        intro_desc: introDesc.trim(),
        intro_stats: introStats.map((s) => ({ val: s.val.trim(), label: s.label.trim() })),
        video_section_title: videoSectionTitle.trim(),
        video_url: videoUrl.trim(),
        video_poster: videoPoster.trim(),
        diurnal_phases: diurnalPhases.map((d) => ({
          time: d.time.trim(),
          title: d.title.trim(),
          detail: d.detail.trim(),
        })),

        pipeline_heading: pipelineHeading.trim(),
        pipeline_steps: pipelineSteps.map((st) => ({
          num: st.num.trim(),
          verb: st.verb.trim(),
          title: st.title.trim(),
          detail: st.detail.trim(),
          spec: st.spec.trim(),
          img: st.img.trim(),
        })),
        step_1_img: pipelineSteps[0]?.img.trim() || "/pics/ph-meter.jpg",
        step_2_img: pipelineSteps[1]?.img.trim() || "/pics/esp32.jpg",
        step_3_img: pipelineSteps[2]?.img.trim() || "/pics/lele-1.jpg",
        step_4_img: pipelineSteps[3]?.img.trim() || "/pics/aerasi.jpg",
        step_5_img: pipelineSteps[4]?.img.trim() || "/pics/tjipanas.jpg",

        arch_heading_1: archHeading1.trim(),
        arch_heading_2: archHeading2.trim(),
        arch_aside: archAside.trim(),
        arch_phases: archPhases.map((ap) => ({
          phase: ap.phase,
          num: ap.num.trim(),
          short_name: ap.short_name.trim(),
          label: ap.label.trim(),
          summary: ap.summary.trim(),
          specs: ap.specs.trim(),
        })),

        packages_heading: packagesHeading.trim(),
        packages_subtitle: packagesSubtitle.trim(),
        packages: packages.map((pkg) => ({
          num: pkg.num.trim(),
          badge: pkg.badge.trim(),
          name: pkg.name.trim(),
          config: pkg.config.trim(),
          price: pkg.price.trim(),
          saas: pkg.saas.trim(),
          highlights: (pkg.highlights || []).map((h) => h.trim()).filter(Boolean),
          featured: Boolean(pkg.featured),
        })),

        faq_heading: faqHeading.trim(),
        faqs: faqs.map((f) => ({ q: f.q.trim(), a: f.a.trim() })),

        footer_kicker: footerKicker.trim(),
        footer_heading: footerHeading.trim(),
        developer_team: developerTeam.map((m) => ({ name: m.name.trim(), url: m.url.trim() })),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        institution_name: institutionName.trim(),
        institution_url: institutionUrl.trim(),
        cta_button_text: ctaButtonText.trim(),
        copyright_text: copyrightText.trim(),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSubmitting(false);
          setSaveError(null);
          showToast("Seluruh konten landing page v2 berhasil disimpan dan disinkronkan!");
        },
        onError: (errors) => {
          setIsSubmitting(false);
          const messages = Object.values(errors || {}).filter(Boolean);
          setSaveError(
            messages.length > 0
              ? `Gagal menyimpan: ${messages[0]}`
              : "Gagal menyimpan konfigurasi. Periksa kembali isian formulir."
          );
        },
      }
    );
  };

  const handleResetDefaults = () => {
    if (
      !confirm(
        "Kembalikan seluruh konten landing page v2 (Hero 3D, Siklus 24J, 5 Tahap, Arsitektur 3D, Paket, FAQ, Tim & Kontak) ke setelan awal BanyuWening?"
      )
    ) {
      return;
    }

    setHeroTag(V2_DEFAULTS.hero_tag);
    setHeroRightTag(V2_DEFAULTS.hero_right_tag);
    setHeroTitle(V2_DEFAULTS.hero_title);
    setHeroHeadline1(V2_DEFAULTS.hero_headline_1);
    setHeroHeadline2(V2_DEFAULTS.hero_headline_2);
    setHeroSubtitle(V2_DEFAULTS.hero_subtitle);
    setCtaButtonText(V2_DEFAULTS.cta_button_text);
    setHeroStage2Kicker(V2_DEFAULTS.hero_stage2_kicker);
    setHeroStage2Title1(V2_DEFAULTS.hero_stage2_title_1);
    setHeroStage2Title2(V2_DEFAULTS.hero_stage2_title_2);
    setHeroStage2Desc(V2_DEFAULTS.hero_stage2_desc);
    setHeroPassageBeats(V2_DEFAULTS.hero_passage_beats);
    setHeroStage3Kicker(V2_DEFAULTS.hero_stage3_kicker);
    setHeroStage3Title1(V2_DEFAULTS.hero_stage3_title_1);
    setHeroStage3Title2(V2_DEFAULTS.hero_stage3_title_2);
    setHeroStage3Desc(V2_DEFAULTS.hero_stage3_desc);

    setIntroStatement1(V2_DEFAULTS.intro_statement_1);
    setIntroStatement2(V2_DEFAULTS.intro_statement_2);
    setIntroStatement3(V2_DEFAULTS.intro_statement_3);
    setIntroStatement4(V2_DEFAULTS.intro_statement_4);
    setIntroStatement5(V2_DEFAULTS.intro_statement_5);
    setIntroPrincipleKicker(V2_DEFAULTS.intro_principle_kicker);
    setIntroPrincipleTitle(V2_DEFAULTS.intro_principle_title);
    setIntroDesc(V2_DEFAULTS.intro_desc);
    setIntroStats(V2_DEFAULTS.intro_stats);
    setVideoSectionTitle(V2_DEFAULTS.video_section_title);
    setVideoUrl(V2_DEFAULTS.video_url);
    setVideoPoster(V2_DEFAULTS.video_poster);
    setDiurnalPhases(V2_DEFAULTS.diurnal_phases);

    setPipelineHeading(V2_DEFAULTS.pipeline_heading);
    setPipelineSteps(V2_DEFAULTS.pipeline_steps);

    setArchHeading1(V2_DEFAULTS.arch_heading_1);
    setArchHeading2(V2_DEFAULTS.arch_heading_2);
    setArchAside(V2_DEFAULTS.arch_aside);
    setArchPhases(V2_DEFAULTS.arch_phases);

    setPackagesHeading(V2_DEFAULTS.packages_heading);
    setPackagesSubtitle(V2_DEFAULTS.packages_subtitle);
    setPackages(V2_DEFAULTS.packages);

    setFaqHeading(V2_DEFAULTS.faq_heading);
    setFaqs(V2_DEFAULTS.faqs);

    setFooterKicker(V2_DEFAULTS.footer_kicker);
    setFooterHeading(V2_DEFAULTS.footer_heading);
    setDeveloperTeam(V2_DEFAULTS.developer_team);
    setContactEmail(V2_DEFAULTS.contact_email);
    setContactPhone(V2_DEFAULTS.contact_phone);
    setInstitutionName(V2_DEFAULTS.institution_name);
    setInstitutionUrl(V2_DEFAULTS.institution_url);
    setCopyrightText(V2_DEFAULTS.copyright_text);

    showToast("Konten v2 direset di formulir. Klik 'Simpan Perubahan' untuk menerbitkan.");
  };

  const updatePassageBeat = (idx: number, field: keyof LandingPassageBeat, val: string) => {
    setHeroPassageBeats((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: val } : b)));
  };

  const updateIntroStat = (idx: number, field: keyof LandingIntroStat, val: string) => {
    setIntroStats((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  };

  const updateDiurnalPhase = (idx: number, field: keyof LandingDiurnalPhase, val: string) => {
    setDiurnalPhases((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: val } : d)));
  };

  const updatePipelineStep = (idx: number, field: keyof LandingPipelineStep, val: string) => {
    setPipelineSteps((prev) => prev.map((st, i) => (i === idx ? { ...st, [field]: val } : st)));
  };

  const updateArchPhase = (idx: number, field: keyof LandingArchPhase, val: string) => {
    setArchPhases((prev) => prev.map((ap, i) => (i === idx ? { ...ap, [field]: val } : ap)));
  };

  const handleAddPackage = () => {
    setPackages((prev) => [
      ...prev,
      {
        num: String(prev.length + 1).padStart(2, "0"),
        badge: "Paket Baru",
        name: "Paket Kustom Kolam",
        config: "1 Core Hub + N Modul Kolam",
        price: "Rp0",
        saas: "Smart Guard Opsional",
        highlights: ["Spesifikasi unggulan 1", "Spesifikasi unggulan 2"],
        featured: false,
      },
    ]);
  };

  const updatePackage = (idx: number, patch: Partial<LandingPackageItem>) => {
    setPackages((prev) => prev.map((pkg, i) => (i === idx ? { ...pkg, ...patch } : pkg)));
  };

  const removePackage = (idx: number) => {
    setPackages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddFaq = () => {
    setFaqs((prev) => [
      ...prev,
      {
        q: "Pertanyaan baru yang sering ditanyakan pembudidaya?",
        a: "Jawaban komprehensif mengenai cara kerja atau instalasi alat di kolam.",
      },
    ]);
  };

  const handleUpdateFaq = (index: number, field: keyof LandingFaq, val: string) => {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: val } : f)));
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMember = () => {
    setDeveloperTeam((prev) => [...prev, { name: "Nama Anggota Baru", url: "https://" }]);
  };

  const updateMember = (idx: number, field: keyof LandingDeveloperMember, val: string) => {
    setDeveloperTeam((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m)));
  };

  const removeMember = (idx: number) => {
    setDeveloperTeam((prev) => prev.filter((_, i) => i !== idx));
  };

  const tabs: { id: SubTabId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "hero", label: "01 · Hero 3D", icon: <Sparkles className="w-4 h-4" /> },
    { id: "siklus", label: "02 · Intro & Siklus 24J", icon: <Clock className="w-4 h-4" /> },
    { id: "otomasi", label: "03 · 5 Tahap Otomasi", icon: <Layers className="w-4 h-4" /> },
    { id: "arsitektur", label: "04 · Arsitektur 3D", icon: <Box className="w-4 h-4" /> },
    {
      id: "paket",
      label: `05 · Paket & Harga (${packages.length})`,
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: "faq",
      label: `06 · FAQ Teknis (${faqs.length})`,
      icon: <HelpCircle className="w-4 h-4" />,
    },
    {
      id: "kontak",
      label: "07 · Tim, Kontak & Footer",
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {toastMessage && (
        <div className="p-4 bg-aman/15 border border-aman text-ink rounded-[6px] flex items-center gap-2.5 text-[13px]">
          <CheckCircle2 className="w-5 h-5 text-aman shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-bahaya-bg/40 border border-bahaya/40 text-ink rounded-[6px] flex items-center justify-between gap-2.5 text-[13px]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-bahaya shrink-0" />
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="text-xs font-semibold text-muted hover:text-ink cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-4 bg-bahaya-bg/40 border border-bahaya/40 text-ink rounded-[6px] flex items-center justify-between gap-2.5 text-[13px]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-bahaya shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-xs font-semibold text-muted hover:text-ink cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[12px] font-semibold mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>CMS Landing Page v2</span>
          </div>
          <h1 className="text-[24px] md:text-[28px] font-display text-ink leading-tight">
            Manajemen Konten Landing Page
          </h1>
          <p className="text-[13px] text-muted mt-1">
            Seluruh tab tersusun 1:1 mengikuti bagian halaman depan BanyuWening v2—mulai dari
            Hero 3D 3-tahap, Intro &amp; Siklus 24 Jam, 5 Tahap Otomasi, Arsitektur 3D, Paket Harga,
            FAQ, hingga Tim &amp; Kontak Footer.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-3.5 border border-line bg-surface hover:bg-surface-2 text-ink rounded-[6px] text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Lihat Landing Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted" />
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-10 px-5 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation (7 Bagian v2) */}
      <div className="flex border-b border-line gap-1.5 overflow-x-auto pb-px text-[13px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? "border-brand text-brand"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ======================================================== */}
        {/* 01 · HERO 3D (3-STAGE PORTAL JOURNEY)                    */}
        {/* ======================================================== */}
        {activeSubTab === "hero" && (
          <div className="space-y-6">
            <div className="p-4 rounded-[6px] bg-brand/10 border border-brand/30 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="text-[13px] text-ink leading-relaxed">
                <span className="font-semibold text-brand block mb-0.5">
                  Hero Interaktif WebGL 3-Tahap (Apricode Portal)
                </span>
                Landing page v2 menggunakan latar 3D WebGL real-time di seluruh Hero (bukan foto
                statis). Atur teks micro-kicker atas dan copywriting untuk Tahap 01 (Portal),
                Tahap 02 (Lorong Core Hub), serta Tahap 03 (Ekosistem Kolam).
              </div>
            </div>

            {/* Micro-Kicker Row */}
            <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
              <h2 className="text-[15px] font-semibold text-ink">
                Baris Micro-Kicker Atas Hero
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Tag Kiri Atas:</label>
                  <input
                    type="text"
                    value={heroTag}
                    onChange={(e) => setHeroTag(e.target.value)}
                    placeholder="SMART AQUACULTURE STUDIO"
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-mono uppercase focus:outline-hidden focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Tag Kanan Atas:</label>
                  <input
                    type="text"
                    value={heroRightTag}
                    onChange={(e) => setHeroRightTag(e.target.value)}
                    placeholder="EDGE FUZZY & IOT HARDWARE"
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-mono uppercase focus:outline-hidden focus:border-brand"
                  />
                </div>
              </div>
            </div>

            {/* Stage 01: Portal */}
            <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-[16px] font-semibold text-ink">
                  Tahap 01 · Portal Utama Hero
                </h2>
                <span className="mono-label text-[11px] text-brand">01 / BANYUWENING</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Nama Brand / Wordmark Footer (01 / ...):
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="BANYUWENING"
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-bold tracking-wider uppercase focus:outline-hidden focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Label Tombol Demo (Hero &amp; Footer):
                  </label>
                  <input
                    type="text"
                    value={ctaButtonText}
                    onChange={(e) => setCtaButtonText(e.target.value)}
                    placeholder="Buka Versi Demo"
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Judul Besar Baris 1:
                  </label>
                  <input
                    type="text"
                    value={heroHeadline1}
                    onChange={(e) => setHeroHeadline1(e.target.value)}
                    placeholder="Buat kualitas air"
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[14px] font-semibold text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Judul Besar Baris 2:
                  </label>
                  <input
                    type="text"
                    value={heroHeadline2}
                    onChange={(e) => setHeroHeadline2(e.target.value)}
                    placeholder="kolam selalu terkendali"
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[14px] font-semibold text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">
                  Subjudul Penjelasan Hero:
                </label>
                <textarea
                  rows={2}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink leading-relaxed focus:outline-hidden focus:border-brand"
                />
              </div>
            </div>

            {/* Stage 02: Lorong Hub & 3 Passage Beats */}
            <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-[16px] font-semibold text-ink">
                  Tahap 02 · Lorong Topologi &amp; 3 Kartu Beat
                </h2>
                <span className="mono-label text-[11px] text-brand">02 / LORONG HUB</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Kicker Tahap 02:</label>
                  <input
                    type="text"
                    value={heroStage2Kicker}
                    onChange={(e) => setHeroStage2Kicker(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[12px] font-mono text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Judul Baris 1:</label>
                  <input
                    type="text"
                    value={heroStage2Title1}
                    onChange={(e) => setHeroStage2Title1(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Judul Baris 2:</label>
                  <input
                    type="text"
                    value={heroStage2Title2}
                    onChange={(e) => setHeroStage2Title2(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">Deskripsi Tahap 02:</label>
                <textarea
                  rows={2}
                  value={heroStage2Desc}
                  onChange={(e) => setHeroStage2Desc(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {heroPassageBeats.map((beat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-surface-2 rounded-[6px] border border-line space-y-2"
                  >
                    <input
                      type="text"
                      value={beat.num}
                      onChange={(e) => updatePassageBeat(idx, "num", e.target.value)}
                      className="w-full px-2.5 py-1 bg-surface border border-line rounded text-[11px] font-mono font-bold text-brand uppercase"
                      placeholder="01 UKUR"
                    />
                    <input
                      type="text"
                      value={beat.title}
                      onChange={(e) => updatePassageBeat(idx, "title", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[13px] font-semibold text-ink"
                      placeholder="Judul Beat"
                    />
                    <textarea
                      rows={2}
                      value={beat.desc}
                      onChange={(e) => updatePassageBeat(idx, "desc", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[12px] text-ink"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Stage 03: Ekosistem Kolam */}
            <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-[16px] font-semibold text-ink">
                  Tahap 03 · Otonomi Pinggir Kolam
                </h2>
                <span className="mono-label text-[11px] text-brand">03 / EKOSISTEM</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Kicker Tahap 03:</label>
                  <input
                    type="text"
                    value={heroStage3Kicker}
                    onChange={(e) => setHeroStage3Kicker(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[12px] font-mono text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Judul Baris 1:</label>
                  <input
                    type="text"
                    value={heroStage3Title1}
                    onChange={(e) => setHeroStage3Title1(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Judul Baris 2:</label>
                  <input
                    type="text"
                    value={heroStage3Title2}
                    onChange={(e) => setHeroStage3Title2(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">Deskripsi Tahap 03:</label>
                <textarea
                  rows={2}
                  value={heroStage3Desc}
                  onChange={(e) => setHeroStage3Desc(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 02 · INTRO TANGGA & SIKLUS 24 JAM (VIDEO + 4 FASE)       */}
        {/* ======================================================== */}
        {activeSubTab === "siklus" && (
          <div className="space-y-6">
            {/* Narasi Tangga */}
            <div className="p-6 bg-surface rounded-[6px] border border-line space-y-5">
              <div>
                <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand" />
                  <span>Narasi Tangga &amp; Prinsip Desain</span>
                </h2>
                <p className="text-[13px] text-muted mt-1">
                  Lima kalimat bertingkat yang muncul berurutan saat halaman digulir, diikuti blok
                  Prinsip Desain dan 3 metrik kunci.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "Baris 1", val: introStatement1, set: setIntroStatement1, cls: "" },
                  {
                    label: "Baris 2",
                    val: introStatement2,
                    set: setIntroStatement2,
                    cls: "md:pl-6",
                  },
                  {
                    label: "Baris 3",
                    val: introStatement3,
                    set: setIntroStatement3,
                    cls: "md:pl-12",
                  },
                  {
                    label: "Baris 4",
                    val: introStatement4,
                    set: setIntroStatement4,
                    cls: "md:pl-18",
                  },
                  {
                    label: "Baris 5",
                    val: introStatement5,
                    set: setIntroStatement5,
                    cls: "md:pl-24",
                  },
                ].map((row) => (
                  <div key={row.label} className={`space-y-1 ${row.cls}`}>
                    <label className="text-[12px] font-semibold text-muted">{row.label}:</label>
                    <input
                      type="text"
                      value={row.val}
                      onChange={(e) => row.set(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink font-medium"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-line">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Kicker Prinsip Desain:
                  </label>
                  <input
                    type="text"
                    value={introPrincipleKicker}
                    onChange={(e) => setIntroPrincipleKicker(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[12px] font-mono uppercase text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Judul Prinsip Desain:
                  </label>
                  <input
                    type="text"
                    value={introPrincipleTitle}
                    onChange={(e) => setIntroPrincipleTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] font-semibold text-ink"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">
                  Deskripsi Prinsip Desain:
                </label>
                <textarea
                  rows={3}
                  value={introDesc}
                  onChange={(e) => setIntroDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {introStats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-2"
                  >
                    <label className="text-[11px] font-bold text-brand uppercase block">
                      Metrik #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={stat.val}
                      onChange={(e) => updateIntroStat(idx, "val", e.target.value)}
                      placeholder="<15 ms"
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[14px] font-bold text-ink"
                    />
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateIntroStat(idx, "label", e.target.value)}
                      placeholder="Inferensi Edge Fuzzy"
                      className="w-full px-2.5 py-1 bg-surface border border-line rounded text-[12px] text-muted"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Video Time-lapse & 4 Fase Diurnal */}
            <div className="p-6 bg-surface rounded-[6px] border border-line space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-brand" />
                  <h2 className="text-[18px] font-semibold text-ink">
                    Video Ekosistem &amp; Siklus 24 Jam
                  </h2>
                </div>
                <span className="mono-label text-[11px] text-muted">#siklus-24-jam</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">
                  Judul Seksi Video &amp; Siklus:
                </label>
                <input
                  type="text"
                  value={videoSectionTitle}
                  onChange={(e) => setVideoSectionTitle(e.target.value)}
                  placeholder="Siklus 24 jam kolam terpal"
                  className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[14px] font-semibold text-ink"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="aspect-video w-full rounded-[6px] overflow-hidden border border-line bg-black">
                  <video
                    src={videoUrl}
                    poster={videoPoster}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted block">
                      URL atau File Video (.webm / .mp4):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="/pics/kolam-timelapse.webm"
                        className="flex-1 px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                      />
                      <button
                        type="button"
                        disabled={uploadingField === "video"}
                        onClick={() => triggerUpload("video", setVideoUrl, "video/*")}
                        className="px-3.5 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === "video" ? "Mengunggah..." : "Unggah Video"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-muted block">
                      Poster Thumbnail Video:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={videoPoster}
                        onChange={(e) => setVideoPoster(e.target.value)}
                        placeholder="/pics/kolam-timelapse-poster.jpg"
                        className="flex-1 px-3 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                      />
                      <button
                        type="button"
                        disabled={uploadingField === "poster"}
                        onClick={() => triggerUpload("poster", setVideoPoster, "image/*")}
                        className="px-3.5 py-2 bg-surface-2 hover:bg-line border border-line rounded-[6px] text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingField === "poster" ? "..." : "Poster"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-line">
                {diurnalPhases.map((phase, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-2 rounded-[6px] border border-line space-y-2"
                  >
                    <input
                      type="text"
                      value={phase.time}
                      onChange={(e) => updateDiurnalPhase(idx, "time", e.target.value)}
                      className="w-full px-2.5 py-1 bg-surface border border-line rounded text-[11px] font-mono font-bold text-brand"
                      placeholder="06:00 Pagi"
                    />
                    <input
                      type="text"
                      value={phase.title}
                      onChange={(e) => updateDiurnalPhase(idx, "title", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[13px] font-semibold text-ink"
                    />
                    <textarea
                      rows={3}
                      value={phase.detail}
                      onChange={(e) => updateDiurnalPhase(idx, "detail", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-[12px] text-ink leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 03 · 5 TAHAP OTOMASI (#cara-kerja)                       */}
        {/* ======================================================== */}
        {activeSubTab === "otomasi" && (
          <div className="space-y-6">
            <div className="p-4 rounded-[6px] bg-brand/10 border border-brand/30 flex items-start gap-3">
              <Film className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="text-[13px] text-ink leading-relaxed">
                <span className="font-semibold text-brand block mb-0.5">
                  5 Tahap Alur Otomasi BanyuWening (Scroll Parallax Deck)
                </span>
                Edit kata kerja, judul, penjelasan teknis, spesifikasi bawah, serta foto tiap tahap
                (01 Ukur hingga 05 Kabari WA). Anda bisa mengetik path, memilih preset foto kolam,
                atau mengunggah foto langsung ke server.
              </div>
            </div>

            <div className="p-5 bg-surface rounded-[6px] border border-line space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-ink">
                  Judul Besar Seksi 5 Tahap Otomasi:
                </label>
                <input
                  type="text"
                  value={pipelineHeading}
                  onChange={(e) => setPipelineHeading(e.target.value)}
                  placeholder="Lima tahap otomasi"
                  className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] font-bold uppercase text-ink"
                />
              </div>
            </div>

            <div className="space-y-4">
              {pipelineSteps.map((st, idx) => {
                const uploadKey = `step_${idx + 1}`;
                const fallbackImg = V2_DEFAULTS.pipeline_steps[idx]?.img || "/pics/ph-meter.jpg";
                return (
                  <div
                    key={st.num}
                    className="p-5 bg-surface rounded-[6px] border border-line grid grid-cols-1 lg:grid-cols-12 gap-5"
                  >
                    <div className="lg:col-span-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="mono-label text-[11px] font-bold text-brand">
                          TAHAP {st.num}
                        </span>
                        <span className="text-[11px] text-muted">{st.verb}</span>
                      </div>

                      <div className="aspect-[16/10] rounded-[6px] overflow-hidden border border-line bg-black/40">
                        <img
                          src={st.img}
                          alt={st.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = fallbackImg;
                          }}
                        />
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={st.img}
                          onChange={(e) => updatePipelineStep(idx, "img", e.target.value)}
                          placeholder={fallbackImg}
                          className="flex-1 px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] text-ink"
                        />
                        <button
                          type="button"
                          disabled={uploadingField === uploadKey}
                          onClick={() =>
                            triggerUpload(uploadKey, (url) => updatePipelineStep(idx, "img", url))
                          }
                          className="px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingField === uploadKey ? "..." : "Unggah"}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {PRESET_IMAGES.slice(0, 5).map((p) => (
                          <button
                            key={p.path}
                            type="button"
                            onClick={() => updatePipelineStep(idx, "img", p.path)}
                            className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                              st.img === p.path
                                ? "bg-brand text-brand-ink border-brand"
                                : "bg-surface-2 text-muted border-line hover:text-ink"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-8 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted">
                            Kata Kerja (Badge):
                          </label>
                          <input
                            type="text"
                            value={st.verb}
                            onChange={(e) => updatePipelineStep(idx, "verb", e.target.value)}
                            className="w-full px-3 py-1.5 bg-surface-2 border border-line rounded text-[13px] font-semibold text-ink"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] font-medium text-muted">
                            Judul Tahapan:
                          </label>
                          <input
                            type="text"
                            value={st.title}
                            onChange={(e) => updatePipelineStep(idx, "title", e.target.value)}
                            className="w-full px-3 py-1.5 bg-surface-2 border border-line rounded text-[13px] font-semibold text-ink"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted">
                          Penjelasan Detail:
                        </label>
                        <textarea
                          rows={3}
                          value={st.detail}
                          onChange={(e) => updatePipelineStep(idx, "detail", e.target.value)}
                          className="w-full px-3 py-2 bg-surface-2 border border-line rounded text-[13px] text-ink leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted">
                          Spesifikasi Bawah (Mono Label):
                        </label>
                        <input
                          type="text"
                          value={st.spec}
                          onChange={(e) => updatePipelineStep(idx, "spec", e.target.value)}
                          className="w-full px-3 py-1.5 bg-surface-2 border border-line rounded text-[12px] font-mono text-brand"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 04 · ARSITEKTUR 3D (#arsitektur-3d)                      */}
        {/* ======================================================== */}
        {activeSubTab === "arsitektur" && (
          <div className="space-y-6">
            <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
              <div>
                <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                  <Box className="w-5 h-5 text-brand" />
                  <span>Judul &amp; Penjelasan Seksi Arsitektur 3D</span>
                </h2>
                <p className="text-[13px] text-muted mt-1">
                  Mengatur tajuk besar dan empat lapisan sistem interaktif yang terhubung dengan
                  panggung 3D Core Hub.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Tajuk Baris 1:</label>
                  <input
                    type="text"
                    value={archHeading1}
                    onChange={(e) => setArchHeading1(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[14px] font-semibold text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Tajuk Baris 2 (Aksen Teal):
                  </label>
                  <input
                    type="text"
                    value={archHeading2}
                    onChange={(e) => setArchHeading2(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[14px] font-semibold text-brand"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">
                  Teks Pengantar Samping:
                </label>
                <textarea
                  rows={2}
                  value={archAside}
                  onChange={(e) => setArchAside(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archPhases.map((ap, idx) => (
                <div
                  key={ap.phase}
                  className="p-5 bg-surface rounded-[6px] border border-line space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="mono-label text-[11px] font-bold text-brand">
                      LAPISAN {ap.num}
                    </span>
                    <span className="text-[11px] text-muted">3D Phase #{ap.phase}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">Tab Mobile:</label>
                      <input
                        type="text"
                        value={ap.short_name}
                        onChange={(e) => updateArchPhase(idx, "short_name", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] font-semibold text-ink"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-medium text-muted">Judul Lengkap:</label>
                      <input
                        type="text"
                        value={ap.label}
                        onChange={(e) => updateArchPhase(idx, "label", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[13px] font-semibold text-ink"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">Ringkasan:</label>
                    <textarea
                      rows={3}
                      value={ap.summary}
                      onChange={(e) => updateArchPhase(idx, "summary", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] text-ink leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">
                      Spesifikasi Teknis:
                    </label>
                    <input
                      type="text"
                      value={ap.specs}
                      onChange={(e) => updateArchPhase(idx, "specs", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[11px] font-mono text-brand"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 05 · PAKET & HARGA (#paket-harga)                        */}
        {/* ======================================================== */}
        {activeSubTab === "paket" && (
          <div className="space-y-6">
            <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                    <Package className="w-5 h-5 text-brand" />
                    <span>Paket Modular &amp; Skema Harga</span>
                  </h2>
                  <p className="text-[13px] text-muted mt-1">
                    Kelola kartu paket hardware dan biaya layanan Smart Guard yang tampil di landing
                    page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddPackage}
                  className="h-9 px-3.5 bg-surface-2 hover:bg-line border border-line text-ink rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <Plus className="w-3.5 h-3.5 text-brand" />
                  <span>Tambah Paket</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-line">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">Judul Seksi Paket:</label>
                  <input
                    type="text"
                    value={packagesHeading}
                    onChange={(e) => setPackagesHeading(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] font-semibold text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Subjudul Keterangan:
                  </label>
                  <input
                    type="text"
                    value={packagesSubtitle}
                    onChange={(e) => setPackagesSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {packages.map((pkg, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-surface rounded-[6px] border border-line space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="mono-label text-[11px] font-bold text-brand">
                      PAKET #{pkg.num || idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePackage(idx)}
                      className="text-muted hover:text-bahaya p-1 rounded cursor-pointer"
                      title="Hapus paket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">Nomor:</label>
                      <input
                        type="text"
                        value={pkg.num}
                        onChange={(e) => updatePackage(idx, { num: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] font-mono text-ink"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[11px] font-medium text-muted">Badge Label:</label>
                      <input
                        type="text"
                        value={pkg.badge}
                        onChange={(e) => updatePackage(idx, { badge: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] text-brand font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">Nama Paket:</label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => updatePackage(idx, { name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[13px] font-semibold text-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">
                      Konfigurasi Hardware:
                    </label>
                    <input
                      type="text"
                      value={pkg.config}
                      onChange={(e) => updatePackage(idx, { config: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] text-ink"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">Harga Paket:</label>
                      <input
                        type="text"
                        value={pkg.price}
                        onChange={(e) => updatePackage(idx, { price: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[14px] font-bold text-ink"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted">
                        Keterangan SaaS / Langganan:
                      </label>
                      <input
                        type="text"
                        value={pkg.saas}
                        onChange={(e) => updatePackage(idx, { saas: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] text-muted"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">
                      Poin Keunggulan (1 baris = 1 poin):
                    </label>
                    <textarea
                      rows={4}
                      value={(pkg.highlights || []).join("\n")}
                      onChange={(e) =>
                        updatePackage(idx, { highlights: e.target.value.split("\n") })
                      }
                      className="w-full px-2.5 py-1.5 bg-surface-2 border border-line rounded text-[12px] text-ink leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 06 · FAQ TEKNIS (#faq)                                   */}
        {/* ======================================================== */}
        {activeSubTab === "faq" && (
          <div className="p-6 bg-surface rounded-[6px] border border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand" />
                  <span>Tanya Jawab / Frequently Asked Questions (FAQ)</span>
                </h2>
                <p className="text-[13px] text-muted mt-1">
                  Tambahkan atau ubah butir pertanyaan teknis yang tampil pada seksi FAQ landing
                  page.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddFaq}
                className="h-9 px-3.5 bg-surface-2 hover:bg-line border border-line text-ink rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <Plus className="w-3.5 h-3.5 text-brand" />
                <span>Tambah Pertanyaan FAQ</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-ink">Judul Seksi FAQ:</label>
              <input
                type="text"
                value={faqHeading}
                onChange={(e) => setFaqHeading(e.target.value)}
                className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[14px] font-semibold text-ink"
              />
            </div>

            <div className="space-y-4 pt-2">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-surface-2 rounded-[6px] border border-line space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-muted uppercase">
                      Pertanyaan #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="text-muted hover:text-bahaya p-1 rounded cursor-pointer"
                      title="Hapus FAQ ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">
                      Pertanyaan (Tanya):
                    </label>
                    <input
                      type="text"
                      value={faq.q}
                      onChange={(e) => handleUpdateFaq(idx, "q", e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded text-[13px] font-semibold text-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted">
                      Jawaban Rinci (Jawab):
                    </label>
                    <textarea
                      rows={3}
                      value={faq.a}
                      onChange={(e) => handleUpdateFaq(idx, "a", e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded text-[13px] text-ink leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 07 · TIM PENGEMBANG, KONTAK RESMI & FOOTER               */}
        {/* ======================================================== */}
        {activeSubTab === "kontak" && (
          <div className="space-y-6">
            {/* Footer Header & Copyright */}
            <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
              <div>
                <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-brand" />
                  <span>Tajuk Ajakan &amp; Hak Cipta Footer</span>
                </h2>
                <p className="text-[13px] text-muted mt-1">
                  Tampil di bagian penutup halaman di atas daftar tim pengembang dan kontak resmi.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Sub-label Atas Footer:
                  </label>
                  <input
                    type="text"
                    value={footerKicker}
                    onChange={(e) => setFooterKicker(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-semibold text-ink">
                    Judul Besar Footer:
                  </label>
                  <input
                    type="text"
                    value={footerHeading}
                    onChange={(e) => setFooterHeading(e.target.value)}
                    className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] font-semibold text-ink"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-ink">
                  Teks Hak Cipta (Footer Copyright):
                </label>
                <input
                  type="text"
                  value={copyrightText}
                  onChange={(e) => setCopyrightText(e.target.value)}
                  className="w-full px-3.5 py-2 bg-surface-2 border border-line rounded-[6px] text-[13px] text-ink"
                />
              </div>
            </div>

            {/* Tim Pengembang */}
            <div className="p-6 bg-surface rounded-[6px] border border-line space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand" />
                    <span>Tim Pengembang (Footer Rows)</span>
                  </h2>
                  <p className="text-[13px] text-muted mt-1">
                    Daftar nama &amp; tautan portofolio/sosial media tim pengembang pada footer.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddMember}
                  className="h-9 px-3.5 bg-surface-2 hover:bg-line border border-line text-ink rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <Plus className="w-3.5 h-3.5 text-brand" />
                  <span>Tambah Anggota</span>
                </button>
              </div>

              <div className="space-y-3">
                {developerTeam.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-surface-2 rounded-[6px] border border-line grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                  >
                    <div className="md:col-span-1 mono-label text-[11px] font-bold text-brand">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateMember(idx, "name", e.target.value)}
                        placeholder="Nama Lengkap"
                        className="w-full px-3 py-1.5 bg-surface border border-line rounded text-[13px] font-semibold text-ink"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <input
                        type="url"
                        value={member.url}
                        onChange={(e) => updateMember(idx, "url", e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-1.5 bg-surface border border-line rounded text-[12px] font-mono text-ink"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        className="text-muted hover:text-bahaya p-1.5 rounded cursor-pointer"
                        title="Hapus anggota"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email, WhatsApp & Institusi */}
            <div className="p-6 bg-surface rounded-[6px] border border-line space-y-5">
              <div>
                <h2 className="text-[18px] font-semibold text-ink flex items-center gap-2">
                  <Mail className="w-5 h-5 text-brand" />
                  <span>Email Resmi, WhatsApp &amp; Institusi</span>
                </h2>
                <p className="text-[13px] text-muted mt-1">
                  Email tersinkron ke footer landing page dan halaman login. Pada desktop membuka
                  komposer web Gmail; pada perangkat mobile membuka aplikasi email bawaan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-brand" />
                    <span>Alamat Email Utama Resmi</span>
                    <span className="text-bahaya">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="admin@banyuwening.id"
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-brand" />
                    <span>Nomor WhatsApp / Hotline (+62)</span>
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(formatWhatsAppNumber(e.target.value))}
                    onKeyDown={(e) => {
                      const input = e.currentTarget;
                      const start = input.selectionStart || 0;
                      const end = input.selectionEnd || 0;
                      if (e.key === "Backspace" && start <= 4 && end <= 4) e.preventDefault();
                      if (e.key === "Delete" && start < 4) e.preventDefault();
                    }}
                    onFocus={(e) => {
                      if ((e.currentTarget.selectionStart || 0) < 4) {
                        e.currentTarget.setSelectionRange(4, 4);
                      }
                    }}
                    onClick={(e) => {
                      if ((e.currentTarget.selectionStart || 0) < 4) {
                        e.currentTarget.setSelectionRange(4, 4);
                      }
                    }}
                    placeholder="+62 8566-9548-964"
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-brand" />
                    <span>Nama Institusi / Afiliasi Kampus</span>
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-brand" />
                    <span>Tautan Website Resmi Kampus</span>
                  </label>
                  <input
                    type="url"
                    value={institutionUrl}
                    onChange={(e) => setInstitutionUrl(e.target.value)}
                    placeholder="https://palcomtech.ac.id/"
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-line rounded-[6px] text-[14px] text-ink focus:outline-hidden focus:border-brand font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 bg-surface rounded-[6px] border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Info className="w-4 h-4 text-brand shrink-0" />
            <span>Perubahan yang disimpan akan langsung tampil di landing page v2 publik.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 border border-line bg-surface hover:bg-surface-2 text-muted hover:text-ink rounded-[6px] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Setelan Awal v2</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-brand text-brand-ink rounded-[6px] text-[13px] font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
