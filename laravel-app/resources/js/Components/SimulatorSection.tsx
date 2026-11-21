import { useState, useRef, memo } from "react";
import { Calculator } from "lucide-react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";

type PackageId = "entry" | "starter" | "juragan";
type SaasPlanId = "smart_guard" | "offline_plus";

interface PackageSpec {
  id: PackageId;
  name: string;
  shortLabel: string;
  composition: string;
  ponds: number;
  hwPrice: number;
  saasCyclePrice: number;
  probeCount: number;
  preventedLossMinYear: number;
  preventedLossMaxYear: number;
  paybackMonthsMin: string;
  paybackMonthsMax: string;
  hardwareDetail: string;
}

const PACKAGES: Record<PackageId, PackageSpec> = {
  entry: {
    id: "entry",
    name: "Paket Entry (1H + 1M)",
    shortLabel: "Entry 1K",
    composition: "1 Core Hub + 1 Modul Sensor Kolam",
    ponds: 1,
    hwPrice: 1650000,
    saasCyclePrice: 150000,
    probeCount: 1,
    preventedLossMinYear: 3000000,
    preventedLossMaxYear: 3500000,
    paybackMonthsMin: "6,2",
    paybackMonthsMax: "7,2",
    hardwareDetail:
      "2x ADS1115 (8-Ch ADC), Relay 4-Ch, LittleFS + RTC DS3231, kabel shielded maks 3-5 m",
  },
  starter: {
    id: "starter",
    name: "Paket Starter 2K (1H + 2M)",
    shortLabel: "Starter 2K",
    composition: "1 Core Hub + 2 Modul Sensor Kolam",
    ponds: 2,
    hwPrice: 2450000,
    saasCyclePrice: 150000,
    probeCount: 2,
    preventedLossMinYear: 6000000,
    preventedLossMaxYear: 7000000,
    paybackMonthsMin: "4,5",
    paybackMonthsMax: "5,2",
    hardwareDetail:
      "2x ADS1115 + MCP23017, Relay 4-Ch (2 aktuator/kolam), LittleFS Buffer, GX16",
  },
  juragan: {
    id: "juragan",
    name: "Paket Juragan 4K (1H + 4M + Exp)",
    shortLabel: "Juragan 4K",
    composition: "1 Core Hub + 4 Modul Sensor + Expansion Kit",
    ponds: 4,
    hwPrice: 4150000,
    saasCyclePrice: 225000,
    probeCount: 4,
    preventedLossMinYear: 12000000,
    preventedLossMaxYear: 14000000,
    paybackMonthsMin: "3,8",
    paybackMonthsMax: "4,4",
    hardwareDetail:
      "3x ADS1115 (12-Ch ADC) + MCP23017, Relay 8-Ch (aerator + pompa/kolam), Edge Watchdog",
  },
};

const PROBE_REPLACEMENT_PRICE = 195000;

function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Interactive Year-1 TCO, harvest cycle SaaS plan, and ROI calculator section.
 */
