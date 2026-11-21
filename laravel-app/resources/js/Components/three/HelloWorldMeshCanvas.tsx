import { memo, useEffect, useRef } from "react";

export interface HelloWorldMeshCanvasProps {
  className?: string;
  colors?: [string, string, string, string, string];
}

const VERT = `
  attribute vec2 p;
  varying vec2 uv;
  void main() {
    uv = p * 0.5 + 0.5;
    gl_Position = vec4(p, 0.0, 1.0);
  }
`;

const FRAG = `
  precision mediump float;
  varying vec2 uv;
  uniform float t, aspect;
  uniform vec3 c[5];

  vec2 orbit(float i) {
    return vec2(
      0.5 + 0.42 * sin(t * (0.11 + i * 0.023) + i * 1.7),
      0.5 + 0.42 * cos(t * (0.09 + i * 0.019) + i * 2.3)
    );
  }

  void main() {
    vec2 q = uv;
    q += 0.06 * vec2(sin(q.y * 5.0 + t * 0.3), cos(q.x * 4.0 - t * 0.25));
    vec3 col = vec3(0.0);
    float w = 0.0;
    for (int i = 0; i < 5; i++) {
      vec2 d = (q - orbit(float(i))) * vec2(aspect, 1.0);
      float k = exp(-dot(d, d) * 3.2);
      col += c[i] * k;
      w += k;
    }
    col /= max(w, 0.001);
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

const DEFAULT_MESH_COLORS: [string, string, string, string, string] = [
  "#072926",
  "#0D4D45",
  "#136F63",
  "#0E4E5E",
  "#09373D",
];

/**
 * Live WebGL 5-point domain-warped mesh gradient ported from helloworlddsgn.com/mesh.js,
 * calibrated to BanyuWening deep aquaculture teal-emerald palette.
 */
export const HelloWorldMeshCanvas = memo(function HelloWorldMeshCanvas({
  className = "",
  colors = DEFAULT_MESH_COLORS,
}: HelloWorldMeshCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsKey = colors.join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      premultipliedAlpha: false,
    });
    if (!gl) return undefined;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return undefined;

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uT = gl.getUniformLocation(prog, "t");
    const uAspect = gl.getUniformLocation(prog, "aspect");
    const uColors = gl.getUniformLocation(prog, "c");

    const palette = colorsKey.split(",");
    const rgbFlat = new Float32Array(palette.flatMap((c) => hexToRgb(c)));
    gl.uniform3fv(uColors, rgbFlat);

    const resize = () => {
      const scale = 0.25;
      const w = Math.max(64, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(64, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uAspect, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    };

    resize();

    let visible = true;
    let rafId = 0;
    const t0 = performance.now();

    const renderFrame = (now: number) => {
      rafId = 0;
      if (!visible) return;
      gl.uniform1f(uT, reduceMotion ? 2.4 : (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduceMotion) {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible && !rafId) {
          rafId = requestAnimationFrame(renderFrame);
        } else if (!visible && rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      resize();
      if (visible && !rafId) {
        rafId = requestAnimationFrame(renderFrame);
      }
    });
    ro.observe(canvas);

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      io.disconnect();
      ro.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(prog);
    };
  }, [colorsKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none block h-full w-full ${className}`.trim()}
      style={{
        background: "#0B3B36",
      }}
    />
  );
});
