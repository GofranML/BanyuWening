import { useEffect, useRef } from "react";

export interface ThreeUITopoBathymetryCanvasProps {
  className?: string;
  scrollProgress?: number;
  interactive?: boolean;
  intensity?: number;
}

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Combines ThreeUI topo-field 2D Simplex contour isolines and emerald-horizon wave modulation
// calibrated strictly to the BanyuWening nocturnal pond palette (#0F2321, #16302D, #33706A, #8CC2BA).
const FRAGMENT_SHADER_SOURCE = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_dpr;
  uniform float u_scroll;
  uniform vec2 u_mouse;
  uniform float u_intensity;

  vec3 permute(vec3 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
  }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
      -0.577350269189626,
      0.024390243902439
    );
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0)) +
      i.x + vec3(0.0, i1.x, 1.0)
    );
    vec3 m = max(
      0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)),
      0.0
    );
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float hash1D(float n) {
    return fract(sin(n) * 10000.0);
  }

  float noise1D(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash1D(i), hash1D(i + 1.0), u);
  }

  void main() {
    vec2 st = gl_FragCoord.xy / max(u_resolution.xy, vec2(1.0));
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);

    // Subtle scroll-driven camera pitch and perspective depth warp
    float scrollShift = clamp(u_scroll, 0.0, 1.0);
    float perspectiveDepth = mix(1.0, 1.38, (1.0 - st.y) * (0.35 + scrollShift * 0.45));
    vec2 topoCoord = vec2((st.x - 0.5) * aspect * perspectiveDepth, (st.y - 0.5) * perspectiveDepth);

    // Pointer influence creates a calm local bathymetric ripple
    vec2 mouseCentered = vec2((u_mouse.x - 0.5) * aspect, u_mouse.y - 0.5);
    float mouseDist = length(topoCoord - mouseCentered);
    float pointerFocus = exp(-mouseDist * 3.2);
    vec2 pointerDrift = (topoCoord - mouseCentered) * pointerFocus * 0.14;

    // Multi-octave bathymetry contour field (ThreeUI topo-field adaptation)
    float noiseScale = 1.45 + scrollShift * 0.35;
    vec2 noisePos = (topoCoord - pointerDrift) * noiseScale +
      vec2(u_time * 0.012 + scrollShift * 0.28, u_time * 0.02 - scrollShift * 0.42);
    float nPrimary = snoise(noisePos) * 0.5 + 0.5;
    float nDetail = snoise(noisePos * 2.15 + vec2(3.7, -1.9)) * 0.5 + 0.5;
    float bathymetry = mix(nPrimary, nDetail, 0.24) + pointerFocus * 0.09;

    float numBands = 11.0;
    float bandVal = bathymetry * numBands + scrollShift * 2.2;
    float triangleWave = abs(fract(bandVal) - 0.5) * 2.0;

    // Anti-aliased crisp contour isolines scaled for DPR clarity
    float lineWidth = clamp(0.022 * max(u_dpr, 1.0), 0.018, 0.045);
    float majorContour = smoothstep(lineWidth, 0.0, triangleWave);
    float minorWave = abs(fract(bandVal * 2.0) - 0.5) * 2.0;
    float minorContour = smoothstep(lineWidth * 1.15, 0.0, minorWave) * 0.42;

    // Horizon pond wave sweep (ThreeUI emerald-horizon adaptation)
    float wave1 = sin(st.x * 3.0 + u_time * 0.42 + scrollShift * 1.8) * 0.085;
    float wave2 = sin(st.x * 5.0 - u_time * 0.26 + scrollShift * 1.1) * 0.042;
    float combinedWave = wave1 + wave2;
    float horizonY = st.y - (0.08 + scrollShift * 0.16);
    float horizonIntensity = smoothstep(0.52, -0.08, horizonY + combinedWave);
    float variation = noise1D(st.x * 2.4 + u_time * 0.08 + scrollShift) * 0.45 + 0.55;
    horizonIntensity *= variation;

    // BanyuWening exact color tokens
    vec3 colMalamKolam = vec3(0.0588, 0.1373, 0.1294); // #0F2321
    vec3 colSurface = vec3(0.0863, 0.1882, 0.1765);    // #16302D
    vec3 colBanyu = vec3(0.2000, 0.4392, 0.4157);      // #33706A
    vec3 colEmbun = vec3(0.5490, 0.7608, 0.7294);      // #8CC2BA

    float depthShade = smoothstep(0.2, 0.85, bathymetry);
    vec3 color = mix(colMalamKolam, colSurface, depthShade * 0.55);

    // Horizon depth wash
    vec3 waveTint = mix(colBanyu, colEmbun, clamp(st.x * 0.45 + 0.2 + pointerFocus * 0.25, 0.0, 1.0));
    color += waveTint * pow(max(horizonIntensity, 0.0001), 1.5) * 0.22 * u_intensity;

    // Bathymetry contour line contribution
    vec3 contourColor = mix(colBanyu, colEmbun, clamp(0.32 + pointerFocus * 0.68 + horizonIntensity * 0.35, 0.0, 1.0));
    float contourAlpha = (majorContour * 0.38 + minorContour * 0.16) * (0.75 + pointerFocus * 0.45) * u_intensity;
    color = mix(color, contourColor, clamp(contourAlpha, 0.0, 0.68));

    // Restrained vignette anchoring edges to Malam Kolam #0F2321
    float vignette = smoothstep(1.28, 0.28, length(st - vec2(0.5, 0.45)));
    color = mix(colMalamKolam, color, mix(0.62, 1.0, vignette));

    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ThreeUITopoBathymetryCanvas({
  className = "",
  scrollProgress,
  interactive = true,
  intensity = 1,
}: ThreeUITopoBathymetryCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef({ scrollProgress, interactive, intensity });
  optionsRef.current = { scrollProgress, interactive, intensity };

  const renderOnceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      return undefined;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertexShader || !fragmentShader) {
      if (vertexShader) gl.deleteShader(vertexShader);
      if (fragmentShader) gl.deleteShader(fragmentShader);
      return undefined;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return undefined;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.detachShader(program, vertexShader);
      gl.detachShader(program, fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      return undefined;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      gl.detachShader(program, vertexShader);
      gl.detachShader(program, fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
      return undefined;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const dprLocation = gl.getUniformLocation(program, "u_dpr");
    const scrollLocation = gl.getUniformLocation(program, "u_scroll");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");
    const intensityLocation = gl.getUniformLocation(program, "u_intensity");

    let rafId = 0;
    let disposed = false;
    let isVisible = true;
    let contextLost = false;
    let currentDpr = 1;
    const startTime = performance.now();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = motionQuery.matches;

    let targetScroll =
      typeof optionsRef.current.scrollProgress === "number"
        ? Math.max(0, Math.min(1, optionsRef.current.scrollProgress))
        : 0;
    let currentScroll = targetScroll;

    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let currentMouseX = 0.5;
    let currentMouseY = 0.5;

    const readWindowScroll = () => {
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      return Math.max(0, Math.min(1, window.scrollY / maxScroll));
    };

    if (typeof optionsRef.current.scrollProgress !== "number") {
      targetScroll = readWindowScroll();
      currentScroll = targetScroll;
    }

    const drawFrame = (now: number) => {
      if (disposed || contextLost) return;

      const opts = optionsRef.current;
      if (typeof opts.scrollProgress === "number") {
        targetScroll = Math.max(0, Math.min(1, opts.scrollProgress));
      }

      if (prefersReducedMotion) {
        currentScroll = targetScroll;
        currentMouseX = 0.5;
        currentMouseY = 0.5;
      } else {
        currentScroll += (targetScroll - currentScroll) * 0.1;
        currentMouseX += (targetMouseX - currentMouseX) * 0.08;
        currentMouseY += (targetMouseY - currentMouseY) * 0.08;
      }

      const elapsedSeconds = prefersReducedMotion ? 0 : (now - startTime) * 0.001;
      const safeIntensity = Math.max(0, Math.min(2, opts.intensity ?? 1));

      gl.useProgram(program);
      if (resolutionLocation) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      if (timeLocation) gl.uniform1f(timeLocation, elapsedSeconds);
      if (dprLocation) gl.uniform1f(dprLocation, currentDpr);
      if (scrollLocation) gl.uniform1f(scrollLocation, currentScroll);
      if (mouseLocation) gl.uniform2f(mouseLocation, currentMouseX, currentMouseY);
      if (intensityLocation) gl.uniform1f(intensityLocation, safeIntensity);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    renderOnceRef.current = () => {
      drawFrame(performance.now());
    };

    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const tick = (now: number) => {
      rafId = 0;
      if (disposed || !isVisible || document.hidden || prefersReducedMotion || contextLost) {
        return;
      }
      drawFrame(now);
      rafId = requestAnimationFrame(tick);
    };

    const scheduleLoop = () => {
      if (disposed || !isVisible || document.hidden || contextLost) return;
      if (prefersReducedMotion) {
        stopLoop();
        drawFrame(performance.now());
        return;
      }
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const resizeCanvas = () => {
      if (disposed) return;
      const bounds = host.getBoundingClientRect();
      currentDpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(bounds.width * currentDpr));
      const nextHeight = Math.max(1, Math.floor(bounds.height * currentDpr));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      gl.viewport(0, 0, nextWidth, nextHeight);
      drawFrame(performance.now());
    };

    let scrollScheduled = false;
    const handleScroll = () => {
      if (typeof optionsRef.current.scrollProgress === "number") return;
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        scrollScheduled = false;
        if (disposed) return;
        targetScroll = readWindowScroll();
        if (prefersReducedMotion && isVisible) {
          drawFrame(performance.now());
        }
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (optionsRef.current.interactive === false || prefersReducedMotion || !isVisible) {
        return;
      }
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1.0 - (event.clientY - rect.top) / rect.height;
      targetMouseX = Math.max(0, Math.min(1, nx));
      targetMouseY = Math.max(0, Math.min(1, ny));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        scheduleLoop();
      }
    };

    const handleMotionChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
      if (prefersReducedMotion) {
        stopLoop();
        drawFrame(performance.now());
      } else {
        scheduleLoop();
      }
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stopLoop();
    };

    const handleContextRestored = () => {
      contextLost = false;
      resizeCanvas();
      scheduleLoop();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionQuery.addEventListener("change", handleMotionChange);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    resizeCanvas();
    scheduleLoop();

    return () => {
      disposed = true;
      renderOnceRef.current = null;
      stopLoop();

      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionQuery.removeEventListener("change", handleMotionChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);

      if (!gl.isContextLost()) {
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(positionBuffer);
        gl.detachShader(program, vertexShader);
        gl.detachShader(program, fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteProgram(program);
      }
    };
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      renderOnceRef.current?.();
    }
  }, [scrollProgress, intensity]);

  const hasPositionClass = /\b(absolute|fixed|sticky|relative)\b/.test(className);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`${hasPositionClass ? "" : "relative "}pointer-events-none overflow-hidden bg-[#0F2321] ${className}`.trim()}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
