import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface BanyuWeningPreloaderProps {
  progress: number;
  ready: boolean;
  onExited?: () => void;
}

const WAVE_SLICES = [
  { id: "bw-pre-wave-0", y: 64, height: 9.5, baseOffset: 0, amp: 2.2, fill: "#8CC2BA", delay: 0 },
  { id: "bw-pre-wave-1", y: 77.5, height: 8, baseOffset: 2.2, amp: 2.6, fill: "#8CC2BA", delay: 0.14 },
  { id: "bw-pre-wave-2", y: 89.5, height: 6.5, baseOffset: -1.4, amp: 2.4, fill: "#8CC2BA", delay: 0.28 },
  { id: "bw-pre-wave-3", y: 100, height: 5, baseOffset: 1.6, amp: 2.1, fill: "#33706A", delay: 0.42 },
  { id: "bw-pre-wave-4", y: 109, height: 3.6, baseOffset: -0.8, amp: 1.7, fill: "#33706A", delay: 0.56 },
  { id: "bw-pre-wave-5", y: 116.6, height: 2.4, baseOffset: 0.9, amp: 1.3, fill: "#33706A", delay: 0.7 },
] as const;

const LOWER_REFLECTION_PATH =
  "M0 124H61A31 30.0 0 0 0 61 64H0ZM22 105H61A11 11.0 0 0 1 61 83H22Z";

function getStatusMessage(pct: number): string {
  if (pct < 35) return "Menyiapkan ruang 3D BanyuWening";
  if (pct < 75) return "Mengompilasi shader air & portal";
  if (pct < 98) return "Merender ekosistem kolam";
  return "Siap dijelajahi";
}

