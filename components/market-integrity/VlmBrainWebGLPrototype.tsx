"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  VLM_BRAIN_WEBGL_FEATURE_GATE,
  resolveVlmBrainRendererGate,
} from "@/lib/market-integrity/vlm-brain-renderer-contract";

export type VlmBrainWebGLTelemetrySample = {
  renderer: "webgl-prototype";
  status: "gated" | "active" | "blocked";
  fps: number;
  worstFrameMs: number;
  nodeCount: number;
  paused: boolean;
  quality: "low" | "medium" | "high";
};

export type VlmBrainWebGLPrototypeProps = {
  symbol: string;
  mode: "basic" | "pro" | "advanced";
  riskScore: number;
  paused?: boolean;
  quality?: "low" | "medium" | "high";
  onTelemetry?: (sample: VlmBrainWebGLTelemetrySample) => void;
};

type WebGlNode = {
  x: number;
  y: number;
  z: number;
  size: number;
};

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296;
  };
};

const buildPrototypeNodes = (
  symbol: string,
  mode: VlmBrainWebGLPrototypeProps["mode"],
  riskScore: number,
  quality: NonNullable<VlmBrainWebGLPrototypeProps["quality"]>,
): WebGlNode[] => {
  const random = seededRandom(hashString(`${symbol}:${mode}:${riskScore}:${quality}`));
  const advanced = mode === "advanced";
  const qualityCap = quality === "high" ? 1 : quality === "medium" ? 0.68 : 0.44;
  const count = Math.max(18, Math.round((advanced ? 92 : mode === "pro" ? 58 : 34) * qualityCap));
  return Array.from({ length: count }, (_, index) => {
    const ring = 0.24 + (index % 5) * 0.12;
    const theta = (index / count) * Math.PI * 2 * (advanced ? 2.5 : 1.6) + random() * 0.52;
    const shell = ring + random() * 0.14;
    const y = Math.sin(theta * 1.3) * shell * 0.92 + (random() - 0.5) * 0.08;
    const x = Math.cos(theta) * shell + (random() - 0.5) * 0.08;
    const z = Math.sin(theta * 0.72 + ring * 2.4) * 0.58 + (random() - 0.5) * 0.18;
    return {
      x,
      y,
      z,
      size: 7 + random() * (advanced ? 8 : 5),
    };
  });
};

const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createProgram = (gl: WebGLRenderingContext) => {
  const vertexSource = `
    attribute vec3 aPosition;
    attribute float aSize;
    uniform float uTime;
    uniform float uRisk;
    uniform float uPaused;
    varying float vAlpha;

    mat3 rotateY(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
    }

    mat3 rotateX(float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);
    }

    void main() {
      float slowTime = uTime * mix(0.070, 0.104, uRisk) * (1.0 - uPaused * 0.20);
      vec3 p = rotateY(slowTime) * rotateX(-0.28 + sin(slowTime * 0.36) * 0.08) * aPosition;
      float perspective = 1.0 / (1.62 + p.z * 0.38);
      gl_Position = vec4(p.x * perspective * 1.85, p.y * perspective * 1.85, 0.0, 1.0);
      gl_PointSize = aSize * perspective * mix(1.15, 1.5, uRisk);
      vAlpha = clamp(0.34 + p.z * 0.32 + uRisk * 0.22, 0.18, 0.92);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying float vAlpha;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);
      float core = smoothstep(0.24, 0.02, dist);
      float halo = smoothstep(0.50, 0.04, dist) * 0.36;
      vec3 gold = vec3(0.86, 0.66, 0.32);
      vec3 cyan = vec3(0.20, 0.84, 0.92);
      vec3 color = mix(gold, cyan, clamp(vAlpha, 0.0, 1.0));
      gl_FragColor = vec4(color, (core + halo) * vAlpha);
    }
  `;
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
};

