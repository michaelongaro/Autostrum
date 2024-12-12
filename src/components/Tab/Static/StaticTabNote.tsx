interface StaticTabNote {
  note: string;
}

function StaticTabNote({ note }: StaticTabNote) {
  return (
    <div className="baseFlex w-[35px]">
      <div className="my-3 h-[1px] flex-[1] bg-pink-100/50"></div>
      {/* {formatNoteAndEffect(note)} */}
      <div
        // "x" wasn't as centered as regular numbers were, manual adjustment below
        style={{
          marginTop: note === "x" ? "-2px" : "0px",
          marginBottom: note === "x" ? "2px" : "0px",
        }}
      >
        {note}
      </div>
      <div className="my-3 h-[1px] flex-[1] bg-pink-100/50"></div>
    </div>
  );
}

export default StaticTabNote;
