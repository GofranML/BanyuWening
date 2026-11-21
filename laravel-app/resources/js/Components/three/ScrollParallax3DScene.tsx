import { useCallback, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

export interface Parallax3DDepthLayerProps {
  depth?: number;
  tiltRange?: number;
  className?: string;
  children: React.ReactNode;
}

export function Parallax3DDepthLayer({
  depth = 36,
  tiltRange = 5,
  className = "",
  children,
}: Parallax3DDepthLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.4,
  });

  const y = useTransform(smoothProgress, [0, 1], [depth * 0.9, -depth * 0.9]);
  const z = useTransform(
    smoothProgress,
    [0, 0.5, 1],
    [-Math.abs(depth) * 0.45, depth * 0.55, -Math.abs(depth) * 0.45]
  );
  const rotateX = useTransform(smoothProgress, [0, 0.5, 1], [tiltRange, 0, -tiltRange]);
  const scale = useTransform(smoothProgress, [0, 0.5, 1], [0.975, 1, 0.975]);

  if (shouldReduceMotion) {
    return (
      <div ref={containerRef} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ perspective: "1200px" }}
    >
      <motion.div
        style={{
          y,
          z,
          rotateX,
          scale,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export interface Parallax3DTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scrollDepth?: number;
}

export function Parallax3DTiltCard({
  children,
  className = "",
  maxTilt = 6,
  scrollDepth = 18,
}: Parallax3DTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const springConfig = { stiffness: 220, damping: 24, mass: 0.35 };
  const smoothPointerX = useSpring(pointerX, springConfig);
  const smoothPointerY = useSpring(pointerY, springConfig);

  const rotateY = useTransform(smoothPointerX, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(smoothPointerY, [-0.5, 0.5], [maxTilt, -maxTilt]);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 26,
    mass: 0.4,
  });

  const scrollY = useTransform(
    smoothScroll,
    [0, 1],
    [scrollDepth * 0.75, -scrollDepth * 0.75]
  );
  const scrollScale = useTransform(smoothScroll, [0, 0.5, 1], [0.985, 1, 0.985]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || event.pointerType === "touch") return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      pointerX.set(Math.max(-0.5, Math.min(0.5, nx)));
      pointerY.set(Math.max(-0.5, Math.min(0.5, ny)));
    },
    [pointerX, pointerY, shouldReduceMotion]
  );

  const resetPointerTilt = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  if (shouldReduceMotion) {
    return (
      <div
        ref={cardRef}
        className={`rounded-[6px] text-[#E8ECE9] ${
          className.includes("bg-") ? "" : "bg-[#16302D]"
        } ${className}`.trim()}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointerTilt}
      onPointerCancel={resetPointerTilt}
      style={{ perspective: "1200px" }}
      className="min-w-0 h-full"
    >
      <motion.div
        style={{
          y: scrollY,
          scale: scrollScale,
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`h-full rounded-[6px] text-[#E8ECE9] transition-colors duration-200 ${
          className.includes("bg-") ? "" : "bg-[#16302D] hover:bg-[#1D3A36]"
        } ${className}`.trim()}
      >
        {children}
      </motion.div>
    </div>
  );
}

export interface Pipeline3DStep {
  verb: string;
  title: string;
  detail: string;
  spec: string;
  img: string;
}

export interface ScrollDriven3DPipelineProps {
  steps: Pipeline3DStep[];
  className?: string;
}

type ProgressMotionValue = ReturnType<typeof useSpring>;

interface PipelineStep3DCardProps {
  step: Pipeline3DStep;
  index: number;
  total: number;
  isActive: boolean;
  progress: ProgressMotionValue;
}