export function BanyuWeningPreloader({
  progress,
  ready,
  onExited,
}: BanyuWeningPreloaderProps) {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"active" | "exiting" | "done">("active");
  const [displayProgress, setDisplayProgress] = useState(() => Math.max(0.06, Math.min(1, progress)));

  const targetProgressRef = useRef(Math.max(0.06, Math.min(1, progress)));
  const readyRef = useRef(ready);
  const startTimeRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : 0);
  const exitedCallbackRef = useRef(onExited);

  targetProgressRef.current = ready ? 1 : Math.max(targetProgressRef.current, Math.min(0.98, progress));
  readyRef.current = ready;
  exitedCallbackRef.current = onExited;

  // Lock body scroll only while preloader is actively covering the initial load
  useEffect(() => {
    if (phase === "active") {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow === "hidden" ? "" : prevOverflow;
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [phase]);

  // Smoothly interpolate progress & respect minimum reveal floor + hard 2600ms safety ceiling
  useEffect(() => {
    if (phase !== "active") return undefined;

    let rafId = 0;
    let exitedTriggered = false;

    const triggerExit = () => {
      if (exitedTriggered) return;
      exitedTriggered = true;
      setDisplayProgress(1);
      document.body.style.overflow = "";
      setPhase("exiting");
    };

    const minFloorMs = shouldReduceMotion ? 120 : 650;
    const hardCeilingMs = shouldReduceMotion ? 450 : 2600;

    const safetyTimer = window.setTimeout(() => {
      triggerExit();
    }, hardCeilingMs);

    const step = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const target = readyRef.current ? 1 : targetProgressRef.current;

      setDisplayProgress((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.002) return target;
        return prev + diff * (shouldReduceMotion ? 0.5 : 0.16);
      });

      if (readyRef.current && elapsed >= minFloorMs) {
        triggerExit();
        return;
      }
      if (elapsed >= hardCeilingMs) {
        triggerExit();
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(safetyTimer);
    };
  }, [phase, shouldReduceMotion]);

  // Complete unmount cleanly once exit transition finishes (must not be cleared when entering "exiting")
  useEffect(() => {
    if (phase !== "exiting") return undefined;
    const unmountDelay = shouldReduceMotion ? 160 : 580;
    const timer = window.setTimeout(() => {
      setPhase("done");
      exitedCallbackRef.current?.();
    }, unmountDelay);
    return () => window.clearTimeout(timer);
  }, [phase, shouldReduceMotion]);

  if (phase === "done") return null;

  const isExiting = phase === "exiting";
  const pct = Math.round(Math.max(0, Math.min(1, displayProgress)) * 100);
  const rippleCalm = Math.max(0, 1 - Math.max(0, (pct - 85) / 15));

  return (
    <motion.div
      data-preloader-state={phase}
      aria-busy={!isExiting}
      aria-live="polite"
      initial={{ opacity: 1, y: "0%" }}
      animate={
        isExiting
          ? shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: "-4%" }
          : { opacity: 1, y: "0%" }
      }
      transition={{
        duration: shouldReduceMotion ? 0.15 : 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#0F2321] text-[#F2EFE7] select-none ${
        isExiting ? "pointer-events-none" : ""
      }`}
    >
      {/* Subtle underwater radial glow + hairline architectural frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(51, 112, 106, 0.30) 0%, rgba(140, 194, 186, 0.09) 34%, rgba(15, 35, 33, 0) 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-5 md:inset-8 border border-[#8CC2BA]/12 rounded-2xl"
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Official BanyuWening "B" + Water-Reflection Logogram */}
        <div className="relative mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="-18 -18 128 160"
            width={92}
            height={114}
            role="img"
            aria-label="Logo BanyuWening sedang memuat"
            className="overflow-visible drop-shadow-[0_12px_32px_rgba(140,194,186,0.14)]"
          >
            {/* Solid upper "B" arch in warm chalk (#F2EFE7) */}
            <motion.path
              fill="#F2EFE7"
              fillRule="evenodd"
              d="M0 0H61A31 30.0 0 0 1 61 60H0ZM22 19H61A11 11.0 0 0 0 61 41H22Z"
              initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Calm water horizon hairline at y=62 */}
            <motion.line
              x1="-10"
              y1="62"
              x2="102"
              y2="62"
              stroke="#8CC2BA"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeOpacity="0.65"
              initial={shouldReduceMotion ? { scaleX: 1, opacity: 0.65 } : { scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: isExiting ? 0.9 : 0.65 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "46px 62px" }}
            />

            {/* Lower 6 wave-sliced reflection bars rippling toward mirror stillness */}
            {WAVE_SLICES.map((slice) => {
              const drift = shouldReduceMotion ? 0 : slice.amp * rippleCalm;
              return (
                <g key={slice.id}>
                  <clipPath id={slice.id}>
                    <rect x="-8" y={slice.y} width="108" height={slice.height} />
                  </clipPath>
                  <motion.path
                    fill={slice.fill}
                    fillRule="evenodd"
                    clipPath={`url(#${slice.id})`}
                    d={LOWER_REFLECTION_PATH}
                    initial={{ x: slice.baseOffset, opacity: shouldReduceMotion ? 1 : 0.25 }}
                    animate={
                      shouldReduceMotion || isExiting
                        ? { x: slice.baseOffset, opacity: 1 }
                        : {
                            x: [
                              slice.baseOffset - drift,
                              slice.baseOffset + drift,
                              slice.baseOffset,
                            ],
                            opacity: 1,
                          }
                    }
                    transition={
                      shouldReduceMotion || isExiting
                        ? { duration: 0.3, ease: "easeOut" }
                        : {
                            x: {
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: slice.delay,
                            },
                            opacity: { duration: 0.45, delay: slice.delay * 0.4 },
                          }
                    }
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Brand wordmark */}
        <div className="text-[13px] font-medium tracking-[0.34em] uppercase text-[#F2EFE7]">
          BANYUWENING
        </div>

        {/* Status label + 2px progress rail */}
        <div className="mt-4 w-56 sm:w-64">
          <div className="flex items-center justify-between text-[11px] mono-label text-[#8CC2BA]/90 mb-2">
            <span className="truncate pr-2">{getStatusMessage(pct)}</span>
            <span className="tabular-nums text-[#F2EFE7] font-semibold">
              {String(pct).padStart(2, "0")}%
            </span>
          </div>
          <div className="h-[2px] w-full rounded-full bg-[#F2EFE7]/12 overflow-hidden">
            <div
              className="h-full w-full bg-[#8CC2BA] transition-transform duration-150 ease-out"
              style={{
                transform: `scaleX(${Math.max(0.02, Math.min(1, displayProgress)).toFixed(4)})`,
                transformOrigin: "0 50%",
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