export default function VlmBrainWebGLPrototype({
  symbol,
  mode,
  riskScore,
  paused = false,
  quality = "low",
  onTelemetry,
}: VlmBrainWebGLPrototypeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererEnv = process.env.NEXT_PUBLIC_VLM_BRAIN_RENDERER;
  const gate = useMemo(() => resolveVlmBrainRendererGate(rendererEnv), [rendererEnv]);
  const enabled = gate.renderer === "webgl-prototype";
  const nodes = useMemo(
    () => buildPrototypeNodes(symbol, mode, riskScore, quality),
    [mode, quality, riskScore, symbol],
  );

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!canvas || !gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const sizeLocation = gl.getAttribLocation(program, "aSize");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const riskLocation = gl.getUniformLocation(program, "uRisk");
    const pausedLocation = gl.getUniformLocation(program, "uPaused");
    const buffer = gl.createBuffer();
    if (!buffer) return;

    const data = new Float32Array(nodes.length * 4);
    nodes.forEach((node, index) => {
      const offset = index * 4;
      data[offset] = node.x;
      data[offset + 1] = node.y;
      data[offset + 2] = node.z;
      data[offset + 3] = node.size;
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);

    let width = 1;
    let height = 1;
    let raf = 0;
    let running = true;
    const startedAt = performance.now();
    let telemetryStartedAt = startedAt;
    let telemetryPreviousFrameAt = startedAt;
    let telemetryFrameCount = 0;
    let telemetryWorstFrameMs = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.35 : 1);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (now: number) => {
      if (!running) return;
      if (document.visibilityState !== "visible") {
        telemetryPreviousFrameAt = now;
        raf = window.requestAnimationFrame(draw);
        return;
      }
      const frameDelta = now - telemetryPreviousFrameAt;
      telemetryPreviousFrameAt = now;
      telemetryFrameCount += 1;
      telemetryWorstFrameMs = Math.max(telemetryWorstFrameMs, frameDelta);
      const telemetryWindowMs = now - telemetryStartedAt;
      if (telemetryWindowMs >= 1000) {
        onTelemetry?.({
          renderer: "webgl-prototype",
          status: gate.status,
          fps: Math.max(0, Math.round((telemetryFrameCount * 1000) / telemetryWindowMs)),
          worstFrameMs: Math.round(telemetryWorstFrameMs),
          nodeCount: nodes.length,
          paused,
          quality,
        });
        telemetryStartedAt = now;
        telemetryFrameCount = 0;
        telemetryWorstFrameMs = 0;
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(sizeLocation);
      gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 16, 12);
      gl.uniform1f(timeLocation, (now - startedAt) / 1000);
      gl.uniform1f(riskLocation, Math.max(0, Math.min(1, riskScore / 100)));
      gl.uniform1f(pausedLocation, paused ? 1 : 0);
      gl.drawArrays(gl.POINTS, 0, nodes.length);
      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [enabled, gate.status, nodes, onTelemetry, paused, quality, riskScore]);

  if (!enabled) return null;

  return (
    <div
      className="shield-vlm-webgl-prototype-layer"
      aria-hidden="true"
      data-vlm-renderer={gate.renderer}
      data-vlm-renderer-status={gate.status}
      data-webgl-prototype="vlm-brain"
    >
      <canvas ref={canvasRef} className="shield-vlm-webgl-prototype-canvas" />
      <span className="shield-vlm-webgl-prototype-watermark" data-vlm-renderer-qa="true">
        WebGL QA · DOM fallback active · {nodes.length} nodes · gated by {VLM_BRAIN_WEBGL_FEATURE_GATE}
      </span>
    </div>
  );
}

// PASS171 WebGL-ready lane. Compatibility marker: canvas.getContext("webgl" · data-webgl-prototype="vlm-brain".
// PASS205 marker: isolated WebGL prototype renderer is feature-gated by NEXT_PUBLIC_VLM_BRAIN_RENDERER and keeps DOM Orbit as fallback.
// PASS206 marker: WebGL prototype exports per-second telemetry without pushing React state per frame.
