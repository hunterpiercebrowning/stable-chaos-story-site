import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './attractor.css';

/**
 * Halvorsen attractor, ported from the marketing site's `main.js`.
 *   dx/dt = -a·x - 4y - 4z - y²   (and cyclic)
 *
 * `intensity` scales overall opacity: 1 on the welcome state, ~0.35 behind a
 * layer. The loop pauses when the tab is hidden and never starts under
 * `prefers-reduced-motion` (a single static frame is rendered instead).
 */
export interface AttractorProps {
  intensity?: number;
}

const WINDOW_SIZE = 6000;
const STEPS_PER_FRAME = 12;
const A = 1.6;
const DT = 0.004;
const SCALE = 1.8;

// Brand palette in linear 0–1 triplets; mirrors tokens.css (WebGL needs numbers).
const PALETTE: [number, number, number][] = [
  [0.35, 0.62, 0.44],
  [0.49, 0.75, 0.54],
  [0.83, 0.8, 0.54],
  [0.88, 0.58, 0.35],
  [0.91, 0.72, 0.6],
  [0.94, 0.93, 0.9],
  [0.61, 0.54, 0.75],
  [0.35, 0.62, 0.44],
];

function paletteAt(t: number): [number, number, number] {
  const ci = t * (PALETTE.length - 1);
  const idx = Math.min(Math.floor(ci), PALETTE.length - 2);
  const frac = ci - idx;
  const a = PALETTE[idx];
  const b = PALETTE[idx + 1];
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
}

export function Attractor({ intensity = 1 }: AttractorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x090909, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090909, 0.008);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 0, 28);

    let ax = -1.48;
    let ay = -1.51;
    let az = 2.04;

    // Estimate the attractor's centroid so it sits in frame.
    let cx = 0;
    let cy = 0;
    let cz = 0;
    {
      let tx = ax;
      let ty = ay;
      let tz = az;
      const N = 20000;
      for (let i = 0; i < N; i++) {
        const dx = -A * tx - 4 * ty - 4 * tz - ty * ty;
        const dy = -A * ty - 4 * tz - 4 * tx - tz * tz;
        const dz = -A * tz - 4 * tx - 4 * ty - tx * tx;
        tx += dx * DT;
        ty += dy * DT;
        tz += dz * DT;
        cx += tx;
        cy += ty;
        cz += tz;
      }
      cx /= N;
      cy /= N;
      cz /= N;
    }

    const ringPos = new Float32Array(WINDOW_SIZE * 3);
    let ringHead = 0;
    let ringCount = 0;

    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(WINDOW_SIZE * 3);
    const lineColors = new Float32Array(WINDOW_SIZE * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);

    const pointGeo = new THREE.BufferGeometry();
    const pointPositions = new Float32Array(WINDOW_SIZE * 3);
    const pointColors = new Float32Array(WINDOW_SIZE * 3);
    const pointAlphas = new Float32Array(WINDOW_SIZE);
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
    pointGeo.setAttribute('alpha', new THREE.BufferAttribute(pointAlphas, 1));
    pointGeo.setDrawRange(0, 0);

    const pointMat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float alpha;
        attribute vec3 color;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(2.0, 5.0 * (20.0 / -mvPos.z));
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uIntensity;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor, vAlpha * glow * uIntensity);
        }
      `,
      uniforms: { uIntensity: { value: intensityRef.current } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pointGeo, pointMat);
    scene.add(points);

    const glowGeo = new THREE.SphereGeometry(18, 32, 32);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float uIntensity;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          float pulse = 0.5 + 0.5 * sin(time * 0.8);
          vec3 col = mix(vec3(0.35, 0.62, 0.44), vec3(0.88, 0.58, 0.35), pulse);
          gl_FragColor = vec4(col, intensity * 0.1 * uIntensity);
        }
      `,
      uniforms: { time: { value: 0 }, uIntensity: { value: intensityRef.current } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowMesh);

    let time = 0;
    let raf = 0;
    let running = false;

    const step = () => {
      time += 0.008;
      const k = intensityRef.current;
      pointMat.uniforms.uIntensity.value = k;
      glowMat.uniforms.uIntensity.value = k;

      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        const dx = -A * ax - 4 * ay - 4 * az - ay * ay;
        const dy = -A * ay - 4 * az - 4 * ax - az * az;
        const dz = -A * az - 4 * ax - 4 * ay - ax * ax;
        ax += dx * DT;
        ay += dy * DT;
        az += dz * DT;

        const ri = ringHead * 3;
        ringPos[ri] = (ax - cx) * SCALE;
        ringPos[ri + 1] = (ay - cy) * SCALE;
        ringPos[ri + 2] = (az - cz) * SCALE;
        ringHead = (ringHead + 1) % WINDOW_SIZE;
        if (ringCount < WINDOW_SIZE) ringCount++;
      }

      const start = (ringHead - ringCount + WINDOW_SIZE) % WINDOW_SIZE;
      for (let i = 0; i < ringCount; i++) {
        const ri = ((start + i) % WINDOW_SIZE) * 3;
        const di = i * 3;
        linePositions[di] = ringPos[ri];
        linePositions[di + 1] = ringPos[ri + 1];
        linePositions[di + 2] = ringPos[ri + 2];
        pointPositions[di] = ringPos[ri];
        pointPositions[di + 1] = ringPos[ri + 1];
        pointPositions[di + 2] = ringPos[ri + 2];

        const t = i / ringCount;
        const c = paletteAt(t);
        lineColors[di] = c[0];
        lineColors[di + 1] = c[1];
        lineColors[di + 2] = c[2];
        pointColors[di] = c[0];
        pointColors[di + 1] = c[1];
        pointColors[di + 2] = c[2];

        const fade = Math.pow(t, 0.4);
        const wave = 0.5 + 0.5 * Math.sin(time * 3.0 - t * 20.0);
        const pulse = 0.6 + 0.4 * Math.sin(time * 1.5);
        pointAlphas[i] = fade * (0.3 + 0.7 * wave) * pulse;
      }

      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.color.needsUpdate = true;
      pointGeo.attributes.position.needsUpdate = true;
      pointGeo.attributes.color.needsUpdate = true;
      pointGeo.attributes.alpha.needsUpdate = true;
      lineGeo.setDrawRange(0, ringCount);
      pointGeo.setDrawRange(0, ringCount);

      lineMat.opacity = (0.3 + 0.25 * Math.sin(time * 1.2)) * k;

      const ry = time * 0.1;
      const rx = Math.sin(time * 0.2) * 0.15;
      line.rotation.set(rx, ry, 0);
      points.rotation.set(rx, ry, 0);
      glowMesh.rotation.set(rx, ry, 0);
      glowMat.uniforms.time.value = time;

      renderer.render(scene, camera);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      step();
    };

    const play = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    if (reduced) {
      // One static frame so the backdrop is not empty.
      for (let i = 0; i < 400; i++) step();
    } else {
      play();
    }

    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener('visibilitychange', onVisibility);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (reduced) step();
    };
    window.addEventListener('resize', onResize);

    return () => {
      pause();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      lineGeo.dispose();
      pointGeo.dispose();
      glowGeo.dispose();
      lineMat.dispose();
      pointMat.dispose();
      glowMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="attractor" aria-hidden="true" style={{ ['--attractor-k' as string]: intensity }}>
      <canvas ref={canvasRef} className="attractor-canvas" />
      <div className="attractor-overlay" />
      <div className="attractor-scrim" />
    </div>
  );
}
