interface PlaybackPalmMuteNode {
  value: string;
}

function PlaybackPalmMuteNode({ value }: PlaybackPalmMuteNode) {
  return (
    <>
      {(value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div className="baseFlex w-full">
              <div className="h-[14px] w-[1px] bg-pink-100"></div>
              <div className="h-[1px] w-1 bg-pink-100"></div>
              <i className="mx-[0.125rem]">PM</i>
              <div className="h-[1px] w-[3px] bg-pink-100"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex w-full">
              <div className="h-[1px] w-full bg-pink-100"></div>
              <div className="h-[14px] w-[1px] bg-pink-100"></div>
            </div>
          )}
        </>
      )}

      {value === "-" && <div className="h-[1px] w-full bg-pink-100"></div>}
    </>
  );
}

export default PlaybackPalmMuteNode;