function SimulatorSectionInner() {
  const [selectedPackage, setSelectedPackage] = useState<PackageId>("starter");
  const [saasPlan, setSaasPlan] = useState<SaasPlanId>("smart_guard");

  const sectionRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.92", "end 0.12"],
  });
  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.35,
  });

  const headerY = useTransform(smoothScroll, [0, 0.28, 0.78, 1], [36, 0, 0, -24]);
  const headerOpacity = useTransform(smoothScroll, [0, 0.22, 0.82, 1], [0.15, 1, 1, 0.25]);
  const consoleY = useTransform(smoothScroll, [0.04, 0.34, 0.78, 1], [42, 0, 0, -28]);
  const consoleScale = useTransform(smoothScroll, [0.04, 0.34, 0.78, 1], [0.965, 1, 1, 0.985]);
  const consoleOpacity = useTransform(smoothScroll, [0.04, 0.28, 0.82, 1], [0.15, 1, 1, 0.25]);

  const pkg = PACKAGES[selectedPackage];
  const dp50 = Math.round(pkg.hwPrice * 0.5);
  const pelunasan50 = pkg.hwPrice - dp50;
  const saasYear1 = saasPlan === "smart_guard" ? pkg.saasCyclePrice * 4 : 0;
  const probeCostYear1 = pkg.probeCount * PROBE_REPLACEMENT_PRICE;
  const totalAllInYear1 = pkg.hwPrice + saasYear1 + probeCostYear1;

  const netBenefitMin = pkg.preventedLossMinYear - totalAllInYear1;
  const netBenefitMax = pkg.preventedLossMaxYear - totalAllInYear1;
  const roiMinPct = ((netBenefitMin / totalAllInYear1) * 100).toFixed(1).replace(".", ",");
  const roiMaxPct = ((netBenefitMax / totalAllInYear1) * 100).toFixed(1).replace(".", ",");

  const entryCostForPayback =
    saasPlan === "smart_guard" ? pkg.hwPrice + pkg.saasCyclePrice : pkg.hwPrice;
  const paybackCyclesMin = (entryCostForPayback / (pkg.preventedLossMaxYear / 4))
    .toFixed(2)
    .replace(".", ",");
  const paybackCyclesMax = (entryCostForPayback / (pkg.preventedLossMinYear / 4))
    .toFixed(2)
    .replace(".", ",");

  return (
    <section
      ref={sectionRef}
      id="simulator"
      className="min-h-[100svh] flex flex-col justify-center py-14 md:py-28 lg:py-36 px-4 sm:px-6 md:px-12 lg:px-16 bg-[#0c1c1a] text-[#E8ECE9] scroll-mt-16 md:scroll-mt-24 overflow-x-clip"
    >
      <div className="w-full">
        <motion.div
          style={shouldReduceMotion ? undefined : { y: headerY, opacity: headerOpacity }}
          className="mb-8 sm:mb-12 md:mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 will-change-transform"
        >
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] text-[#8CC2BA] mb-3 sm:mb-4">
              <Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Kalkulator Paket &amp; ROI</span>
            </div>
            <h2 className="font-display text-[clamp(28px,5.2vw,64px)] leading-[1.06] tracking-[-0.035em] font-semibold text-[#E8ECE9] mb-3 sm:mb-4 text-balance">
              Kalkulator Paket &amp; ROI Petambak
            </h2>
            <p className="text-[15px] sm:text-[17px] md:text-[19px] leading-[1.6] max-w-[62ch] text-[#B5C4C0]">
              Hitung estimasi investasi perangkat Tahun-1, pilihan skema siklus panen, dan proyeksi pengembalian modal (ROI) kolam lele Anda.
            </p>
          </div>
        </motion.div>

        <motion.div
          style={
            shouldReduceMotion
              ? undefined
              : { y: consoleY, scale: consoleScale, opacity: consoleOpacity }
          }
          className="bg-[#122926] border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-12 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55)] will-change-transform"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-stretch">
            {/* Package & Plan Selector */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 sm:space-y-6 lg:space-y-8">
              <div>
                <div className="text-[13.5px] sm:text-[16px] font-semibold text-[#E8ECE9] mb-2.5 sm:mb-4">
                  1. Pilih Paket Hardware Multi-Kolam
                </div>
                <div className="space-y-2.5 sm:space-y-4">
                  {(Object.values(PACKAGES) as PackageSpec[]).map((item) => {
                    const isSelected = selectedPackage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedPackage(item.id)}
                        className={`w-full min-h-0 sm:min-h-[124px] p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl text-left transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#1a3e3a] text-[#E8ECE9] ring-1 ring-[#8CC2BA]/45 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.45)]"
                            : "bg-[#0e2220] text-[#E8ECE9] hover:bg-[#16302D]"
                        }`}
                      >
                        <div className="w-full flex flex-row items-baseline justify-between gap-2 sm:gap-3">
                          <span className="text-[14px] sm:text-[17px] md:text-[19px] font-semibold leading-snug">
                            {item.name}
                          </span>
                          <span className="text-[15px] sm:text-[20px] md:text-[24px] font-bold tnum text-[#8CC2BA] shrink-0">
                            {formatIdr(item.hwPrice)}
                          </span>
                        </div>
                        <div className="text-[12px] sm:text-[14px] md:text-[15px] text-[#B5C4C0] mt-1 sm:mt-2">
                          {item.composition} ({item.ponds} kolam)
                        </div>
                        <div className="text-[11px] sm:text-[13px] md:text-[14px] leading-[1.45] text-[#9DB0AB] mt-0.5 sm:mt-1">
                          {item.hardwareDetail}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[13.5px] sm:text-[16px] font-semibold text-[#E8ECE9] mb-2.5 sm:mb-4">
                  2. Pilih Skema SaaS Siklus Panen (3 Bulanan)
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <button
                    type="button"
                    aria-pressed={saasPlan === "smart_guard"}
                    onClick={() => setSaasPlan("smart_guard")}
                    className={`min-h-0 sm:min-h-[144px] p-3 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl text-left transition-all duration-200 flex flex-col justify-between ${
                      saasPlan === "smart_guard"
                        ? "bg-[#1a3e3a] text-[#E8ECE9] ring-1 ring-[#8CC2BA]/45 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.45)]"
                        : "bg-[#0e2220] text-[#E8ECE9] hover:bg-[#16302D]"
                    }`}
                  >
                    <div>
                      <div className="text-[13.5px] sm:text-[17px] font-semibold">Smart Guard</div>
                      <div className="text-[14px] sm:text-[20px] text-[#8CC2BA] font-bold tnum mt-0.5 sm:mt-1">
                        {formatIdr(pkg.saasCyclePrice)} / siklus
                      </div>
                    </div>
                    <div className="text-[11px] sm:text-[14px] leading-[1.4] text-[#9DB0AB] mt-1.5 sm:mt-3">
                      RF 1-3 jam, WA AI, auto-backfill, OTA
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-pressed={saasPlan === "offline_plus"}
                    onClick={() => setSaasPlan("offline_plus")}
                    className={`min-h-0 sm:min-h-[144px] p-3 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl text-left transition-all duration-200 flex flex-col justify-between ${
                      saasPlan === "offline_plus"
                        ? "bg-[#1a3e3a] text-[#E8ECE9] ring-1 ring-[#8CC2BA]/45 shadow-[0_14px_34px_-12px_rgba(0,0,0,0.45)]"
                        : "bg-[#0e2220] text-[#E8ECE9] hover:bg-[#16302D]"
                    }`}
                  >
                    <div>
                      <div className="text-[13.5px] sm:text-[17px] font-semibold">Offline-Plus</div>
                      <div className="text-[14px] sm:text-[20px] text-[#7FD3A0] font-bold tnum mt-0.5 sm:mt-1">
                        Rp0 permanen
                      </div>
                    </div>
                    <div className="text-[11px] sm:text-[14px] leading-[1.4] text-[#9DB0AB] mt-1.5 sm:mt-3">
                      Anti-Bricking: Edge Fuzzy &amp; LCD tetap aktif
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Output Financial Breakdown */}
            <div
              data-ui="simulator-roi-summary"
              className="lg:col-span-7 bg-[#0b1b19] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-7 lg:p-10 flex flex-col justify-between space-y-4 sm:space-y-6 lg:space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4">
                <div>
                  <div className="text-[16px] sm:text-[20px] md:text-[24px] font-semibold text-[#E8ECE9]">
                    Rincian Ekonomi Petambak Tahun-1 ({pkg.shortLabel})
                  </div>
                  <p className="text-[12px] sm:text-[14px] md:text-[15px] text-[#9DB0AB] mt-0.5 sm:mt-1">
                    Sudah memasukkan biaya ganti probe kaca pH consumable per 6 bulan
                  </p>
                </div>
                <span className="px-2.5 py-1 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-[13px] font-semibold bg-[#16302D] text-[#8CC2BA] shrink-0 self-start">
                  Skema PO: DP 50% + Lunas 50%
                </span>
              </div>

              {/* Cost Breakdown Rows */}
              <div className="space-y-3 sm:space-y-4">
                <div className="divide-y divide-white/10 border-t border-b border-white/10 text-[12.5px] sm:text-[15px] md:text-[16px]">
                  <div className="py-2.5 sm:py-4 flex flex-row items-baseline justify-between gap-3">
                    <span className="text-[#B5C4C0]">
                      Hardware {pkg.shortLabel} (DP 50% {formatIdr(dp50)} + Pelunasan{" "}
                      {formatIdr(pelunasan50)})
                    </span>
                    <span className="font-semibold tnum text-[#E8ECE9] shrink-0">
                      {formatIdr(pkg.hwPrice)}
                    </span>
                  </div>
                  <div className="py-2.5 sm:py-4 flex flex-row items-baseline justify-between gap-3">
                    <span className="text-[#B5C4C0]">
                      {saasPlan === "smart_guard"
                        ? `SaaS Smart Guard (4 siklus x ${formatIdr(pkg.saasCyclePrice)})`
                        : "SaaS Offline-Plus (Anti-Bricking permanen)"}
                    </span>
                    <span className="font-semibold tnum text-[#E8ECE9] shrink-0">
                      {formatIdr(saasYear1)}
                    </span>
                  </div>
                  <div className="py-2.5 sm:py-4 flex flex-row items-baseline justify-between gap-3">
                    <span className="text-[#B5C4C0]">
                      Consumable Probe pH ({pkg.probeCount} probe x{" "}
                      {formatIdr(PROBE_REPLACEMENT_PRICE)} bln ke-6)
                    </span>
                    <span className="font-semibold tnum text-[#E8ECE9] shrink-0">
                      {formatIdr(probeCostYear1)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl sm:rounded-2xl bg-[#142e2b] border border-[#8CC2BA]/25 px-3.5 sm:px-6 py-3 sm:py-5 flex flex-row items-center justify-between gap-3">
                  <span className="text-[13.5px] sm:text-[16px] md:text-[18px] font-semibold text-[#E8ECE9]">
                    Total Biaya All-In Tahun-1
                  </span>
                  <span className="text-[18px] sm:text-[22px] md:text-[28px] font-bold tnum text-[#8CC2BA] shrink-0">
                    {formatIdr(totalAllInYear1)}
                  </span>
                </div>
              </div>

              {/* ROI & Payback Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-6 md:p-7 rounded-xl sm:rounded-2xl bg-[#142e2b] border border-white/8 min-h-0 sm:min-h-[148px] flex flex-col justify-between">
                  <div className="text-[16px] sm:text-[20px] md:text-[24px] font-bold tnum leading-tight text-[#E8ECE9]">
                    {formatIdr(pkg.preventedLossMinYear)} - {formatIdr(pkg.preventedLossMaxYear)}
                  </div>
                  <div className="text-[11.5px] sm:text-[13px] md:text-[14px] leading-[1.4] text-[#9DB0AB] mt-1 sm:mt-3">
                    Kerugian SR -20% dicegah/thn (4 siklus)
                  </div>
                </div>

                <div className="p-3.5 sm:p-6 md:p-7 rounded-xl sm:rounded-2xl bg-[#142e2b] border border-white/8 min-h-0 sm:min-h-[148px] flex flex-col justify-between">
                  <div className="text-[16px] sm:text-[20px] md:text-[24px] font-bold tnum leading-tight text-[#7FD3A0]">
                    {roiMinPct}% - {roiMaxPct}%
                  </div>
                  <div className="text-[11.5px] sm:text-[13px] md:text-[14px] leading-[1.4] text-[#E8ECE9] tnum mt-1 sm:mt-3">
                    Net ROI: +{formatIdr(netBenefitMin)} s.d. +{formatIdr(netBenefitMax)}
                  </div>
                </div>

                <div className="p-3.5 sm:p-6 md:p-7 rounded-xl sm:rounded-2xl bg-[#142e2b] border border-white/8 min-h-0 sm:min-h-[148px] flex flex-col justify-between">
                  <div className="text-[16px] sm:text-[20px] md:text-[24px] font-bold tnum leading-tight text-[#8CC2BA]">
                    {saasPlan === "smart_guard"
                      ? `~${pkg.paybackMonthsMin}-${pkg.paybackMonthsMax} bulan`
                      : `${paybackCyclesMin}-${paybackCyclesMax} siklus`}
                  </div>
                  <div className="text-[11.5px] sm:text-[13px] md:text-[14px] leading-[1.4] text-[#9DB0AB] mt-1 sm:mt-3">
                    Payback ({paybackCyclesMin}-{paybackCyclesMax} siklus atas biaya masuk)
                  </div>
                </div>
              </div>

              <div className="p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-[#142e2b]/80 border border-white/6 text-[11.5px] sm:text-[13px] md:text-[14px] leading-[1.55] text-[#9DB0AB]">
                Basis perhitungan: 1 kolam terpal 1.000 ekor, SR dasar 85% (panen 170 kg x Rp22.000/kg = Rp3.740.000/siklus). Garansi elektronik Core Hub dan modul kering IP65 berlaku 12 bulan; probe kaca pH adalah consumable (garansi DOA 30 hari, umur pakai 4-6 bulan di kolam budidaya).
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export const SimulatorSection = memo(SimulatorSectionInner);
