import { useState, useEffect } from "react";
import { Canvas, extend } from "@react-three/fiber";
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
interface GenrePreviewBubbles {
  color: string;
}

function GenrePreviewBubbles({ color }: GenrePreviewBubbles) {
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    setDpr(window.devicePixelRatio > 1 ? 1.1 : 1);
  }, []);

  return (
    <Canvas
      style={{
        width: "2rem",
        height: "2rem",
        pointerEvents: "none",
        zIndex: 0,
      }}
      camera={{ position: [0, 0, 55] }}
      dpr={dpr}
      frameloop="demand"
    >
      <ambientLight intensity={1.5} />
      <directionalLight color={"white"} intensity={0.5} />

      <mesh position={[-15, -18, 0]}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.5}
          reflectivity={1}
          clearcoatRoughness={0.5}
          clearcoat={0.8}
          color={color}
        />
      </mesh>

      <mesh position={[-17, 9, 0]}>
        <sphereGeometry args={[12, 16, 16]} />
        <meshPhysicalMaterial
          roughness={0}
          metalness={0.5}
          reflectivity={1}
          clearcoatRoughness={0.5}
          clearcoat={0.8}
          color={color}
        />
      </mesh>

      <mesh position={[20, 2, 0]}>
        <sphereGeometry args={[18, 16, 16]} />
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

export default GenrePreviewBubbles;
