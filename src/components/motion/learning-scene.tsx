"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import type { Group, Mesh } from "three";

function LearningTiles({ staticScene }: { staticScene: boolean }) {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);

  useFrame(({ clock, pointer }) => {
    if (!group.current || !ring.current || staticScene) return;
    const time = clock.getElapsedTime();
    group.current.rotation.y += (pointer.x * 0.18 - group.current.rotation.y) * 0.035;
    group.current.rotation.x += (-pointer.y * 0.1 - group.current.rotation.x) * 0.035;
    group.current.position.y = Math.sin(time * 0.65) * 0.08;
    ring.current.rotation.z = time * 0.18;
  });

  const tiles = [
    { position: [-1.35, 0.35, 0.1] as [number, number, number], rotation: [0.04, 0.28, -0.12] as [number, number, number], color: "#2563eb" },
    { position: [0.1, 0.7, -0.25] as [number, number, number], rotation: [-0.1, -0.18, 0.06] as [number, number, number], color: "#ffffff" },
    { position: [1.35, -0.2, 0.25] as [number, number, number], rotation: [0.08, -0.3, 0.12] as [number, number, number], color: "#5eead4" },
    { position: [-0.45, -0.85, 0.35] as [number, number, number], rotation: [-0.08, 0.2, -0.04] as [number, number, number], color: "#c7d2fe" }
  ];

  return (
    <group ref={group} rotation={[0.08, -0.12, 0]}>
      <mesh ref={ring} position={[0, 0, -1.2]} rotation={[1.22, 0, 0]}>
        <torusGeometry args={[2.15, 0.035, 20, 96]} />
        <meshStandardMaterial color="#67e8f9" transparent opacity={0.48} />
      </mesh>
      {tiles.map((tile, index) => (
        <group key={tile.color} position={tile.position} rotation={tile.rotation}>
          <mesh castShadow>
            <boxGeometry args={[1.25, 1.55, 0.12]} />
            <meshStandardMaterial color={tile.color} roughness={0.3} metalness={0.04} />
          </mesh>
          <mesh position={[0, 0.24, 0.071]}>
            {index % 2 === 0 ? <circleGeometry args={[0.27, 32]} /> : <boxGeometry args={[0.48, 0.48, 0.025]} />}
            <meshStandardMaterial color={index === 1 ? "#2563eb" : "#ffffff"} />
          </mesh>
          <mesh position={[0, -0.39, 0.071]}>
            <boxGeometry args={[0.72, 0.09, 0.025]} />
            <meshStandardMaterial color={index === 1 ? "#93c5fd" : "#dbeafe"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function LearningScene() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-[430px] w-full overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-blue-600/10 via-white/30 to-cyan-300/20 shadow-[0_35px_90px_rgba(30,64,175,0.2)] backdrop-blur-xl sm:h-[520px]">
      <Canvas
        aria-label="Floating classroom learning cards"
        camera={{ position: [0, 0, 6.4], fov: 44 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[3, 5, 5]} intensity={2.4} castShadow />
        <pointLight position={[-4, -2, 3]} color="#60a5fa" intensity={4} />
        <LearningTiles staticScene={Boolean(reduceMotion)} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-5 bottom-5 flex items-center justify-between rounded-2xl border border-white/60 bg-white/55 px-4 py-3 text-sm font-bold text-slate-700 shadow-lg backdrop-blur-xl">
        <span>Interactive learning materials</span>
        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs text-white">Move your pointer</span>
      </div>
    </div>
  );
}
