"use client";

import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform float time;
void main() {
  vec2 uv = gl_FragCoord.xy / 400.0;
  float band = sin(uv.x * 18.0 + time * 3.0) * 0.15;
  float sheen = smoothstep(0.2, 0.8, uv.y + band);
  vec3 brass = vec3(0.83, 0.71, 0.51);
  vec3 ink = vec3(0.08, 0.07, 0.05);
  gl_FragColor = vec4(mix(ink, brass, sheen * 0.55), 1.0);
}
`;

function tone(phase: string) {
  const audio = new AudioContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.value = phase === "burst" ? 520 : phase === "decision" ? 220 : 140;
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.04, audio.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.2);
  window.setTimeout(() => void audio.close(), 400);
}

export function RevealFx({
  phase,
  haptics,
  mute,
  reduced,
}: {
  phase: string;
  haptics: boolean;
  mute: boolean;
  reduced: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const last = useRef<string>("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;
    const program = gl.createProgram();
    if (!program) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, "time");
    let frame = 0;
    let live = true;
    const draw = (now: number) => {
      if (!live) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(time, now / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (phase === last.current || reduced) return;
    last.current = phase;
    if (!mute && (phase === "burst" || phase === "decision")) {
      try {
        tone(phase);
      } catch {
        /* autoplay can be blocked until a gesture */
      }
    }
    if (haptics && phase === "burst" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(12);
    }
  }, [phase, haptics, mute, reduced]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={180}
      aria-hidden="true"
      className="reveal-shimmer"
      data-testid="reveal-shimmer"
    />
  );
}
