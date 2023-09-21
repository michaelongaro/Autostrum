import { useState, useEffect } from "react";
import { Canvas, extend } from "@react-three/fiber";
import { View } from "~/components/canvas/View";
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
  return (
    <View className="pointer-events-none h-8 w-8">
      <ambientLight intensity={1.5} />
      <directionalLight color={"white"} intensity={0.5} />

      <mesh position={[-15, -18, 0]}>
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

      <mesh position={[-21, 9, 0]}>
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

      <mesh position={[15, 2, 0]}>
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
    </View>
  );
}

export default GenrePreviewBubbles;
