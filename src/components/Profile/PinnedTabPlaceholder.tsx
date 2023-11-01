import { Canvas, extend, useFrame } from "@react-three/fiber";
import { useRef } from "react";
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

function PinnedTabPlaceholder() {
  const containerRef = useRef<HTMLDivElement>(null);

  const positions: number[][] = [];

  const radius = 65;
  const deltaTheta = Math.PI / 10; // Increment angle by 10 degrees

  for (let theta = 0; theta <= 2 * Math.PI; theta += deltaTheta) {
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);
    positions.push([x, y, 0]);
  }

  return (
    <div
      ref={containerRef}
      className="lightestGlassmorphic grid h-[250px] w-full grid-cols-1 grid-rows-1 rounded-md p-4 md:h-[288px] md:w-[392px]"
    >
      <Canvas
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
        className="col-start-1 col-end-1 row-start-1 row-end-1"
        camera={{ position: [0, 0, 100] }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight color={"white"} intensity={0.5} />

        {Array.from({ length: 20 }, (_, i) => i).map((_, i) => {
          return (
            <FloatingBubble
              key={i}
              position={positions[i] as [number, number, number]}
            />
          );
        })}
      </Canvas>
      <div className="baseFlex z-10 col-start-1 col-end-1 row-start-1 row-end-1">
        <div className="baseVertFlex lightGlassmorphic gap-2 rounded-md p-4 text-lg">
          <p>Pinned tab unavailable</p>
        </div>
      </div>
    </div>
  );
}

interface FloatingBubble {
  position: [number, number, number];
}

function FloatingBubble({ position }: FloatingBubble) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const rotationSpeed = 0.1; // Adjust rotation speed as needed
    // Calculate the angle of rotation based on time and rotationSpeed
    const angle = time * rotationSpeed;
    // Apply rotation around the Z-axis
    const x = position[1] * Math.sin(angle) - position[0] * Math.cos(angle);
    const y = position[0] * Math.sin(angle) + position[1] * Math.cos(angle);
    // Update the position of the bubble
    if (meshRef.current) {
      meshRef.current.position.x = x;
      meshRef.current.position.y = y;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[5, 32, 16]} />
      <meshPhysicalMaterial
        roughness={0}
        metalness={0.5}
        reflectivity={1}
        clearcoatRoughness={0.5}
        clearcoat={0.8}
        color={"#f472b6"}
      />
    </mesh>
  );
}

export default PinnedTabPlaceholder;
