import { Canvas, extend } from "@react-three/fiber";
import { motion } from "framer-motion";
import { IoTelescopeOutline } from "react-icons/io5";
import {
  AmbientLight,
  DirectionalLight,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
} from "three";
extend({
  AmbientLight,
  PointLight,
  SphereGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  DirectionalLight,
});

interface NoResultsFoundBubbles {
  color: string;
  reverseBubblePositions?: boolean;
}

function NoResultsFoundBubbles({
  color,
  reverseBubblePositions,
}: NoResultsFoundBubbles) {
  const bubblePositions = reverseBubblePositions
    ? [
        [15, -18, 0],
        [21, 9, 0],
        [-15, 2, 0],
      ]
    : [
        [-15, -18, 0],
        [-21, 9, 0],
        [15, 2, 0],
      ];

  return (
    <Canvas
      style={{
        width: "3rem",
        height: "3rem",
        pointerEvents: "none",
        zIndex: 0,
      }}
      camera={{ position: [0, 0, 55] }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight color={"white"} intensity={0.5} />

      <mesh position={bubblePositions[0] as [number, number, number]}>
        <sphereGeometry args={[8, 32, 16]} />
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.5}
          reflectivity={1}
          clearcoatRoughness={0.5}
          clearcoat={0.8}
          color={color}
        />
      </mesh>

      <mesh position={bubblePositions[1] as [number, number, number]}>
        <sphereGeometry args={[12, 32, 16]} />
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.5}
          reflectivity={1}
          clearcoatRoughness={0.5}
          clearcoat={0.8}
          color={color}
        />
      </mesh>

      <mesh position={bubblePositions[2] as [number, number, number]}>
        <sphereGeometry args={[18, 32, 16]} />
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.5}
          reflectivity={1}
          clearcoatRoughness={0.5}
          clearcoat={0.8}
          color={color}
        />
      </mesh>
    </Canvas>
  );
}

export default NoResultsFoundBubbles;
