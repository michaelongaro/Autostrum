function PrettyNote({
  note,
  displayWithFlex,
}: {
  note: string;
  displayWithFlex?: boolean;
}) {
  return (
    <div className="baseFlex relative">
      <p>{note[0]}</p>
      {note[1] === "#" && (
        <div
          className={`relative -top-1 right-[-1px] text-xs ${displayWithFlex ? "w-[8px]" : "w-[10px]"} text-center`}
        >
          <p>#</p>
        </div>
      )}
    </div>
  );
}

function PrettyTuning({
  tuning,
  width,
  displayWithFlex,
}: {
  tuning: string;
  width?: string;
  displayWithFlex?: boolean;
}) {
  const notes = tuning.trim().split(/\s+/); // trim might not be necessary depending on how you tweak toString()

  return (
    <div
      className={`${displayWithFlex ? "baseFlex gap-1" : "grid grid-cols-6 !place-items-start"} ${width}`}
    >
      {notes.map((note, index) => (
        <PrettyNote
          key={`${tuning}-${index}`}
          note={note.toUpperCase()}
          displayWithFlex={displayWithFlex}
        />
      ))}
    </div>
  );
}

// used to render tuning on tab sections
function PrettyVerticalTuning({
  tuning,
  height,
}: {
  tuning: string;
  height: string;
}) {
  const notes = tuning.trim().split(/\s+/);

  return (
    <div
      style={{ height }}
      className={`baseVertFlex !items-start !justify-between ${notes.toString().includes("#") ? "w-4" : "w-3"}`}
    >
      {notes.map((note, index) => (
        <PrettyNote key={`${tuning}-${index}`} note={note.toUpperCase()} />
      ))}
    </div>
  );
}

export { PrettyNote, PrettyTuning, PrettyVerticalTuning };
