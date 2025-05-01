function DifficultyBars({ difficulty }: { difficulty: number }) {
  const difficultyBars = Array.from({ length: 5 }, (_, i) => (
    <DifficultyBar key={i} filled={i < difficulty} />
  ));

  return <div className="baseFlex !items-end gap-0.5">{difficultyBars}</div>;
}

function DifficultyBar({ filled }: { filled: boolean }) {
  return (
    <div
      className={`h-[13px] w-[3px] rounded-full bg-current ${filled ? "" : "opacity-50"}`}
    ></div>
  );
}

export default DifficultyBars;
