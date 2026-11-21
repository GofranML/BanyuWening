import { useState, useEffect, useRef, useCallback, memo, type ReactNode } from "react";
import { Head, Link } from "@inertiajs/react";
import {
  motion,
  type MotionValue,
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { ApricodePortal3DScene } from "@/Components/three/ApricodePortal3DScene";
import { BanyuWeningPreloader } from "@/Components/BanyuWeningPreloader";
import { HelloWorldMeshCanvas } from "@/Components/three/HelloWorldMeshCanvas";
import { ThreeUICoreHub3DStage, type CoreHubPhase } from "@/Components/three/ThreeUICoreHub3DStage";
import { SimulatorSection } from "@/Components/SimulatorSection";
import { ContactEmailLink } from "@/Components/ContactEmailLink";
import { HelloWorldInteractiveWordmark } from "@/Components/HelloWorldInteractiveWordmark";
import type { LandingContentSettings, LandingFaq } from "@/Types";
import {
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Cpu,
  ShieldCheck,
  Waves,
  MessageCircle,
  ExternalLink,
  Menu,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface HomeProps {
  landingContent?: LandingContentSettings;
}

const DEFAULT_FAQS: LandingFaq[] = [
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
];

const PIPELINE_STEPS = [
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
];

const ARCH_PHASES: {
  phase: CoreHubPhase;
  num: string;
  label: string;
  summary: string;
  specs: string;
}[] = [
  {
    phase: 0,
    num: "01",
    label: "Topologi Modular 1 Core Hub : 1-4 Modul Kolam",
    summary:
      "Satu Core Hub melayani hingga 4 kolam terpal berdempetan milik satu petambak via soket kedap air GX16 dan kabel shielded maksimal 3-5 meter guna menjaga kejernihan sinyal ADC dan kestabilan kelistrikan.",
    specs: "4 Port GX16 Shielded · 1-4 Stilling Well PVC · Jangkauan 3-5 meter",
  },
  {
    phase: 1,
    num: "02",
    label: "Susunan PCB Berlapis & Pemisahan Jalur Daya",
    summary:
      "Carrier PCB menggabungkan ESP32-WROOM, 2-3x ADS1115 16-bit (8-12 kanal ADC), MCP23017, Level Shifter 3.3V/5V, MOSFET power-switch TDS anti-korosi, serta Relay 4-Ch / 8-Ch Optocoupler dengan filter EMI terisolasi.",
    specs: "ESP32-WROOM · Multi-ADS1115 16-bit · Relay Optocoupler 4/8-Ch",
  },
  {
    phase: 2,
    num: "03",
    label: "Ketahanan Lumpur & Sensor Health Watchdog",
    summary:
      "Probe ditempatkan di dalam stilling well PVC pelindung tubrukan ikan. Sensor Health Watchdog otomatis mengisolasi nilai flatline atau lensa turbidity jenuh lumut (SATURATED/FAULT) dan mengirim pengingat bilas ke WhatsApp.",
    specs: "Stilling Well PVC · Isolasi SATURATED/FAULT · Garansi Hub IP65 12 Bln",
  },
  {
    phase: 3,
    num: "04",
    label: "Always-On Cloud & HITL AI Safety Gate",
    summary:
      "Broker EMQX TLS Port 8883, FastAPI Always-On, dan Supabase Pro memproses proyeksi Random Forest 1-3 jam per pond_id. Pembaruan parameter JSON wajib melalui Human-in-the-Loop Engineer Gate + Dual-OTA 60s rollback.",
    specs: "EMQX TLS 8883 · Random Forest 1-3 Jam · WeningBot WhatsApp-First",
  },
];

const DIURNAL_PHASES = [
  {
    time: "06:00 Pagi",
    title: "Stabilitas Suhu & Aerasi Pagi",
    detail: "DS18B20 mendeteksi penurunan suhu malam; Edge Fuzzy menyesuaikan durasi aerasi tanpa boros listrik.",
  },
  {
    time: "13:00 Siang",
    title: "Puncak Radiasi & Fluktuasi pH",
    detail: "Fotosintesis fitoplankton menaikkan pH permukaan; ADS1115 16-bit mengawal ambang aman 6,5-8,5.",
  },
  {
    time: "19:00 Malam",
    title: "Evaluasi Sisa Pakan & TDS",
    detail: "MOSFET switch menyalakan elektroda TDS sesaat agar terhindar dari korosi sambil membaca lonjakan organik.",
  },
  {
    time: "02:00 Dini Hari",
    title: "Siaga Oksigen Terlarut Menurun",
    detail: "Fase paling kritis kolam terpal dijaga penuh Edge Fuzzy lokal + LittleFS Store-and-Forward 72 jam.",
  },
];

const PACKAGES_OVERVIEW = [
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
];

const DEVELOPER_TEAM = [
  { num: "01", name: "Gofran Muttaqi Likhan" },
  { num: "02", name: "M. Ilham Nandari" },
  { num: "03", name: "Monika Lisbet Lase" },
];

const NAV_LINKS = [
  { href: "#siklus-24-jam", label: "Ketahanan" },
  { href: "#cara-kerja", label: "Otomasi" },
  { href: "#arsitektur-3d", label: "Arsitektur 3D" },
  { href: "#paket-harga", label: "Paket" },
  { href: "#simulator", label: "Kalkulator ROI" },
];

const StaircaseParallaxSection = memo(function StaircaseParallaxSection({
  statements,
}: {
  statements: [string, string, string, string, string];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.94", "end 0.52"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.35,
  });

  const x0 = useTransform(smoothProgress, [0.02, 0.22], [-48, 0]);
  const o0 = useTransform(smoothProgress, [0.02, 0.16], [0.08, 1]);
  const x1 = useTransform(smoothProgress, [0.14, 0.36], [-48, 0]);
  const o1 = useTransform(smoothProgress, [0.14, 0.29], [0.08, 1]);
  const x2 = useTransform(smoothProgress, [0.26, 0.50], [-48, 0]);
  const o2 = useTransform(smoothProgress, [0.26, 0.42], [0.08, 1]);
  const x3 = useTransform(smoothProgress, [0.38, 0.62], [-48, 0]);
  const o3 = useTransform(smoothProgress, [0.38, 0.54], [0.08, 1]);
  const x4 = useTransform(smoothProgress, [0.50, 0.74], [-48, 0]);
  const o4 = useTransform(smoothProgress, [0.50, 0.66], [0.08, 1]);

  const rows = [
    {
      text: statements[0],
      tone: "text-[#111918]",
      icon: <Cpu className="w-[54%] h-[54%]" />,
      tileCls: "bg-[#111918] text-[#F3F1EC] rounded-full -rotate-6",
      x: x0,
      opacity: o0,
    },
    {
      text: statements[1],
      tone: "text-[#3A4A47]",
      icon: <Waves className="w-[58%] h-[58%]" />,
      tileCls: "bg-[#136F63] text-white rounded-[0.22em] rotate-6",
      x: x1,
      opacity: o1,
    },
    {
      text: statements[2],
      tone: "text-[#136F63]",
      icon: <ShieldCheck className="w-[58%] h-[58%]" />,
      tileCls: "bg-[#1CA392] text-white rounded-[30%] -rotate-3",
      x: x2,
      opacity: o2,
    },
    {
      text: statements[3],
      tone: "text-[#3A4A47]",
      icon: null,
      tileCls: "",
      x: x3,
      opacity: o3,
    },
    {
      text: statements[4],
      tone: "text-[#111918]",
      icon: null,
      tileCls: "",
      x: x4,
      opacity: o4,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="py-2 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start"
    >
      <div className="lg:col-span-4 space-y-2 lg:pt-2">
        <div className="mono-label text-[10.5px] sm:text-[11px] text-[#53625E]">
          01 / KETAHANAN OPERASIONAL 24 JAM
        </div>
        <p className="text-[13px] sm:text-[14px] leading-relaxed text-[#485653] max-w-[30ch]">
          Dirancang untuk tetap menjaga oksigen dan kualitas air kolam sekalipun koneksi internet terputus.
        </p>
      </div>

      <div className="lg:col-span-8 lg:pl-6 space-y-2.5 sm:space-y-4 text-[clamp(22px,3.1vw,46px)] leading-[1.16] tracking-[-0.03em] font-semibold">
        {rows.map((row, idx) => (
          <motion.p
            key={idx}
            style={shouldReduceMotion ? undefined : { x: row.x, opacity: row.opacity }}
            className={`${row.tone} will-change-transform`}
          >
            {row.text}
            {row.icon && (
              <span className={`hw-tile ${row.tileCls}`} aria-hidden="true">
                {row.icon}
              </span>
            )}
          </motion.p>
        ))}
      </div>
    </div>
  );
});

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function smoothstep01(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const ApricodeScrollSection = memo(function ApricodeScrollSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: hostRef,
    offset: ["start 0.92", "end 0.08"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.35,
  });

  const y = useTransform(smooth, [0, 0.26, 0.78, 1], [36, 0, 0, -24]);
  const scale = useTransform(smooth, [0, 0.26, 0.78, 1], [0.975, 1, 1, 0.985]);
  const opacity = useTransform(smooth, [0, 0.22, 0.82, 1], [0.12, 1, 1, 0.2]);

  return (
    <motion.div
      ref={hostRef}
      style={shouldReduceMotion ? undefined : { y, scale, opacity }}
      className={`${className} will-change-transform`.trim()}
    >
      {children}
    </motion.div>
  );
});

const ShowroomPlateSection = memo(function ShowroomPlateSection({
  videoRef,
  shouldReduceMotion,
  videoUrl,
  videoPoster,
  activeDiurnal,
  onSelectDiurnal,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  shouldReduceMotion: boolean;
  videoUrl: string;
  videoPoster: string;
  activeDiurnal: number;
  onSelectDiurnal: (idx: number) => void;
}) {
  const showroomRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: showroomRef,
    offset: ["start 0.94", "end 0.14"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.35,
  });

  const plateScale = useTransform(smooth, [0, 0.32, 0.8, 1], [0.92, 1, 1, 0.97]);
  const plateY = useTransform(smooth, [0, 0.32, 0.8, 1], [36, 0, 0, -20]);
  const plateRadius = useTransform(smooth, [0, 0.32, 1], [28, 16, 16]);
  const plateOpacity = useTransform(smooth, [0, 0.22, 0.85, 1], [0.25, 1, 1, 0.35]);

  return (
    <div ref={showroomRef} className="mt-14 sm:mt-24 pt-10 sm:pt-16 border-t border-[#111918]/15">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-[clamp(26px,4vw,58px)] leading-[1.04] tracking-[-0.035em] font-semibold text-[#111918]">
          Siklus 24 jam kolam terpal
        </h2>
      </div>

      <motion.div
        style={
          shouldReduceMotion
            ? undefined
            : {
                scale: plateScale,
                y: plateY,
                borderRadius: plateRadius,
                opacity: plateOpacity,
              }
        }
        className="will-change-transform"
      >
        <div className="rounded-[inherit] overflow-hidden bg-[#111918] shadow-[0_24px_60px_-20px_rgba(17,25,24,0.3)]">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={videoPoster}
            width={1280}
            height={720}
            autoPlay={!shouldReduceMotion}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="w-full aspect-video max-h-[540px] object-cover"
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] mono-label text-[#53625E] pb-6 border-b border-[#111918]/15">
          <span>01 / DINAMIKA KUALITAS AIR SEPANJANG HARI</span>
          <span>Time-lapse kolam (TLSVideos · CC BY 3.0)</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#111918]/12 border-b border-[#111918]/15">
          {DIURNAL_PHASES.map((phase, idx) => {
            const selected = activeDiurnal === idx;
            return (
              <button
                key={phase.time}
                type="button"
                onClick={() => onSelectDiurnal(idx)}
                className={`p-3.5 sm:p-5 text-left transition-colors cursor-pointer ${
                  selected ? "bg-white" : "hover:bg-white/60"
                }`}
              >
                <div className="inline-flex items-center gap-1.5 mono-label text-[10px] sm:text-[11px] text-[#136F63]">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{phase.time}</span>
                </div>
                <div className="mt-1.5 sm:mt-2 text-[14px] sm:text-[16px] font-semibold text-[#111918] leading-snug">
                  {phase.title}
                </div>
                <p className="mt-1 sm:mt-1.5 text-[12px] sm:text-[13px] leading-relaxed text-[#485653]">
                  {phase.detail}
                </p>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
});

const PracticeGlyph = memo(function PracticeGlyph({
  char,
  index,
  progress,
  shouldReduceMotion,
}: {
  char: string;
  index: number;
  progress: MotionValue<number>;
  shouldReduceMotion: boolean;
}) {
  const start = Math.min(0.45, index * 0.032);
  const end = Math.min(0.92, start + 0.44);
  const y = useTransform(progress, [start, end], ["115%", "0%"]);
  const rotate = useTransform(progress, [start, end], [5, 0]);
  const opacity = useTransform(progress, [start, end], [0, 1]);

  return (
    <motion.span
      style={shouldReduceMotion ? undefined : { y, rotate, opacity }}
      className="practice-glyph inline-block will-change-transform"
    >
      {char}
    </motion.span>
  );
});

const PracticeCapabilityRow = memo(function PracticeCapabilityRow({
  index,
  isActive,
  item,
  onSelect,
  progress,
  shouldReduceMotion,
}: {
  index: number;
  isActive: boolean;
  item: (typeof ARCH_PHASES)[number];
  onSelect: () => void;
  progress: MotionValue<number>;
  shouldReduceMotion: boolean;
}) {
  const start = Math.min(0.5, 0.2 + index * 0.09);
  const end = Math.min(0.98, start + 0.38);
  const y = useTransform(progress, [start, end], [28, 0]);
  const opacity = useTransform(progress, [start, end], [0.08, 1]);
  const ruleScaleX = useTransform(progress, [start, end], [0, 1]);

  return (
    <motion.div
      style={shouldReduceMotion ? undefined : { y, opacity }}
      className="relative will-change-transform"
    >
      <motion.div
        aria-hidden="true"
        style={
          shouldReduceMotion
            ? undefined
            : { scaleX: ruleScaleX, transformOrigin: "left center" }
        }
        className="h-px w-full bg-white/15"
      />
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isActive}
        className={`w-full text-left py-4 px-4 transition-colors cursor-pointer ${
          isActive ? "bg-white/8" : "hover:bg-white/4"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="mono-label text-[11px] text-[#8CC2BA]">
            {item.num}
          </span>
          <span className="text-[16px] font-semibold text-[#F3F1EC]">
            {item.label}
          </span>
        </div>
        <p className="mt-1.5 text-[14px] leading-[1.55] text-[#B5C4C0]">
          {item.summary}
        </p>
        <div className="mt-2 mono-label text-[11px] text-[#8CC2BA]">
          {item.specs}
        </div>
      </button>
    </motion.div>
  );
});

function useSmoothWheelScroll(disabled: boolean) {
  useEffect(() => {
    if (disabled || typeof window === "undefined") return undefined;
    if (!window.matchMedia?.("(pointer: fine)").matches) return undefined;

    let rafId = 0;
    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let lastTime = 0;
    const recentWrittenY: number[] = [window.scrollY];

    const recordWrittenY = (y: number) => {
      recentWrittenY.push(y);
      if (recentWrittenY.length > 5) recentWrittenY.shift();
    };

    const getMaxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const hasScrollableAncestor = (target: EventTarget | null, deltaY: number): boolean => {
      let el = target instanceof Element ? target : null;
      while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 2) {
          if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
          if (deltaY < 0 && el.scrollTop > 1) return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const stopGlide = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const step = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const diff = targetY - currentY;
      if (Math.abs(diff) < 0.5) {
        currentY = targetY;
        recordWrittenY(currentY);
        window.scrollTo(0, currentY);
        rafId = 0;
        return;
      }
      currentY += diff * (1 - Math.exp(-dt / 0.085));
      recordWrittenY(currentY);
      window.scrollTo(0, currentY);
      rafId = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || document.body.style.overflow === "hidden") return;
      if (hasScrollableAncestor(e.target, e.deltaY)) return;

      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 32;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      if (!dy) return;

      e.preventDefault();
      if (!rafId) {
        currentY = window.scrollY;
        targetY = currentY;
        lastTime = performance.now();
        recordWrittenY(currentY);
        rafId = requestAnimationFrame(step);
      }
      const maxScroll = getMaxScroll();
      targetY = Math.max(0, Math.min(maxScroll, targetY + dy));
    };

    const onScrollEvent = () => {
      const sy = window.scrollY;
      if (rafId && recentWrittenY.some((y) => Math.abs(sy - y) <= 2.5)) {
        return;
      }
      stopGlide();
      currentY = sy;
      targetY = sy;
      recordWrittenY(sy);
    };

    const syncHardInterrupt = () => {
      stopGlide();
      const sy = window.scrollY;
      currentY = sy;
      targetY = sy;
      recordWrittenY(sy);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScrollEvent, { passive: true });
    window.addEventListener("pointerdown", syncHardInterrupt, { passive: true });
    window.addEventListener("keydown", syncHardInterrupt, { passive: true });
    window.addEventListener("resize", syncHardInterrupt, { passive: true });

    return () => {
      stopGlide();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScrollEvent);
      window.removeEventListener("pointerdown", syncHardInterrupt);
      window.removeEventListener("keydown", syncHardInterrupt);
      window.removeEventListener("resize", syncHardInterrupt);
    };
  }, [disabled]);
}

const PassageBeatCard = memo(function PassageBeatCard({
  beat,
  idx,
  smoothJourney,
  journeyStage,
  shouldReduceMotion,
}: {
  beat: { num: string; title: string; desc: string; start: number; end: number };
  idx: number;
  smoothJourney: MotionValue<number>;
  journeyStage: 0 | 1 | 2;
  shouldReduceMotion: boolean | null;
}) {
  const opacity = useTransform(smoothJourney, [beat.start, beat.end, 0.56, 0.7], [0, 1, 1, 0]);
  const y = useTransform(smoothJourney, [beat.start, beat.end, 0.56, 0.7], [24, 0, 0, -16]);
  const scale = useTransform(smoothJourney, [beat.start, beat.end], [0.93, 1]);
  const beatShift = idx === 1 ? -48 : 0;

  return (
    <motion.div
      className="passage-beat rounded-xl border border-[#8CC2BA]/25 px-5 py-3 text-right will-change-transform max-w-[300px]"
      style={
        shouldReduceMotion
          ? {
              opacity: journeyStage === 1 ? 1 : 0,
              x: beatShift,
              background:
                "radial-gradient(ellipse at 82% 50%, rgba(15, 35, 33, 0.80), rgba(20, 48, 45, 0.48) 75%)",
              backdropFilter: "blur(10px)",
            }
          : {
              opacity,
              x: beatShift,
              y,
              scale,
              background:
                "radial-gradient(ellipse at 82% 50%, rgba(15, 35, 33, 0.80), rgba(20, 48, 45, 0.48) 75%)",
              backdropFilter: "blur(10px)",
            }
      }
    >
      <div className="mono-label text-[10px] text-[#8CC2BA] inline-flex items-center justify-end gap-1.5">
        <span>{beat.num}</span>
        <span className="inline-block h-px w-4 bg-[#8CC2BA]/60" />
      </div>
      <div className="mt-0.5 text-[14px] font-semibold text-[#F2EFE7]">{beat.title}</div>
      <div className="mt-1 text-[12px] leading-snug text-[#D9D4C7]">{beat.desc}</div>
    </motion.div>
  );
});

const HeroJourneyOverlay = memo(function HeroJourneyOverlay({
  smoothJourney,
  journeyStage,
  shouldReduceMotion,
  landingContent,
  onJumpStage,
}: {
  smoothJourney: MotionValue<number>;
  journeyStage: 0 | 1 | 2;
  shouldReduceMotion: boolean | null;
  landingContent?: LandingContentSettings;
  onJumpStage: (stage: 0 | 1 | 2) => void;
}) {
  const journeyTextTone = journeyStage === 2 ? "text-[#14302D]" : "text-[#F2EFE7]";
  const journeyMutedTone = journeyStage === 2 ? "text-[#4B5D5A]" : "text-[#D9D4C7]";

  const vignetteOpacity = useTransform(smoothJourney, [0.56, 0.78], [1, 0]);

  const s1Opacity = useTransform(smoothJourney, [0.08, 0.3], [1, 0]);
  const s1Visibility = useTransform(s1Opacity, (v) => (v <= 0.01 ? "hidden" : "visible"));
  const s1Line1Y = useTransform(smoothJourney, [0.08, 0.3], ["0%", "-112%"]);
  const s1Line2Y = useTransform(smoothJourney, [0.08, 0.3], ["0%", "-121%"]);
  const s1KickerY = useTransform(smoothJourney, [0.08, 0.3], [0, -18]);
  const s1BodyY = useTransform(smoothJourney, [0.08, 0.3], [0, -22]);
  const s1CtaY = useTransform(smoothJourney, [0.08, 0.3], [0, -28]);

  const s2Opacity = useTransform(smoothJourney, [0.22, 0.38, 0.56, 0.7], [0, 1, 1, 0]);
  const s2Visibility = useTransform(s2Opacity, (v) => (v <= 0.01 ? "hidden" : "visible"));
  const s2Line1Y = useTransform(smoothJourney, [0.22, 0.38, 0.56, 0.7], ["112%", "0%", "0%", "-112%"]);
  const s2Line2Y = useTransform(smoothJourney, [0.22, 0.38, 0.56, 0.7], ["118%", "0%", "0%", "-118%"]);

  const s3Opacity = useTransform(smoothJourney, [0.64, 0.8], [0, 1]);
  const s3Visibility = useTransform(s3Opacity, (v) => (v <= 0.01 ? "hidden" : "visible"));
  const s3Line1Y = useTransform(smoothJourney, [0.64, 0.8], ["112%", "0%"]);
  const s3Line2Y = useTransform(smoothJourney, [0.64, 0.8], ["118%", "0%"]);

  const trackScaleX = useTransform(smoothJourney, [0, 1], [0.02, 1]);

  const passageBeats = [
    {
      num: "01 UKUR",
      title: "Multi-ADC 16-bit",
      desc: "Isolasi pH, suhu, TDS, dan kekeruhan lewat 2-3x ADS1115 & MOSFET.",
      start: 0.25,
      end: 0.42,
    },
    {
      num: "02 ISOLASI",
      title: "Watchdog & LittleFS",
      desc: "Menahan anomali probe & menyimpan telemetri 72 jam tanpa WiFi.",
      start: 0.33,
      end: 0.5,
    },
    {
      num: "03 AKTUASI",
      title: "Edge Fuzzy <15 ms",
      desc: "Menyalakan aerator & pompa kolam secara otonom di Core Hub.",
      start: 0.41,
      end: 0.58,
    },
  ];

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: shouldReduceMotion ? (journeyStage === 2 ? 0 : 1) : vignetteOpacity,
          background:
            "linear-gradient(180deg, rgba(15, 35, 33, 0.50), rgba(0, 0, 0, 0) 22%), linear-gradient(90deg, rgba(15, 35, 33, 0.38), rgba(0, 0, 0, 0) 54%), linear-gradient(180deg, rgba(0, 0, 0, 0) 68%, rgba(15, 35, 33, 0.36))",
        }}
      />

      {/* Subtle top micro-kicker row */}
      <div
        className={`relative z-10 w-full px-4 sm:px-6 md:px-12 lg:px-16 pt-20 md:pt-24 flex items-center justify-between text-[10px] sm:text-[11px] mono-label transition-colors duration-300 ${journeyMutedTone}`}
      >
        <span className="truncate max-w-[78vw] sm:max-w-[60vw]">
          {landingContent?.hero_tag || "SMART AQUACULTURE STUDIO"}
        </span>
        <span className="hidden sm:inline">EDGE FUZZY &amp; IOT HARDWARE</span>
      </div>

      {/* Main 3-Stage Bidirectional Scroll-Scrubbed Copy Layer (Zero-Re-Render MotionValues) */}
      <div className="relative z-10 w-full h-[calc(100svh-8.5rem)] sm:h-[calc(100svh-9.5rem)] px-4 sm:px-6 md:px-12 lg:px-16 pointer-events-none">
        {/* Stage 01: Portal */}
        <motion.div
          data-hero-stage="01"
          aria-hidden={journeyStage !== 0}
          style={
            shouldReduceMotion
              ? {
                  opacity: journeyStage === 0 ? 1 : 0,
                  visibility: journeyStage === 0 ? "visible" : "hidden",
                }
              : {
                  opacity: s1Opacity,
                  visibility: s1Visibility as any,
                }
          }
          className={`absolute bottom-2 sm:bottom-4 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 left-4 right-4 sm:left-5 sm:right-5 md:left-12 md:right-12 lg:left-16 lg:right-auto max-w-[760px] lg:max-w-[44vw] rounded-xl sm:rounded-2xl bg-[#0F2321]/68 backdrop-blur-md border border-white/12 p-3.5 sm:p-5 lg:border-0 lg:rounded-none lg:bg-transparent lg:backdrop-blur-none lg:p-0 ${
            journeyStage === 0 ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <motion.div
            className="mono-label text-[10px] sm:text-[11px] text-[#8CC2BA] mb-1.5 sm:mb-3 lg:mb-4 inline-flex items-center gap-2 will-change-transform"
            style={shouldReduceMotion ? undefined : { y: s1KickerY }}
          >
            <span
              aria-hidden="true"
              className="signal-dot inline-block w-1.5 h-1.5 rounded-full bg-[#8CC2BA] shadow-[0_0_14px_#8CC2BA]"
            />
            <span>01 / {landingContent?.hero_title || "BANYUWENING"}</span>
          </motion.div>
          <h1 className="text-[clamp(22px,5.4vw,76px)] leading-[1.06] tracking-[-0.035em] font-semibold text-[#F2EFE7] text-balance">
            <span className="block overflow-hidden pb-0.5 sm:pb-1">
              <motion.span
                className="block hero-split-line will-change-transform"
                style={shouldReduceMotion ? undefined : { y: s1Line1Y }}
              >
                Buat kualitas air
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-0.5 sm:pb-1">
              <motion.span
                className="block hero-split-line will-change-transform"
                style={shouldReduceMotion ? undefined : { y: s1Line2Y }}
              >
                kolam selalu terkendali
              </motion.span>
            </span>
          </h1>
          <motion.p
            className="mt-2 sm:mt-3.5 max-w-[54ch] text-[12.5px] sm:text-[15px] md:text-[18px] leading-[1.45] sm:leading-[1.55] text-[#D9D4C7] will-change-transform"
            style={shouldReduceMotion ? undefined : { y: s1BodyY }}
          >
            {landingContent?.hero_subtitle ||
              "Platform IoT akuakultur presisi dengan kecerdasan Edge Fuzzy lokal dan kontrol pompa otomatis untuk menjaga kualitas air kolam lele 24 jam penuh."}
          </motion.p>
          <motion.div
            className="mt-3 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-6 will-change-transform"
            style={shouldReduceMotion ? undefined : { y: s1CtaY }}
          >
            <a
              href="#arsitektur-3d"
              className="group min-h-[40px] sm:min-h-[44px] inline-flex items-center gap-2 px-1 border-b border-[#F2EFE7]/35 text-[12.5px] sm:text-[14px] font-medium text-[#F2EFE7] hover:border-[#F2EFE7] transition-colors"
            >
              <span>Jelajahi sistem 3D</span>
              <ArrowRight
                className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </a>
            <Link
              href="/demo"
              className="min-h-[40px] sm:min-h-[44px] inline-flex items-center gap-2 rounded-full border border-[#8CC2BA]/40 bg-[#0F2321]/65 backdrop-blur-md px-3.5 sm:px-5 py-1.5 sm:py-2 text-[12.5px] sm:text-[13px] font-medium text-[#8CC2BA] hover:bg-[#8CC2BA] hover:text-[#14302D] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{landingContent?.cta_button_text || "Buka Versi Demo"}</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Stage 02: Passage + BanyuWening Passage Beats */}
        <motion.div
          data-hero-stage="02"
          aria-hidden={journeyStage !== 1}
          style={
            shouldReduceMotion
              ? {
                  opacity: journeyStage === 1 ? 1 : 0,
                  visibility: journeyStage === 1 ? "visible" : "hidden",
                }
              : {
                  opacity: s2Opacity,
                  visibility: s2Visibility as any,
                }
          }
          className="absolute bottom-2 sm:bottom-4 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 left-4 right-4 sm:left-6 sm:right-6 md:left-12 md:right-12 lg:left-16 lg:right-16 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-8 pointer-events-none"
        >
          <div
            className={`max-w-[760px] lg:max-w-[44vw] rounded-xl sm:rounded-2xl bg-[#0F2321]/68 backdrop-blur-md border border-white/12 p-3.5 sm:p-5 lg:border-0 lg:rounded-none lg:bg-transparent lg:backdrop-blur-none lg:p-0 ${
              journeyStage === 1 ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <div className="mono-label text-[10px] sm:text-[11px] text-[#8CC2BA] mb-1.5 sm:mb-3 lg:mb-4 inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="signal-dot inline-block w-1.5 h-1.5 rounded-full bg-[#8CC2BA] shadow-[0_0_14px_#8CC2BA]"
              />
              <span>02 / LORONG TOPOLOGI CORE HUB</span>
            </div>
            <h2 className="text-[clamp(21px,5.2vw,72px)] leading-[1.06] tracking-[-0.035em] font-semibold text-[#F2EFE7] text-balance">
              <span className="block overflow-hidden pb-0.5 sm:pb-1">
                <motion.span
                  className="block hero-split-line will-change-transform"
                  style={shouldReduceMotion ? undefined : { y: s2Line1Y }}
                >
                  Satu inti hardware
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-0.5 sm:pb-1">
                <motion.span
                  className="block hero-split-line will-change-transform"
                  style={shouldReduceMotion ? undefined : { y: s2Line2Y }}
                >
                  menyatukan empat kolam
                </motion.span>
              </span>
            </h2>
            <p className="mt-2 sm:mt-3.5 max-w-[52ch] text-[12.5px] sm:text-[15px] md:text-[18px] leading-[1.45] sm:leading-[1.55] text-[#D9D4C7]">
              Jalur kabel shielded GX16 mengisolasi pembacaan ADC 16-bit tiap kolam sekaligus mempertahankan efisiensi instalasi petambak UMKM.
            </p>
            <div className="lg:hidden grid grid-cols-3 gap-1.5 sm:gap-2 mt-2.5 sm:mt-3.5 pt-2.5 sm:pt-3 border-t border-white/15">
              {passageBeats.map((b) => (
                <div key={b.num} className="rounded-lg bg-white/6 px-2 py-1.5">
                  <div className="mono-label text-[8.5px] text-[#8CC2BA]">{b.num}</div>
                  <div className="text-[10.5px] font-semibold text-[#F2EFE7] mt-0.5 leading-tight">{b.title}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-3 items-end pointer-events-none">
            {passageBeats.map((beat, idx) => (
              <PassageBeatCard
                key={beat.num}
                beat={beat}
                idx={idx}
                smoothJourney={smoothJourney}
                journeyStage={journeyStage}
                shouldReduceMotion={shouldReduceMotion}
              />
            ))}
          </div>
        </motion.div>

        {/* Stage 03: Bio-Pond Observatory */}
        <motion.div
          data-hero-stage="03"
          aria-hidden={journeyStage !== 2}
          style={
            shouldReduceMotion
              ? {
                  opacity: journeyStage === 2 ? 1 : 0,
                  visibility: journeyStage === 2 ? "visible" : "hidden",
                }
              : {
                  opacity: s3Opacity,
                  visibility: s3Visibility as any,
                }
          }
          className={`absolute bottom-2 sm:bottom-4 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 left-4 right-4 sm:left-5 sm:right-5 md:left-12 md:right-12 lg:left-16 lg:right-auto max-w-[760px] lg:max-w-[44vw] rounded-xl sm:rounded-2xl bg-[#F2EFE7]/86 backdrop-blur-md border border-[#14302D]/10 p-3.5 sm:p-5 lg:border-0 lg:rounded-none lg:bg-transparent lg:backdrop-blur-none lg:p-0 ${journeyTextTone} ${
            journeyStage === 2 ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="mono-label text-[10px] sm:text-[11px] text-[#33706A] mb-1.5 sm:mb-3 lg:mb-4 inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="signal-dot inline-block w-1.5 h-1.5 rounded-full bg-[#33706A]"
            />
            <span>03 / OTONOMI PENUH PINGGIR KOLAM</span>
          </div>
          <h2 className="text-[clamp(21px,5.2vw,68px)] leading-[1.06] tracking-[-0.035em] font-semibold text-[#14302D] text-balance">
            <span className="block overflow-hidden pb-0.5 sm:pb-1">
              <motion.span
                className="block hero-split-line will-change-transform"
                style={shouldReduceMotion ? undefined : { y: s3Line1Y }}
              >
                Dibuat untuk eksplorasi.
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-0.5 sm:pb-1">
              <motion.span
                className="block hero-split-line will-change-transform"
                style={shouldReduceMotion ? undefined : { y: s3Line2Y }}
              >
                Siap bekerja otomatis.
              </motion.span>
            </span>
          </h2>
          <p className="mt-2 sm:mt-3.5 max-w-[50ch] text-[12.5px] sm:text-[15px] md:text-[18px] leading-[1.45] sm:leading-[1.55] text-[#4B5D5A]">
            Tetap menjaga pH, suhu, kekeruhan, dan pompa aerasi walaupun WiFi kolam terputus melalui Edge Fuzzy &amp; Mode Offline-Plus Rp0.
          </p>
          <div className="mt-3 sm:mt-6">
            <a
              href="#arsitektur-3d"
              className="min-h-[40px] sm:min-h-[44px] inline-flex items-center gap-2 px-1 border-b border-[#14302D]/35 text-[12.5px] sm:text-[14px] font-medium text-[#14302D] hover:border-[#14302D]"
            >
              <span>Lihat arsitektur sistem</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Bottom HUD Navigation Bar & 2px Journey Progress Track */}
      <div
        className={`absolute bottom-3 sm:bottom-5 md:bottom-7 left-0 right-0 z-20 px-4 sm:px-6 md:px-12 lg:px-16 transition-colors duration-300 ${journeyMutedTone}`}
      >
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4 text-[12px]">
          <a
            href="#siklus-24-jam"
            className="hidden sm:inline-flex items-center gap-3 hover:opacity-100 opacity-85"
          >
            <span
              aria-hidden="true"
              className={`signal-dot inline-block w-1.5 h-1.5 rounded-full ${
                journeyStage === 2
                  ? "bg-[#33706A]"
                  : "bg-[#8CC2BA] shadow-[0_0_12px_#8CC2BA]"
              }`}
            />
            <span>Gulir untuk membuka</span>
            <span className="inline-block h-4 w-[1px] bg-current opacity-50" />
          </a>

          <div className="flex items-center gap-3 sm:gap-5 md:gap-7 font-medium mx-auto sm:mx-0">
            {[
              { id: 0 as const, num: "01", label: "Portal" },
              { id: 1 as const, num: "02", label: "Lorong Hub" },
              { id: 2 as const, num: "03", label: "Ekosistem" },
            ].map((item) => {
              const active = journeyStage === item.id;
              const activeUnderline =
                journeyStage === 2 ? "border-[#33706A]" : "border-[#8CC2BA]";
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => onJumpStage(item.id)}
                  className={`min-h-[44px] px-2 border-b-2 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    active
                      ? `${activeUnderline} opacity-100 font-semibold ${
                          journeyStage === 2 ? "text-[#14302D]" : "text-[#F2EFE7]"
                        }`
                      : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  <span
                    className={`mono-label text-[10px] ${
                      active
                        ? journeyStage === 2
                          ? "text-[#33706A]"
                          : "text-[#8CC2BA]"
                        : ""
                    }`}
                  >
                    {item.num}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2px Bottom Journey Progress Track */}
      <div
        aria-hidden="true"
        className={`journey-track absolute bottom-0 left-0 right-0 z-20 h-[2px] ${
          journeyStage === 2 ? "bg-[#14302D]/10" : "bg-[#F2EFE7]/10"
        }`}
      >
        <motion.span
          className={`block h-full w-full origin-left transition-colors duration-300 ${
            journeyStage === 2 ? "bg-[#33706A]" : "bg-[#8CC2BA]"
          }`}
          style={{
            scaleX: shouldReduceMotion ? [0.2, 0.55, 1][journeyStage] : trackScaleX,
          }}
        />
      </div>
    </>
  );
});

const PipelineCard = memo(function PipelineCard({
  st,
  idx,
  active,
  smoothPipeline,
}: {
  st: (typeof PIPELINE_STEPS)[number];
  idx: number;
  active: boolean;
  smoothPipeline: MotionValue<number>;
}) {
  const stepCenter = idx / (PIPELINE_STEPS.length - 1);
  const deadzoneSigned = (d: number) => {
    const a = Math.abs(d);
    if (a <= 0.32) return 0;
    const t = Math.min(1, (a - 0.32) / 0.36);
    return Math.sign(d) * t * t * (3 - 2 * t);
  };
  const opacity = useTransform(smoothPipeline, (p) => {
    const absD = Math.abs((p - stepCenter) * 4);
    if (absD <= 0.32) return 1;
    if (absD >= 0.68) return 0;
    const t = (absD - 0.32) / 0.36;
    return 1 - t * t * (3 - 2 * t);
  });
  const visibility = useTransform(opacity, (v) => (v < 0.01 ? "hidden" : "visible"));
  const x = useTransform(smoothPipeline, (p) => deadzoneSigned((stepCenter - p) * 4) * 14);
  const y = useTransform(smoothPipeline, (p) => deadzoneSigned((stepCenter - p) * 4) * 22);
  const rotateX = useTransform(smoothPipeline, (p) => deadzoneSigned((p - stepCenter) * 4) * 3.5);
  const scale = useTransform(
    smoothPipeline,
    (p) => 1 - Math.abs(deadzoneSigned((p - stepCenter) * 4)) * 0.04
  );
  const ghostY = useTransform(smoothPipeline, (p) => deadzoneSigned((p - stepCenter) * 4) * 28);

  return (
    <motion.article
      aria-hidden={!active}
      className="absolute inset-0 flex items-center lg:items-stretch justify-center pointer-events-none py-1 sm:py-2 will-change-transform"
      style={{
        opacity,
        visibility: visibility as any,
        zIndex: active ? 10 : 1,
        x,
        y,
        rotateX,
        scale,
        backfaceVisibility: "hidden",
      }}
    >
      <div
        className="relative w-full h-auto max-h-full lg:h-full flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] gap-3.5 sm:gap-5 lg:gap-8 items-stretch lg:items-center rounded-2xl sm:rounded-3xl bg-[#051B18]/94 border border-white/15 p-4 sm:p-6 lg:p-8 xl:p-10 shadow-[0_32px_90px_-24px_rgba(0,0,0,0.55)] overflow-y-auto lg:overflow-hidden no-scrollbar"
        style={{ contain: "layout style" }}
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none hidden sm:block absolute top-2 right-6 md:right-12 text-[clamp(84px,12vw,160px)] font-bold leading-none tracking-[-0.05em] text-white/[0.06] select-none tnum will-change-transform"
          style={{ y: ghostY }}
        >
          {st.num}
        </motion.span>

        <div className="lg:col-span-6 lg:h-full min-h-0 flex items-center justify-center shrink-0">
          <div className="relative w-full aspect-[16/10] max-h-[24vh] sm:max-h-[30vh] lg:max-h-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#0B2320] border border-white/10 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.6)]">
            <img
              src={st.img}
              alt={st.title}
              width={800}
              height={500}
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
        </div>

        <div className="lg:col-span-6 min-h-0 flex flex-col justify-center space-y-2 sm:space-y-3 lg:space-y-4 lg:px-2">
          <div className="flex items-baseline gap-2.5 sm:gap-4">
            <span className="text-[clamp(28px,4.5vw,68px)] font-bold leading-none tracking-[-0.04em] tnum text-white/95">
              {st.num}
            </span>
            <span className="mono-label text-[10.5px] sm:text-[12px] text-[#A9F2E8]">
              TAHAP {st.verb}
            </span>
          </div>
          <h3 className="text-[clamp(18px,2.8vw,36px)] leading-[1.12] tracking-[-0.025em] font-semibold text-white">
            {st.title}
          </h3>
          <p className="text-[13px] sm:text-[15px] lg:text-[16px] xl:text-[17px] leading-[1.52] sm:leading-[1.6] text-white/85 max-w-[58ch]">
            {st.detail}
          </p>
          <div className="pt-2 sm:pt-3 border-t border-white/20 mono-label text-[10px] sm:text-[11.5px] lg:text-[12px] text-[#A9F2E8]">
            {st.spec}
          </div>
        </div>
      </div>
    </motion.article>
  );
});

const PipelineRailStep = memo(function PipelineRailStep({
  st,
  idx,
  isCurrent,
  smoothPipeline,
}: {
  st: (typeof PIPELINE_STEPS)[number];
  idx: number;
  isCurrent: boolean;
  smoothPipeline: MotionValue<number>;
}) {
  const stepCenter = idx / (PIPELINE_STEPS.length - 1);
  const opacity = useTransform(smoothPipeline, (p) =>
    Math.max(0.35, 1 - Math.abs(p - stepCenter) * 2.2)
  );

  return (
    <motion.div
      className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-medium whitespace-nowrap shrink-0"
      style={{ opacity }}
    >
      <span
        className={`mono-label tnum ${
          isCurrent ? "text-[#A9F2E8] font-bold" : "text-white/75"
        }`}
      >
        {st.num}
      </span>
      <span className={isCurrent ? "text-white font-semibold" : "text-white/75"}>
        {st.verb}
      </span>
    </motion.div>
  );
});

const PipelineScrollStage = memo(function PipelineScrollStage({
  smoothPipeline,
}: {
  smoothPipeline: MotionValue<number>;
}) {
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  useMotionValueEvent(smoothPipeline, "change", (latest) => {
    const p = Math.max(0, Math.min(1, latest));
    const nextIdx = Math.min(
      PIPELINE_STEPS.length - 1,
      Math.max(0, Math.round(p * (PIPELINE_STEPS.length - 1)))
    );
    setActiveStepIdx((prev) => (prev === nextIdx ? prev : nextIdx));
  });

  const gridY = useTransform(smoothPipeline, [0, 1], [0, 120]);
  const meterScaleX = useTransform(smoothPipeline, [0, 1], [0.1, 1]);

  return (
    <div className="sticky top-0 h-[100svh] w-full overflow-hidden flex flex-col justify-between px-4 sm:px-6 md:px-12 lg:px-16 pt-16 sm:pt-18 md:pt-20 pb-3 sm:pb-5">
      {/* Layer 0: Full-Bleed WebGL 5-Point Mesh Gradient + 3D Perspective Floor Grid */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <HelloWorldMeshCanvas className="h-full w-full" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25"
          style={{ perspective: "1000px" }}
        >
          <div
            className="absolute -inset-x-24 -bottom-24 h-[65vh] overflow-hidden"
            style={{
              transform: "rotateX(68deg) translateZ(-80px)",
              transformOrigin: "bottom center",
              maskImage: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
              WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
            }}
          >
            <motion.div
              className="w-full h-[calc(100%+144px)] -top-[144px] relative will-change-transform"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(169,242,232,0.22) 1px, transparent 1px), linear-gradient(to top, rgba(169,242,232,0.22) 1px, transparent 1px)",
                backgroundSize: "72px 72px",
                y: gridY,
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Row: Section Heading + Read-Only Continuous Progress Meter */}
      <div className="relative z-20 w-full flex flex-row items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-[clamp(22px,4vw,56px)] leading-[0.98] tracking-[-0.04em] font-bold uppercase text-white">
            Lima tahap otomasi
          </h2>
        </div>

        <div
          aria-live="polite"
          className="pointer-events-none flex flex-col items-end gap-1.5 sm:gap-2 shrink-0"
        >
          <div className="mono-label text-[10px] sm:text-[12px] text-[#A9F2E8] tnum">
            TAHAP 0{activeStepIdx + 1} / 05
          </div>
          <div className="w-24 sm:w-40 md:w-56 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full w-full bg-[#A9F2E8] rounded-full origin-left"
              style={{ scaleX: meterScaleX }}
            />
          </div>
        </div>
      </div>

      {/* Center Stage: Full-Viewport 5 Stacked Cards Driven Purely by GPU MotionValues */}
      <div
        className="relative z-10 flex-1 min-h-0 w-full flex items-stretch justify-center my-2 sm:my-4"
        style={{ perspective: "1400px" }}
      >
        {PIPELINE_STEPS.map((st, idx) => (
          <PipelineCard
            key={st.num}
            st={st}
            idx={idx}
            active={idx === activeStepIdx}
            smoothPipeline={smoothPipeline}
          />
        ))}
      </div>

      {/* Bottom Full-Page Read-Only Scroll Rail */}
      <div className="pointer-events-none relative z-20 w-full pt-2 sm:pt-3 border-t border-white/15 flex items-center justify-between gap-4">
        <div className="flex flex-nowrap overflow-x-auto no-scrollbar items-center gap-3 sm:gap-6">
          {PIPELINE_STEPS.map((st, idx) => (
            <PipelineRailStep
              key={st.num}
              st={st}
              idx={idx}
              isCurrent={idx === activeStepIdx}
              smoothPipeline={smoothPipeline}
            />
          ))}
        </div>
        <div className="hidden lg:block mono-label text-[10px] text-white/65">
          GULIR HALAMAN UNTUK MELANJUTKAN TAHAP 01 - 05
        </div>
      </div>
    </div>
  );
});

const Arch3DStageWrapper = memo(function Arch3DStageWrapper({
  activePhase,
  archScrollY,
  manualPhaseTimestampRef,
  className,
}: {
  activePhase: CoreHubPhase;
  archScrollY: MotionValue<number>;
  manualPhaseTimestampRef: React.MutableRefObject<number>;
  className: string;
}) {
  const [archProgress, setArchProgress] = useState(0);

  useEffect(() => {
    if (performance.now() - manualPhaseTimestampRef.current < 700) {
      setArchProgress([0.12, 0.37, 0.62, 0.88][activePhase]);
    }
  }, [activePhase, manualPhaseTimestampRef]);

  useMotionValueEvent(archScrollY, "change", (latest) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return;
    if (performance.now() - manualPhaseTimestampRef.current < 650) return;
    const clamped = Math.max(0, Math.min(1, latest));
    setArchProgress((prev) => (Math.abs(clamped - prev) >= 0.008 ? clamped : prev));
  });

  return (
    <ThreeUICoreHub3DStage
      activePhase={activePhase}
      progress={archProgress}
      className={className}
    />
  );
});

export default function Home({ landingContent }: HomeProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDiurnal, setActiveDiurnal] = useState(0);
  const [navOnLightPaper, setNavOnLightPaper] = useState(false);
  const [headerIsAway, setHeaderIsAway] = useState(false);
  const [preloaderProgress, setPreloaderProgress] = useState(0.08);
  const [sceneReady, setSceneReady] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  useSmoothWheelScroll(Boolean(shouldReduceMotion) || mobileMenuOpen);

  const journeyRef = useRef<HTMLDivElement>(null);
  const paperSheetRef = useRef<HTMLElement>(null);
  const pipelineRef = useRef<HTMLElement>(null);
  const archRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualPhaseTimestampRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const portalProgressRef = useRef(0);
  const navToneRafRef = useRef(0);
  const navTargetsRef = useRef<{
    paket: HTMLElement | null;
    faq: HTMLElement | null;
    footer: HTMLElement | null;
  } | null>(null);

  const handlePrewarmProgress = useCallback((p: number, done: boolean) => {
    setPreloaderProgress(p);
    if (done) {
      setSceneReady(true);
    }
  }, []);

  // Apricode 3-Stage Scroll Journey Progress (0..1)
  const { scrollYProgress: journeyScroll } = useScroll({
    target: journeyRef,
    offset: ["start start", "end end"],
  });
  const smoothJourney = useSpring(journeyScroll, {
    stiffness: 180,
    damping: 28,
    mass: 0.25,
  });

  const [journeyStage, setJourneyStage] = useState<0 | 1 | 2>(0);

  // Full-Page 5-Stage Pipeline 3D Parallax Progress (0..1)
  const { scrollYProgress: pipelineScrollY } = useScroll({
    target: pipelineRef,
    offset: ["start start", "end end"],
  });
  const smoothPipeline = useSpring(pipelineScrollY, {
    stiffness: 280,
    damping: 34,
    mass: 0.18,
  });

  // Switch top navbar ink & directionally show/hide header with cached refs + rAF throttle
  const { scrollY } = useScroll();
  const updateNavbarTone = useCallback((prog: number) => {
    if (navToneRafRef.current) return;
    navToneRafRef.current = requestAnimationFrame(() => {
      navToneRafRef.current = 0;
      const journey = journeyRef.current;
      const paper = paperSheetRef.current;
      if (!navTargetsRef.current) {
        navTargetsRef.current = {
          paket: document.getElementById("paket-harga"),
          faq: document.getElementById("faq"),
          footer: document.querySelector("footer"),
        };
      }
      const { paket, faq, footer } = navTargetsRef.current;
      const overPaper =
        (paper &&
          paper.getBoundingClientRect().top <= 48 &&
          paper.getBoundingClientRect().bottom >= 48) ||
        (paket &&
          paket.getBoundingClientRect().top <= 48 &&
          paket.getBoundingClientRect().bottom >= 48) ||
        (faq &&
          faq.getBoundingClientRect().top <= 48 &&
          footer &&
          footer.getBoundingClientRect().bottom >= 48);
      const inBeyond =
        prog > 0.72 &&
        Boolean(journey && journey.getBoundingClientRect().bottom > 48) &&
        !overPaper;
      const next = Boolean(overPaper || inBeyond);
      setNavOnLightPaper((prev) => (prev === next ? prev : next));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (navToneRafRef.current) {
        cancelAnimationFrame(navToneRafRef.current);
      }
    };
  }, []);

  useMotionValueEvent(journeyScroll, "change", (latest) => {
    const p = Math.max(0, Math.min(1, latest));
    portalProgressRef.current = p;
    const nextStage: 0 | 1 | 2 = p < 0.36 ? 0 : p < 0.7 ? 1 : 2;
    setJourneyStage((prev) => (prev === nextStage ? prev : nextStage));
    updateNavbarTone(p);
  });

  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = lastScrollYRef.current;
    const delta = latest - prev;
    lastScrollYRef.current = latest;
    if (!shouldReduceMotion) {
      if (latest <= 90) {
        setHeaderIsAway(false);
      } else if (delta > 6 && !mobileMenuOpen) {
        setHeaderIsAway(true);
      } else if (delta < -4) {
        setHeaderIsAway(false);
      }
    }
    updateNavbarTone(portalProgressRef.current);
  });

  // Apricode #practice bidirectional glyph & row entry scrub on #arsitektur-3d
  const { scrollYProgress: archEntryScroll } = useScroll({
    target: archRef,
    offset: ["start 0.92", "start 0.15"],
  });
  const smoothArchEntry = useSpring(archEntryScroll, {
    stiffness: 110,
    damping: 26,
    mass: 0.35,
  });
  const archDesignY = useTransform(smoothArchEntry, [0.22, 0.72], ["112%", "0%"]);
  const archDesignOpacity = useTransform(smoothArchEntry, [0.22, 0.65], [0, 1]);
  const archAsideY = useTransform(smoothArchEntry, [0.28, 0.8], [18, 0]);
  const archAsideOpacity = useTransform(smoothArchEntry, [0.28, 0.75], [0, 1]);
  const archStageScale = useTransform(smoothArchEntry, [0.18, 0.82], [0.95, 1]);
  const archStageY = useTransform(smoothArchEntry, [0.18, 0.82], [24, 0]);
  const archStageOpacity = useTransform(smoothArchEntry, [0.15, 0.72], [0.25, 1]);

  // Architecture section scroll sync (desktop only so mobile taps stay locked cleanly)
  const { scrollYProgress: archScrollY } = useScroll({
    target: archRef,
    offset: ["start start", "end end"],
  });
  const [activePhase, setActivePhase] = useState<CoreHubPhase>(0);

  useMotionValueEvent(archScrollY, "change", (latest) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return;
    if (performance.now() - manualPhaseTimestampRef.current < 650) return;
    const clamped = Math.max(0, Math.min(1, latest));
    const nextPhase: CoreHubPhase =
      clamped < 0.25 ? 0 : clamped < 0.5 ? 1 : clamped < 0.75 ? 2 : 3;
    setActivePhase((prev) => (prev === nextPhase ? prev : nextPhase));
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    if (shouldReduceMotion) {
      video.pause();
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!video) return;
        if (entry?.isIntersecting && !shouldReduceMotion) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [shouldReduceMotion]);

  const jumpJourneyStage = useCallback(
    (stage: 0 | 1 | 2) => {
      const el = journeyRef.current;
      if (!el) return;
      const top = window.scrollY + el.getBoundingClientRect().top;
      const span = Math.max(1, el.offsetHeight - window.innerHeight);
      const targets = [0.02, 0.52, 0.92];
      window.scrollTo({
        top: top + span * targets[stage],
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    },
    [shouldReduceMotion]
  );

  const handleSelectPhase = (phase: CoreHubPhase) => {
    manualPhaseTimestampRef.current = performance.now();
    setActivePhase(phase);
  };

  const faqs =
    landingContent?.faqs && landingContent.faqs.length > 0
      ? landingContent.faqs
      : DEFAULT_FAQS;

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
    <div className="relative bg-[#0F2321] text-[#F2EFE7] min-h-[100svh] font-sans selection:bg-[#33706A] selection:text-[#F2EFE7]">
      <Head title="Smart Aquaculture IoT Multi-Kolam & AI Decision Support" />

      <BanyuWeningPreloader progress={preloaderProgress} ready={sceneReady} />

      {/* ================================================================= */}
      {/* APRICODE ADAPTIVE TOPBAR (DARK / LIGHT STUDIO AUTO-SWITCH)        */}
      {/* ================================================================= */}
      <header
        data-away={headerIsAway && !mobileMenuOpen ? "true" : "false"}
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 md:px-12 lg:px-16 h-16 md:h-20 flex items-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          headerIsAway && !mobileMenuOpen ? "-translate-y-[105%]" : "translate-y-0"
        } ${
          navOnLightPaper
            ? "bg-[#F2EFE7]/85 text-[#14302D] border-b border-[#14302D]/10 backdrop-blur-md"
            : "bg-transparent text-[#F2EFE7]"
        }`}
      >
        <div className="w-full flex items-center justify-between gap-3">
          <Link href="/" className="min-h-[44px] inline-flex items-center gap-2 shrink-0">
            <img
              src={navOnLightPaper ? "/brand/logogram.svg" : "/brand/logogram-gelap.svg"}
              alt="Logo BanyuWening"
              width={24}
              height={30}
            />
            <span className="text-[13px] sm:text-[14px] font-medium tracking-[0.2em] uppercase">
              BANYUWENING
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama BanyuWening"
            className="hidden lg:flex items-center gap-7 text-[14px] font-medium"
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="min-h-[44px] inline-flex items-center opacity-85 hover:opacity-100 transition-opacity"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-5 shrink-0">
            <Link
              href="/demo"
              className={`min-h-[44px] inline-flex items-center gap-1.5 text-[13px] font-medium hover:underline transition-colors ${
                navOnLightPaper ? "text-[#33706A]" : "text-[#8CC2BA]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Versi Demo</span>
            </Link>

            <Link
              href="/dashboard"
              className={`group inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium border backdrop-blur-md transition-all duration-300 ${
                navOnLightPaper
                  ? "border-[#14302D]/25 bg-[#14302D] text-[#F2EFE7] hover:bg-[#33706A] hover:border-[#33706A]"
                  : "border-[#F2EFE7]/35 bg-[#0F2321]/55 text-[#F2EFE7] hover:bg-[#F2EFE7] hover:text-[#14302D]"
              }`}
            >
              <span>Masuk Dashboard</span>
              <ArrowUpRight
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            className={`lg:hidden min-h-[44px] px-3.5 inline-flex items-center justify-center gap-1.5 rounded-full border text-[12px] font-semibold ${
              navOnLightPaper
                ? "border-[#14302D]/20 bg-white/85 text-[#14302D]"
                : "border-[#F2EFE7]/30 bg-[#0F2321]/75 text-[#F2EFE7]"
            }`}
          >
            {mobileMenuOpen ? (
              <>
                <X className="w-4 h-4" aria-hidden="true" />
                <span>Tutup</span>
              </>
            ) : (
              <>
                <Menu className="w-4 h-4" aria-hidden="true" />
                <span>Menu</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Backdrop & Panel */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 top-16 z-30 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
          />
          <div
            id="mobile-nav-drawer"
            className="lg:hidden fixed top-16 left-0 right-0 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto bg-[#0F2321]/95 backdrop-blur-xl border-b border-[#8CC2BA]/20 px-4 py-4 space-y-3 text-[#F2EFE7] shadow-2xl"
          >
            <nav aria-label="Menu navigasi mobile" className="grid grid-cols-2 gap-2">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-3 flex items-center rounded-xl bg-white/5 hover:bg-white/10 text-[13px] font-medium"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-4 flex items-center justify-center gap-1.5 rounded-full border border-[#8CC2BA]/35 text-[13px] font-medium text-[#8CC2BA]"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Versi Demo</span>
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] px-4 flex items-center justify-center gap-1.5 rounded-full bg-[#F2EFE7] text-[#14302D] text-[13px] font-semibold"
              >
                <span>Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </>
      )}

      <main>
        {/* ================================================================= */}
        {/* SEKSI 1: APRICODE 3-STAGE 3D PORTAL JOURNEY (01->02->03)          */}
        {/* ================================================================= */}
        <div ref={journeyRef} id="top" className="relative h-[280vh]">
          <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
            {/* Three.js Brushed Pine-Titanium Portal + Swirling Liquid-Silk Vortex + Bio-Pond */}
            <div className="absolute inset-0 z-0">
              <ApricodePortal3DScene
                scrollProgress={0}
                progressRef={portalProgressRef}
                paused={false}
                onPrewarmProgress={handlePrewarmProgress}
                className="h-full w-full"
              />
            </div>

            <HeroJourneyOverlay
              smoothJourney={smoothJourney}
              journeyStage={journeyStage}
              shouldReduceMotion={shouldReduceMotion}
              landingContent={landingContent}
              onJumpStage={jumpJourneyStage}
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* SEKSI 2: HELLOWORLDDSGN SWISS EDITORIAL SHEET (ROUNDED TOP 28px)  */}
        {/* ================================================================= */}
        <section
          id="siklus-24-jam"
          ref={paperSheetRef}
          className="swiss-sheet swiss-sheet-rule relative z-10 px-4 sm:px-6 md:px-12 lg:px-16 py-14 sm:py-20 md:py-28 overflow-x-clip"
        >
          <div className="w-full">
            {/* Full-Width Stacked Staircase Statement with Smooth Left-to-Right Scroll Parallax */}
            <StaircaseParallaxSection
              statements={[
                landingContent?.intro_statement_1 || "Satu Core Hub pintar",
                landingContent?.intro_statement_2 || "menjaga hingga 4 kolam lele,",
                landingContent?.intro_statement_3 || "saat WiFi kolam terputus,",
                landingContent?.intro_statement_4 || "atau cuaca buruk tengah malam.",
                landingContent?.intro_statement_5 || "Tanpa mengunci alat petambak.",
              ]}
            />

            {/* Col 5-12 Architectural Detail + Stats Table */}
            <div className="mt-8 sm:mt-16 pt-6 sm:pt-10 border-t border-[#111918]/15 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
              <div className="lg:col-span-4 space-y-1.5 sm:space-y-2">
                <div className="mono-label text-[10.5px] sm:text-[11px] text-[#53625E]">PRINSIP DESAIN</div>
                <div className="text-[18px] sm:text-[20px] font-semibold text-[#111918]">
                  Anti-Bricking &amp; Otomasi Lokal
                </div>
              </div>
              <div className="lg:col-span-8 lg:pl-6 space-y-5 sm:space-y-8">
                <p className="text-[14.5px] sm:text-[17px] leading-[1.6] sm:leading-[1.65] text-[#283331] max-w-[66ch]">
                  {landingContent?.intro_desc ||
                    "Arsitektur 1 Core Hub untuk 1-4 Modul Kolam dengan Edge Fuzzy + LittleFS Store-and-Forward, Sensor Health Watchdog, dan WeningBot WhatsApp-First. Mode Offline-Plus Rp0 aktif permanen."}
                </p>

                <div className="grid grid-cols-3 gap-2 sm:gap-0 border-t border-[#111918]/15">
                  {[
                    { val: "<15 ms", label: "Inferensi Edge Fuzzy" },
                    { val: "72 Jam", label: "Log LittleFS Offline" },
                    { val: "Rp0", label: "Mode Offline-Plus" },
                  ].map((stat, idx) => (
                    <div
                      key={stat.label}
                      className={`py-3.5 sm:py-5 ${
                        idx > 0 ? "border-l border-[#111918]/15 pl-2.5 sm:pl-6" : "pr-1.5 sm:pr-6"
                      }`}
                    >
                      <div className="text-[20px] sm:text-[36px] md:text-[44px] font-bold tracking-[-0.03em] text-[#111918] tnum leading-none">
                        {stat.val}
                      </div>
                      <div className="mt-1.5 sm:mt-2 text-[10.5px] sm:text-[13px] leading-snug font-medium text-[#53625E]">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Part 2B: Apricode Showroom Plate with Bidirectional Scroll Scale & Reveal */}
            <ShowroomPlateSection
              videoRef={videoRef}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
              videoUrl={landingContent?.video_url || "/pics/kolam-timelapse.webm"}
              videoPoster={landingContent?.video_poster || "/pics/kolam-timelapse-poster.jpg"}
              activeDiurnal={activeDiurnal}
              onSelectDiurnal={setActiveDiurnal}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* SEKSI 3: FULL-PAGE SCROLL-DRIVEN 3D PARALLAX OTOMASI (#cara-kerja) */}
        {/* ================================================================= */}
        {shouldReduceMotion ? (
          <section
            id="cara-kerja"
            ref={pipelineRef}
            className="relative w-full bg-[#072926] text-white py-20 px-6 md:px-12 lg:px-16"
          >
            <div className="w-full space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/15 pb-6">
                <div>
                  <h2 className="text-[clamp(32px,4.5vw,64px)] leading-[0.98] tracking-[-0.04em] font-bold uppercase text-white">
                    Lima tahap otomasi
                  </h2>
                </div>
                <div className="mono-label text-[12px] text-[#A9F2E8]">
                  TAHAP 01 / 05 — 05 / 05
                </div>
              </div>

              <div className="space-y-6">
                {PIPELINE_STEPS.map((st) => (
                  <article
                    key={st.num}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-2xl bg-[#051B18]/80 border border-white/15 p-5 md:p-8"
                  >
                    <div className="lg:col-span-5 relative overflow-hidden rounded-xl aspect-[16/10] bg-[#0B2320]">
                      <img
                        src={st.img}
                        alt={st.title}
                        width={800}
                        height={500}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover object-center"
                      />
                    </div>
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex items-baseline gap-4">
                        <span className="text-[48px] font-bold leading-none tracking-[-0.04em] tnum text-white">
                          {st.num}
                        </span>
                        <span className="mono-label text-[12px] text-[#A9F2E8]">
                          TAHAP {st.verb}
                        </span>
                      </div>
                      <h3 className="text-[24px] md:text-[32px] font-semibold text-white">
                        {st.title}
                      </h3>
                      <p className="text-[15px] md:text-[16px] leading-[1.65] text-white/85 max-w-[60ch]">
                        {st.detail}
                      </p>
                      <div className="pt-3 border-t border-white/15 mono-label text-[11px] text-[#A9F2E8]">
                        {st.spec}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section
            id="cara-kerja"
            ref={pipelineRef}
            className="relative w-full h-[450vh] bg-[#072926] text-white"
          >
            <PipelineScrollStage smoothPipeline={smoothPipeline} />
          </section>
        )}

        {/* ================================================================= */}
        {/* SEKSI 4: APRICODE DARK PRACTICE & 3D HARDWARE STAGE (#arsitektur-3d) */}
        {/* ================================================================= */}
        <section
          id="arsitektur-3d"
          ref={archRef}
          className="relative bg-[#111918] text-[#F3F1EC] lg:min-h-[240vh] scroll-mt-16 md:scroll-mt-20"
        >
          <div className="lg:sticky lg:top-0 lg:min-h-[100svh] flex flex-col justify-center py-14 md:py-20 lg:py-24 px-4 sm:px-6 md:px-12 lg:px-16 overflow-x-clip">
            <div className="w-full">
              <div className="mb-6 sm:mb-8 lg:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <h2 className="text-[clamp(32px,7.5vw,96px)] leading-[0.98] tracking-[-0.045em] font-semibold text-[#F3F1EC]">
                  <span
                    aria-label="Fungsional."
                    className="inline-block overflow-hidden align-bottom whitespace-nowrap pb-1"
                  >
                    {Array.from("Fungsional.").map((char, idx) => (
                      <PracticeGlyph
                        key={idx}
                        char={char}
                        index={idx}
                        progress={smoothArchEntry}
                        shouldReduceMotion={Boolean(shouldReduceMotion)}
                      />
                    ))}
                  </span>
                  <br />
                  <span className="inline-block overflow-hidden align-bottom pb-1">
                    <motion.span
                      style={
                        shouldReduceMotion
                          ? undefined
                          : { y: archDesignY, opacity: archDesignOpacity }
                      }
                      className="practice-design inline-block text-[#8CC2BA] will-change-transform"
                    >
                      Dari desain.
                    </motion.span>
                  </span>
                </h2>
                <motion.p
                  style={
                    shouldReduceMotion
                      ? undefined
                      : { y: archAsideY, opacity: archAsideOpacity }
                  }
                  className="practice-aside text-[15px] md:text-[16px] leading-[1.6] text-[#B5C4C0] max-w-[48ch] will-change-transform"
                >
                  Empat lapisan sistem BanyuWening dari kolam hingga cloud. Gulir halaman atau klik salah satu lapisan untuk memutar dan membedah model 3D secara interaktif.
                </motion.p>
              </div>

              {(() => {
                const activeArchItem = ARCH_PHASES[activePhase] ?? ARCH_PHASES[0];
                const shortNames = ["Topologi", "Susunan PCB", "Anti-Lumpur", "Hybrid Cloud"];
                return (
                  <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch lg:items-start">
                    {/* Mobile Compact 4-Tab Pill Bar */}
                    <div
                      role="tablist"
                      aria-label="Pilih lapisan arsitektur 3D"
                      className="order-1 lg:hidden grid grid-cols-2 sm:flex sm:flex-wrap gap-2"
                    >
                      {ARCH_PHASES.map((item) => {
                        const isActive = activePhase === item.phase;
                        return (
                          <button
                            key={item.phase}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => handleSelectPhase(item.phase)}
                            className={`min-h-[44px] px-3 py-2 rounded-xl sm:rounded-full text-[12.5px] sm:text-[13px] font-medium transition-colors cursor-pointer inline-flex items-center justify-center sm:justify-start gap-1.5 ${
                              isActive
                                ? "bg-[#8CC2BA] text-[#111918] font-semibold"
                                : "bg-white/8 text-[#F3F1EC] border border-white/15 hover:bg-white/14"
                            }`}
                          >
                            <span className="mono-label text-[10px] sm:text-[11px] opacity-80">{item.num}</span>
                            <span className="truncate">{shortNames[item.phase]}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Desktop Interactive 4-Layer Selector List with Bidirectional Scrub */}
                    <div className="hidden lg:block lg:col-span-5 border-b border-white/15">
                      {ARCH_PHASES.map((item, idx) => (
                        <PracticeCapabilityRow
                          key={item.phase}
                          index={idx}
                          isActive={activePhase === item.phase}
                          item={item}
                          onSelect={() => handleSelectPhase(item.phase)}
                          progress={smoothArchEntry}
                          shouldReduceMotion={Boolean(shouldReduceMotion)}
                        />
                      ))}
                    </div>

                    {/* Single Interactive 3D Architecture Canvas */}
                    <motion.div
                      style={
                        shouldReduceMotion
                          ? undefined
                          : {
                              scale: archStageScale,
                              y: archStageY,
                              opacity: archStageOpacity,
                            }
                      }
                      className="order-2 lg:order-none lg:col-span-7 will-change-transform"
                    >
                      <Arch3DStageWrapper
                        activePhase={activePhase}
                        archScrollY={archScrollY}
                        manualPhaseTimestampRef={manualPhaseTimestampRef}
                        className="min-h-[340px] sm:min-h-[420px] lg:min-h-[520px] rounded-2xl border border-white/12"
                      />
                    </motion.div>

                    {/* Mobile Active Layer Explanation Card Right Under Canvas */}
                    <div className="order-3 lg:hidden rounded-2xl bg-white/[0.06] border border-white/12 p-4 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="mono-label text-[11px] text-[#8CC2BA]">
                          {activeArchItem.num}
                        </span>
                        <span className="text-[16px] font-semibold text-[#F3F1EC]">
                          {activeArchItem.label}
                        </span>
                      </div>
                      <p className="text-[14px] leading-[1.6] text-[#B5C4C0]">
                        {activeArchItem.summary}
                      </p>
                      <div className="pt-2 border-t border-white/12 mono-label text-[11px] text-[#8CC2BA]">
                        {activeArchItem.specs}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SEKSI 5: SWISS EDITORIAL PACKAGES (WARM PAPER #F3F1EC)            */}
        {/* ================================================================= */}
        <section
          id="paket-harga"
          className="relative bg-[#F3F1EC] text-[#111918] rounded-t-[24px] sm:rounded-t-[28px] -mt-4 z-20 px-4 sm:px-6 md:px-12 lg:px-16 py-14 sm:py-20 md:py-24 scroll-mt-16 md:scroll-mt-20 overflow-x-clip"
        >
          <ApricodeScrollSection className="w-full">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <h2 className="text-[clamp(30px,4vw,56px)] leading-[1.04] tracking-[-0.035em] font-semibold text-[#111918]">
                Skala modular sesuai kebutuhan kolam
              </h2>
              <p className="text-[14px] text-[#485653] max-w-[38ch]">
                Perangkat dibeli penuh petambak, dilindungi Mode Offline-Plus Rp0 permanen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PACKAGES_OVERVIEW.map((pkg) => (
                <div
                  key={pkg.name}
                  className="group rounded-2xl p-6 md:p-8 flex flex-col justify-between bg-white text-[#111918] border border-[#111918]/12 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-[#111918] hover:text-[#F3F1EC] hover:border-[#111918] hover:shadow-[0_24px_60px_-15px_rgba(17,25,24,0.35)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="mono-label text-[11px] text-[#136F63] transition-colors duration-300 group-hover:text-[#8CC2BA]">
                        {pkg.num} / {pkg.badge}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[26px] tracking-[-0.02em] font-semibold">
                      {pkg.name}
                    </h3>
                    <div className="text-[13px] mt-1 text-[#53625E] transition-colors duration-300 group-hover:text-[#B5C4C0]">
                      {pkg.config}
                    </div>

                    <div className="mt-6 text-[36px] font-bold tracking-[-0.03em] tnum">
                      {pkg.price}
                    </div>
                    <div className="text-[12px] mt-1 text-[#53625E] transition-colors duration-300 group-hover:text-[#8CC2BA]">
                      {pkg.saas}
                    </div>

                    <ul className="mt-6 space-y-2.5 text-[14px]">
                      {pkg.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <CheckCircle2
                            className="w-4 h-4 shrink-0 mt-0.5 text-[#136F63] transition-colors duration-300 group-hover:text-[#7FD3A0]"
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-5 border-t border-current/12">
                    <a
                      href="#simulator"
                      className="w-full min-h-[44px] rounded-full inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors duration-300 bg-[#111918] text-[#F3F1EC] group-hover:bg-[#8CC2BA] group-hover:text-[#111918] hover:bg-[#A9F2E8]"
                    >
                      <span>Simulasikan Paket</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </ApricodeScrollSection>
        </section>

        {/* ================================================================= */}
        {/* SEKSI 6: KALKULATOR PAKET & ROI PETAMBAK (#simulator)             */}
        {/* ================================================================= */}
        <SimulatorSection />

        {/* ================================================================= */}
        {/* SEKSI 7: TANYA JAWAB TEKNIS (#faq)                                */}
        {/* ================================================================= */}
        <section
          id="faq"
          className="relative bg-[#F3F1EC] text-[#111918] rounded-t-[24px] sm:rounded-t-[28px] -mt-4 z-20 px-4 sm:px-6 md:px-12 lg:px-16 py-14 sm:py-20 md:py-24 overflow-x-clip"
        >
          <ApricodeScrollSection className="w-full">
            <div className="mb-8 sm:mb-10">
              <h2 className="text-[clamp(26px,4vw,48px)] leading-[1.06] tracking-[-0.03em] font-semibold text-[#111918]">
                Pertanyaan teknis &amp; operasional
              </h2>
            </div>

            <div className="divide-y divide-[#111918]/15 border-t border-b border-[#111918]/15">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                const panelId = `faq-panel-${i}`;
                return (
                  <div key={i}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="w-full min-h-[44px] py-4 sm:py-5 text-left flex items-center justify-between gap-3 sm:gap-4 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <div className="flex items-baseline gap-3 sm:gap-4 min-w-0">
                        <span className="mono-label text-[11px] sm:text-[12px] text-[#136F63] shrink-0">
                          0{i + 1}
                        </span>
                        <span className="text-[15px] sm:text-[16px] md:text-[18px] font-semibold text-[#111918]">
                          {faq.q}
                        </span>
                      </div>
                      <span
                        className="text-[22px] sm:text-[24px] leading-none font-light text-[#111918] shrink-0"
                        aria-hidden="true"
                      >
                        {isOpen ? "-" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        id={panelId}
                        className="pb-5 sm:pb-6 pl-6 sm:pl-9 md:pl-10 pr-2 sm:pr-4 text-[14px] sm:text-[15px] leading-[1.65] text-[#33413F] max-w-[74ch]"
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ApricodeScrollSection>
        </section>
      </main>

      {/* ================================================================= */}
      {/* SEKSI 8: HELLOWORLDDSGN SWISS CONTACT & DEVELOPER FOOTER          */}
      {/* ================================================================= */}
      <footer className="relative bg-white text-[#111918] border-t border-[#111918]/15 px-4 sm:px-6 md:px-12 lg:px-16 pt-14 sm:pt-20 pb-8 sm:pb-10 overflow-x-clip">
        <ApricodeScrollSection className="w-full space-y-12 sm:space-y-16">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[13px] sm:text-[14px] text-[#485653]">
                Sistem Monitoring &amp; Otomasi Kolam Ikan BanyuWening
              </p>
              <h2 className="text-[clamp(28px,5.2vw,64px)] leading-[1.02] tracking-[-0.04em] font-semibold text-[#111918]">
                Mari bangun kolam presisi bersama.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
              <Link
                href="/demo"
                className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#136F63] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#0D534A] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{landingContent?.cta_button_text || "Buka Versi Demo"}</span>
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#111918]/25 px-5 py-2.5 text-[13px] font-semibold text-[#111918] hover:bg-[#111918] hover:text-white transition-colors"
              >
                <span>Masuk Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Left Labels & Right-Aligned Team, Contact & Institution Rows */}
          <div className="divide-y divide-[#111918]/15 border-t border-b border-[#111918]/15">
            {DEVELOPER_TEAM.map((member) => (
              <div
                key={member.name}
                className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="mono-label text-[11px] text-[#53625E]">
                  {member.num} / TIM PENGEMBANG
                </div>
                <div className="text-[18px] font-semibold text-[#111918] sm:text-right">
                  {member.name}
                </div>
              </div>
            ))}

            <div className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="mono-label text-[11px] text-[#53625E]">
                04 / EMAIL RESMI
              </div>
              <div className="text-[17px] font-semibold text-[#111918] sm:text-right">
                <ContactEmailLink
                  email={landingContent?.contact_email || "banyuwening@example.id"}
                  showIcon={true}
                  className="min-h-[44px] py-1 text-[#111918] hover:text-[#136F63] sm:justify-end"
                />
              </div>
            </div>

            <div className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="mono-label text-[11px] text-[#53625E]">
                05 / WHATSAPP
              </div>
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 text-[17px] font-semibold text-[#111918] hover:text-[#136F63] sm:justify-end"
              >
                <MessageCircle className="w-4 h-4 text-[#136F63]" aria-hidden="true" />
                <span className="tnum">{displayPhone}</span>
              </a>
            </div>

            <div className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="mono-label text-[11px] text-[#53625E]">
                06 / INSTITUSI
              </div>
              <a
                href={landingContent?.institution_url || "https://palcomtech.ac.id/"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[16px] font-medium text-[#485653] hover:text-[#136F63] sm:justify-end"
              >
                <span>
                  {landingContent?.institution_name ||
                    "Institut Teknologi dan Bisnis PalComTech"}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Interactive Pointer-Reactive SVG-Displacement Footer Wordmark */}
          <div className="pt-4">
            <HelloWorldInteractiveWordmark text={landingContent?.hero_title || "BANYUWENING"} />
          </div>

          {/* Copyright & Archive Credit */}
          <div className="pt-6 border-t border-[#111918]/12 flex flex-col md:flex-row justify-between gap-3 text-[12px] text-[#53625E]">
            <p>
              {landingContent?.copyright_text ||
                "© 2026 BanyuWening · Smart Aquaculture for a Sustainable Future."}
            </p>
            <p>
              Kredit video:{" "}
              <a
                href="https://commons.wikimedia.org/wiki/File:Time-lapse_of_pond_in_the_UK.webm"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#136F63]"
              >
                Time-lapse of pond in the UK
              </a>{" "}
              oleh TLSVideos (CC BY 3.0).
            </p>
          </div>
        </ApricodeScrollSection>
      </footer>
    </div>
  );
}
