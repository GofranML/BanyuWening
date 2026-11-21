import { useEffect, useId, useRef } from "react";
import { useReducedMotion } from "motion/react";

export interface HelloWorldInteractiveWordmarkProps {
  text?: string;
  className?: string;
}

/**
 * Pointer-reactive full-width footer wordmark ported from helloworlddsgn.com/content.js.
 * Letters near the cursor stretch vertically, shift toward BanyuWening emerald-teal,
 * and ripple via per-character SVG feTurbulence displacement filters.
 */
export function HelloWorldInteractiveWordmark({
  text = "BANYUWENING",
  className = "",
}: HelloWorldInteractiveWordmarkProps) {
  const uid = useId().replace(/:/g, "");
  const shouldReduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const turbRefs = useRef<(SVGFETurbulenceElement | null)[]>([]);
  const dispRefs = useRef<(SVGFEDisplacementMapElement | null)[]>([]);

  const chars = Array.from(text);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || shouldReduceMotion) return undefined;

    const coarsePointer = window.matchMedia?.("(hover: none), (pointer: coarse)").matches;
    if (coarsePointer) return undefined;

    const k = new Array(chars.length).fill(0);
    const want = new Array(chars.length).fill(0);
    let mx = -1e4;
    let my = -1e4;
    let lx = 0;
    let ly = 0;
    let energy = 0;
    let gain = 1;
    let over = false;
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      rafId = 0;
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const rect = el.getBoundingClientRect();
      const radius = Math.max(120, rect.height * 0.95);
      energy = energy * 0.92 + Math.min(1, Math.hypot(mx - lx, my - ly) / 30) * 0.35;
      lx = mx;
      ly = my;

      let activeMotion = false;
      chars.forEach((_, idx) => {
        const span = charRefs.current[idx];
        if (!span) return;
        const cr = span.getBoundingClientRect();
        const cx = cr.left + cr.width / 2;
        const cy = cr.top + cr.height / 2;
        const dist = Math.hypot(cx - mx, (cy - my) * 0.65);

        want[idx] = over ? Math.exp(-(dist * dist) / (radius * radius)) : 0;
        const speed = want[idx] > k[idx] ? 10 : 4.5;
        k[idx] += (want[idx] - k[idx]) * Math.min(1, dt * speed);
        if (Math.abs(want[idx] - k[idx]) > 0.002 || k[idx] > 0.004) {
          activeMotion = true;
        }

        const weight = k[idx];
        const sy = 1 + weight * 0.22;
        span.style.transform = `scaleY(${sy.toFixed(3)})`;
        span.style.transformOrigin = "bottom center";
        span.style.color =
          weight > 0.25 ? `color-mix(in srgb, #136F63 ${Math.round(weight * 100)}%, #111918)` : "";

        const disp = dispRefs.current[idx];
        const turb = turbRefs.current[idx];
        if (disp && turb) {
          const scale = weight * gain * (2.5 + energy * 9.5);
          disp.setAttribute("scale", scale.toFixed(2));
          if (weight > 0.04) {
            const bfY = 0.015 + energy * 0.018;
            turb.setAttribute("baseFrequency", `0.006 ${bfY.toFixed(4)}`);
          }
        }
      });

      if (over || activeMotion) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const kick = () => {
      if (!rafId) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      mx = e.clientX;
      my = e.clientY;
      over = true;
      gain = 1;
      kick();
    };

    const onLeave = () => {
      over = false;
      gain = 0.5;
      kick();
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerenter", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [chars.length, shouldReduceMotion]);

  return (
    <div ref={rootRef} className={`relative w-full select-none ${className}`.trim()}>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0"
      >
        <defs>
          {chars.map((_, idx) => (
            <filter
              key={idx}
              id={`hw-warp-${uid}-${idx}`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feTurbulence
                ref={(el) => {
                  turbRefs.current[idx] = el;
                }}
                type="fractalNoise"
                baseFrequency="0.006 0.016"
                numOctaves={1}
                seed={idx * 7 + 3}
                result="n"
              />
              <feDisplacementMap
                ref={(el) => {
                  dispRefs.current[idx] = el;
                }}
                in="SourceGraphic"
                in2="n"
                scale={0}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>
      </svg>

      <div
        className="w-full flex items-baseline justify-between font-bold tracking-[-0.04em] text-[#111918] leading-[0.88]"
        style={{ fontSize: "clamp(2.2rem, 10.6vw, 9.6rem)" }}
      >
        {chars.map((char, idx) => (
          <span
            key={idx}
            ref={(el) => {
              charRefs.current[idx] = el;
            }}
            style={
              shouldReduceMotion
                ? undefined
                : {
                    display: "inline-block",
                    filter: `url(#hw-warp-${uid}-${idx})`,
                    willChange: "transform",
                  }
            }
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
