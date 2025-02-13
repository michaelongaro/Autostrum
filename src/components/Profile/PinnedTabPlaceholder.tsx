import { useRef } from "react";

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
      {/* FYI: didn't work well with React 19, will be removed in future merge */}
      {/* <Canvas
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
      </Canvas> */}
      <div className="baseFlex z-10 col-start-1 col-end-1 row-start-1 row-end-1">
        <div className="baseVertFlex lightGlassmorphic gap-2 rounded-md p-4 text-lg">
          <p>Pinned tab unavailable</p>
        </div>
      </div>
    </div>
  );
}

export default PinnedTabPlaceholder;
