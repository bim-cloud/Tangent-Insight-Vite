import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion } from "framer-motion";
import * as THREE from "three";

// A slowly rotating icosahedron wireframe with a glowing core — the
// "premium opening" centerpiece. Cheap to render, looks high-end.
function WelcomeMesh() {
  const mesh = useRef();
  const inner = useRef();
  useFrame((state, delta) => {
    if (mesh.current) { mesh.current.rotation.y += delta * 0.35; mesh.current.rotation.x += delta * 0.12; }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.5;
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.06;
      inner.current.scale.set(s, s, s);
    }
  });
  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[2.2, 1]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={inner}>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.8} />
      </mesh>
      <pointLight position={[0, 0, 0]} color="#22d3ee" intensity={2} distance={8} />
    </group>
  );
}

export default function WelcomeScreen({ onDone, name }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(12px)" }}
      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 999, background: "rgb(9 11 18)",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas camera={{ position: [0, 0, 6], fov: 55 }} dpr={[1, 1.8]} gl={{ alpha: true, antialias: true }}>
          <WelcomeMesh />
        </Canvas>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
        style={{ position: "relative", textAlign: "center", zIndex: 1, pointerEvents: "none" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}
          style={{ height: 64, width: 64, borderRadius: 18, background: "var(--grad-cyan)", margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 30,
            boxShadow: "0 12px 40px -8px rgba(34,211,238,0.6)" }}>
          T
        </motion.div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: "#fff" }}>Tangent Insight</div>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          style={{ fontSize: 13.5, color: "rgb(180 190 206)", marginTop: 6 }}>
          {name ? `Welcome back, ${name.split(" ")[0]}` : "BIM Intelligence Platform"}
        </motion.div>

        {/* progress shimmer */}
        <motion.div style={{ width: 160, height: 3, borderRadius: 3, background: "rgb(38 44 60)", margin: "26px auto 0", overflow: "hidden" }}>
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: "100%" }}
            transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
            style={{ width: "60%", height: "100%", background: "var(--grad-cyan)" }}
          />
        </motion.div>
      </motion.div>

      {/* auto-dismiss trigger */}
      <DismissTimer onDone={onDone} />
    </motion.div>
  );
}

import { useEffect } from "react";
function DismissTimer({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return null;
}
