interface StaticPalmMuteNode {
  value: string;
}

function StaticPalmMuteNode({ value }: StaticPalmMuteNode) {
  return (
    <>
      {value === "start" && (
        <div className="baseFlex w-full">
          <div
            style={{
              backgroundColor: "hsl(var(--screenshot-foreground))",
            }}
            className="ml-2 h-[14px] w-[1px] shrink-0"
          ></div>

          <div
            style={{
              backgroundColor: "hsl(var(--screenshot-foreground))",
            }}
            className="h-[1px] w-[5px] shrink-0"
          ></div>

          <i
            style={{
              color: "hsl(var(--screenshot-foreground))",
            }}
            className="mx-[2px]"
          >
            PM
          </i>

          <div
            style={{
              backgroundColor: "hsl(var(--screenshot-foreground))",
            }}
            className="h-[1px] w-auto grow"
          ></div>
        </div>
      )}

      {value === "end" && (
        <div className="baseFlex w-full">
          <div
            style={{
              backgroundColor: "hsl(var(--screenshot-foreground))",
            }}
            className="h-[1px] w-auto grow"
          ></div>

          <div
            style={{
              backgroundColor: "hsl(var(--screenshot-foreground))",
            }}
            className="mr-2 h-[14px] w-[1px]"
          ></div>
        </div>
      )}

      {value === "-" && (
        <div
          style={{
            backgroundColor: "hsl(var(--screenshot-foreground))",
          }}
          className="h-[1px] w-full"
        ></div>
      )}
    </>
  );
}

export default StaticPalmMuteNode;
