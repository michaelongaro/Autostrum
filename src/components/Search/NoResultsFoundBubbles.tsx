import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

interface NoResultsFoundBubbles {
  color: string;
  reverseBubblePositions?: boolean;
}

function NoResultsFoundBubbles({
  color,
  reverseBubblePositions,
}: NoResultsFoundBubbles) {
  const isAboveSmallViewportWidth = useViewportWidthBreakpoint(640);

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

  return {
    /* FYI: didn't work well with React 19, will be removed in future merge */
  };
  // <Canvas
  //   style={{
  //     width: isAboveSmallViewportWidth ? "3rem" : "2.5rem",
  //     height: isAboveSmallViewportWidth ? "3rem" : "2.5rem",
  //     pointerEvents: "none",
  //     zIndex: 0,
  //   }}
  //   camera={{ position: [0, 0, 55] }}
  // >
  //   <ambientLight intensity={1.5} />
  //   <directionalLight color={"white"} intensity={0.5} />

  //   <mesh position={bubblePositions[0] as [number, number, number]}>
  //     <sphereGeometry args={[8, 32, 16]} />
  //     <meshPhysicalMaterial
  //       roughness={0}
  //       metalness={0.5}
  //       reflectivity={1}
  //       clearcoatRoughness={0.5}
  //       clearcoat={0.8}
  //       color={color}
  //     />
  //   </mesh>

  //   <mesh position={bubblePositions[1] as [number, number, number]}>
  //     <sphereGeometry args={[12, 32, 16]} />
  //     <meshPhysicalMaterial
  //       roughness={0}
  //       metalness={0.5}
  //       reflectivity={1}
  //       clearcoatRoughness={0.5}
  //       clearcoat={0.8}
  //       color={color}
  //     />
  //   </mesh>

  //   <mesh position={bubblePositions[2] as [number, number, number]}>
  //     <sphereGeometry args={[18, 32, 16]} />
  //     <meshPhysicalMaterial
  //       roughness={0}
  //       metalness={0.5}
  //       reflectivity={1}
  //       clearcoatRoughness={0.5}
  //       clearcoat={0.8}
  //       color={color}
  //     />
  //   </mesh>
  // </Canvas>
}

export default NoResultsFoundBubbles;