function PipelineStep3DCard({
  step,
  index,
  total,
  progress,
}: PipelineStep3DCardProps) {
  const stepSpan = total > 1 ? 1 / (total - 1) : 1;
  const center = total > 1 ? index * stepSpan : 0.5;
  const inputRange = [
    center - stepSpan * 0.65,
    center,
    center + stepSpan * 0.65,
  ];

  const z = useTransform(progress, inputRange, [-72, 0, 28]);
  const y = useTransform(progress, inputRange, [20, 0, -20]);
  const rotateX = useTransform(progress, inputRange, [-4, 0, 4]);
  const scale = useTransform(progress, inputRange, [0.97, 1, 0.99]);

  return (
    <motion.article
      style={{
        z: total > 1 ? z : 0,
        y: total > 1 ? y : 0,
        rotateX: total > 1 ? rotateX : 0,
        scale: total > 1 ? scale : 1,
        transformStyle: "preserve-3d",
      }}
      className="w-full"
    >
      <div className="grid w-full grid-cols-1 overflow-hidden rounded-[6px] bg-[#16302D] md:grid-cols-12">
        {/* Visual evidence panel */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0F2321] md:col-span-6 md:aspect-auto md:min-h-[340px]">
          <img
            src={step.img}
            alt={step.title}
            width={800}
            height={520}
            loading="eager"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Technical narrative panel */}
        <div className="flex flex-col justify-between p-5 md:col-span-6 md:p-8">
          <div>
            <h3 className="font-display text-[24px] leading-[1.18] font-normal text-[#E8ECE9] text-balance">
              {step.title}
            </h3>
            <p className="mt-3 text-[16px] leading-[1.6] text-[#E8ECE9]">
              {step.detail}
            </p>
          </div>

          <div className="mt-6 rounded-[6px] bg-[#1D3A36] px-4 py-3">
            <p className="text-[13px] font-medium text-[#E8ECE9] tnum">
              <strong className="text-[#8CC2BA]">Tahap {step.verb}:</strong>{" "}
              {step.spec}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function ScrollDriven3DPipeline({
  steps,
  className = "",
}: ScrollDriven3DPipelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.85", "end 0.15"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 135,
    damping: 26,
    mass: 0.35,
  });

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (steps.length <= 1) return;
    const clamped = Math.max(0, Math.min(1, latest));
    const nextIndex = Math.round(clamped * (steps.length - 1));
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  });

  const jumpToStep = useCallback(
    (targetIdx: number) => {
      setActiveIndex(targetIdx);
      const track = trackRef.current;
      if (!track || steps.length <= 1 || shouldReduceMotion) return;

      const rect = track.getBoundingClientRect();
      const trackTop = window.scrollY + rect.top;
      const scrollableSpan = Math.max(1, track.offsetHeight - window.innerHeight);
      const ratio = targetIdx / (steps.length - 1);
      window.scrollTo({
        top: trackTop + scrollableSpan * ratio,
        behavior: "smooth",
      });
    },
    [shouldReduceMotion, steps.length]
  );

  if (!steps || steps.length === 0) {
    return (
      <div
        className={`rounded-[6px] bg-[#16302D] p-6 text-[13px] text-[#E8ECE9] ${className}`.trim()}
      >
        Belum ada tahapan operasional yang dikonfigurasi.
      </div>
    );
  }

  if (shouldReduceMotion) {
    return (
      <div ref={trackRef} className={`space-y-6 ${className}`.trim()}>
        {steps.map((step, idx) => (
          <article
            key={`${step.verb}-${idx}`}
            className="grid grid-cols-1 overflow-hidden rounded-[6px] bg-[#16302D] md:grid-cols-12"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0F2321] md:col-span-5 md:aspect-auto">
              <img
                src={step.img}
                alt={step.title}
                width={800}
                height={520}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-between p-5 md:col-span-7 md:p-7">
              <div>
                <h3 className="font-display text-[24px] leading-[1.18] font-normal text-[#E8ECE9] text-balance">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[16px] leading-[1.6] text-[#E8ECE9]">
                  {step.detail}
                </p>
              </div>
              <div className="mt-4 rounded-[6px] bg-[#1D3A36] px-4 py-2.5 text-[13px] font-medium text-[#E8ECE9] tnum">
                <strong className="text-[#8CC2BA]">Tahap {step.verb}:</strong>{" "}
                {step.spec}
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  const activeStep = steps[activeIndex] ?? steps[0];

  return (
    <div
      ref={trackRef}
      className={`relative ${className}`.trim()}
    >
      <div className="flex flex-col justify-center py-2">
        {/* Accessible stage selector */}
        <nav
          aria-label="Navigasi tahapan operasional BanyuWening"
          className="mb-6 flex flex-wrap items-center gap-2.5"
        >
          {steps.map((step, idx) => {
            const selected = idx === activeIndex;
            return (
              <button
                key={`${step.verb}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-current={selected ? "step" : undefined}
                className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CC2BA] ${
                  selected
                    ? "bg-[#8CC2BA] text-[#071514] shadow-[0_6px_18px_-4px_rgba(140,194,186,0.45)]"
                    : "bg-[#112724] border border-[#8CC2BA]/25 text-[#D2E2DF] hover:bg-[#193A36] hover:text-[#F1F6F5]"
                }`}
              >
                <span className="text-[11px] opacity-75 tnum">0{idx + 1}</span>
                <span>{step.verb}</span>
              </button>
            );
          })}
        </nav>

        {/* 3D Z-axis perspective stage */}
        <div
          className="relative flex w-full items-center justify-center"
          style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
        >
          <PipelineStep3DCard
            step={activeStep}
            index={activeIndex}
            total={steps.length}
            isActive={true}
            progress={smoothProgress}
          />
        </div>
      </div>
    </div>
  );
}
