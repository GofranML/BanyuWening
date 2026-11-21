import { useCallback, useEffect, useRef, useState } from "react";

export type CoreHubPhase = 0 | 1 | 2 | 3;

export interface ThreeUICoreHub3DStageProps {
  activePhase: CoreHubPhase;
  progress: number;
  className?: string;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
}

interface MicroBubble {
  x: number;
  y: number;
  r: number;
  rMax: number;
  grow: number;
  vy: number;
  alpha: number;
}

interface SurfaceRipple {
  x: number;
  y: number;
  r0: number;
  born: number;
}

interface PhaseMeta {
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: "aman" | "waspada" | "bahaya" | "brand";
}

const PHASE_METADATA: Record<CoreHubPhase, PhaseMeta> = {
  0: {
    title: "Topologi 1 Core Hub IP65 ke 4 Kolam",
    subtitle: "4 port GX16 dan kabel shielded 3-5 m menuju modul Stilling Well PVC",
    statusLabel: "4 Pond Aktif · GX16",
    statusTone: "aman",
  },
  1: {
    title: "Arsitektur 5 Lapisan PCB Core Hub",
    subtitle: "ESP32-WROOM, ADS1115, MOSFET TDS, LittleFS + RTC DS3231, dan Relay Optocoupler",
    statusLabel: "Exploded Stack · IP65",
    statusTone: "brand",
  },
  2: {
    title: "Batimetri Lumpur & Sensor Health Watchdog",
    subtitle: "Isolasi turbidity jenuh lumut (SATURATED/FAULT) dan verifikasi DO/Amonia",
    statusLabel: "SATURATED/FAULT Terisolasi",
    statusTone: "bahaya",
  },
  3: {
    title: "Aliran Telemetri Hybrid Edge-Cloud Always-On",
    subtitle: "EMQX TLS, FastAPI, Supabase Pro, Random Forest 1-3 jam, HITL Gate, WeningBot",
    statusLabel: "Hybrid Edge-Cloud · HITL",
    statusTone: "waspada",
  },
};

const BANYU_COLORS = {
  bg: "#0F2321",
  surface: "#16302D",
  surface2: "#1D3A36",
  line: "#2A4743",
  ink: "#E8ECE9",
  muted: "#9DB0AB",
  embun: "#8CC2BA",
  banyu: "#33706A",
  aman: "#7FD3A0",
  waspada: "#F2C46B",
  bahaya: "#FF9C92",
} as const;

const DEFAULT_YAW = Math.PI / 4;
const DEFAULT_PITCH = Math.PI / 6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Rotates a 3D coordinate by camera yaw and pitch before applying isometric-perspective projection
// adapted from ThreeUI DiagnosticsPanel projectIso(x, y, z).
function project3D(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  unitScale: number
): ProjectedPoint {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = y * cosP - z1 * sinP;
  const z2 = y * sinP + z1 * cosP;

  const cameraDistance = 760;
  const persp = cameraDistance / Math.max(200, cameraDistance + z2);
  return {
    x: x1 * persp * unitScale,
    y: y2 * persp * unitScale,
    z: z2,
    scale: persp * unitScale,
  };
}

function drawRoundedTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accentColor: string,
  align: "left" | "right" | "center" = "left"
) {
  ctx.save();
  ctx.font = "600 11px Manrope, system-ui, sans-serif";
  const metrics = ctx.measureText(text);
  const padX = 8;
  const boxW = metrics.width + padX * 2;
  const boxH = 22;

  let drawX = x;
  if (align === "right") drawX = x - boxW;
  if (align === "center") drawX = x - boxW / 2;
  const drawY = y - boxH / 2;

  ctx.fillStyle = "rgba(15, 35, 33, 0.92)";
  ctx.strokeStyle = BANYU_COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(drawX, drawY, boxW, boxH, 4);
  } else {
    ctx.rect(drawX, drawY, boxW, boxH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.fillRect(drawX + 4, drawY + 6, 3, boxH - 12);

  ctx.fillStyle = BANYU_COLORS.ink;
  ctx.textBaseline = "middle";
  ctx.fillText(text, drawX + padX + 3, y + 0.5);
  ctx.restore();
}

function drawSolidPrism(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
  yaw: number,
  pitch: number,
  unitScale: number,
  fillTop: string,
  fillSideA: string,
  fillSideB: string,
  strokeColor: string,
  lineWidth = 1.15
) {
  const corners: Point3D[] = [
    { x: cx - hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy - hy, z: cz + hz },
    { x: cx - hx, y: cy - hy, z: cz + hz },
    { x: cx - hx, y: cy + hy, z: cz - hz },
    { x: cx + hx, y: cy + hy, z: cz - hz },
    { x: cx + hx, y: cy + hy, z: cz + hz },
    { x: cx - hx, y: cy + hy, z: cz + hz },
  ];

  const p = corners.map((pt) => project3D(pt.x, pt.y, pt.z, yaw, pitch, unitScale));

  // Faces sorted back-to-front by average Z
  const faces = [
    { idx: [0, 1, 2, 3], color: fillTop },    // Top (-y)
    { idx: [4, 5, 6, 7], color: fillSideB },  // Bottom (+y)
    { idx: [0, 1, 5, 4], color: fillSideA },  // Back (-z)
    { idx: [2, 3, 7, 6], color: fillSideA },  // Front (+z)
    { idx: [1, 2, 6, 5], color: fillSideB },  // Right (+x)
    { idx: [3, 0, 4, 7], color: fillSideB },  // Left (-x)
  ].map((face) => ({
    ...face,
    avgZ:
      (p[face.idx[0]].z + p[face.idx[1]].z + p[face.idx[2]].z + p[face.idx[3]].z) /
      4,
  }));

  faces.sort((a, b) => b.avgZ - a.avgZ);

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeColor;

  for (const face of faces) {
    ctx.beginPath();
    ctx.moveTo(p[face.idx[0]].x, p[face.idx[0]].y);
    ctx.lineTo(p[face.idx[1]].x, p[face.idx[1]].y);
    ctx.lineTo(p[face.idx[2]].x, p[face.idx[2]].y);
    ctx.lineTo(p[face.idx[3]].x, p[face.idx[3]].y);
    ctx.closePath();
    ctx.fillStyle = face.color;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function ThreeUICoreHub3DStage({
  activePhase,
  progress,
  className = "",
}: ThreeUICoreHub3DStageProps) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const propsRef = useRef({ activePhase, progress });
  propsRef.current = { activePhase, progress };

  const cameraTargetRef = useRef({ yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH });
  const cameraCurrentRef = useRef({ yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH });
  const triggerStaticRenderRef = useRef<(() => void) | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });

  const handleResetAngle = useCallback(() => {
    cameraTargetRef.current.yaw = DEFAULT_YAW;
    cameraTargetRef.current.pitch = DEFAULT_PITCH;
    if (reducedMotion) {
      cameraCurrentRef.current.yaw = DEFAULT_YAW;
      cameraCurrentRef.current.pitch = DEFAULT_PITCH;
    }
    triggerStaticRenderRef.current?.();
  }, [reducedMotion]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const stepYaw = 0.14;
      const stepPitch = 0.08;
      let handled = true;

      switch (event.key) {
        case "ArrowLeft":
          cameraTargetRef.current.yaw -= stepYaw;
          break;
        case "ArrowRight":
          cameraTargetRef.current.yaw += stepYaw;
          break;
        case "ArrowUp":
          cameraTargetRef.current.pitch = clamp(
            cameraTargetRef.current.pitch - stepPitch,
            0.14,
            1.02
          );
          break;
        case "ArrowDown":
          cameraTargetRef.current.pitch = clamp(
            cameraTargetRef.current.pitch + stepPitch,
            0.14,
            1.02
          );
          break;
        case "r":
        case "R":
        case "Home":
          handleResetAngle();
          break;
        default:
          handled = false;
      }

      if (handled) {
        event.preventDefault();
        if (reducedMotion) {
          cameraCurrentRef.current.yaw = cameraTargetRef.current.yaw;
          cameraCurrentRef.current.pitch = cameraTargetRef.current.pitch;
        }
        triggerStaticRenderRef.current?.();
      }
    },
    [handleResetAngle, reducedMotion]
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    setIsDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore synthetic events where pointer capture is unavailable
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragStateRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;

      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;

      cameraTargetRef.current.yaw += dx * 0.0075;
      cameraTargetRef.current.pitch = clamp(
        cameraTargetRef.current.pitch + dy * 0.0055,
        0.14,
        1.02
      );

      if (reducedMotion) {
        cameraCurrentRef.current.yaw = cameraTargetRef.current.yaw;
        cameraCurrentRef.current.pitch = cameraTargetRef.current.pitch;
        triggerStaticRenderRef.current?.();
      }
    },
    [reducedMotion]
  );

  const endPointerDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    if (drag.pointerId === event.pointerId) {
      drag.active = false;
      drag.pointerId = null;
      setIsDragging(false);
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Safe cleanup fallback
      }
    }
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReduced = motionQuery.matches;
    setReducedMotion(isReduced);

    let cssWidth = 640;
    let cssHeight = 420;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rafId = 0;
    let disposed = false;
    let isVisible = true;
    let simTime = 0;
    let lastFrameMs = performance.now();

    // Offscreen sprite cache for micro-bubbles adapted from ThreeUI condensationRenderer.ts
    const bubbleSprites = new Map<number, HTMLCanvasElement>();
    let bubbles: MicroBubble[] = [];
    let ripples: SurfaceRipple[] = [];

    const getBubbleSprite = (radius: number): HTMLCanvasElement => {
      const quantized = Math.max(0.5, Math.round(radius * 2) / 2);
      const cached = bubbleSprites.get(quantized);
      if (cached) return cached;

      const padding = Math.ceil(2 * dpr);
      const physRadius = quantized * dpr;
      const size = Math.max(4, Math.ceil(physRadius * 2 + padding * 2));
      const sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const sCtx = sprite.getContext("2d");

      if (sCtx) {
        const center = size / 2;
        const lit = clamp(quantized / 4.2, 0.2, 1);

        // BanyuWening Embun (#8CC2BA) droplet body
        sCtx.fillStyle = `rgba(140, 194, 186, ${0.14 + lit * 0.16})`;
        sCtx.beginPath();
        sCtx.arc(center, center, physRadius, 0, Math.PI * 2);
        sCtx.fill();

        sCtx.strokeStyle = `rgba(51, 112, 106, ${0.35 + lit * 0.28})`;
        sCtx.lineWidth = Math.max(0.75, 0.85 * dpr);
        sCtx.stroke();

        // Crisp specular highlight
        sCtx.fillStyle = `rgba(232, 236, 233, ${0.28 + lit * 0.24})`;
        sCtx.beginPath();
        sCtx.arc(
          center - physRadius * 0.3,
          center - physRadius * 0.32,
          Math.max(0.5 * dpr, physRadius * 0.22),
          0,
          Math.PI * 2
        );
        sCtx.fill();
      }

      bubbleSprites.set(quantized, sprite);
      return sprite;
    };

    const seedBubbles = () => {
      const targetCount = clamp(Math.round((cssWidth * cssHeight) / 14000), 18, 42);
      bubbles = [];
      ripples = [];
      for (let i = 0; i < targetCount; i += 1) {
        bubbles.push({
          x: (Math.random() - 0.5) * cssWidth * 0.85,
          y: (Math.random() - 0.5) * cssHeight * 0.72,
          r: 1.0 + Math.random() * 2.2,
          rMax: 2.4 + Math.random() * 1.9,
          grow: 0.002 + Math.random() * 0.003,
          vy: 0.18 + Math.random() * 0.28,
          alpha: 0.28 + Math.random() * 0.35,
        });
      }
    };

    const stepBubbles = (dtSec: number, nowSec: number) => {
      const halfW = cssWidth * 0.44;
      const topBound = -cssHeight * 0.34;
      const bottomBound = cssHeight * 0.36;

      for (let i = 0; i < bubbles.length; i += 1) {
        const b = bubbles[i];
        b.r = Math.min(b.rMax, b.r + b.grow * dtSec * 60);
        b.y -= b.vy * dtSec * 38;
        b.x += Math.sin(nowSec * 1.4 + i) * 0.12;

        if (b.y < topBound) {
          ripples.push({ x: b.x, y: topBound + 6, r0: b.r * 1.4, born: nowSec });
          b.x = (Math.random() - 0.5) * halfW * 2;
          b.y = bottomBound;
          b.r = 0.9 + Math.random() * 1.1;
        }
      }

      ripples = ripples.filter((r) => nowSec - r.born < 0.9);
    };

    const drawBackgroundGridAndBubbles = (
      unitScale: number,
      t: number,
      bubbleStrength: number
    ) => {
      // Subtle 3D perspective pond floor mesh adapted from DiagnosticsPanel bg-waves
      const cols = 12;
      const rows = 9;
      const spacing = 46;

      ctx.save();
      ctx.lineWidth = 1;

      for (let z = 0; z < rows; z += 1) {
        for (let x = 0; x < cols; x += 1) {
          const px = (x - (cols - 1) / 2) * spacing;
          const pz = (z - (rows - 1) / 2) * spacing;
          const py = 115 + Math.sin(x * 0.45 + t * 0.9) * Math.cos(z * 0.45 + t * 0.8) * 5;
          const pt = project3D(
            px,
            py,
            pz,
            cameraCurrentRef.current.yaw * 0.45,
            cameraCurrentRef.current.pitch * 0.85,
            unitScale
          );

          const depthFade = clamp(1 - (pt.z + 240) / 560, 0.12, 0.75);
          ctx.fillStyle = `rgba(140, 194, 186, ${0.22 * depthFade})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.1 * pt.scale, 0, Math.PI * 2);
          ctx.fill();

          if (x > 0) {
            const pxPrev = (x - 1 - (cols - 1) / 2) * spacing;
            const pyPrev =
              115 + Math.sin((x - 1) * 0.45 + t * 0.9) * Math.cos(z * 0.45 + t * 0.8) * 5;
            const ptPrev = project3D(
              pxPrev,
              pyPrev,
              pz,
              cameraCurrentRef.current.yaw * 0.45,
              cameraCurrentRef.current.pitch * 0.85,
              unitScale
            );
            ctx.strokeStyle = `rgba(42, 71, 67, ${0.42 * depthFade})`;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(ptPrev.x, ptPrev.y);
            ctx.stroke();
          }
        }
      }

      // Micro-bubbles from condensationRenderer.ts adapted for aeration droplets
      if (bubbleStrength > 0.05) {
        for (const b of bubbles) {
          const sprite = getBubbleSprite(b.r);
          ctx.globalAlpha = b.alpha * bubbleStrength;
          const drawSize = sprite.width / dpr;
          ctx.drawImage(
            sprite,
            b.x - drawSize / 2,
            b.y - drawSize / 2,
            drawSize,
            drawSize
          );
        }
        ctx.globalAlpha = 1;

        for (const ripple of ripples) {
          const life = (t - ripple.born) / 0.9;
          if (life < 0 || life > 1) continue;
          const radius = ripple.r0 + life * 12;
          ctx.strokeStyle = `rgba(140, 194, 186, ${(1 - life) * 0.34 * bubbleStrength})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(ripple.x, ripple.y, radius, radius * 0.34, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // PHASE 0: 1 Core Hub IP65 -> 4 GX16 Shielded Cables -> 4 Modul Sensor Kolam (Stilling Well PVC)
    const drawPhase0Topology = (
      yaw: number,
      pitch: number,
      unitScale: number,
      t: number,
      localProgress: number
    ) => {
      const spread = 96 + localProgress * 22;
      const pondDefs = [
        { id: "Kolam 1", x: -spread, z: -spread, ph: "pH 7,1", statusColor: BANYU_COLORS.aman },
        { id: "Kolam 2", x: spread, z: -spread, ph: "28,4 C", statusColor: BANYU_COLORS.aman },
        { id: "Kolam 3", x: -spread, z: spread, ph: "352 ppm", statusColor: BANYU_COLORS.aman },
        { id: "Kolam 4", x: spread, z: spread, ph: "Stilling Well", statusColor: BANYU_COLORS.embun },
      ];

      type DrawEntry = { z: number; render: () => void };
      const drawQueue: DrawEntry[] = [];

      // Shielded GX16 cable arcs drawn underneath elevated nodes
      const hubAnchor = project3D(0, -4, 0, yaw, pitch, unitScale);

      pondDefs.forEach((pond, idx) => {
        const floatY = Math.sin(t * 1.4 + idx * 1.5) * 3;
        const pWell = project3D(pond.x, 22 + floatY, pond.z, yaw, pitch, unitScale);
        const gx16Port = project3D(
          pond.x * 0.28,
          6,
          pond.z * 0.28,
          yaw,
          pitch,
          unitScale
        );

        // Shielded cable curve (maks 3-5m)
        const midX = (gx16Port.x + pWell.x) * 0.5;
        const midY = (gx16Port.y + pWell.y) * 0.5 + 26 * unitScale;

        ctx.save();
        ctx.strokeStyle = "rgba(51, 112, 106, 0.85)";
        ctx.lineWidth = 2 * unitScale;
        ctx.beginPath();
        ctx.moveTo(hubAnchor.x, hubAnchor.y);
        ctx.lineTo(gx16Port.x, gx16Port.y);
        ctx.quadraticCurveTo(midX, midY, pWell.x, pWell.y);
        ctx.stroke();

        // Inner shielded conductor glint
        ctx.strokeStyle = "rgba(140, 194, 186, 0.45)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(gx16Port.x, gx16Port.y);
        ctx.quadraticCurveTo(midX, midY, pWell.x, pWell.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Signal pulse packet from pond sensor to Core Hub
        const packetT = isReduced ? 0.52 : (t * 0.45 + idx * 0.25) % 1;
        const invT = 1 - packetT;
        const px =
          invT * invT * pWell.x + 2 * invT * packetT * midX + packetT * packetT * gx16Port.x;
        const py =
          invT * invT * pWell.y + 2 * invT * packetT * midY + packetT * packetT * gx16Port.y;

        ctx.fillStyle = BANYU_COLORS.aman;
        ctx.beginPath();
        ctx.arc(px, py, 3 * unitScale, 0, Math.PI * 2);
        ctx.fill();

        // GX16 Port connector node
        ctx.fillStyle = BANYU_COLORS.surface2;
        ctx.strokeStyle = BANYU_COLORS.embun;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(gx16Port.x, gx16Port.y, 4.2 * unitScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Queue Stilling Well PVC + Modul Sensor Kolam
        drawQueue.push({
          z: pWell.z,
          render: () => {
            // Water surface ring around PVC Stilling Well
            ctx.save();
            ctx.strokeStyle = "rgba(140, 194, 186, 0.38)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(pWell.x, pWell.y + 16 * unitScale, 20 * unitScale, 8 * unitScale, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // PVC Stilling Well vertical pipe prism
            drawSolidPrism(
              ctx,
              pond.x,
              26 + floatY,
              pond.z,
              11,
              24,
              11,
              yaw,
              pitch,
              unitScale,
              BANYU_COLORS.surface2,
              BANYU_COLORS.surface,
              BANYU_COLORS.bg,
              BANYU_COLORS.banyu,
              1.1
            );

            // Sensor cap head
            drawSolidPrism(
              ctx,
              pond.x,
              2 + floatY,
              pond.z,
              14,
              5,
              14,
              yaw,
              pitch,
              unitScale,
              BANYU_COLORS.surface2,
              BANYU_COLORS.banyu,
              BANYU_COLORS.surface,
              pond.statusColor,
              1.2
            );

            const labelPt = project3D(pond.x, -12 + floatY, pond.z, yaw, pitch, unitScale);
            drawRoundedTag(
              ctx,
              labelPt.x,
              labelPt.y - 8 * unitScale,
              `${pond.id} · ${pond.ph}`,
              pond.statusColor,
              "center"
            );
          },
        });
      });

      // Queue Center Core Hub IP65 Enclosure
      const hubDepth = project3D(0, -10, 0, yaw, pitch, unitScale).z;
      drawQueue.push({
        z: hubDepth,
        render: () => {
          const hoverY = Math.cos(t * 1.1) * 3 - 10;
          // IP65 base enclosure
          drawSolidPrism(
            ctx,
            0,
            hoverY,
            0,
            34,
            22,
            34,
            yaw,
            pitch,
            unitScale,
            BANYU_COLORS.surface2,
            BANYU_COLORS.surface,
            BANYU_COLORS.bg,
            BANYU_COLORS.embun,
            1.45
          );
          // Top IP65 sealed lid + LCD 16x2 status bezel
          drawSolidPrism(
            ctx,
            0,
            hoverY - 25,
            0,
            24,
            5,
            18,
            yaw,
            pitch,
            unitScale,
            BANYU_COLORS.banyu,
            BANYU_COLORS.surface2,
            BANYU_COLORS.surface,
            BANYU_COLORS.aman,
            1.2
          );

          const topAnchor = project3D(0, hoverY - 46, 0, yaw, pitch, unitScale);
          drawRoundedTag(
            ctx,
            topAnchor.x,
            topAnchor.y,
            "Core Hub IP65 · 4 Port GX16 (3-5 m)",
            BANYU_COLORS.embun,
            "center"
          );
        },
      });

      drawQueue.sort((a, b) => b.z - a.z);
      for (const item of drawQueue) {
        item.render();
      }
    };

    // PHASE 1: Exploded 3D PCB Stack (5 layers separating vertically along scroll)
    // Direct adaptation of ThreeUI DiagnosticsPanel canvas-layers stacked isometric planes
    const drawPhase1PCBStack = (
      yaw: number,
      pitch: number,
      unitScale: number,
      t: number,
      localProgress: number
    ) => {
      const explodeFactor = Math.max(0.32, localProgress);
      const layers = [
        {
          label: "Carrier PCB ESP32-WROOM",
          accent: BANYU_COLORS.embun,
          fill: BANYU_COLORS.surface2,
          chipText: "RF",
        },
        {
          label: "2-3x ADS1115 16-bit + MCP23017 + Level Shifter",
          accent: BANYU_COLORS.aman,
          fill: BANYU_COLORS.surface,
          chipText: "I2C",
        },
        {
          label: "MOSFET TDS + Filter EMI",
          accent: BANYU_COLORS.embun,
          fill: BANYU_COLORS.surface,
          chipText: "EMI",
        },
        {
          label: "Watchdog Hardware + RTC DS3231 + LittleFS Store-and-Forward",
          accent: BANYU_COLORS.waspada,
          fill: BANYU_COLORS.surface,
          chipText: "FS",
        },
        {
          label: "Relay 4-Ch / 8-Ch Optocoupler",
          accent: BANYU_COLORS.banyu,
          fill: BANYU_COLORS.bg,
          chipText: "AC",
        },
      ];

      const size = 64;
      const gap = 14 + explodeFactor * 30;
      const totalSpan = (layers.length - 1) * gap;

      const getLayerY = (index: number) =>
        index * gap - totalSpan / 2 + Math.sin(t * 1.2 + index * 0.45) * 2.5;

      // Render bottom-to-top or sorted by projected Y/Z depending on pitch
      const order = [4, 3, 2, 1, 0];

      for (const i of order) {
        const layer = layers[i];
        const yOff = getLayerY(i);

        const c1 = project3D(-size, yOff, -size, yaw, pitch, unitScale);
        const c2 = project3D(size, yOff, -size, yaw, pitch, unitScale);
        const c3 = project3D(size, yOff, size, yaw, pitch, unitScale);
        const c4 = project3D(-size, yOff, size, yaw, pitch, unitScale);

        // Dashed vertical bus pillars connecting to next layer
        if (i < layers.length - 1) {
          const nextY = getLayerY(i + 1);
          const n1 = project3D(-size, nextY, -size, yaw, pitch, unitScale);
          const n3 = project3D(size, nextY, size, yaw, pitch, unitScale);

          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "rgba(140, 194, 186, 0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(c1.x, c1.y);
          ctx.lineTo(n1.x, n1.y);
          ctx.moveTo(c3.x, c3.y);
          ctx.lineTo(n3.x, n3.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Layer plate
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.fillStyle = layer.fill;
        ctx.fill();
        ctx.strokeStyle = i === 0 ? BANYU_COLORS.embun : layer.accent;
        ctx.lineWidth = i === 0 ? 1.6 : 1.15;
        ctx.stroke();

        // Inner PCB trace grid adapted from DiagnosticsPanel clipped scanlines
        const m1 = project3D(-size * 0.56, yOff, -size * 0.56, yaw, pitch, unitScale);
        const m2 = project3D(size * 0.56, yOff, -size * 0.56, yaw, pitch, unitScale);
        const m3 = project3D(size * 0.56, yOff, size * 0.56, yaw, pitch, unitScale);
        const m4 = project3D(-size * 0.56, yOff, size * 0.56, yaw, pitch, unitScale);

        ctx.beginPath();
        ctx.moveTo(m1.x, m1.y);
        ctx.lineTo(m2.x, m2.y);
        ctx.lineTo(m3.x, m3.y);
        ctx.lineTo(m4.x, m4.y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(140, 194, 186, 0.35)";
        ctx.lineWidth = 0.9;
        ctx.stroke();

        for (let k = -0.4; k <= 0.4; k += 0.2) {
          const sA = project3D(-size * 0.5, yOff, size * k, yaw, pitch, unitScale);
          const sB = project3D(size * 0.5, yOff, size * k, yaw, pitch, unitScale);
          ctx.beginPath();
          ctx.moveTo(sA.x, sA.y);
          ctx.lineTo(sB.x, sB.y);
          ctx.strokeStyle = "rgba(51, 112, 106, 0.4)";
          ctx.stroke();
        }

        // Layer-specific 3D hardware block silhouette
        if (i === 0) {
          drawSolidPrism(
            ctx,
            0,
            yOff - 4,
            0,
            18,
            4,
            14,
            yaw,
            pitch,
            unitScale,
            BANYU_COLORS.surface2,
            BANYU_COLORS.banyu,
            BANYU_COLORS.bg,
            BANYU_COLORS.embun,
            1
          );
        } else if (i === 3) {
          // 2x 18650 Li-Ion pack representation
          drawSolidPrism(
            ctx,
            -18,
            yOff - 4,
            0,
            10,
            4,
            28,
            yaw,
            pitch,
            unitScale,
            BANYU_COLORS.surface2,
            BANYU_COLORS.surface,
            BANYU_COLORS.bg,
            BANYU_COLORS.waspada,
            1
          );
          drawSolidPrism(
            ctx,
            12,
            yOff - 4,
            0,
            10,
            4,
            28,
            yaw,
            pitch,
            unitScale,
            BANYU_COLORS.surface2,
            BANYU_COLORS.surface,
            BANYU_COLORS.bg,
            BANYU_COLORS.waspada,
            1
          );
        } else if (i === 4) {
          // Relay optocoupler banks
          for (let r = -1; r <= 1; r += 1) {
            drawSolidPrism(
              ctx,
              r * 22,
              yOff - 4,
              -10,
              7,
              4,
              10,
              yaw,
              pitch,
              unitScale,
              BANYU_COLORS.surface2,
              BANYU_COLORS.banyu,
              BANYU_COLORS.bg,
              BANYU_COLORS.embun,
              0.9
            );
          }
        }

        // Leader callout alternating left/right so labels remain crisp and legible
        const sideSign = i % 2 === 0 ? 1 : -1;
        const anchor = project3D(size * sideSign, yOff, 0, yaw, pitch, unitScale);
        const labelX = anchor.x + sideSign * 26 * unitScale;
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(labelX, anchor.y);
        ctx.strokeStyle = layer.accent;
        ctx.lineWidth = 1;
        ctx.stroke();

        drawRoundedTag(
          ctx,
          labelX + sideSign * 4,
          anchor.y,
          layer.label,
          layer.accent,
          sideSign > 0 ? "left" : "right"
        );

        ctx.restore();
      }
    };

    // PHASE 2: 3D Wave Mesh Batimetri Lumpur & Sensor Health Watchdog
    // Direct adaptation of ThreeUI DiagnosticsPanel canvas-flow undulating 3D mesh
    const drawPhase2WaveWatchdog = (
      yaw: number,
      pitch: number,
      unitScale: number,
      t: number,
      localProgress: number
    ) => {
      const size = 112;
      const segments = 16;
      const step = (size * 2) / segments;
      const faultZoneCenterX = 32;
      const faultZoneCenterZ = 18;
      const faultRadius = 46;

      // Height function combines healthy water wave + silt bathymetry mound + flatline rail clamping
      const sampleMesh = (x: number, z: number) => {
        const distFromCenter = Math.sqrt(x * x + z * z);
        const distToFault = Math.sqrt(
          (x - faultZoneCenterX) * (x - faultZoneCenterX) +
            (z - faultZoneCenterZ) * (z - faultZoneCenterZ)
        );

        const siltMound = Math.max(0, 32 - distFromCenter * 0.35);
        const healthyWave =
          Math.sin(x * 0.055 + t * 1.4) * Math.cos(z * 0.055 + t * 1.2) * 8;

        // Flatline / stuck-at-rail plateau representing turbidity probe clogged by lumut
        const faultBlend = clamp(1 - distToFault / faultRadius, 0, 1);
        const railHeight = -34 - localProgress * 8;
        const naturalY = -siltMound - healthyWave + 18;
        const y = naturalY * (1 - faultBlend) + railHeight * faultBlend;

        return { y, faultBlend };
      };

      type QuadCell = {
        p1: ProjectedPoint;
        p2: ProjectedPoint;
        p3: ProjectedPoint;
        p4: ProjectedPoint;
        avgZ: number;
        faultBlend: number;
        elevation: number;
      };

      const quads: QuadCell[] = [];
      for (let z = -size; z < size; z += step) {
        for (let x = -size; x < size; x += step) {
          const s1 = sampleMesh(x, z);
          const s2 = sampleMesh(x + step, z);
          const s3 = sampleMesh(x + step, z + step);
          const s4 = sampleMesh(x, z + step);

          const p1 = project3D(x, s1.y, z, yaw, pitch, unitScale);
          const p2 = project3D(x + step, s2.y, z, yaw, pitch, unitScale);
          const p3 = project3D(x + step, s3.y, z + step, yaw, pitch, unitScale);
          const p4 = project3D(x, s4.y, z + step, yaw, pitch, unitScale);

          quads.push({
            p1,
            p2,
            p3,
            p4,
            avgZ: (p1.z + p2.z + p3.z + p4.z) / 4,
            faultBlend: (s1.faultBlend + s2.faultBlend + s3.faultBlend + s4.faultBlend) / 4,
            elevation: -(s1.y + s2.y + s3.y + s4.y) / 4,
          });
        }
      }

      // Painter's algorithm sort for 3D camera rotation
      quads.sort((a, b) => b.avgZ - a.avgZ);

      ctx.save();
      ctx.lineWidth = 1;
      for (const q of quads) {
        ctx.beginPath();
        ctx.moveTo(q.p1.x, q.p1.y);
        ctx.lineTo(q.p2.x, q.p2.y);
        ctx.lineTo(q.p3.x, q.p3.y);
        ctx.lineTo(q.p4.x, q.p4.y);
        ctx.closePath();

        if (q.faultBlend > 0.55) {
          ctx.fillStyle = "rgba(255, 156, 146, 0.16)";
          ctx.strokeStyle = BANYU_COLORS.bahaya;
        } else if (q.faultBlend > 0.2) {
          ctx.fillStyle = "rgba(242, 196, 107, 0.12)";
          ctx.strokeStyle = BANYU_COLORS.waspada;
        } else {
          ctx.fillStyle = BANYU_COLORS.bg;
          const ratio = clamp(q.elevation / 36, 0, 1);
          ctx.strokeStyle = `rgba(140, 194, 186, ${0.18 + ratio * 0.48})`;
        }

        ctx.fill();
        ctx.stroke();
      }

      // Vertical Watchdog probe pin in the isolated SATURATED/FAULT zone
      const probeBase = project3D(faultZoneCenterX, -36, faultZoneCenterZ, yaw, pitch, unitScale);
      const probeTop = project3D(faultZoneCenterX, -76, faultZoneCenterZ, yaw, pitch, unitScale);

      ctx.strokeStyle = BANYU_COLORS.bahaya;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(probeBase.x, probeBase.y);
      ctx.lineTo(probeTop.x, probeTop.y);
      ctx.stroke();

      drawRoundedTag(
        ctx,
        probeTop.x,
        probeTop.y - 12 * unitScale,
        "Turbiditas Lumut · SATURATED/FAULT",
        BANYU_COLORS.bahaya,
        "center"
      );

      // Healthy sensor reference + calibration cue
      const healthyPin = project3D(-64, -18, -32, yaw, pitch, unitScale);
      const healthyTop = project3D(-64, -56, -32, yaw, pitch, unitScale);
      ctx.strokeStyle = BANYU_COLORS.aman;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(healthyPin.x, healthyPin.y);
      ctx.lineTo(healthyTop.x, healthyTop.y);
      ctx.stroke();

      drawRoundedTag(
        ctx,
        healthyTop.x,
        healthyTop.y - 10 * unitScale,
        "Kanal Sehat Aktif · Kalibrasi DO/Amonia",
        BANYU_COLORS.aman,
        "center"
      );
      ctx.restore();
    };

    // PHASE 3: Hybrid Edge-Cloud Always-On Telemetry Pipeline
    const drawPhase3HybridCloud = (
      yaw: number,
      pitch: number,
      unitScale: number,
      t: number,
      localProgress: number
    ) => {
      const stages = [
        {
          id: "edge",
          label: "Core Hub + Edge Fuzzy",
          sub: "LittleFS · Safety Clamp",
          pos: { x: -135, y: 28, z: 68 },
          labelAbove: false,
          color: BANYU_COLORS.aman,
        },
        {
          id: "broker",
          label: "EMQX TLS + FastAPI",
          sub: "Always-On + Supabase",
          pos: { x: -45, y: -18, z: -25 },
          labelAbove: true,
          color: BANYU_COLORS.embun,
        },
        {
          id: "ml",
          label: "Cloud Random Forest",
          sub: "Horizon 1-3j + HITL Gate",
          pos: { x: 48, y: 24, z: -68 },
          labelAbove: false,
          color: BANYU_COLORS.waspada,
        },
        {
          id: "bot",
          label: "WeningBot WhatsApp",
          sub: "Alert Petambak & Audit",
          pos: { x: 138, y: -14, z: 42 },
          labelAbove: true,
          color: BANYU_COLORS.aman,
        },
      ];

      const projectedStages = stages.map((st) => ({
        ...st,
        proj: project3D(st.pos.x, st.pos.y, st.pos.z, yaw, pitch, unitScale),
      }));

      // Directed curved telemetry links
      ctx.save();
      for (let i = 0; i < projectedStages.length - 1; i += 1) {
        const a = projectedStages[i];
        const b = projectedStages[i + 1];
        const midX = (a.proj.x + b.proj.x) * 0.5;
        const midY = (a.proj.y + b.proj.y) * 0.5 - 32 * unitScale;

        ctx.strokeStyle = "rgba(140, 194, 186, 0.55)";
        ctx.lineWidth = 1.6 * unitScale;
        ctx.beginPath();
        ctx.moveTo(a.proj.x, a.proj.y);
        ctx.quadraticCurveTo(midX, midY, b.proj.x, b.proj.y);
        ctx.stroke();

        // Directed stream particles (2 staggered packets per hop)
        const particleCount = 2;
        for (let p = 0; p < particleCount; p += 1) {
          const u = isReduced
            ? 0.3 + p * 0.4
            : (t * 0.55 + i * 0.22 + p * 0.5 + localProgress * 0.2) % 1;
          const inv = 1 - u;
          const px = inv * inv * a.proj.x + 2 * inv * u * midX + u * u * b.proj.x;
          const py = inv * inv * a.proj.y + 2 * inv * u * midY + u * u * b.proj.y;

          ctx.fillStyle = p === 0 ? BANYU_COLORS.embun : BANYU_COLORS.aman;
          ctx.beginPath();
          ctx.arc(px, py, 3.2 * unitScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Signed HITL feedback path back from Gate to Edge Hub
      const gateNode = projectedStages[2].proj;
      const edgeNode = projectedStages[0].proj;
      const retMidX = (gateNode.x + edgeNode.x) * 0.5;
      const retMidY = (gateNode.y + edgeNode.y) * 0.5 + 52 * unitScale;
      ctx.strokeStyle = "rgba(242, 196, 107, 0.45)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(gateNode.x, gateNode.y);
      ctx.quadraticCurveTo(retMidX, retMidY, edgeNode.x, edgeNode.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Depth-sorted 3D stage nodes
      const sorted = [...projectedStages].sort((a, b) => b.proj.z - a.proj.z);
      for (const node of sorted) {
        const hoverY = Math.sin(t * 1.2 + node.pos.x * 0.02) * 3;
        drawSolidPrism(
          ctx,
          node.pos.x,
          node.pos.y + hoverY,
          node.pos.z,
          24,
          15,
          24,
          yaw,
          pitch,
          unitScale,
          BANYU_COLORS.surface2,
          BANYU_COLORS.surface,
          BANYU_COLORS.bg,
          node.color,
          1.35
        );

        const cap = project3D(
          node.pos.x,
          node.pos.y + hoverY + (node.labelAbove ? -38 : 34),
          node.pos.z,
          yaw,
          pitch,
          unitScale
        );
        drawRoundedTag(ctx, cap.x, cap.y, node.label, node.color, "center");
        drawRoundedTag(ctx, cap.x, cap.y + 22, node.sub, BANYU_COLORS.banyu, "center");
      }
    };

    const drawFrame = (nowMs: number) => {
      if (disposed) return;

      const deltaSec = clamp((nowMs - lastFrameMs) * 0.001, 0, 0.05);
      lastFrameMs = nowMs;

      if (!isReduced) {
        simTime += deltaSec;
        cameraCurrentRef.current.yaw +=
          (cameraTargetRef.current.yaw - cameraCurrentRef.current.yaw) * 0.1;
        cameraCurrentRef.current.pitch +=
          (cameraTargetRef.current.pitch - cameraCurrentRef.current.pitch) * 0.1;
        stepBubbles(deltaSec, simTime);
      }

      const { activePhase: phase, progress: rawProgress } = propsRef.current;
      const safeProgress = clamp(rawProgress, 0, 1);

      ctx.clearRect(0, 0, cssWidth, cssHeight);
      ctx.save();
      ctx.translate(cssWidth / 2, cssHeight / 2 + 8);

      const unitScale = clamp(Math.min(cssWidth / 560, cssHeight / 380), 0.62, 1.28);
      const yaw = cameraCurrentRef.current.yaw;
      const pitch = cameraCurrentRef.current.pitch;

      const bubbleStrength = phase === 1 ? 0.25 : phase === 3 ? 0.45 : 0.9;
      drawBackgroundGridAndBubbles(unitScale, simTime, bubbleStrength);

      if (phase === 0) {
        const localT = clamp(safeProgress / 0.25, 0, 1);
        drawPhase0Topology(yaw, pitch, unitScale, simTime, localT);
      } else if (phase === 1) {
        const localT = clamp((safeProgress - 0.25) / 0.25, 0, 1);
        drawPhase1PCBStack(yaw, pitch, unitScale, simTime, localT);
      } else if (phase === 2) {
        const localT = clamp((safeProgress - 0.5) / 0.25, 0, 1);
        drawPhase2WaveWatchdog(yaw, pitch, unitScale, simTime, localT);
      } else {
        const localT = clamp((safeProgress - 0.75) / 0.25, 0, 1);
        drawPhase3HybridCloud(yaw, pitch, unitScale, simTime, localT);
      }

      ctx.restore();
    };

    triggerStaticRenderRef.current = () => {
      drawFrame(performance.now());
    };

    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const tick = (nowMs: number) => {
      rafId = 0;
      if (disposed || !isVisible || document.hidden || isReduced) {
        return;
      }
      drawFrame(nowMs);
      rafId = requestAnimationFrame(tick);
    };

    const scheduleLoop = () => {
      if (disposed || !isVisible || document.hidden) return;
      if (isReduced) {
        stopLoop();
        drawFrame(performance.now());
        return;
      }
      if (!rafId) {
        lastFrameMs = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      if (disposed) return;
      const bounds = host.getBoundingClientRect();
      cssWidth = Math.max(240, bounds.width);
      cssHeight = Math.max(240, bounds.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      bubbleSprites.clear();
      seedBubbles();
      drawFrame(performance.now());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        scheduleLoop();
      }
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      isReduced = event.matches;
      setReducedMotion(isReduced);
      if (isReduced) {
        stopLoop();
        drawFrame(performance.now());
      } else {
        scheduleLoop();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? true;
        if (isVisible) {
          scheduleLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(host);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionQuery.addEventListener("change", handleMotionChange);

    resize();
    scheduleLoop();

    return () => {
      disposed = true;
      triggerStaticRenderRef.current = null;
      stopLoop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionQuery.removeEventListener("change", handleMotionChange);
      bubbleSprites.clear();
      bubbles = [];
      ripples = [];
    };
  }, []);

  useEffect(() => {
    triggerStaticRenderRef.current?.();
  }, [activePhase, progress]);

  const meta = PHASE_METADATA[activePhase];
  const toneColorClass =
    meta.statusTone === "aman"
      ? "text-[#7FD3A0]"
      : meta.statusTone === "waspada"
        ? "text-[#F2C46B]"
        : meta.statusTone === "bahaya"
          ? "text-[#FF9C92]"
          : "text-[#8CC2BA]";

  const toneDotColor =
    meta.statusTone === "aman"
      ? "bg-[#7FD3A0]"
      : meta.statusTone === "waspada"
        ? "bg-[#F2C46B]"
        : meta.statusTone === "bahaya"
          ? "bg-[#FF9C92]"
          : "bg-[#8CC2BA]";

  return (
    <div
      role="region"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Visualisasi 3D Core Hub: ${meta.title}. Gunakan tombol panah untuk memutar sudut pandang atau R untuk mengatur ulang sudut.`}
      className={`relative flex flex-col justify-between overflow-hidden rounded-[6px] bg-[#0F2321] text-[#E8ECE9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CC2BA] ${className}`.trim()}
    >
      {/* Top status bar with functional indicator and accessible reset button */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-[#16302D] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${toneDotColor}`} aria-hidden="true" />
            <span className={`text-[13px] font-semibold ${toneColorClass}`}>
              {meta.statusLabel}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[16px] font-semibold text-[#E8ECE9]">
            {meta.title}
          </div>
          <p className="truncate text-[13px] text-[#9DB0AB]">{meta.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleResetAngle}
          aria-label="Reset sudut pandang 3D ke posisi awal"
          className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] bg-[#1D3A36] px-3.5 py-2 text-[13px] font-semibold text-[#E8ECE9] transition-colors hover:bg-[#2A4743] hover:text-[#8CC2BA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8CC2BA]"
        >
          Reset Sudut 3D
        </button>
      </div>

      {/* Interactive 3D Isometric Canvas */}
      <div ref={canvasHostRef} className="relative min-h-[320px] flex-1 sm:min-h-[380px]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          className={`block h-full w-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ width: "100%", height: "100%", touchAction: "pan-y" }}
        />
      </div>

      {/* Bottom concise telemetry footer */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 bg-[#16302D] px-4 py-2.5 text-[13px] text-[#9DB0AB]">
        <span>Seret horizontal atau tekan tombol panah untuk mengorbit kamera 3D</span>
        <span className="font-semibold text-[#8CC2BA] tnum">
          Progres gulir: {Math.round(clamp(progress, 0, 1) * 100)}%
        </span>
      </div>
    </div>
  );
}
