import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ----- Device capability tiering (decides particle count / whether to render) -----
function detectTier() {
  if (typeof navigator === "undefined") return "mid";
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return "off";
  if (mobile && (mem <= 4 || cores <= 4)) return "low";
  if (mem <= 4 || cores <= 4) return "mid";
  return "high";
}

const COUNT = { high: 2600, mid: 1200, low: 500, off: 0 };

// ----- The particle field -----
function ParticleField({ count, theme }) {
  const points = useRef();
  const { pointer, viewport } = useThree();
  const drift = useRef({ x: 0, y: 0 });

  const { positions, scales, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      scales[i] = Math.random() * 0.9 + 0.2;
      speeds[i] = Math.random() * 0.4 + 0.08;
    }
    return { positions, scales, speeds };
  }, [count]);

  const color = useMemo(() => new THREE.Color(theme === "light" ? "#0ea5b7" : "#38e0f0"), [theme]);
  const color2 = useMemo(() => new THREE.Color("#a78bfa"), []);

  useFrame((state, delta) => {
    if (!points.current) return;
    const t = state.clock.elapsedTime;
    const pos = points.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      // gentle upward drift + sine sway
      pos[i * 3 + 1] += speeds[i] * delta * 0.5;
      pos[i * 3] += Math.sin(t * 0.2 + i) * 0.0015;
      if (pos[i * 3 + 1] > 7) pos[i * 3 + 1] = -7;
    }
    points.current.geometry.attributes.position.needsUpdate = true;

    // Parallax: whole field eases toward pointer
    drift.current.x += (pointer.x * 0.6 - drift.current.x) * 0.03;
    drift.current.y += (pointer.y * 0.4 - drift.current.y) * 0.03;
    points.current.rotation.y = drift.current.x * 0.15;
    points.current.rotation.x = -drift.current.y * 0.12;
  });

  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    return t;
  }, []);

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-scale" count={count} array={scales} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        map={tex}
        transparent
        opacity={theme === "light" ? 0.5 : 0.7}
        color={color}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Soft floating light orbs for volumetric depth
function GlowOrbs({ theme }) {
  const a = useRef(), b = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (a.current) {
      a.current.position.x = Math.sin(t * 0.15) * 4;
      a.current.position.y = Math.cos(t * 0.12) * 2.5;
    }
    if (b.current) {
      b.current.position.x = Math.cos(t * 0.1) * -5;
      b.current.position.y = Math.sin(t * 0.17) * 3;
    }
  });
  return (
    <>
      <mesh ref={a} position={[-3, 1, -4]}>
        <sphereGeometry args={[2.4, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={theme === "light" ? 0.04 : 0.07} />
      </mesh>
      <mesh ref={b} position={[4, -1, -5]}>
        <sphereGeometry args={[2.8, 32, 32]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={theme === "light" ? 0.035 : 0.06} />
      </mesh>
    </>
  );
}

export default function AmbientBackground({ theme = "dark", quality }) {
  const [tier, setTier] = useState("mid");
  useEffect(() => { setTier(detectTier()); }, []);
  const effectiveTier = quality || tier;
  const count = COUNT[effectiveTier] ?? COUNT.mid;

  if (effectiveTier === "off" || count === 0) {
    // Reduced-motion / unsupported: static CSS gradient only
    return (
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: theme === "light"
          ? "radial-gradient(1200px 600px at 30% 20%, rgba(34,211,238,0.06), transparent), radial-gradient(1000px 500px at 75% 70%, rgba(167,139,250,0.05), transparent)"
          : "radial-gradient(1200px 600px at 30% 20%, rgba(34,211,238,0.08), transparent), radial-gradient(1000px 500px at 75% 70%, rgba(167,139,250,0.07), transparent)",
      }} />
    );
  }

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 60 }}
        dpr={effectiveTier === "high" ? [1, 1.8] : [1, 1.2]}
        gl={{ antialias: effectiveTier === "high", alpha: true, powerPreference: "high-performance" }}
        frameloop="always"
      >
        <ParticleField count={count} theme={theme} />
        <GlowOrbs theme={theme} />
      </Canvas>
    </div>
  );
}

export { detectTier };
