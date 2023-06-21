import { useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRouter } from "next/router";
import type { Mesh } from "three";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import type { GenreWithTotalTabNumbers } from "~/server/api/routers/genre";
import { formatNumber } from "~/utils/formatNumber";

// maybe a bit of a spring animation on enter framer motion?
// scale: 0.75 -> 1

// 100 slices is probably WAY too much, experiment with decreasing later and zooming in to
// make sure it still looks good
function GenreBubble(genre: GenreWithTotalTabNumbers) {
  const { push } = useRouter();

  const [hoveringOnGenre, setHoveringOnGenre] = useState(false);
  const [mouseDownOnGenre, setMouseDownOnGenre] = useState(false);

  const radii: [number, number, number, number, number] = useMemo(() => {
    return [
      Math.random() * 7 + 3,
      Math.random() * 7 + 3,
      Math.random() * 7 + 3,
      Math.random() * 7 + 3,
      Math.random() * 7 + 3,
    ];
  }, []);

  //also seems pretty logical to add the spotlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const { left, top } = currentTarget.getBoundingClientRect();

    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      style={{
        backgroundColor: genre.color,
      }}
      className={`baseVertFlex group relative h-36 w-full cursor-pointer !items-start !justify-between rounded-lg p-6 shadow-md transition-all hover:shadow-lg ${
        mouseDownOnGenre ? "brightness-75" : "brightness-100"
      }`}
      onMouseEnter={() => setHoveringOnGenre(true)}
      onMouseLeave={() => {
        setHoveringOnGenre(false);
        setMouseDownOnGenre(false);
      }}
      onMouseDown={() => setMouseDownOnGenre(true)}
      onMouseUp={() => setMouseDownOnGenre(false)}
      onMouseMove={handleMouseMove}
      // use formatting functions from other component
      // onClick={() => push(`/explore/genre/${genre.id}`)}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              350px circle at ${mouseX}px ${mouseY}px,
              hsla(210, 40%, 95%, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      <p className="text-lg font-semibold">{genre.name}</p>

      <p>{`${formatNumber(genre.totalTabs)} tabs`}</p>

      <div className="absolute right-4 top-4 h-28 w-28">
        <Canvas
          style={{
            width: "7rem",
            height: "7rem",
            pointerEvents: "none",
            zIndex: 0,
          }}
          camera={{ position: [0, 0, 50] }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight color={"white"} intensity={0.5} />

          <ConditionallyFloatingBubble
            delay={Math.random()}
            floating={hoveringOnGenre}
            position={[-20, 5, 0]}
            radius={radii[0]}
            color={genre.color}
          />
          <ConditionallyFloatingBubble
            delay={Math.random()}
            floating={hoveringOnGenre}
            position={[0, 10, 0]}
            radius={radii[1]}
            color={genre.color}
          />
          <ConditionallyFloatingBubble
            delay={Math.random()}
            floating={hoveringOnGenre}
            position={[25, 0, 0]}
            radius={radii[2]}
            color={genre.color}
          />
          <ConditionallyFloatingBubble
            delay={Math.random()}
            floating={hoveringOnGenre}
            position={[-10, -25, 0]}
            radius={radii[3]}
            color={genre.color}
          />
          <ConditionallyFloatingBubble
            delay={Math.random()}
            floating={hoveringOnGenre}
            position={[10, -20, 0]}
            radius={radii[4]}
            color={genre.color}
          />
        </Canvas>
      </div>
    </div>
  );
}

export default GenreBubble;

interface ConditionallyFloatingBubble {
  delay: number;
  floating: boolean;
  radius: number;
  position: [number, number, number];
  color: string;
}

function ConditionallyFloatingBubble({
  delay,
  floating,
  radius,
  position,
  color,
}: ConditionallyFloatingBubble) {
  const meshRef = useRef<Mesh>(null!);

  const amplitudeY = 4.5; // Max vertical displacement
  const amplitudeX = 2.5; // Max horizontal displacement
  const frequency = 12 / radius; // Speed of oscillation 1.5

  useFrame((state, delta) => {
    if (meshRef.current && floating) {
      const time = state.clock.getElapsedTime();

      setTimeout(() => {
        meshRef.current.position.x +=
          amplitudeX * Math.cos(frequency * time) * 0.001;
        meshRef.current.position.y +=
          amplitudeY * Math.sin(frequency * time) * 0.01;
      }, delay * 100);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 100, 100]} />
      <meshPhysicalMaterial
        roughness={0}
        metalness={0.5}
        reflectivity={1}
        clearcoatRoughness={0.5}
        clearcoat={0.8}
        color={color}
      />
    </mesh>
  );
}
