import { Canvas, extend, useFrame } from "@react-three/fiber";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/router";
import { useMemo, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import type { Mesh } from "three";
import {
  AmbientLight,
  DirectionalLight,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointLight,
  SphereGeometry,
} from "three";
import type { GenreWithTotalTabNumbers } from "~/server/api/routers/genre";
import { formatNumber } from "~/utils/formatNumber";
extend({
  AmbientLight,
  PointLight,
  SphereGeometry,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  DirectionalLight,
});

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

function GenreBubble(genre: GenreWithTotalTabNumbers) {
  const { push, query, pathname } = useRouter();

  const [hoveringOnGenre, setHoveringOnGenre] = useState(false);
  const [mouseDownOnGenre, setMouseDownOnGenre] = useState(false);

  const aboveSmallViewportWidth = useViewportWidthBreakpoint(640);

  const positions: [number, number, number][] = useMemo(() => {
    const positionBases = [
      [-20, 15, 0],
      [0, 15, 0],
      [25, 5, 0],
      [-10, -25, 0],
      [15, -20, 0],
      [-27, -15, 0],
    ];

    const modifiedPositions = positionBases.map((positionBase) => {
      const [x, y, z] = positionBase;

      const slightlyRandomX = x! + Math.random() * 10 - 5;
      const slightlyRandomY = y! + Math.random() * 10;
      const slightlyRandomZ = z! + Math.random() * 5 - 2.5;
      return [slightlyRandomX, slightlyRandomY, slightlyRandomZ];
    });

    return modifiedPositions as [number, number, number][];
  }, []);

  const radii: [number, number, number, number, number, number] =
    useMemo(() => {
      return [
        Math.random() * 8.5 + 3.5,
        Math.random() * 8.5 + 3.5,
        Math.random() * 8.5 + 3.5,
        Math.random() * 8.5 + 3.5,
        Math.random() * 8.5 + 3.5,
        Math.random() * 8.5 + 3.5,
      ];
    }, []);

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

  function searchForSpecificGenre(genreId: number) {
    void push({
      pathname: `${pathname}/filters`,
      query: {
        ...query,
        genreId,
      },
    });
  }

  return (
    <motion.div
      key={`genreBubbleButton${genre.id}`}
      tabIndex={0}
      variants={opacityVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{
        duration: 0.15,
      }}
      style={{
        backgroundColor: genre.color,
      }}
      className={`baseVertFlex group relative h-36 w-full cursor-pointer !items-start !justify-start gap-1 rounded-lg p-4 shadow-md transition-all hover:shadow-lg sm:!justify-center sm:p-6 md:gap-2 ${
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
      onClick={() => {
        searchForSpecificGenre(genre.id);
      }}
      onKeyDown={(event) =>
        event.key === "Enter" && searchForSpecificGenre(genre.id)
      }
    >
      <motion.div
        key={`genreBubbleButton${genre.id}Hover`}
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

      {/* z-index as fallback just incase for weird safari positioning */}
      <p className="z-10 text-lg font-semibold">{genre.name}</p>

      {/* z-index as fallback just incase for weird safari positioning */}
      <p className="z-10">{`${formatNumber(genre.totalTabs)} ${
        genre.totalTabs === 1 ? "tab" : "tabs"
      }`}</p>

      {isMobile ? (
        <Image
          src={
            aboveSmallViewportWidth
              ? `genreButtonBubbles/largeBubbles/id${genre.id}.png`
              : `genreButtonBubbles/smallBubbles/id${genre.id}.png`
          }
          alt="three genre preview bubbles with the same color as the associated genre"
          width={aboveSmallViewportWidth ? 144 : 128}
          height={112}
          quality={100}
          unoptimized
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
          className="absolute -right-4 top-10 h-28 w-32 scale-[0.60] sm:right-4 sm:top-4 sm:scale-100 md:w-36 "
        />
      ) : (
        <div className="absolute -right-8 top-12 h-28 w-32 scale-75 sm:right-4 sm:top-4 sm:scale-100 md:w-36 ">
          <Canvas
            style={{
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 0,
            }}
            camera={{ position: [0, 0, 60] }}
          >
            <ambientLight intensity={1.5} />
            <directionalLight color={"white"} intensity={0.5} />

            {positions.map((position, index) => (
              <ConditionallyFloatingBubble
                key={index}
                delay={Math.random()}
                floating={hoveringOnGenre}
                position={position as [number, number, number]}
                radius={radii[index]!}
                color={genre.color}
              />
            ))}
          </Canvas>
        </div>
      )}
    </motion.div>
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

  const amplitudeY = 4; // Max vertical displacement
  const amplitudeX = 2.5; // Max horizontal displacement
  const frequency = 12 / radius; // Speed of oscillation 1.5

  useFrame((state, delta) => {
    if (meshRef.current && floating) {
      const time = state.clock.getElapsedTime();

      setTimeout(() => {
        if (meshRef.current) {
          meshRef.current.position.x +=
            amplitudeX * Math.cos(frequency * time) * 0.001;
          meshRef.current.position.y +=
            amplitudeY * Math.sin(frequency * time) * 0.01;
        }
      }, delay * 100);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 32, 16]} />
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
