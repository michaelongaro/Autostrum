import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import type { Mesh } from "three";
import {
  AmbientLight,
  PointLight,
  SphereGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  DirectionalLight,
  CameraHelper,
  AxesHelper,
  GridHelper,
} from "three";
extend({
  AmbientLight,
  PointLight,
  SphereGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  DirectionalLight,
  CameraHelper,
  AxesHelper,
  GridHelper,
});

const Bubbles = () => {
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
        Math.floor(Math.random() * -30) + 5,
        Math.floor(Math.random() * 20),
      ];
      const size = Math.random() * 0.5;
      const velocity = Math.random();
      bubbleProps.push({ position, size, velocity });
    }
    // @ts-expect-error typing on arr
    return bubbleProps;
  }, []);

  return (
    <Canvas
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        zIndex: 0,
      }}
      // className="min-h-[100vh] w-[100vw]"
      camera={{ position: [0, 0, 50] }}
    >
      {/* <OrbitControls />
      <axesHelper args={[5]} /> */}
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
};

export default Bubbles;

interface Bubble {
  position: [number, number, number];
  size: number;
  velocity: number;
}
function Bubble({ position, size, velocity }: Bubble) {
  const meshRef = useRef<Mesh>(null!);

  // console.log(position, velocity);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y += velocity * 0.05;
      meshRef.current.position.x +=
        Math.sin(meshRef.current.position.y) * 0.005;

      // Reset bubble position when it goes out of the screen
      if (meshRef.current.position.y > 30) {
        meshRef.current.position.y = -30;
      }
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[size, 100, 100]} />
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.5}
          reflectivity={1}
          clearcoatRoughness={0.5}
          clearcoat={0.8}
          color={"#f472b6"}
        />
      </mesh>
    </>
  );
}
