import { useEffect, useRef, useState } from 'react';

/* =====================================================================
   BurnReveal: WebGL burn dissolve (transparent canvas, time based)
   - progressRef (0..1) ko GSAP timeline chalati hai
   - origin=[x,y] (0..1, y neeche se) : jahan se aag phailti hai (Walima mein car ki jagah)
   - jala hua hissa = image, na jala hua = transparent (neeche ka DOM scene)
   ===================================================================== */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D uB;
uniform float uProgress;
uniform float uTime;
uniform float uBand;
uniform float uAspectB;
uniform float uMaxD;
uniform vec2 uOrigin;
uniform vec2 uRes;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
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

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return v * 0.5 + 0.5;
}

vec2 cover(vec2 uv, float imgAspect) {
  float sa = uRes.x / uRes.y;
  vec2 s = sa > imgAspect ? vec2(1.0, imgAspect / sa) : vec2(sa / imgAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec3 B = texture2D(uB, cover(vUv, uAspectB)).rgb;

  if (uProgress <= 0.0005) { gl_FragColor = vec4(0.0); return; }
  if (uProgress >= 0.9995) { gl_FragColor = vec4(B, 1.0); return; }

  float sa = uRes.x / uRes.y;
  vec2 p = (vUv - uOrigin) * vec2(sa, 1.0);
  float d = length(p) / uMaxD; // 0 origin .. 1 sab se door kona
  float n = fbm(p * 2.4 + vec2(0.0, uTime * 0.05));
  float f = d * 0.60 + n * 0.40;

  float t = mix(0.10, 1.0 + uBand + 0.04, uProgress);
  float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.010;
  float edge = f - t + grain;

  float rim = 1.0 - smoothstep(0.0, 0.028, abs(edge + 0.006));
  vec2 cell = floor(gl_FragCoord.xy / 2.0);
  float glit = step(0.80, hash(cell + floor(uTime * 12.0)));
  vec3 gold = mix(vec3(0.831, 0.686, 0.216), vec3(1.0, 0.953, 0.82), hash(cell + 1.7));
  vec3 rimCol = gold * (rim * 0.6 + glit * rim * 1.6);
  float rimA = clamp(rim, 0.0, 1.0);

  if (edge >= 0.0) {
    gl_FragColor = vec4(min(rimCol, vec3(1.0)) * rimA, rimA);
    return;
  }

  float tin = -edge;
  float toBand = smoothstep(0.0, 0.035, tin);
  float toB = smoothstep(uBand * 0.55, uBand, tin);

  // ember -> koyla; char ab itna bhaari nahi (pow 0.6 -> 0.9, aur thora transparent)
  vec3 ember = vec3(1.0, 0.52, 0.14);
  vec3 charC = vec3(0.05, 0.026, 0.016);
  float k = smoothstep(0.0, uBand * 0.8, tin);
  float flick = 0.65 + 0.35 * snoise(p * 18.0 + vec2(0.0, uTime * 1.5));
  vec3 band = mix(ember * flick, charC, pow(k, 0.9));

  vec2 fc = gl_FragCoord.xy;
  vec2 g1 = floor(fc / 3.0);
  float s1 = step(0.986, hash(g1 + floor(uTime * 4.0)));
  vec2 g2 = floor(fc / 9.0);
  float h2 = hash(g2 + 7.7);
  float round2 = 1.0 - smoothstep(0.0, 0.5, length(fract(fc / 9.0) - 0.5));
  float s2 = step(0.988, h2) * round2 * (0.5 + 0.5 * sin(uTime * 3.0 + h2 * 60.0));
  vec3 dustCol = mix(vec3(0.86, 0.91, 1.0), vec3(1.0, 0.86, 0.55), step(0.5, hash(g1 + 3.3)));
  band += dustCol * (s1 * 0.85 + s2 * 2.4);

  vec3 col = mix(band, B, toB);
  col += rimCol;
  float a = max(toBand, rimA);
  gl_FragColor = vec4(min(col, vec3(1.0)) * a, a);
}
`;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

const loadImage = (name) =>
  new Promise((resolve) => {
    const png = () => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = `/images/${name}.png`;
    };
    const w = new Image();
    w.onload = () => resolve(w);
    w.onerror = png;
    w.src = `/images/${name}.webp`;
  });

export default function BurnReveal({
  name,
  progressRef,
  onStatus,
  className = '',
  origin = [0.5, 0.5],
  band = 0.13,
  maxDpr = 1.5,
  maxPixels = 2.4e6,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  const [epoch, setEpoch] = useState(0);
  const ox = origin[0];
  const oy = origin[1];

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const report = (ok) => statusRef.current && statusRef.current(ok);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      report(false);
      return undefined;
    }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      report(false);
      return undefined;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      report(false);
      return undefined;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ['uB', 'uProgress', 'uTime', 'uBand', 'uAspectB', 'uRes', 'uOrigin', 'uMaxD'].forEach((n) => {
      U[n] = gl.getUniformLocation(prog, n);
    });
    gl.uniform1i(U.uB, 0);
    gl.uniform1f(U.uBand, band);
    gl.uniform2f(U.uOrigin, ox, oy);
    gl.clearColor(0, 0, 0, 0);

    let alive = true;
    let isReady = false;
    let dirty = true;
    let lastP = -1;
    let raf = 0;
    let tex = null;
    const maxTex = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048, 2048);
    const limit = window.innerWidth < 700 ? Math.min(maxTex, 1536) : maxTex;

    loadImage(name).then((im) => {
      if (!alive) return;
      if (!im) {
        report(false);
        return;
      }
      const k = Math.min(1, limit / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.max(1, Math.round(im.naturalWidth * k));
      const h = Math.max(1, Math.round(im.naturalHeight * k));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(im, 0, 0, w, h);
      tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1f(U.uAspectB, im.naturalWidth / im.naturalHeight);
      isReady = true;
      dirty = true;
      report(true);
    });

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      let w = Math.max(1, Math.round(r.width * dpr));
      let h = Math.max(1, Math.round(r.height * dpr));
      if (w * h > maxPixels) {
        const k = Math.sqrt(maxPixels / (w * h));
        w = Math.round(w * k);
        h = Math.round(h * k);
      }
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uRes, w, h);
      // origin se sab se door kona (aspect-corrected space)
      const sa = w / h;
      const dx = Math.max(ox, 1 - ox) * sa;
      const dy = Math.max(oy, 1 - oy);
      gl.uniform1f(U.uMaxD, Math.hypot(dx, dy));
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!isReady) return;
      const p = clamp01(progressRef?.current ?? 0);
      const mid = p > 0.0005 && p < 0.9995;
      if (!dirty && p === lastP && !mid) return;
      lastP = p;
      dirty = false;
      gl.uniform1f(U.uProgress, p);
      gl.uniform1f(U.uTime, now * 0.001);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);

    const onLost = (e) => {
      e.preventDefault();
      isReady = false;
      report(false);
    };
    const onRestored = () => setEpoch((v) => v + 1);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      // GPU resources free (mode switch / replay par leak na ho)
      if (!gl.isContextLost()) {
        if (tex) gl.deleteTexture(tex);
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      }
    };
  }, [name, progressRef, band, maxDpr, maxPixels, ox, oy, epoch]);

  return (
    <div ref={wrapRef} className={`pointer-events-none ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}