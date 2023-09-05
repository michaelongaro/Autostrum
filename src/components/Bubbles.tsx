import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { extend } from "@react-three/fiber";
import type { Mesh } from "three";
import {
  AmbientLight,
  PointLight,
  SphereGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  DirectionalLight,
} from "three";
extend({
  AmbientLight,
  PointLight,
  SphereGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  DirectionalLight,
});

function Bubbles() {
  const bubbles = useMemo((): {
    position: [number, number, number];
    size: number;
    velocity: number;
  }[] => {
    if (typeof window === "undefined") return [];
    const bubbleProps = [];

    for (let i = 0; i < 25; i++) {
      const position = [
        (Math.random() * window.innerWidth - window.innerWidth / 2) / 10,
        Math.floor(Math.random() * -30) + 35,
        Math.floor(Math.random() * 20),
      ];
      const size = Math.random() * 0.65;
      const velocity = Math.random() * 0.04 + 0.01;
      bubbleProps.push({ position, size, velocity });
    }
    // @ts-expect-error typing on arr
    return bubbleProps;
  }, []);

  return (
    <Canvas
      style={{
        width: "100vw",
        height: "100dvh",
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
      camera={{ position: [0, 0, 50] }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight color={"white"} intensity={0.5} />

      {bubbles.map((bubble, i) => (
        <Bubble
          key={i}
          position={bubble.position}
          size={bubble.size}
          velocity={bubble.velocity}
        />
      ))}
    </Canvas>
  );
}

export default Bubbles;

interface Bubble {
  position: [number, number, number];
  size: number;
  velocity: number;
}
function Bubble({ position, size, velocity }: Bubble) {
  const meshRef = useRef<Mesh>(null!);

  const frequency = 0.2 / size;
  // console.log(position, velocity);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();

      // TODO: I think both should be inversely proportional to the bubbles size tbh
      meshRef.current.position.y += velocity;

      meshRef.current.position.x +=
        // Math.sin(meshRef.current.position.y) * 0.005;
        Math.cos(frequency * time) * 0.02;

      // Reset bubble position when it goes out of the screen
      if (meshRef.current.position.y > 40) {
        meshRef.current.position.y = -40;
      }
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 50, 50]} />
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.5}
          reflectivity={1}
          clearcoatRoughness={0}
          clearcoat={0.8}
          color={"#f472b6"}
        />
      </mesh>
    </>
  );
}
