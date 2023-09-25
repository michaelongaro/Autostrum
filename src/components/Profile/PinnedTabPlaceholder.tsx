import { Canvas, extend } from "@react-three/fiber";
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
interface PinnedTabPlaceholder {
  artistUsername: string;
}

function PinnedTabPlaceholder({ artistUsername }: PinnedTabPlaceholder) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="lightestGlassmorphic grid h-full w-full grid-cols-1 grid-rows-1 rounded-md p-4"
    >
      <Canvas
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: -1,
        }}
        className="col-start-1 col-end-1 row-start-1 row-end-1"
        camera={{ position: [0, 0, 100] }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight color={"white"} intensity={0.5} />

        {Array.from({ length: 10 }, (_, i) => i).map((_, i) => {
          return (
            <FloatingBubble
              key={i}
              position={
                [
                  Math.random() *
                    (containerRef.current?.getBoundingClientRect().width ?? 0) *
                    0.25 *
                    (Math.random() > 0.5 ? 1 : -1),
                  Math.random() *
                    (containerRef.current?.getBoundingClientRect().height ??
                      0) *
                    0.25 *
                    (Math.random() > 0.5 ? 1 : -1),
                  Math.random() * 2,
                ] as [number, number, number]
              }
            />
          );
        })}
      </Canvas>
      <div className="baseFlex col-start-1 col-end-1 row-start-1 row-end-1 ">
        <p className="lightGlassmorphic rounded-md p-4 text-lg">{`${artistUsername} hasn't pinned a tab yet.`}</p>
      </div>
    </div>
  );
}

interface FloatingBubble {
  position: [number, number, number];
}

function FloatingBubble({ position }: FloatingBubble) {
  // might end up making these float in some way... feels a bit out of place

  return (
    <mesh position={position}>
      <sphereGeometry args={[Math.random() * 5 + 1.5, 32, 16]} />
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
