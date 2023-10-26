import { Canvas, extend, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";
import {
  AmbientLight,
  ColorManagement,
  DirectionalLight,
  MeshPhongMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
} from "three";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
extend({
  AmbientLight,
  PointLight,
  SphereGeometry,
  MeshStandardMaterial,
  DirectionalLight,
  MeshPhongMaterial,
  ColorManagement,
});

// needed to set color management to true in order to get the static
// global mesh to render as it would if it were inline in the <Bubble /> component
ColorManagement.enabled = true;
const bubbleMesh = new MeshPhongMaterial({
  color: "#f396c6",
  emissive: "#b92248",
  specular: "#fe67a8",
  shininess: 100,
  reflectivity: 1,
  refractionRatio: 0.98,
});

function Bubbles() {
  const isAboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const bubbles = useMemo((): {
    position: [number, number, number];
    size: number;
    velocity: number;
  }[] => {
    if (typeof window === "undefined") return [];
    const bubbleProps = [];

    for (let i = 0; i < (isAboveMediumViewportWidth ? 25 : 10); i++) {
      const position = [
        (Math.random() * window.innerWidth - window.innerWidth / 2) / 15,
        Math.floor(Math.random() * -125) + 15,
        Math.floor(Math.random() * 35),
      ];
      const size = Math.random() * 0.35 + 0.1;
      const velocity = Math.random() * 0.03 + 0.01;
      bubbleProps.push({ position, size, velocity });
    }
    // @ts-expect-error typing on arr
    return bubbleProps;
  }, [isAboveMediumViewportWidth]);

  return (
    <Canvas
      id="mainFloatingBubblesBackground"
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
      <ambientLight color={"#fdf2f8"} intensity={0.15} />
      <directionalLight color={"#fdf2f8"} intensity={0.25} />

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

  const originalX = position[0];
  const frequency = 1 / Math.max(0.25, size); // prevents small bubbles from swaying too much
  const amplitude = size;

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();

      // Vertical movement
      meshRef.current.position.y += velocity;

      // Horizontal swaying
      const offsetX = Math.cos(frequency * time) * amplitude;
      meshRef.current.position.x = originalX + offsetX;

      // Reset bubble position when it goes out of the screen
      if (meshRef.current.position.y > 40) {
        meshRef.current.position.y = -40;
        meshRef.current.position.x = originalX;
      }
    }
  });

  return (
    <mesh ref={meshRef} material={bubbleMesh} position={position}>
      <sphereGeometry args={[size, 16, 8]} />
    </mesh>
  );
}
