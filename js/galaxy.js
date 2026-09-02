/**
 * Galaxy background
 * - Desktop: WebGL (React Bits / ogl)
 * - Safari / iOS: Canvas 2D (WebGL fixed layers clip on iOS Safari)
 */

function isSafariOrIOS() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS || isSafari;
}

function setAppHeight() {
  const h = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
  return Math.round(h);
}

function pinLayer(el, width, height) {
  const vv = window.visualViewport;
  const top = vv?.offsetTop || 0;
  const left = vv?.offsetLeft || 0;
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  el.style.webkitTransform = `translate3d(${left}px, ${top}px, 0)`;
}

function createStars(count, w, h) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.2,
      a: Math.random() * 0.7 + 0.3,
      tw: Math.random() * Math.PI * 2,
      sp: 0.01 + Math.random() * 0.03,
      layer: Math.random()
    });
  }
  return stars;
}

/** Reliable starfield for Safari / iOS */
function initCanvasGalaxy(ctn) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctn.appendChild(canvas);

  let stars = [];
  let w = 0;
  let h = 0;
  let angle = 0;
  let raf = 0;

  function resize() {
    const cssH = setAppHeight();
    const cssW = Math.round(window.visualViewport?.width || window.innerWidth);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    w = cssW;
    h = cssH;
    pinLayer(ctn, w, h);

    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = createStars(Math.floor((w * h) / 900), w, h);
  }

  function draw(t) {
    raf = requestAnimationFrame(draw);
    angle += 0.00035;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const lx = s.x - cx;
      const ly = s.y - cy;
      const depth = 0.35 + s.layer * 0.65;
      const rx = cx + (lx * cos - ly * sin) * depth;
      const ry = cy + (lx * sin + ly * cos) * depth;

      s.tw += s.sp;
      const twinkle = 0.55 + Math.sin(s.tw + t * 0.001) * 0.45;
      const alpha = s.a * twinkle;

      ctx.beginPath();
      ctx.fillStyle = `rgba(230, 230, 255, ${alpha})`;
      ctx.arc(rx, ry, s.r * (0.7 + s.layer * 0.6), 0, Math.PI * 2);
      ctx.fill();

      if (s.r > 1.2) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(162, 155, 254, ${alpha * 0.35})`;
        ctx.arc(rx, ry, s.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  resize();
  raf = requestAnimationFrame(draw);

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('scroll', resize);
  // iOS sometimes reports wrong height until after first paint
  setTimeout(resize, 100);
  setTimeout(resize, 500);

  ctn.classList.add('galaxy-ready');
}

async function initWebGLGalaxy(ctn) {
  const { Renderer, Program, Mesh, Triangle } = await import('./vendor/ogl.mjs');

  const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

  const fragmentShader = `
precision highp float;
uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;
varying vec2 vUv;
#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0
float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float tri(float x) { return abs(fract(x) * 2.0 - 1.0); }
float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}
float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}
vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
      float star = Star(gv - offset - pad, flareSize);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;
      col += star * size * base;
    }
  }
  return col;
}
void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);
  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    uv += mouseNorm * 0.1 * uMouseActiveFactor;
  }
  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

  const renderer = new Renderer({ alpha: false, premultipliedAlpha: false, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 1);

  let program;
  const geometry = new Triangle(gl);

  function sync() {
    const height = setAppHeight();
    const width = Math.round(window.visualViewport?.width || window.innerWidth);
    pinLayer(ctn, width, height);
    renderer.setSize(width, height);
    gl.canvas.style.width = `${width}px`;
    gl.canvas.style.height = `${height}px`;
    if (program) {
      program.uniforms.uResolution.value[0] = gl.canvas.width;
      program.uniforms.uResolution.value[1] = gl.canvas.height;
      program.uniforms.uResolution.value[2] = gl.canvas.width / gl.canvas.height;
    }
  }

  program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new Float32Array([1, 1, 1]) },
      uFocal: { value: new Float32Array([0.5, 0.5]) },
      uRotation: { value: new Float32Array([1, 0]) },
      uStarSpeed: { value: 0.5 },
      uDensity: { value: 1.2 },
      uHueShift: { value: 140 },
      uSpeed: { value: 1 },
      uMouse: { value: new Float32Array([0.5, 0.5]) },
      uGlowIntensity: { value: 0.35 },
      uSaturation: { value: 0 },
      uMouseRepulsion: { value: false },
      uTwinkleIntensity: { value: 0.3 },
      uRotationSpeed: { value: 0.08 },
      uRepulsionStrength: { value: 2 },
      uMouseActiveFactor: { value: 0 },
      uAutoCenterRepulsion: { value: 0 },
      uTransparent: { value: false }
    }
  });

  const mesh = new Mesh(gl, { geometry, program });
  ctn.appendChild(gl.canvas);
  sync();

  function update(t) {
    requestAnimationFrame(update);
    program.uniforms.uTime.value = t * 0.001;
    program.uniforms.uStarSpeed.value = (t * 0.001 * 0.5) / 10;
    renderer.render({ scene: mesh });
  }
  requestAnimationFrame(update);

  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  window.visualViewport?.addEventListener('resize', sync);
  window.visualViewport?.addEventListener('scroll', sync);
  ctn.classList.add('galaxy-ready');
}

const galaxyEl = document.getElementById('galaxy');
if (galaxyEl) {
  setAppHeight();
  if (isSafariOrIOS()) {
    initCanvasGalaxy(galaxyEl);
  } else {
    initWebGLGalaxy(galaxyEl).catch(err => {
      console.warn('WebGL galaxy failed, falling back to canvas', err);
      initCanvasGalaxy(galaxyEl);
    });
  }
}
